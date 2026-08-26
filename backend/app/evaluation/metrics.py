"""Trajectory evaluation metrics for Antarctic iceberg drift prediction.

Implements standard spatial displacement metrics (ADE, FDE, Along-Track / Cross-Track,
Discrete Fréchet Distance, and RMSE).
"""

import math
from typing import List, Tuple, Dict, Any
from ..physics.geodesy import haversine_distance_km, initial_bearing_degrees


def compute_displacement_errors(
    observed_coords: List[Tuple[float, float]],
    predicted_coords: List[Tuple[float, float]],
) -> Dict[str, float]:
    """Compute spatial displacement error metrics between observed and predicted trajectories.
    
    Args:
        observed_coords: List of (lat, lon) observed points.
        predicted_coords: List of (lat, lon) predicted points.
        
    Returns:
        Dictionary containing ADE (Average Displacement Error), FDE (Final Displacement Error),
        RMSE, and Max Error in kilometers.
    """
    n = min(len(observed_coords), len(predicted_coords))
    if n == 0:
        return {"ade_km": 0.0, "fde_km": 0.0, "rmse_km": 0.0, "max_error_km": 0.0}

    errors_km = []
    for i in range(n):
        lat_obs, lon_obs = observed_coords[i]
        lat_pred, lon_pred = predicted_coords[i]
        err = haversine_distance_km(lat_obs, lon_obs, lat_pred, lon_pred)
        errors_km.append(err)

    ade = sum(errors_km) / n
    fde = errors_km[-1]
    rmse = math.sqrt(sum(e ** 2 for e in errors_km) / n)
    max_err = max(errors_km)

    return {
        "ade_km": round(ade, 3),
        "fde_km": round(fde, 3),
        "rmse_km": round(rmse, 3),
        "max_error_km": round(max_err, 3),
    }


def compute_along_cross_track_errors(
    obs_start: Tuple[float, float],
    obs_target: Tuple[float, float],
    predicted_target: Tuple[float, float],
) -> Dict[str, float]:
    """Decompose prediction error into Along-Track (along observed motion axis) and
    Cross-Track (perpendicular to observed motion axis) errors in kilometers.
    """
    # Total error from observed target to predicted target
    total_err_km = haversine_distance_km(obs_target[0], obs_target[1], predicted_target[0], predicted_target[1])
    
    # Observed trajectory bearing
    obs_bearing = initial_bearing_degrees(obs_start[0], obs_start[1], obs_target[0], obs_target[1])
    
    # Error vector bearing
    err_bearing = initial_bearing_degrees(obs_target[0], obs_target[1], predicted_target[0], predicted_target[1])
    
    # Angle between motion track and error vector
    rel_angle_rad = math.radians(err_bearing - obs_bearing)
    
    along_track_km = total_err_km * math.cos(rel_angle_rad)
    cross_track_km = total_err_km * math.sin(rel_angle_rad)

    return {
        "total_error_km": round(total_err_km, 3),
        "along_track_error_km": round(along_track_km, 3),
        "cross_track_error_km": round(cross_track_km, 3),
    }


def discrete_frechet_distance_km(
    p: List[Tuple[float, float]],
    q: List[Tuple[float, float]],
) -> float:
    """Compute Discrete Fréchet Distance between two trajectories in kilometers."""
    n_p = len(p)
    n_q = len(q)
    if n_p == 0 or n_q == 0:
        return 0.0

    ca = [[-1.0 for _ in range(n_q)] for _ in range(n_p)]

    def c(i: int, j: int) -> float:
        if ca[i][j] > -1.0:
            return ca[i][j]
        d = haversine_distance_km(p[i][0], p[i][1], q[j][0], q[j][1])
        if i == 0 and j == 0:
            ca[i][j] = d
        elif i > 0 and j == 0:
            ca[i][j] = max(c(i - 1, 0), d)
        elif i == 0 and j > 0:
            ca[i][j] = max(c(0, j - 1), d)
        elif i > 0 and j > 0:
            ca[i][j] = max(min(c(i - 1, j), c(i - 1, j - 1), c(i, j - 1)), d)
        else:
            ca[i][j] = float("inf")
        return ca[i][j]

    return round(c(n_p - 1, n_q - 1), 3)
