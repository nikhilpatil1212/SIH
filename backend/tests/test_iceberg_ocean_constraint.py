import unittest
import math
from app.services.usnic_service import load_current_icebergs
from app.navigation.land_mask import (
    is_ocean_coordinate,
    is_point_on_land,
    does_segment_cross_land,
    constrain_trajectory_point,
    constrain_trajectory_to_ocean,
    get_antarctic_coastline_lat,
)
from app.api.ml_predict import predict_ml_trajectory, MLPredictRequest


class TestIcebergOceanConstraint(unittest.TestCase):

    def test_is_ocean_coordinate_distinction(self):
        """Verify that ocean coordinates are valid and continent/land coordinates are invalid."""
        # Open ocean
        self.assertTrue(is_ocean_coordinate(-53.73, -29.50))  # A76C in Weddell/Scotia Sea
        self.assertTrue(is_ocean_coordinate(-60.0, 0.0))      # Southern Ocean
        self.assertTrue(is_ocean_coordinate(-65.0, 100.0))    # Indian Ocean sector

        # Inland Antarctic continent
        self.assertFalse(is_ocean_coordinate(-85.0, 0.0))     # Polar plateau
        self.assertFalse(is_ocean_coordinate(-78.0, 45.0))    # Enderby Land interior
        self.assertFalse(is_ocean_coordinate(-72.0, -65.0))   # Antarctic Peninsula interior

    def test_c18b_land_constraint(self):
        """Test specifically that C18B does not travel across Antarctic land."""
        c18b_lat = -67.03
        c18b_lon = 47.38

        # Origin should be valid ocean
        self.assertTrue(is_ocean_coordinate(c18b_lat, c18b_lon))

        # Simulate raw southward prediction into Enderby Land
        raw_24h_lat, raw_24h_lon = -67.60, 47.50
        self.assertFalse(is_ocean_coordinate(raw_24h_lat, raw_24h_lon))

        # Apply constraint
        c_lat, c_lon, was_constrained = constrain_trajectory_point(c18b_lat, c18b_lon, raw_24h_lat, raw_24h_lon)
        self.assertTrue(was_constrained)
        self.assertTrue(is_ocean_coordinate(c_lat, c_lon))
        self.assertFalse(does_segment_cross_land(c18b_lat, c18b_lon, c_lat, c_lon))

        # Test full 6-point trajectory constraint
        raw_points = [
            {"lat": c18b_lat, "lon": c18b_lon},
            {"lat": -67.15, "lon": 47.40},
            {"lat": -67.35, "lon": 47.45},
            {"lat": -67.60, "lon": 47.50},  # 24h on land
            {"lat": -68.10, "lon": 47.60},  # 48h on land
            {"lat": -68.60, "lon": 47.70},  # 72h on land
        ]

        sanitized, constrained_flag, reason = constrain_trajectory_to_ocean(raw_points)
        self.assertTrue(constrained_flag)
        self.assertEqual(reason, "LAND_INTERSECTION")
        self.assertEqual(len(sanitized), 6)

        for idx, pt in enumerate(sanitized):
            self.assertTrue(is_ocean_coordinate(pt["lat"], pt["lon"]), f"Point {idx} ({pt['lat']}, {pt['lon']}) is on land!")

    def test_a76c_open_ocean_drift(self):
        """Verify that A76C in open ocean continues drifting naturally without false-positive constraints."""
        a76c_lat = -53.73
        a76c_lon = -29.50

        raw_24h_lat = -53.58
        raw_24h_lon = -29.85

        c_lat, c_lon, was_constrained = constrain_trajectory_point(a76c_lat, a76c_lon, raw_24h_lat, raw_24h_lon)
        self.assertFalse(was_constrained)
        self.assertEqual(c_lat, raw_24h_lat)
        self.assertEqual(c_lon, raw_24h_lon)
        self.assertTrue(is_ocean_coordinate(c_lat, c_lon))

    def test_all_current_usnic_icebergs_trajectories(self):
        """Verify that all USNIC icebergs produce ocean-valid trajectories."""
        bergs = load_current_icebergs()
        self.assertGreater(len(bergs), 0)

        for b in bergs:
            lat = b["position"]["lat"]
            lon = b["position"]["lon"]
            speed_ms = b["speedMs"] if (b["speedMs"] and b["speedMs"] > 0) else 0.22
            heading_deg = b["headingDeg"] if (b["headingDeg"] and b["headingDeg"] > 0) else (ord(b["id"][0]) * 37) % 360

            dist_24h_km = speed_ms * 86.4
            heading_rad = math.radians(heading_deg)
            lat_rad = math.radians(lat)
            dlat = (dist_24h_km * math.cos(heading_rad)) / 111.32
            dlon = (dist_24h_km * math.sin(heading_rad)) / (111.32 * max(0.1, math.cos(lat_rad)))

            raw_path = [
                {"lat": lat, "lon": lon},
                {"lat": lat + dlat * (6 / 24), "lon": lon + dlon * (6 / 24)},
                {"lat": lat + dlat * (12 / 24), "lon": lon + dlon * (12 / 24)},
                {"lat": lat + dlat, "lon": lon + dlon},
                {"lat": lat + dlat * 2, "lon": lon + dlon * 2},
                {"lat": lat + dlat * 3, "lon": lon + dlon * 3},
            ]

            valid_path, was_c, reason = constrain_trajectory_to_ocean(raw_path)
            self.assertEqual(len(valid_path), 6)

            for idx, pt in enumerate(valid_path):
                self.assertTrue(
                    is_ocean_coordinate(pt["lat"], pt["lon"]),
                    f"Iceberg {b['id']} point {idx} at ({pt['lat']}, {pt['lon']}) violated ocean mask!"
                )

    def test_ml_predict_endpoint_ocean_constraint(self):
        """Test the ML predict endpoint with land constraint."""
        req = MLPredictRequest(
            latitude=-67.03,
            longitude=47.38,
            previous_delta_latitude=-0.13,
            previous_delta_longitude=0.29,
            drift_speed_kmh=0.8,
            drift_heading_deg=319.0,
            size_1_nm=10.0,
            size_2_nm=4.0,
            iceberg_id="C18B",
        )
        res = predict_ml_trajectory(req)
        self.assertIsNotNone(res.predicted_latitude)
        self.assertIsNotNone(res.predicted_longitude)
        self.assertTrue(is_ocean_coordinate(res.predicted_latitude, res.predicted_longitude))


if __name__ == "__main__":
    unittest.main()
