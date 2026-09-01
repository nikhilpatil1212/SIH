"""High-Precision Polar & Global Maritime Land/Coastline Mask.

Provides polygon-based and coordinate-verified land collision detection
for the Southern Ocean, Antarctica, South America, South Africa, Australia, New Zealand,
and Sub-Antarctic islands.
"""

import math
from typing import List, Tuple, Dict, Any, Optional

# Major coastal scientific stations and gateway ports with approach tolerances (km)
COASTAL_STATION_APPROACH: Dict[str, Tuple[float, float, float]] = {
    # Name: (lat, lon, max_tolerance_radius_km)
    "maitri": (-70.77, 11.73, 35.0),
    "bharati": (-69.41, 76.19, 35.0),
    "dakshin_gangotri": (-70.08, 12.00, 35.0),
    "cape_town": (-33.92, 18.42, 45.0),
    "punta_arenas": (-53.16, -70.91, 55.0),
    "ushuaia": (-54.80, -68.30, 50.0),
    "hobart": (-42.88, 147.33, 45.0),
    "christchurch": (-43.53, 172.63, 45.0),
    "fremantle": (-32.05, 115.74, 45.0),
    "goa": (15.4, 73.8, 45.0),
    "mcmurdo": (-77.85, 166.67, 40.0),
    "esperanza": (-63.40, -56.99, 35.0),
    "rothera": (-67.57, -68.13, 35.0),
    "halley": (-75.58, -26.50, 40.0),
    "neumayer": (-70.67, -8.27, 35.0),
    "syowa": (-69.00, 39.58, 35.0),
    "davis": (-68.58, 77.97, 35.0),
    "mawson": (-67.60, 62.87, 35.0),
    "casey": (-66.28, 110.53, 45.0),
    "dumond_durville": (-66.66, 140.00, 35.0),

    "zongshan": (-69.37, 76.37, 35.0),
    # Additional fairway corridor navigation coordinates for enclosed port basins
    "beagle_channel_mid": (-55.05, -67.20, 30.0),
    "beagle_channel_east": (-55.15, -66.50, 30.0),
    "beagle_channel_entrance": (-55.25, -65.80, 30.0),
    "strait_of_magellan_mid": (-52.7, -69.2, 30.0),
    "strait_of_magellan_exit": (-52.4, -68.3, 35.0),
    "hobart_storm_bay": (-43.50, 147.50, 35.0),
    "hobart_south_cape": (-44.20, 147.00, 35.0),
}




# Comprehensive Polygon Definitions for Polar Maritime Safety
ANTARCTIC_CONTINENT_POLYGON: List[Tuple[float, float]] = [
    # 1. Antarctic Peninsula (Graham Land & Palmer Land)
    (-63.3, -57.0),
    (-63.8, -58.8),
    (-64.5, -61.5),
    (-65.8, -64.8),
    (-67.5, -67.5),
    (-69.5, -71.5),
    (-71.5, -74.0),
    (-73.5, -75.0),
    # 2. Bellingshausen & Amundsen Sea Coast (Ellsworth & Marie Byrd Land)
    (-73.0, -80.0),
    (-73.5, -90.0),
    (-72.5, -100.0),
    (-74.5, -110.0),
    (-74.0, -120.0),
    (-75.0, -135.0),
    (-76.0, -150.0),
    # 3. Ross Ice Shelf & Victoria Land Coast
    (-78.5, -165.0),
    (-78.8, -175.0),
    (-78.8, 175.0),
    (-77.5, 166.0),
    (-75.0, 164.0),
    (-72.5, 170.0),
    (-70.5, 165.0),
    # 4. George V, Terre Adelie & Wilkes Land
    (-68.5, 155.0),
    (-67.0, 145.0),
    (-66.5, 140.0),
    (-66.2, 130.0),
    (-66.0, 120.0),
    (-66.3, 110.5),
    (-65.5, 100.0),
    (-66.5, 90.0),
    # 5. Prydz Bay, Mac. Robertson & Enderby Land
    (-68.5, 80.0),
    (-69.5, 76.2),
    (-69.8, 73.0),
    (-68.0, 70.0),
    (-67.5, 62.8),
    (-66.5, 55.0),
    (-67.5, 45.0),
    (-69.0, 39.5),
    (-69.5, 30.0),
    # 6. Princess Astrid & Princess Martha Coast (Maitri & Neumayer)
    (-70.8, 20.0),
    (-70.8, 11.7),
    (-70.5, 0.0),
    (-70.7, -8.3),
    (-72.0, -15.0),
    (-74.0, -25.0),
    # 7. Weddell Sea Coast & Brunt / Filchner-Ronne Ice Shelf
    (-75.6, -26.5),
    (-76.5, -30.0),
    (-78.0, -40.0),
    (-78.5, -50.0),
    (-76.5, -60.0),
    (-74.0, -62.0),
    (-71.0, -60.5),
    (-68.0, -59.5),
    (-65.5, -59.0),
    (-64.2, -56.8),
    (-63.3, -57.0),
]

