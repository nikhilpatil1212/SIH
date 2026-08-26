from typing import List, Dict, Any
from ..navigation.geodesy import haversine_distance_nm

def compute_voyage_risk_score(
    route_coords: List[Dict[str, float]],
    icebergs: List[Dict[str, Any]],
    sea_ice_concentration: float,
    wind_speed_kn: float,
    visibility_km: float
) -> Dict[str, Any]:
    """
    Calculate dynamic Voyage Risk Index (0-100) from real spatial conditions.
    """
    # 1. Iceberg proximity penalty
    min_iceberg_dist_nm = 999.0
    for pt in route_coords:
        for ibg in icebergs:
            dist = haversine_distance_nm(pt["lat"], pt["lon"], ibg["position"]["lat"], ibg["position"]["lon"])
            if dist < min_iceberg_dist_nm:
                min_iceberg_dist_nm = dist

    iceberg_risk = 50.0 if min_iceberg_dist_nm < 10.0 else (30.0 if min_iceberg_dist_nm < 25.0 else 10.0)

    # 2. Sea-ice pack penalty
    sea_ice_risk = (sea_ice_concentration / 100.0) * 35.0

    # 3. Metocean weather penalty
    weather_risk = 0.0
    if wind_speed_kn > 40.0:
        weather_risk += 15.0
    elif wind_speed_kn > 25.0:
        weather_risk += 8.0

    if visibility_km < 1.0:
        weather_risk += 12.0
    elif visibility_km < 5.0:
        weather_risk += 5.0

    # Composite score
    total_score = min(98, max(5, int(iceberg_risk + sea_ice_risk + weather_risk)))
    level = "high" if total_score >= 60 else ("medium" if total_score >= 38 else "low")

    return {
        "score": total_score,
        "level": level,
        "min_iceberg_distance_nm": round(min_iceberg_dist_nm, 1),
        "factors": [
            {"label": "Iceberg proximity", "level": "high" if iceberg_risk > 35 else ("medium" if iceberg_risk > 15 else "ok")},
            {"label": "Sea-ice concentration", "level": "high" if sea_ice_concentration > 60 else ("medium" if sea_ice_concentration > 30 else "ok")},
            {"label": "Wind & wave exposure", "level": "high" if wind_speed_kn > 40 else ("medium" if wind_speed_kn > 25 else "ok")},
            {"label": "Visibility & whiteout", "level": "high" if visibility_km < 2.0 else "ok"},
        ]
    }
