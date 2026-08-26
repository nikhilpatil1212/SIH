import sys
import os
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.navigation.geodesy import (
    haversine_distance_nm,
    haversine_distance_km,
    initial_bearing_deg,
    calculate_eta_hours,
    format_eta,
    calculate_fuel_tonnes,
)
from app.navigation.router import calculate_route_alternatives

class TestGeodesyAndRouting(unittest.TestCase):
    def test_haversine_distance(self):
        dist_nm = haversine_distance_nm(-33.92, 18.42, -70.77, 11.73)
        self.assertTrue(2200.0 < dist_nm < 2350.0)

    def test_initial_bearing(self):
        brng = initial_bearing_deg(-33.92, 18.42, -70.77, 11.73)
        self.assertTrue(180.0 <= brng <= 210.0)

    def test_eta_calculation(self):
        eta_h = calculate_eta_hours(2400.0, 12.0)
        self.assertEqual(eta_h, 200.0)
        self.assertEqual(format_eta(eta_h), "8d 08h")

    def test_destination_changes_distance(self):
        res_maitri = calculate_route_alternatives(-33.92, 18.42, -70.77, 11.73, 14.0)
        res_bharati = calculate_route_alternatives(-33.92, 18.42, -69.41, 76.19, 14.0)
        
        dist_maitri = res_maitri["routes"][0]["distanceNm"]
        dist_bharati = res_bharati["routes"][0]["distanceNm"]
        self.assertNotEqual(dist_maitri, dist_bharati)
        self.assertTrue(dist_bharati > dist_maitri)

    def test_objective_selection(self):
        res_safest = calculate_route_alternatives(-33.92, 18.42, -70.77, 11.73, 14.0, "SAFEST")
        self.assertEqual(res_safest["recommended_route_id"], "route-b")

        res_shortest = calculate_route_alternatives(-33.92, 18.42, -70.77, 11.73, 14.0, "SHORTEST")
        self.assertEqual(res_shortest["recommended_route_id"], "route-a")

if __name__ == "__main__":
    unittest.main()