SOUTH_AMERICA_POLYGON: List[Tuple[float, float]] = [
    (-52.0, -76.0),
    (-50.0, -75.0),
    (-40.0, -65.0),
    (-35.0, -55.0),
    (-45.0, -60.0),
    (-52.0, -67.5),
    (-54.0, -65.0),
    (-55.2, -66.5),
    (-56.0, -67.5),
    (-55.5, -71.5),
    (-54.0, -74.0),
    (-52.0, -76.0),
]

SOUTH_AFRICA_POLYGON: List[Tuple[float, float]] = [
    (-34.4, 18.4),
    (-34.8, 20.0),
    (-34.2, 25.5),
    (-30.0, 31.5),
    (-20.0, 35.0),
    (-20.0, 14.0),
    (-28.5, 16.5),
    (-32.0, 18.0),
    (-33.8, 18.4),
    (-34.4, 18.4),
]

AUSTRALIA_TASMANIA_POLYGON: List[Tuple[float, float]] = [
    (-38.0, 140.0),
    (-38.0, 148.0),
    (-40.5, 148.5),
    (-43.2, 148.0),   # Cape Pillar (Tasman Peninsula)
    (-43.65, 147.0),  # South East Cape
    (-43.5, 146.0),   # South West Cape
    (-42.0, 145.0),   # West Coast
    (-40.5, 144.5),   # Cape Grim
    (-38.0, 144.5),
    (-38.0, 140.0),
]

NEW_ZEALAND_POLYGON: List[Tuple[float, float]] = [
    (-47.0, 167.0),
    (-46.0, 171.0),
    (-43.5, 173.5),
    (-41.0, 175.0),
    (-35.0, 174.0),
    (-38.0, 174.0),
    (-41.5, 172.0),
    (-45.0, 166.5),
    (-47.0, 167.0),
]

# Major Sub-Antarctic Island Obstacles: (name, lat, lon, exclusion_radius_km)
ISLAND_OBSTACLES: List[Tuple[str, float, float, float]] = [
    ("Falkland Islands", -51.75, -59.5, 80.0),
    ("South Georgia", -54.4, -36.6, 95.0),
    ("South Sandwich Islands", -58.5, -26.3, 70.0),
    ("South Orkney Islands", -60.6, -45.5, 55.0),
    ("South Shetland Islands", -62.5, -59.5, 55.0),
    ("Bouvet Island", -54.42, 3.35, 25.0),
    ("Prince Edward & Marion Islands", -46.88, 37.85, 40.0),
    ("Crozet Islands", -46.42, 51.85, 50.0),
    ("Kerguelen Islands", -49.35, 69.35, 85.0),
    ("Heard & McDonald Islands", -53.1, 73.5, 45.0),
    ("Macquarie Island", -54.6, 158.85, 35.0),
    ("Campbell Island", -52.55, 169.15, 30.0),
    ("Auckland Islands", -50.7, 166.1, 40.0),
    ("Peter I Island", -68.85, -90.6, 25.0),
]


