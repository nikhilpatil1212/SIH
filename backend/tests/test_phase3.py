"""Automated unit and integration tests for Phase 3 ML, Hybrid Forecasting, Route Risk, and API."""

import pytest
import os
import math
from datetime import datetime, timezone

from app.ml.schemas import (
    CanonicalMLFeatureRecord,
    HybridForecastResult,
    RouteRiskEvaluation,
)
from app.ml.regime_detector import detect_physical_regime, PhysicalRegime
from app.ml.engine import (
    TabularFeatureScaler,
    DecisionTreeRegressor,
    RandomForestRegressor,
    GradientBoostedRegressor,
    RidgeRegressor,
)
from app.ml.residual_model import MLResidualModelTrainer, HybridDriftModel
from app.ml.hybrid_forecaster import HybridForecaster
from app.ml.uncertainty import UncertaintyEstimator
from app.ml.route_risk import RouteRiskEngine
from app.ml.ai_explanation import generate_drift_decision_explanation
from app.api.icebergs import predict_iceberg_drift, PredictIcebergDriftRequest
from app.api.routes import evaluate_maritime_routes, RoutePredictRequest


def test_physical_regime_detector():
    # 1. Grounded case (depth <= draft)
    res_grounded = detect_physical_regime(latitude=-75.0, longitude=-45.0, draft_m=250.0, bathymetry_depth_m=-200.0)
    assert res_grounded["regime"] == PhysicalRegime.GROUNDED.value
    assert res_grounded["is_grounded"]

    # 2. Ice-locked case (C_ice >= 0.85)
    res_locked = detect_physical_regime(latitude=-68.0, longitude=-50.0, bathymetry_depth_m=-2500.0, sea_ice_concentration=0.92)
    assert res_locked["regime"] == PhysicalRegime.ICE_LOCKED.value
    assert res_locked["is_ice_locked"]

    # 3. Free-drift case
    res_drift = detect_physical_regime(latitude=-58.0, longitude=-40.0, bathymetry_depth_m=-3500.0, sea_ice_concentration=0.10)
    assert res_drift["regime"] == PhysicalRegime.FREE_DRIFT.value


def test_ml_tabular_engine_algorithms():
    X = [[1.0, 2.0], [2.0, 1.0], [3.0, 4.0], [5.0, 2.0], [4.0, 5.0], [6.0, 3.0]]
    y = [2.0 * row[0] - 3.0 * row[1] + 1.0 for row in X]

    # Scaler
    scaler = TabularFeatureScaler()
    X_scaled = scaler.fit_transform(X)
    assert len(X_scaled) == 6

    # 1. Ridge Regressor
    ridge = RidgeRegressor(alpha=0.1)
    ridge.fit(X_scaled, y)
    preds_ridge = ridge.predict(X_scaled)
    assert len(preds_ridge) == 6

    # 2. Decision Tree Regressor
    tree = DecisionTreeRegressor(max_depth=4)
    tree.fit(X_scaled, y)
    preds_tree = tree.predict(X_scaled)
    assert len(preds_tree) == 6

    # 3. Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=10, max_depth=4)
    rf.fit(X_scaled, y)
    preds_rf, stds_rf = rf.predict_with_uncertainty(X_scaled)
    assert len(preds_rf) == 6
    assert all(s >= 0.0 for s in stds_rf)

    # 4. GBDT Regressor
    gbdt = GradientBoostedRegressor(n_estimators=10, learning_rate=0.1)
    gbdt.fit(X_scaled, y)
    preds_gbdt = gbdt.predict(X_scaled)
    assert len(preds_gbdt) == 6


