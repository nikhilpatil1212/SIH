"""Trajectory feature engineering service for Antarctic iceberg tracks.

Calculates Great-Circle displacement, velocities, azimuth bearings,
stationary periods, and heuristic quality anomaly flags.
"""

from typing import List, Tuple
from ..schemas.iceberg import CanonicalIcebergObservation, TrajectoryFeaturePoint, IcebergTrackSummary
from ..physics.geodesy import haversine_distance_km, initial_bearing_degrees, KM_PER_NMI

# Configurable engineering heuristic thresholds (explicitly non-canonical):
STATIONARY_DISPLACEMENT_THRESHOLD_KM = 1.0   # Daily displacement < 1.0 km marked as stationary
SUSPICIOUS_SPEED_HEURISTIC_KM_DAY = 60.0    # Speed > 60 km/day (~1.5 m/s) flagged as anomaly outlier


def compute_trajectory_features(
    observations: List[CanonicalIcebergObservation],
) -> List[TrajectoryFeaturePoint]:
    """Compute sequential kinematic trajectory features along an iceberg's canonical path.
    
    Args:
        observations: Sorted list of canonical observations for a single iceberg.
        
    Returns:
        List of TrajectoryFeaturePoint objects with derived physical and kinematic attributes.
    """
    if not observations:
        return []

    # Sort strictly by calendar date
    sorted_obs = sorted(observations, key=lambda o: o.calendar_date)
    feature_points: List[TrajectoryFeaturePoint] = []
    
    cumulative_stationary_days = 0.0

    for i, curr in enumerate(sorted_obs):
        if i == 0:
            # First observation: baseline point
            pt = TrajectoryFeaturePoint(
                **curr.model_dump(),
                step_index=0,
                delta_time_days=0.0,
                delta_distance_km=0.0,
                speed_km_day=0.0,
                speed_knots=0.0,
                speed_m_s=0.0,
                bearing_deg=None,
                is_stationary=False,
                stationary_duration_days=0.0,
                suspicious_speed=False,
            )
            feature_points.append(pt)
            continue

        prev = sorted_obs[i - 1]
        dt_days = max(1.0, (curr.calendar_date - prev.calendar_date).days)
        dist_km = haversine_distance_km(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
        
        speed_km_day = dist_km / dt_days
        speed_knots = (dist_km / (dt_days * 24.0)) / KM_PER_NMI
        speed_m_s = (dist_km * 1000.0) / (dt_days * 86400.0)
        
        bearing = initial_bearing_degrees(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
        
        # Operational stationary classification
        is_stat = dist_km < (STATIONARY_DISPLACEMENT_THRESHOLD_KM * dt_days)
        if is_stat:
            cumulative_stationary_days += dt_days
        else:
            cumulative_stationary_days = 0.0

        # Heuristic anomaly flag for sensor geolocation outliers
        suspicious = speed_km_day > SUSPICIOUS_SPEED_HEURISTIC_KM_DAY

        pt = TrajectoryFeaturePoint(
            **curr.model_dump(),
            step_index=i,
            delta_time_days=round(float(dt_days), 1),
            delta_distance_km=round(dist_km, 3),
            speed_km_day=round(speed_km_day, 3),
            speed_knots=round(speed_knots, 3),
            speed_m_s=round(speed_m_s, 4),
            bearing_deg=bearing,
            is_stationary=is_stat,
            stationary_duration_days=round(cumulative_stationary_days, 1),
            suspicious_speed=suspicious,
        )
        feature_points.append(pt)

    return feature_points


def update_summary_with_features(
    summary: IcebergTrackSummary,
    feature_points: List[TrajectoryFeaturePoint],
) -> IcebergTrackSummary:
    """Update track summary with derived kinematic trajectory statistics."""
    if not feature_points:
        return summary

    total_dist = sum(pt.delta_distance_km for pt in feature_points)
    speeds = [pt.speed_km_day for pt in feature_points[1:]] if len(feature_points) > 1 else [0.0]
    stationary_count = sum(1 for pt in feature_points if pt.is_stationary)
    
    summary.total_trajectory_distance_km = round(total_dist, 2)
    summary.max_observed_speed_km_day = round(max(speeds), 2) if speeds else 0.0
    summary.mean_observed_speed_km_day = round(sum(speeds) / len(speeds), 2) if speeds else 0.0
    summary.stationary_percentage = round((stationary_count / len(feature_points)) * 100.0, 1)

    return summary