def point_in_polygon(lat: float, lon: float, polygon: List[Tuple[float, float]]) -> bool:
    """Standard ray-casting algorithm to test if point (lat, lon) is inside a polygon."""
    n = len(polygon)
    inside = False
    p1_lat, p1_lon = polygon[0]
    for i in range(1, n + 1):
        p2_lat, p2_lon = polygon[i % n]
        if min(p1_lon, p2_lon) < lon <= max(p1_lon, p2_lon):
            if lat <= max(p1_lat, p2_lat):
                if p1_lon != p2_lon:
                    lat_inters = (lon - p1_lon) * (p2_lat - p1_lat) / (p2_lon - p1_lon) + p1_lat
                else:
                    lat_inters = p1_lat
                if p1_lat == p2_lat or lat <= lat_inters:
                    inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon
    return inside


def is_near_registered_station(lat: float, lon: float) -> bool:
    """Check if point is directly at a registered Antarctic coastal station or gateway port."""
    for name, (st_lat, st_lon, tol_km) in COASTAL_STATION_APPROACH.items():
        dlat = (lat - st_lat) * 111.0
        dlon = (lon - st_lon) * 111.0 * math.cos(math.radians((lat + st_lat) / 2.0))
        dist_km = math.sqrt(dlat * dlat + dlon * dlon)
        if dist_km <= tol_km:
            return True
    return False



# High-resolution Antarctic Continental Coastline Boundary (lon, northernmost continental latitude)
ANTARCTIC_COASTLINE_TABLE: List[Tuple[float, float]] = [
    (-180.0, -78.0),
    (-175.0, -78.4),
    (-170.0, -78.5),
    (-165.0, -78.2),
    (-160.0, -77.8),
    (-155.0, -77.2),
    (-150.0, -76.2),
    (-145.0, -75.8),
    (-140.0, -75.2),
    (-135.0, -74.8),
    (-130.0, -74.2),
    (-125.0, -73.8),
    (-120.0, -73.5),
    (-115.0, -73.8),
    (-110.0, -74.2),
    (-105.0, -74.8),
    (-100.0, -73.2),
    (-95.0, -72.6),
    (-90.0, -72.8),
    (-85.0, -73.2),
    (-80.0, -73.5),
    (-75.0, -73.0),
    (-72.0, -71.2),
    (-70.0, -69.0),
    (-68.0, -67.2),
    (-66.0, -65.5),
    (-64.0, -64.2),
    (-63.0, -63.8),
    (-60.0, -63.3),  # Prime Head / Trinity Peninsula
    (-57.0, -63.2),  # Tip of Peninsula
    (-55.0, -64.2),
    (-58.0, -65.5),
    (-60.0, -68.0),
    (-61.0, -71.0),
    (-62.0, -74.0),
    (-55.0, -77.5),
    (-50.0, -78.2),
    (-45.0, -78.0),
    (-40.0, -77.5),
    (-35.0, -76.5),
    (-30.0, -75.8),
    (-25.0, -74.5),
    (-20.0, -73.2),
    (-15.0, -72.0),
    (-10.0, -70.8),
    (-5.0, -70.5),
    (0.0, -70.2),
    (5.0, -70.0),
    (10.0, -70.2),
    (15.0, -70.5),
    (20.0, -70.6),
    (25.0, -70.4),
    (30.0, -69.8),
    (35.0, -69.2),
    (40.0, -68.6),
    (45.0, -67.4),
    (50.0, -66.8),   # Cape Ann / Enderby Land
    (55.0, -66.2),
    (60.0, -67.0),
    (65.0, -67.4),
    (70.0, -68.2),
    (73.0, -69.6),   # Amery Ice Shelf / Prydz Bay
    (76.0, -69.2),
    (80.0, -68.0),
    (85.0, -66.4),
    (90.0, -66.2),
    (95.0, -65.8),
    (100.0, -65.4),
    (105.0, -65.8),
    (110.0, -66.3),
    (115.0, -66.2),
    (120.0, -65.6),

    (125.0, -65.8),
    (130.0, -66.0),
    (135.0, -66.2),
    (140.0, -66.4),
    (145.0, -66.8),
    (150.0, -67.8),
    (155.0, -68.6),
    (160.0, -69.8),
    (165.0, -71.2),
    (170.0, -72.4),
    (175.0, -74.8),
    (180.0, -78.0),
]


