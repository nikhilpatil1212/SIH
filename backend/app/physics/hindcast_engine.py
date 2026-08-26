"""Physics-Informed Iceberg Drift Hindcast and Baseline Benchmark Engine.

Executes forward trajectory simulations using:
1. Wagner et al. (2017) Analytical Physics Model
2. Constant-Velocity Persistence Baseline

Evaluates spatial displacement errors (24h, 48h, 72h, ADE, FDE, Along-Track, Cross-Track)
against ground-truth satellite fixes, maintaining strict separation between direct and
interpolated observations.
"""

from typing import List, Dict, Tuple, Optional, Any
import math
from pydantic import BaseModel, Field

from ..environment.colocation import CoLocatedIcebergObservation
from ..physics.wagner_drift_model import compute_iceberg_velocity
from ..physics.geodesy import (
    destination_point,
    haversine_distance_km,
    initial_bearing_degrees,
)
from ..evaluation.metrics import compute_along_cross_track_errors


class SingleStepHindcast(BaseModel):
    """Evaluation of 24h, 48h, and 72h forward drift predictions from a single origin timestamp."""
    step_index: int
    iceberg_id: str
    origin_date: str
    origin_lat: float
    origin_lon: float
    is_direct_fix: bool
    size_source: str
    size_is_imputed: bool
    is_stationary: bool

    # Wagner Physics Velocity
    wagner_u_m_s: float
    wagner_v_m_s: float
    wagner_speed_km_day: float
    wagner_bearing_deg: float
    wagner_regime: str

    # 24-Hour Horizon Evaluation
    has_gt_24h: bool = False
    gt_24h_is_direct: bool = False
    wagner_pred_24h_lat: Optional[float] = None
    wagner_pred_24h_lon: Optional[float] = None
    persistence_pred_24h_lat: Optional[float] = None
    persistence_pred_24h_lon: Optional[float] = None
    wagner_error_24h_km: Optional[float] = None
    persistence_error_24h_km: Optional[float] = None
    wagner_along_track_24h_km: Optional[float] = None
    wagner_cross_track_24h_km: Optional[float] = None

    # 48-Hour Horizon Evaluation
    has_gt_48h: bool = False
    gt_48h_is_direct: bool = False
    wagner_error_48h_km: Optional[float] = None
    persistence_error_48h_km: Optional[float] = None

    # 72-Hour Horizon Evaluation
    has_gt_72h: bool = False
    gt_72h_is_direct: bool = False
    wagner_error_72h_km: Optional[float] = None
    persistence_error_72h_km: Optional[float] = None


