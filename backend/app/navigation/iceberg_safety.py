"""Iceberg Predictive Safety Buffer & Collision Avoidance Engine.

Calculates time-aware geographic distances between vessel routes and active
iceberg forecast trajectories (0h, 24h, 48h, 72h horizons), enforcing
configurable safety standoff margins (e.g. 10km, 20km, 30km, 50km).
"""

import math
from typing import List, Dict, Any, Tuple, Optional
from .geodesy import haversine_distance_km

DEFAULT_ICEBERG_SAFETY_BUFFER_KM = 20.0


def extract_iceberg_forecast_points(iceberg: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract forecast positions across 0h, 24h, 48h, 72h for an iceberg."""
    pts = []
    
    # 0h / Current position
    pos = iceberg.get("position", {})
    now_lat = pos.get("lat") or iceberg.get("latitude")
    now_lon = pos.get("lon") or iceberg.get("longitude")
    
    if now_lat is not None and now_lon is not None:
        pts.append({"lat": float(now_lat), "lon": float(now_lon), "horizon_hours": 0.0})
        
    # Trajectory path if available
    path = iceberg.get("predictedPath") or iceberg.get("predicted_trajectory") or []
    for idx, p in enumerate(path):
        if isinstance(p, dict):
            p_lat = p.get("lat") or p.get("latitude")
            p_lon = p.get("lon") or p.get("longitude")
            if p_lat is not None and p_lon is not None:
                # Estimate horizon hours: 0h, 18h, 36h, 54h, 72h
                h_hours = (idx + 1) * (72.0 / max(1, len(path)))
                pts.append({"lat": float(p_lat), "lon": float(p_lon), "horizon_hours": round(h_hours, 1)})
                
    if len(pts) == 1 and now_lat is not None and now_lon is not None:
        # Generate baseline drift forecast if only current position exists
        speed_ms = float(iceberg.get("speedMs") or iceberg.get("drift_speed_kmh", 1.5) / 3.6 or 0.3)
        heading_rad = math.radians(float(iceberg.get("headingDeg") or iceberg.get("drift_heading_deg", 300.0)))
        dist_24h_km = speed_ms * 86.4
        dlat = (dist_24h_km * math.cos(heading_rad)) / 111.32
        dlon = (dist_24h_km * math.sin(heading_rad)) / (111.32 * max(0.1, math.cos(math.radians(now_lat))))
        
        pts.append({"lat": now_lat + dlat, "lon": now_lon + dlon, "horizon_hours": 24.0})
        pts.append({"lat": now_lat + dlat * 2, "lon": now_lon + dlon * 2, "horizon_hours": 48.0})
        pts.append({"lat": now_lat + dlat * 3, "lon": now_lon + dlon * 3, "horizon_hours": 72.0})

    return pts


def get_all_iceberg_forecast_tuples(icebergs: List[Dict[str, Any]]) -> List[Tuple[str, float, float, float]]:
    """Extract flattened list of (iceberg_id, lat, lon, horizon_hours) for fast vectorized spatial queries."""
    tuples_list = []
    for berg in icebergs:
        b_id = berg.get("id") or berg.get("iceberg_id") or "IBG"
        pts = extract_iceberg_forecast_points(berg)
        for p in pts:
            tuples_list.append((b_id, p["lat"], p["lon"], p.get("horizon_hours", 0.0)))
    return tuples_list


def check_segment_iceberg_clearance(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
    iceberg_pts: List[Tuple[str, float, float, float]],
    num_samples: Optional[int] = None,
) -> Tuple[float, str]:
    """Calculate the minimum distance between a route segment and all iceberg forecast positions."""
    if not iceberg_pts:
        return 999999.0, "NONE"
        
    dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)
    if num_samples is None:
        num_samples = max(6, int(dist_km / 25.0))
        
    min_dist = 999999.0
    nearest_id = "NONE"
    
    for i in range(num_samples + 1):
        fraction = i / float(num_samples)
        sample_lat = lat1 + fraction * (lat2 - lat1)
        sample_lon = lon1 + fraction * (lon2 - lon1)
        for b_id, b_lat, b_lon, h in iceberg_pts:
            d = haversine_distance_km(sample_lat, sample_lon, b_lat, b_lon)
            if d < min_dist:
                min_dist = d
                nearest_id = b_id
                
    return min_dist, nearest_id


def evaluate_route_iceberg_clearance(
    route_coordinates: List[Dict[str, float]],
    icebergs: List[Dict[str, Any]],
    vessel_speed_kn: float = 14.0,
    safety_buffer_km: float = DEFAULT_ICEBERG_SAFETY_BUFFER_KM,
) -> Dict[str, Any]:
    """Evaluate a vessel route against all tracked iceberg forecast cones.
    
    Returns:
        min_clearance_km: minimum distance observed between ship and any iceberg
        nearest_iceberg_id: ID of the closest iceberg
        violates_buffer: True if min_clearance_km < safety_buffer_km
        violations: list of detailed violation records
    """
    if not route_coordinates or not icebergs:
        return {
            "min_clearance_km": 999.0,
            "nearest_iceberg_id": "NONE",
            "violates_buffer": False,
            "violations": [],
            "safety_buffer_km": safety_buffer_km,
        }

    min_dist_overall = 999999.0
    nearest_berg_id = "NONE"
    violations = []
    
    # Calculate cumulative distance and estimated ship arrival time at each waypoint
    cumulative_dist_km = 0.0
    waypoint_times = []
    
    for i, pt in enumerate(route_coordinates):
        if i > 0:
            prev = route_coordinates[i - 1]
            leg_km = haversine_distance_km(prev["lat"], prev["lon"], pt["lat"], pt["lon"])
            cumulative_dist_km += leg_km
        
        # Ship speed kn -> km/h: 1 kn = 1.852 km/h
        speed_kmh = max(1.0, vessel_speed_kn * 1.852)
        arrival_hour = cumulative_dist_km / speed_kmh
        waypoint_times.append((pt["lat"], pt["lon"], arrival_hour))

    # Evaluate across every segment with dense sampling
    for i in range(len(route_coordinates) - 1):
        p1 = route_coordinates[i]
        p2 = route_coordinates[i + 1]
        dist_km = haversine_distance_km(p1["lat"], p1["lon"], p2["lat"], p2["lon"])
        num_samples = max(8, int(dist_km / 20.0))
        
        for s in range(num_samples + 1):
            frac = s / float(num_samples)
            s_lat = p1["lat"] + frac * (p2["lat"] - p1["lat"])
            s_lon = p1["lon"] + frac * (p2["lon"] - p1["lon"])
            
            for berg in icebergs:
                berg_id = berg.get("id") or berg.get("iceberg_id") or "ICEBERG"
                forecast_points = extract_iceberg_forecast_points(berg)
                
                for f_pt in forecast_points:
                    d_km = haversine_distance_km(s_lat, s_lon, f_pt["lat"], f_pt["lon"])
                    
                    if d_km < min_dist_overall:
                        min_dist_overall = d_km
                        nearest_berg_id = berg_id
                        
                    if d_km < safety_buffer_km:
                        violations.append({
                            "iceberg_id": berg_id,
                            "ship_location": {"lat": round(s_lat, 4), "lon": round(s_lon, 4)},
                            "iceberg_location": {"lat": f_pt["lat"], "lon": f_pt["lon"]},
                            "distance_km": round(d_km, 2),
                            "forecast_h": round(f_pt.get("horizon_hours", 0.0), 1),
                        })

    return {
        "min_clearance_km": round(min_dist_overall, 1) if min_dist_overall < 99999 else 999.0,
        "nearest_iceberg_id": nearest_berg_id,
        "violates_buffer": len(violations) > 0 or min_dist_overall < safety_buffer_km,
        "violations": violations,
        "safety_buffer_km": safety_buffer_km,
    }