def wrap_lon(lon: float) -> float:
    return (((lon + 180.0) % 360.0) + 360.0) % 360.0 - 180.0


def get_antarctic_coastline_lat(lon: float) -> float:
    """Get the northernmost latitude of the Antarctic continent at given longitude."""
    wlon = wrap_lon(lon)
    for i in range(len(ANTARCTIC_COASTLINE_TABLE) - 1):
        l1, lat1 = ANTARCTIC_COASTLINE_TABLE[i]
        l2, lat2 = ANTARCTIC_COASTLINE_TABLE[i + 1]
        if l1 <= wlon <= l2:
            frac = (wlon - l1) / (l2 - l1) if l2 != l1 else 0.0
            return lat1 + frac * (lat2 - lat1)
    return -70.0


def is_ocean_coordinate(lat: float, lon: float) -> bool:
    """Return True if (lat, lon) is in valid ocean water (including sea ice), False if on land."""
    return not is_point_on_land(lat, lon)


def is_point_on_land(lat: float, lon: float) -> bool:
    """Determine if a geographic point (lat, lon) is located on impassable land."""
    # Exemption for designated port/station approaches
    if is_near_registered_station(lat, lon):
        return False

    # 1. Check Sub-Antarctic Islands
    for name, isl_lat, isl_lon, rad_km in ISLAND_OBSTACLES:
        dlat = (lat - isl_lat) * 111.0
        dlon = (lon - isl_lon) * 111.0 * math.cos(math.radians((lat + isl_lat) / 2.0))
        if math.sqrt(dlat * dlat + dlon * dlon) <= rad_km:
            return True

    # 2. Check Continents
    if point_in_polygon(lat, lon, ANTARCTIC_CONTINENT_POLYGON):
        return True
    if point_in_polygon(lat, lon, SOUTH_AMERICA_POLYGON):
        return True
    if point_in_polygon(lat, lon, SOUTH_AFRICA_POLYGON):
        return True
    if point_in_polygon(lat, lon, AUSTRALIA_TASMANIA_POLYGON):
        return True
    if point_in_polygon(lat, lon, NEW_ZEALAND_POLYGON):
        return True

    # 3. High-resolution Antarctic Continental Coastline Check
    if lat <= -60.0:
        coast_lat = get_antarctic_coastline_lat(lon)
        if lat <= (coast_lat - 0.02):
            return True

    # 4. Inland polar ice sheet cap (below 80°S is strictly continental ice sheet)
    if lat < -80.0:
        return True

    return False


def does_segment_cross_land(lat1: float, lon1: float, lat2: float, lon2: float, num_samples: Optional[int] = None) -> bool:
    """Check if a route segment intersects any landmass using adaptive spatial sampling."""
    if num_samples is None:
        dlat = (lat2 - lat1) * 111.0
        dlon = (lon2 - lon1) * 111.0 * math.cos(math.radians((lat1 + lat2) / 2.0))
        approx_km = math.sqrt(dlat * dlat + dlon * dlon)
        num_samples = max(8, int(approx_km / 35.0))

    for i in range(0, num_samples + 1):
        fraction = i / float(num_samples)
        sample_lat = lat1 + fraction * (lat2 - lat1)
        sample_lon = wrap_lon(lon1 + fraction * (lon2 - lon1))
        if is_point_on_land(sample_lat, sample_lon):
            return True
            
    return False