def test_track_partitioning_zero_leakage():
    records = [
        CanonicalMLFeatureRecord(
            iceberg_id="BERG_A",
            calendar_date="2020-01-01",
            timestamp=datetime(2020, 1, 1, tzinfo=timezone.utc),
            latitude=-60.0,
            longitude=-40.0,
            length_m=10000.0,
            width_m=5000.0,
            aspect_ratio=2.0,
            harmonic_length_m=3333.3,
            size_source="nic_direct",
            size_is_imputed=False,
            is_direct_fix=True,
            observed_velocity_u=0.1,
            observed_velocity_v=0.1,
            observed_speed_km_day=10.0,
            is_stationary=False,
            wagner_velocity_u=0.12,
            wagner_velocity_v=0.08,
            wagner_speed_km_day=12.0,
            wagner_bearing_deg=45.0,
            target_future_velocity_u=0.15,
            target_future_velocity_v=0.09,
            residual_target_u=0.03,
            residual_target_v=0.01,
        ),
        CanonicalMLFeatureRecord(
            iceberg_id="BERG_B",
            calendar_date="2020-01-01",
            timestamp=datetime(2020, 1, 1, tzinfo=timezone.utc),
            latitude=-65.0,
            longitude=-50.0,
            length_m=12000.0,
            width_m=6000.0,
            aspect_ratio=2.0,
            harmonic_length_m=4000.0,
            size_source="nic_direct",
            size_is_imputed=False,
            is_direct_fix=True,
            observed_velocity_u=0.1,
            observed_velocity_v=0.1,
            observed_speed_km_day=10.0,
            is_stationary=False,
            wagner_velocity_u=0.14,
            wagner_velocity_v=0.07,
            wagner_speed_km_day=13.0,
            wagner_bearing_deg=50.0,
            target_future_velocity_u=0.16,
            target_future_velocity_v=0.08,
            residual_target_u=0.02,
            residual_target_v=0.01,
        ),
        CanonicalMLFeatureRecord(
            iceberg_id="BERG_C",
            calendar_date="2020-01-01",
            timestamp=datetime(2020, 1, 1, tzinfo=timezone.utc),
            latitude=-70.0,
            longitude=-60.0,
            length_m=8000.0,
            width_m=4000.0,
            aspect_ratio=2.0,
            harmonic_length_m=2666.7,
            size_source="nic_direct",
            size_is_imputed=False,
            is_direct_fix=True,
            observed_velocity_u=0.05,
            observed_velocity_v=0.05,
            observed_speed_km_day=5.0,
            is_stationary=False,
            wagner_velocity_u=0.06,
            wagner_velocity_v=0.04,
            wagner_speed_km_day=6.0,
            wagner_bearing_deg=40.0,
            target_future_velocity_u=0.07,
            target_future_velocity_v=0.05,
            residual_target_u=0.01,
            residual_target_v=0.01,
        ),
    ]

    trainer = MLResidualModelTrainer(random_seed=42)
    train_set, val_set, test_set = trainer.partition_by_tracks(records, train_ratio=0.34, val_ratio=0.33)

    train_ids = set(r.iceberg_id for r in train_set)
    val_ids = set(r.iceberg_id for r in val_set)
    test_ids = set(r.iceberg_id for r in test_set)

    # Zero overlap across partitions
    assert len(train_ids.intersection(val_ids)) == 0
    assert len(train_ids.intersection(test_ids)) == 0
    assert len(val_ids.intersection(test_ids)) == 0


def test_hybrid_forecaster_propagation():
    forecaster = HybridForecaster()
    res = forecaster.forecast(
        iceberg_id="A68A",
        origin_lat=-56.2,
        origin_lon=-35.5,
        length_m=150000.0,
        width_m=48000.0,
        thickness_m=250.0,
        ocean_u=0.20,
        ocean_v=0.08,
        wind_u_10m=12.0,
        wind_v_10m=-6.0,
        forecast_horizon_hours=72,
    )

    assert res.iceberg_id == "A68A"
    assert len(res.waypoints) == 3
    assert res.waypoints[0].horizon_hours == 24
    assert res.waypoints[1].horizon_hours == 48
    assert res.waypoints[2].horizon_hours == 72
    assert res.waypoints[0].uncertainty_radius_km < res.waypoints[1].uncertainty_radius_km < res.waypoints[2].uncertainty_radius_km
    assert len(res.ai_explanation) > 50


def test_route_risk_engine():
    engine = RouteRiskEngine()
    routes = engine.evaluate_routes(
        start_lat=-54.8,
        start_lon=-68.3,
        dest_lat=-64.8,
        dest_lon=-64.0,
        active_icebergs=[{"iceberg_id": "A68A", "latitude": -56.2, "longitude": -35.5}],
    )

    assert len(routes) == 3
    assert any(r.is_recommended for r in routes)
    for r in routes:
        assert 0.0 <= r.overall_risk_score <= 100.0
        assert r.risk_level in ["LOW", "MODERATE", "ELEVATED", "CRITICAL"]
        assert len(r.waypoints) > 5


def test_api_predict_and_routes_handlers():
    # 1. Test POST /api/v1/icebergs/predict handler
    req = PredictIcebergDriftRequest(
        iceberg_id="A68A",
        current_latitude=-56.2,
        current_longitude=-35.5,
        forecast_hours=72,
    )
    res = predict_iceberg_drift(req)
    assert res.iceberg_id == "A68A"
    assert len(res.waypoints) == 3
    assert hasattr(res, "ai_explanation")

    # 2. Test POST /api/v1/routes/predict handler
    route_req = RoutePredictRequest(
        start_latitude=-54.8,
        start_longitude=-68.3,
        destination_latitude=-64.8,
        destination_longitude=-64.0,
        vessel_speed_knots=12.0,
    )
    routes = evaluate_maritime_routes(route_req)
    assert len(routes) == 3
    assert any(r.is_recommended for r in routes)
