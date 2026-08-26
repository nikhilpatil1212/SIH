"""Abstract baseline interfaces for iceberg drift prediction evaluation.

Enables standardized benchmarking of:
1. Dead-Reckoning / Persistence Baseline
2. Wagner et al. (2017) Analytical Physics Baseline
3. Future Hybrid Physics-ML Models (No training now)
"""

from typing import List, Tuple, Dict, Any, Optional
from ..physics.geodesy import destination_point, initial_bearing_degrees, haversine_distance_km
from ..physics.wagner_drift_model import compute_iceberg_velocity
from .metrics import compute_displacement_errors


class PersistenceBaseline:
    """Zero-acceleration constant-velocity persistence baseline."""
    
    @staticmethod
    def predict_horizon(
        last_lat: float,
        last_lon: float,
        speed_km_day: float,
        bearing_deg: float,
        horizon_days: int = 3,
    ) -> List[Tuple[float, float]]:
        """Project future positions assuming constant velocity and bearing."""
        trajectory = []
        curr_lat, curr_lon = last_lat, last_lon
        for d in range(1, horizon_days + 1):
            next_pt = destination_point(curr_lat, curr_lon, bearing_deg, speed_km_day)
            trajectory.append(next_pt)
            curr_lat, curr_lon = next_pt
        return trajectory


class WagnerPhysicsBaseline:
    """Physics-informed analytical baseline using Wagner et al. (2017)."""
    
    @staticmethod
    def step_drift(
        start_lat: float,
        start_lon: float,
        ocean_u: float,
        ocean_v: float,
        wind_u: float,
        wind_v: float,
        length_m: float,
        width_m: float,
        delta_time_days: float = 1.0,
    ) -> Tuple[float, float, Dict[str, Any]]:
        """Calculate next position using Wagner analytical drift equations."""
        result = compute_iceberg_velocity(
            ocean_u=ocean_u,
            ocean_v=ocean_v,
            wind_u=wind_u,
            wind_v=wind_v,
            length_m=length_m,
            width_m=width_m,
            latitude_deg=start_lat,
        )
        
        # Total displacement in km over delta_time
        speed_km_day = result["iceberg_speed_m_s"] * 86.4
        dist_km = speed_km_day * delta_time_days
        bearing_deg = result["iceberg_bearing_deg"]
        
        next_lat, next_lon = destination_point(start_lat, start_lon, bearing_deg, dist_km)
        return next_lat, next_lon, result