def constrain_trajectory_point(
    prev_lat: float,
    prev_lon: float,
    raw_target_lat: float,
    raw_target_lon: float,
) -> Tuple[float, float, bool]:
    """Constrain a single trajectory forward step so it remains in valid ocean."""
    from ..physics.geodesy import haversine_distance_km, initial_bearing_degrees, destination_point
    
    # Check if raw target is already ocean-valid and segment is clear
    if not is_point_on_land(raw_target_lat, raw_target_lon) and not does_segment_cross_land(prev_lat, prev_lon, raw_target_lat, raw_target_lon, 8):
        return raw_target_lat, raw_target_lon, False

    dist_km = max(1.0, haversine_distance_km(prev_lat, prev_lon, raw_target_lat, raw_target_lon))
    raw_bearing = initial_bearing_degrees(prev_lat, prev_lon, raw_target_lat, raw_target_lon)

    # Search angular deflections (preferring coastal alongshore deflection into open water)
    for angle_offset in range(15, 180, 15):
        for sign in [-1, 1]:
            test_bearing = (raw_bearing + sign * angle_offset) % 360.0
            test_lat, test_lon = destination_point(prev_lat, prev_lon, test_bearing, dist_km)
            
            if not is_point_on_land(test_lat, test_lon) and not does_segment_cross_land(prev_lat, prev_lon, test_lat, test_lon, 6):
                return round(test_lat, 5), round(test_lon, 5), True

    # Fallback: project northward / seaward off the local coastline with 15km clearance
    coast_lat = get_antarctic_coastline_lat(prev_lon)
    safe_lat = max(prev_lat + 0.05, coast_lat + 0.15)
    return round(safe_lat, 5), round(prev_lon, 5), True


def constrain_trajectory_to_ocean(raw_points: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], bool, Optional[str]]:
    """Constrain an entire sequential list of trajectory points to valid ocean positions."""
    if not raw_points:
        return [], False, None

    was_constrained = False
    result_points: List[Dict[str, Any]] = []

    # Step 0: Ensure origin point is in ocean
    p0 = raw_points[0]
    p0_lat = p0.get("latitude", p0.get("lat", 0.0))
    p0_lon = p0.get("longitude", p0.get("lon", 0.0))
    
    if is_point_on_land(p0_lat, p0_lon):
        coast_lat = get_antarctic_coastline_lat(p0_lon)
        p0_lat = coast_lat + 0.08
        was_constrained = True

    p0_copy = dict(p0)
    if "latitude" in p0_copy: p0_copy["latitude"] = round(p0_lat, 5)
    if "lat" in p0_copy: p0_copy["lat"] = round(p0_lat, 5)
    if "longitude" in p0_copy: p0_copy["longitude"] = round(p0_lon, 5)
    if "lon" in p0_copy: p0_copy["lon"] = round(p0_lon, 5)
    result_points.append(p0_copy)

    # Step 1..N
    for i in range(1, len(raw_points)):
        raw_pt = raw_points[i]
        prev_pt = result_points[i - 1]
        
        prev_lat = prev_pt.get("latitude", prev_pt.get("lat", 0.0))
        prev_lon = prev_pt.get("longitude", prev_pt.get("lon", 0.0))
        target_lat = raw_pt.get("latitude", raw_pt.get("lat", 0.0))
        target_lon = raw_pt.get("longitude", raw_pt.get("lon", 0.0))

        c_lat, c_lon, step_constrained = constrain_trajectory_point(prev_lat, prev_lon, target_lat, target_lon)
        if step_constrained:
            was_constrained = True

        pt_copy = dict(raw_pt)
        if "latitude" in pt_copy: pt_copy["latitude"] = c_lat
        if "lat" in pt_copy: pt_copy["lat"] = c_lat
        if "longitude" in pt_copy: pt_copy["longitude"] = c_lon
        if "lon" in pt_copy: pt_copy["lon"] = c_lon
        result_points.append(pt_copy)

    return result_points, was_constrained, "LAND_INTERSECTION" if was_constrained else None

