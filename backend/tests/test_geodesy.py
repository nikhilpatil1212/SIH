from app.navigation.geodesy import (
    haversine_distance_nm,
    haversine_distance_km,
    initial_bearing_deg,
    calculate_eta_hours,
    format_eta,
    calculate_fuel_tonnes,
)

def test_haversine_distance_known_points():
    # Cape Town (-33.92, 18.42) to Maitri (-70.77, 11.73)
    dist_nm = haversine_distance_nm(-33.92, 18.42, -70.77, 11.73)
    assert 2200.0 < dist_nm < 2350.0
    
    # Distance in km should be ~1.852 * dist_nm
    dist_km = haversine_distance_km(-33.92, 18.42, -70.77, 11.73)
    assert abs(dist_km - dist_nm * 1.852) < 2.0

def test_initial_bearing():
    # Cape Town to Maitri is south-south-west
    brng = initial_bearing_deg(-33.92, 18.42, -70.77, 11.73)
    assert 180.0 <= brng <= 210.0

def test_eta_and_fuel_scaling():
    dist = 2400.0
    speed = 12.0
    eta_h = calculate_eta_hours(dist, speed)
    assert eta_h == 200.0
    assert format_eta(eta_h) == "8d 08h"
    
    # Higher speed reduces ETA
    eta_h_fast = calculate_eta_hours(dist, 16.0)
    assert eta_h_fast == 150.0
    assert format_eta(eta_h_fast) == "6d 06h"

    # Fuel burn scales with distance and speed
    fuel = calculate_fuel_tonnes(dist, 14.0)
    assert fuel > 0
