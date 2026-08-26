"""Geodesy and spherical kinematics engine for Antarctic maritime navigation
and iceberg trajectory tracking.
"""

import math
from typing import List, Tuple

# Earth parameters (WGS84 spherical mean)
EARTH_RADIUS_KM = 6371.0088
KM_PER_NMI = 1.852
NMI_PER_KM = 1.0 / KM_PER_NMI


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great-Circle distance between two coordinates in kilometers using the Haversine formula.
    
    Args:
        lat1, lon1: Decimal degrees of point 1.
        lat2, lon2: Decimal degrees of point 2.
        
    Returns:
        Distance in kilometers.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return EARTH_RADIUS_KM * c


def haversine_distance_nmi(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great-Circle distance in Nautical Miles."""
    return haversine_distance_km(lat1, lon1, lat2, lon2) * NMI_PER_KM


def initial_bearing_degrees(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the initial forward azimuth bearing from point 1 to point 2 in degrees [0, 360).
    
    Args:
        lat1, lon1: Starting coordinates in decimal degrees.
        lat2, lon2: Target coordinates in decimal degrees.
        
    Returns:
        Forward azimuth in degrees normalized to [0, 360).
    """
    if abs(lat1 - lat2) < 1e-7 and abs(lon1 - lon2) < 1e-7:
        return 0.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    bearing_rad = math.atan2(y, x)
    bearing_deg = (math.degrees(bearing_rad) + 360.0) % 360.0
    return round(bearing_deg, 2)


def destination_point(lat1: float, lon1: float, bearing_deg: float, distance_km: float) -> Tuple[float, float]:
    """Compute the destination coordinates given a start point, initial bearing, and distance in km.
    
    Args:
        lat1, lon1: Starting coordinates in decimal degrees.
        bearing_deg: Forward bearing in degrees [0, 360).
        distance_km: Distance to travel in kilometers.
        
    Returns:
        Tuple of (latitude, longitude) in decimal degrees.
    """
    delta = distance_km / EARTH_RADIUS_KM
    theta = math.radians(bearing_deg)
    phi1 = math.radians(lat1)
    lambda1 = math.radians(lon1)

    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta) + math.cos(phi1) * math.sin(delta) * math.cos(theta)
    )
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2),
    )

    # Normalize longitude to [-180, 180]
    lon2_deg = (math.degrees(lambda2) + 540.0) % 360.0 - 180.0
    return round(math.degrees(phi2), 6), round(lon2_deg, 6)


def interpolate_great_circle_arc(
    lat1: float, lon1: float, lat2: float, lon2: float, num_points: int = 10
) -> List[Tuple[float, float]]:
    """Interpolate intermediate coordinate points along the geodesic Great-Circle arc.
    
    Args:
        lat1, lon1: Start point.
        lat2, lon2: End point.
        num_points: Total number of points to generate (including start and end).
        
    Returns:
        List of (latitude, longitude) tuples along the arc.
    """
    if num_points <= 2:
        return [(lat1, lon1), (lat2, lon2)]

    total_dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)
    if total_dist_km < 1e-4:
        return [(lat1, lon1) for _ in range(num_points)]

    bearing = initial_bearing_degrees(lat1, lon1, lat2, lon2)
    points = []
    step_km = total_dist_km / (num_points - 1)

    for i in range(num_points):
        d_km = i * step_km
        if i == 0:
            points.append((lat1, lon1))
        elif i == num_points - 1:
            points.append((lat2, lon2))
        else:
            pt = destination_point(lat1, lon1, bearing, d_km)
            points.append(pt)

    return points
