"""
ML Trajectory Prediction Router — Step 22
Loads the trained Random Forest model (iceberg_trajectory_final.joblib) and
serves 24-hour T+24h iceberg drift predictions via a clean REST endpoint.
"""

import os
import math
import logging
from datetime import date, datetime
from typing import Optional

import joblib
import numpy as np
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/icebergs", tags=["ML Trajectory Prediction"])

# ── Paths ─────────────────────────────────────────────────────────────────────
_HERE = os.path.dirname(__file__)
MODEL_PATH = os.path.abspath(
    os.path.join(_HERE, "..", "..", "..", "data", "models", "iceberg_trajectory_final.joblib")
)

# ── Feature order MUST match training ─────────────────────────────────────────
FEATURE_ORDER = [
    "latitude",
    "longitude",
    "previous_delta_latitude",
    "previous_delta_longitude",
    "drift_speed_kmh",
    "drift_heading_deg",
    "size_1_nm",
    "size_2_nm",
    "sin_doy",
    "cos_doy",
    "current_extent",
]

# ── Model cache (loaded once on first request) ─────────────────────────────────
_model = None


def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Trained model not found at: {MODEL_PATH}\n"
                "Ensure iceberg_trajectory_final.joblib exists in data/models/"
            )
        logger.info("Loading Random Forest model from %s", MODEL_PATH)
        _model = joblib.load(MODEL_PATH)
        logger.info("Model loaded successfully: %s", type(_model).__name__)
    return _model


# ── Request / Response schemas ─────────────────────────────────────────────────
class MLPredictRequest(BaseModel):
    # Current position (required)
    latitude: float = Field(..., ge=-90, le=90, description="Current latitude (negative = South)")
    longitude: float = Field(..., ge=-180, le=180, description="Current longitude [-180,180]")

    # Kinematic features (required by the model)
    previous_delta_latitude: float = Field(
        ..., description="Latitude change in previous 24h step (degrees)"
    )
    previous_delta_longitude: float = Field(
        ..., description="Longitude change in previous 24h step (degrees)"
    )
    drift_speed_kmh: float = Field(..., ge=0, description="Drift speed in km/h")
    drift_heading_deg: float = Field(..., ge=0, le=360, description="Drift heading in degrees")

    # Iceberg size (nautical miles)
    size_1_nm: float = Field(default=5.0, ge=0, description="Major axis size in nautical miles")
    size_2_nm: float = Field(default=2.5, ge=0, description="Minor axis size in nautical miles")

    # Seasonal signal (if not provided, auto-calculated from today's date)
    sin_doy: Optional[float] = Field(None, description="sin(day-of-year * 2π/365)")
    cos_doy: Optional[float] = Field(None, description="cos(day-of-year * 2π/365)")

    # Sea-ice extent proxy
    current_extent: float = Field(
        default=11.5, description="Sea-ice extent proxy (10^6 km²); ~11.5 typical"
    )

    # Optional metadata (not used by model, included for traceability)
    iceberg_id: Optional[str] = Field(None, description="Iceberg identifier for logging")
    observation_date: Optional[str] = Field(None, description="ISO date of observation (YYYY-MM-DD)")


class MLPredictResponse(BaseModel):
    iceberg_id: Optional[str]
    model_version: str
    prediction_horizon: str

    current_latitude: float
    current_longitude: float

    predicted_delta_latitude: float
    predicted_delta_longitude: float

    predicted_latitude: float
    predicted_longitude: float

    displacement_km: float

    # Feature echo for transparency
    features_used: dict