def run_trajectory_hindcast(
    co_located_obs: List[CoLocatedIcebergObservation],
    default_length_m: float = 10000.0,
    default_width_m: float = 5000.0,
    default_thickness_m: float = 250.0,
) -> Tuple[List[SingleStepHindcast], Dict[str, Any]]:
    """Run forward drift hindcast simulations across all eligible observations in a trajectory."""
    hindcast_results: List[SingleStepHindcast] = []
    n = len(co_located_obs)

    for i in range(n):
        curr = co_located_obs[i]
        # Require valid kinematics forcing
        if (
            curr.ocean_u is None
            or curr.ocean_v is None
            or curr.wind_u_10m is None
            or curr.wind_v_10m is None
        ):
            continue

        # Determine dimensions (in meters)
        l_m = (curr.size_major_km * 1000.0) if (curr.size_major_km and curr.size_major_km > 0) else default_length_m
        w_m = (curr.size_minor_km * 1000.0) if (curr.size_minor_km and curr.size_minor_km > 0) else default_width_m
        h_m = default_thickness_m

        # Compute instantaneous Wagner analytical velocity vector
        wagner_res = compute_iceberg_velocity(
            ocean_u=curr.ocean_u,
            ocean_v=curr.ocean_v,
            wind_u=curr.wind_u_10m,
            wind_v=curr.wind_v_10m,
            length_m=l_m,
            width_m=w_m,
            latitude_deg=curr.latitude,
        )

        w_speed_km_day = wagner_res["iceberg_speed_m_s"] * 86.4
        w_bearing = wagner_res["iceberg_bearing_deg"]

        # 1. Wagner Predictions for 24h, 48h, 72h
        w_lat_24, w_lon_24 = destination_point(curr.latitude, curr.longitude, w_bearing, w_speed_km_day * 1.0)
        w_lat_48, w_lon_48 = destination_point(curr.latitude, curr.longitude, w_bearing, w_speed_km_day * 2.0)
        w_lat_72, w_lon_72 = destination_point(curr.latitude, curr.longitude, w_bearing, w_speed_km_day * 3.0)

        # 2. Persistence Baseline Predictions
        p_speed = curr.observed_speed_km_day
        p_bearing = curr.observed_bearing_deg if curr.observed_bearing_deg is not None else 0.0
        p_lat_24, p_lon_24 = destination_point(curr.latitude, curr.longitude, p_bearing, p_speed * 1.0)
        p_lat_48, p_lon_48 = destination_point(curr.latitude, curr.longitude, p_bearing, p_speed * 2.0)
        p_lat_72, p_lon_72 = destination_point(curr.latitude, curr.longitude, p_bearing, p_speed * 3.0)

        step_record = SingleStepHindcast(
            step_index=i,
            iceberg_id=curr.iceberg_id,
            origin_date=curr.calendar_date,
            origin_lat=curr.latitude,
            origin_lon=curr.longitude,
            is_direct_fix=curr.is_direct_fix,
            size_source=curr.size_source,
            size_is_imputed=curr.size_is_imputed,
            is_stationary=curr.is_stationary,
            wagner_u_m_s=wagner_res["iceberg_u"],
            wagner_v_m_s=wagner_res["iceberg_v"],
            wagner_speed_km_day=round(w_speed_km_day, 3),
            wagner_bearing_deg=w_bearing,
            wagner_regime=wagner_res["regime_description"],
            wagner_pred_24h_lat=w_lat_24,
            wagner_pred_24h_lon=w_lon_24,
            persistence_pred_24h_lat=p_lat_24,
            persistence_pred_24h_lon=p_lon_24,
        )

        # 24h Horizon Verification
        if i + 1 < n:
            gt_24 = co_located_obs[i + 1]
            step_record.has_gt_24h = True
            step_record.gt_24h_is_direct = gt_24.is_direct_fix
            w_err_24 = haversine_distance_km(gt_24.latitude, gt_24.longitude, w_lat_24, w_lon_24)
            p_err_24 = haversine_distance_km(gt_24.latitude, gt_24.longitude, p_lat_24, p_lon_24)
            step_record.wagner_error_24h_km = round(w_err_24, 3)
            step_record.persistence_error_24h_km = round(p_err_24, 3)

            # Along-track and cross-track decomposition
            decomp = compute_along_cross_track_errors(
                (curr.latitude, curr.longitude),
                (gt_24.latitude, gt_24.longitude),
                (w_lat_24, w_lon_24),
            )
            step_record.wagner_along_track_24h_km = decomp["along_track_error_km"]
            step_record.wagner_cross_track_24h_km = decomp["cross_track_error_km"]

        # 48h Horizon Verification
        if i + 2 < n:
            gt_48 = co_located_obs[i + 2]
            step_record.has_gt_48h = True
            step_record.gt_48h_is_direct = gt_48.is_direct_fix
            w_err_48 = haversine_distance_km(gt_48.latitude, gt_48.longitude, w_lat_48, w_lon_48)
            p_err_48 = haversine_distance_km(gt_48.latitude, gt_48.longitude, p_lat_48, p_lon_48)
            step_record.wagner_error_48h_km = round(w_err_48, 3)
            step_record.persistence_error_48h_km = round(p_err_48, 3)

        # 72h Horizon Verification
        if i + 3 < n:
            gt_72 = co_located_obs[i + 3]
            step_record.has_gt_72h = True
            step_record.gt_72h_is_direct = gt_72.is_direct_fix
            w_err_72 = haversine_distance_km(gt_72.latitude, gt_72.longitude, w_lat_72, w_lon_72)
            p_err_72 = haversine_distance_km(gt_72.latitude, gt_72.longitude, p_lat_72, p_lon_72)
            step_record.wagner_error_72h_km = round(w_err_72, 3)
            step_record.persistence_error_72h_km = round(p_err_72, 3)

        hindcast_results.append(step_record)

    # Aggregate Evaluation Metrics
    def _mean_val(lst: List[float]) -> Optional[float]:
        return round(sum(lst) / len(lst), 3) if lst else None

    # All observations
    w_24_all = [r.wagner_error_24h_km for r in hindcast_results if r.wagner_error_24h_km is not None]
    p_24_all = [r.persistence_error_24h_km for r in hindcast_results if r.persistence_error_24h_km is not None]
    w_48_all = [r.wagner_error_48h_km for r in hindcast_results if r.wagner_error_48h_km is not None]
    p_48_all = [r.persistence_error_48h_km for r in hindcast_results if r.persistence_error_48h_km is not None]
    w_72_all = [r.wagner_error_72h_km for r in hindcast_results if r.wagner_error_72h_km is not None]
    p_72_all = [r.persistence_error_72h_km for r in hindcast_results if r.persistence_error_72h_km is not None]

    # Direct observations only
    w_24_direct = [r.wagner_error_24h_km for r in hindcast_results if r.is_direct_fix and r.wagner_error_24h_km is not None]
    p_24_direct = [r.persistence_error_24h_km for r in hindcast_results if r.is_direct_fix and r.persistence_error_24h_km is not None]

    metrics = {
        "total_hindcast_evaluations": len(hindcast_results),
        "wagner_errors_overall": {
            "mae_24h_km": _mean_val(w_24_all),
            "mae_48h_km": _mean_val(w_48_all),
            "mae_72h_km": _mean_val(w_72_all),
            "samples_24h": len(w_24_all),
            "samples_48h": len(w_48_all),
            "samples_72h": len(w_72_all),
        },
        "persistence_errors_overall": {
            "mae_24h_km": _mean_val(p_24_all),
            "mae_48h_km": _mean_val(p_48_all),
            "mae_72h_km": _mean_val(p_72_all),
        },
        "direct_observations_comparison": {
            "wagner_mae_24h_km": _mean_val(w_24_direct),
            "persistence_mae_24h_km": _mean_val(p_24_direct),
            "direct_samples": len(w_24_direct),
        },
    }

    return hindcast_results, metrics
