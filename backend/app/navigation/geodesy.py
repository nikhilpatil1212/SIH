import math
from typing import List, Tuple, Dict, Any

EARTH_RADIUS_KM = 6371.0088
EARTH_RADIUS_NM = 3440.065

def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great-Circle distance between two coordinates in Nautical Miles."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_NM * c, 1)

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the Great-Circle distance between two coordinates in Kilometers."""
    return round(haversine_distance_nm(lat1, lon1, lat2, lon2) * 1.852, 1)

def initial_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate initial compass bearing from start to destination in degrees (0-360)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
    bearing = math.degrees(math.atan2(y, x))
    return round((bearing + 360.0) % 360.0, 1)

def interpolate_great_circle(
    lat1: float, lon1: float, lat2: float, lon2: float, num_points: int = 20
) -> List[Dict[str, float]]:
    """Interpolate intermediate coordinates along the Great Circle arc."""
    if num_points <= 2:
        return [{"lat": lat1, "lon": lon1}, {"lat": lat2, "lon": lon2}]

    p1_lat, p1_lon = math.radians(lat1), math.radians(lon1)
    p2_lat, p2_lon = math.radians(lat2), math.radians(lon2)

    # Angular distance
    d = 2 * math.asin(math.sqrt(
        math.sin((p2_lat - p1_lat) / 2) ** 2 +
        math.cos(p1_lat) * math.cos(p2_lat) * math.sin((p2_lon - p1_lon) / 2) ** 2
    ))

    if d == 0:
        return [{"lat": lat1, "lon": lon1} for _ in range(num_points)]

    points = []
    for i in range(num_points):
        f = i / (num_points - 1)
        A = math.sin((1 - f) * d) / math.sin(d)
        B = math.sin(f * d) / math.sin(d)

        x = A * math.cos(p1_lat) * math.cos(p1_lon) + B * math.cos(p2_lat) * math.cos(p2_lon)
        y = A * math.cos(p1_lat) * math.sin(p1_lon) + B * math.cos(p2_lat) * math.sin(p2_lon)
        z = A * math.sin(p1_lat) + B * math.sin(p2_lat)

        lat = math.atan2(z, math.sqrt(x**2 + y**2))
        lon = math.atan2(y, x)

        points.append({
            "lat": round(math.degrees(lat), 4),
            "lon": round(math.degrees(lon), 4)
        })

    return points

def compute_route_bounding_box(coords: List[Dict[str, float]]) -> Dict[str, float]:
    """Calculate geographic bounding box with padding for fitting map viewports."""
    if not coords:
        return {"min_lat": -90, "max_lat": 90, "min_lon": -180, "max_lon": 180}
    
    lats = [c["lat"] for c in coords]
    lons = [c["lon"] for c in coords]
    
    return {
        "min_lat": round(min(lats) - 1.5, 4),
        "max_lat": round(max(lats) + 1.5, 4),
        "min_lon": round(min(lons) - 2.5, 4),
        "max_lon": round(max(lons) + 2.5, 4),
    }

def calculate_eta_hours(distance_nm: float, speed_kn: float) -> float:
    """Calculate estimated hours based on distance and vessel speed."""
    if speed_kn <= 0:
        return 0.0
    return round(distance_nm / speed_kn, 1)

def format_eta(hours: float) -> str:
    """Format duration hours into human readable 'Xd Yh' format."""
    total_hours = int(round(hours))
    days = total_hours // 24
    rem_h = total_hours % 24
    if days == 0:
        return f"{rem_h}h"
    return f"{days}d {rem_h:02d}h"

def calculate_fuel_tonnes(distance_nm: float, speed_kn: float, fuel_per_day_tonnes: float = 16.5) -> float:
    """Calculate bunker fuel consumption based on distance and speed (quadratic cube law scaling)."""
    hours = calculate_eta_hours(distance_nm, speed_kn)
    days = hours / 24.0
    # Standard Admiralty cube law approximation for marine diesel consumption relative to design speed (14kn)
    speed_factor = (speed_kn / 14.0) ** 2.2
    return round(days * fuel_per_day_tonnes * speed_factor, 1)
