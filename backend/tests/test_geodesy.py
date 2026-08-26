"""Automated unit tests for Geodesy and Spherical Kinematics calculations."""

import pytest
import math
from app.physics.geodesy import (
    haversine_distance_km,
    haversine_distance_nmi,
    initial_bearing_degrees,
    destination_point,
    interpolate_great_circle_arc,
    KM_PER_NMI,
)


def test_haversine_known_distances():
    # Cape Town (-33.92, 18.42) to Maitri Station (-70.77, 11.73)
    dist_km = haversine_distance_km(-33.92, 18.42, -70.77, 11.73)
    # Geodesic distance is ~4100-4200 km
    assert 4000 < dist_km < 4300
    
    # Same point distance should be 0
    assert haversine_distance_km(-65.0, 100.0, -65.0, 100.0) == 0.0


def test_haversine_nmi_conversion():
    dist_km = haversine_distance_km(-50.0, 0.0, -60.0, 0.0)
    dist_nmi = haversine_distance_nmi(-50.0, 0.0, -60.0, 0.0)
    assert math.isclose(dist_km, dist_nmi * KM_PER_NMI, rel_tol=1e-5)


def test_initial_bearing():
    # Due North: (0, 0) -> (10, 0) bearing should be 0 deg
    assert math.isclose(initial_bearing_degrees(0.0, 0.0, 10.0, 0.0), 0.0, abs_tol=0.1)
    
    # Due East: (0, 0) -> (0, 10) bearing should be 90 deg
    assert math.isclose(initial_bearing_degrees(0.0, 0.0, 0.0, 10.0), 90.0, abs_tol=0.1)
    
    # Due South: (0, 0) -> (-10, 0) bearing should be 180 deg
    assert math.isclose(initial_bearing_degrees(0.0, 0.0, -10.0, 0.0), 180.0, abs_tol=0.1)
    
    # Due West: (0, 0) -> (0, -10) bearing should be 270 deg
    assert math.isclose(initial_bearing_degrees(0.0, 0.0, 0.0, -10.0), 270.0, abs_tol=0.1)


def test_destination_point_roundtrip():
    lat1, lon1 = -65.0, -45.0
    bearing = 135.0  # Southeast
    dist_km = 250.0
    
    dest_lat, dest_lon = destination_point(lat1, lon1, bearing, dist_km)
    
    # Distance from start to dest must match 250 km
    computed_dist = haversine_distance_km(lat1, lon1, dest_lat, dest_lon)
    assert math.isclose(computed_dist, dist_km, rel_tol=1e-3)


def test_great_circle_interpolation():
    lat1, lon1 = -60.0, 20.0
    lat2, lon2 = -70.0, 50.0
    points = interpolate_great_circle_arc(lat1, lon1, lat2, lon2, num_points=5)
    
    assert len(points) == 5
    assert points[0] == (lat1, lon1)
    assert points[-1] == (lat2, lon2)