# ── Helpers ────────────────────────────────────────────────────────────────────
def _wrap_longitude(lon: float) -> float:
    """Wrap longitude to [-180, 180]."""
    return ((lon + 180) % 360) - 180


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ── Endpoint ───────────────────────────────────────────────────────────────────
@router.post(
    "/ml-predict",
    response_model=MLPredictResponse,
    summary="24-Hour Iceberg Trajectory Prediction (Random Forest ML Model)",
    description=(
        "Uses the trained Random Forest multi-output regressor "
        "(iceberg_trajectory_final.joblib) to predict the 24-hour positional "
        "displacement of an Antarctic iceberg. Returns current + predicted "
        "coordinates suitable for map visualisation."
    ),
)
def predict_ml_trajectory(req: MLPredictRequest):
    """
    Predict T+24h iceberg position using the final trained Random Forest model.

    Feature vector order (must match training):
        latitude, longitude, previous_delta_latitude, previous_delta_longitude,
        drift_speed_kmh, drift_heading_deg, size_1_nm, size_2_nm,
        sin_doy, cos_doy, current_extent
    """
    # ── 1. Load model ──────────────────────────────────────────────────────────
    try:
        model = _load_model()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    # ── 2. Seasonal signal ─────────────────────────────────────────────────────
    if req.sin_doy is None or req.cos_doy is None:
        try:
            obs_date = (
                date.fromisoformat(req.observation_date)
                if req.observation_date
                else date.today()
            )
        except ValueError:
            obs_date = date.today()
        doy = obs_date.timetuple().tm_yday
        angle = 2 * math.pi * doy / 365.0
        sin_doy = math.sin(angle)
        cos_doy = math.cos(angle)
    else:
        sin_doy = req.sin_doy
        cos_doy = req.cos_doy

    # ── 3. Build feature vector ────────────────────────────────────────────────
    feature_values = {
        "latitude": req.latitude,
        "longitude": req.longitude,
        "previous_delta_latitude": req.previous_delta_latitude,
        "previous_delta_longitude": req.previous_delta_longitude,
        "drift_speed_kmh": req.drift_speed_kmh,
        "drift_heading_deg": req.drift_heading_deg,
        "size_1_nm": req.size_1_nm,
        "size_2_nm": req.size_2_nm,
        "sin_doy": sin_doy,
        "cos_doy": cos_doy,
        "current_extent": req.current_extent,
    }

    X = np.array([[feature_values[f] for f in FEATURE_ORDER]], dtype=np.float64)

    # ── 4. Sanity check ────────────────────────────────────────────────────────
    if not np.isfinite(X).all():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input features contain NaN or Inf values. Please check the request payload.",
        )

    # ── 5. Predict ────────────────────────────────────────────────────────────
    try:
        prediction = model.predict(X)[0]  # shape (2,): [delta_lat, delta_lon]
    except Exception as exc:
        logger.exception("Model prediction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model prediction error: {exc}",
        )

    pred_delta_lat = float(prediction[0])
    pred_delta_lon = float(prediction[1])

    # ── 6. Validate output ─────────────────────────────────────────────────────
    if not (math.isfinite(pred_delta_lat) and math.isfinite(pred_delta_lon)):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model returned NaN or Inf prediction. Please check input features.",
        )

    # ── 7. Convert deltas → absolute predicted coordinates ────────────────────
    pred_lat = req.latitude + pred_delta_lat
    pred_lon = _wrap_longitude(req.longitude + pred_delta_lon)

    # Clamp latitude to valid range
    pred_lat = max(-90.0, min(90.0, pred_lat))

    # ── 8. Compute displacement ────────────────────────────────────────────────
    displacement_km = _haversine_km(req.latitude, req.longitude, pred_lat, pred_lon)

    logger.info(
        "ML Prediction | iceberg=%s | current=(%.4f, %.4f) | predicted=(%.4f, %.4f) | "
        "delta=(%.4f, %.4f) | displacement=%.2f km",
        req.iceberg_id or "?",
        req.latitude, req.longitude,
        pred_lat, pred_lon,
        pred_delta_lat, pred_delta_lon,
        displacement_km,
    )

    return MLPredictResponse(
        iceberg_id=req.iceberg_id,
        model_version="iceberg_trajectory_final_v1_rf",
        prediction_horizon="24 hours",
        current_latitude=req.latitude,
        current_longitude=req.longitude,
        predicted_delta_latitude=round(pred_delta_lat, 6),
        predicted_delta_longitude=round(pred_delta_lon, 6),
        predicted_latitude=round(pred_lat, 6),
        predicted_longitude=round(pred_lon, 6),
        displacement_km=round(displacement_km, 2),
        features_used=feature_values,
    )
