import unittest
import math
from datetime import datetime, timezone
from app.database.connection import SessionLocal, engine, Base
from app.database.models import IcebergObservation, IcebergForecast, ModelValidationMetric
from app.services.usnic_service import (
    load_current_icebergs,
    ingest_usnic_dataset,
    generate_72h_forecast,
    parse_usnic_date,
    get_region_for_iceberg,
)
from app.navigation.land_mask import is_ocean_coordinate


class TestUSNIC72hPipeline(unittest.TestCase):

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_usnic_ingestion_and_db_persistence(self):
        """Test that USNIC data is ingested, cached, and stored in iceberg_observations."""
        res = ingest_usnic_dataset(self.db, force=True)
        self.assertIn(res["status"], ["SUCCESS", "UNCHANGED"])
        self.assertGreater(res["total_icebergs"], 0)

        # Verify DB records
        obs_count = self.db.query(IcebergObservation).count()
        self.assertGreater(obs_count, 0)

        # Check a specific canonical iceberg
        a76c_obs = self.db.query(IcebergObservation).filter(IcebergObservation.iceberg_id == "A76C").first()
        self.assertIsNotNone(a76c_obs)
        self.assertAlmostEqual(a76c_obs.latitude, -53.73, places=1)
        self.assertAlmostEqual(a76c_obs.longitude, -29.50, places=1)
        self.assertEqual(a76c_obs.source, "U.S. National Ice Center (USNIC)")

    def test_72h_multi_horizon_forecast_sampling(self):
        """Test that 72h forecast generates all required milestones and remains ocean-valid."""
        lat = -53.73
        lon = -29.50
        speed_m_s = 0.22
        bearing_deg = 307.9
        obs_dt = datetime(2026, 8, 27, 12, 0, tzinfo=timezone.utc)

        valid_path, raw_path, baseline_path, was_c, reason = generate_72h_forecast(
            lat=lat,
            lon=lon,
            speed_m_s=speed_m_s,
            bearing_deg=bearing_deg,
            iceberg_id="A76C",
            obs_timestamp=obs_dt,
        )

        # Check horizons: NOW(0h), 6h, 12h, 18h, 24h, 36h, 48h, 60h, 72h -> 9 points total
        self.assertEqual(len(valid_path), 9)
        self.assertEqual(len(raw_path), 9)
        self.assertEqual(len(baseline_path), 9)

        # Verify all coordinates in valid_path are strictly ocean-valid
        for idx, pt in enumerate(valid_path):
            self.assertTrue(
                is_ocean_coordinate(pt["lat"], pt["lon"]),
                f"Waypoint {idx} ({pt['lat']}, {pt['lon']}) is on land!",
            )

    def test_c18b_72h_land_deflection(self):
        """Verify that C18B near Enderby Land generates 72h path without entering continent."""
        c18b_lat = -67.03
        c18b_lon = 47.38
        speed_m_s = 0.25
        bearing_deg = 220.0  # Southward towards continent
        obs_dt = datetime(2026, 8, 27, 12, 0, tzinfo=timezone.utc)

        valid_path, raw_path, baseline_path, was_c, reason = generate_72h_forecast(
            lat=c18b_lat,
            lon=c18b_lon,
            speed_m_s=speed_m_s,
            bearing_deg=bearing_deg,
            iceberg_id="C18B",
            obs_timestamp=obs_dt,
        )

        self.assertEqual(len(valid_path), 9)
        self.assertTrue(was_c)

        for pt in valid_path:
            self.assertTrue(is_ocean_coordinate(pt["lat"], pt["lon"]))

    def test_usnic_load_current_icebergs_metadata(self):
        """Verify that current icebergs API objects contain accurate observation timestamps and data age."""
        bergs = load_current_icebergs(self.db)
        self.assertGreater(len(bergs), 0)

        for b in bergs:
            self.assertIn("observedAt", b)
            self.assertIn("dataAgeDays", b)
            self.assertIn("updateFrequency", b)
            self.assertEqual(b["updateFrequency"], "Weekly")
            self.assertEqual(b["source"], "U.S. National Ice Center (USNIC)")
            self.assertEqual(len(b["predictedPath"]), 9)


if __name__ == "__main__":
    unittest.main()
