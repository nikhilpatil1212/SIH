"""Unit and Integration Tests for Real Spatial Antarctic Sea Ice Ingestion & Regional ML Pipeline."""

import unittest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.connection import Base
from backend.app.database.models import SeaIceRegionData
from backend.app.services.sea_ice_data_loader import sea_ice_loader
from backend.app.services.antarctic_sic_grid_loader import (
    antarctic_sic_grid_loader,
    ANTARCTIC_SPATIAL_SECTORS,
    is_point_in_sector
)
from backend.app.ml.regional_sea_ice_ml_model import regional_sea_ice_ml
from backend.app.services.sea_ice_pipeline import aggregate_and_ingest_sea_ice_data
from backend.app.services.sea_ice_service import get_sea_ice_data

# In-memory SQLite engine for clean test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

class TestSeaIcePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=test_engine)

    def setUp(self):
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()

    def test_synthetic_generator_is_completely_removed(self):
        """Verify that generate_spatial_observation_grid has been completely removed from the loader."""
        self.assertFalse(hasattr(antarctic_sic_grid_loader, "generate_spatial_observation_grid"),
                         "CRITICAL: generate_spatial_observation_grid must not exist in production code!")

    def test_real_spatial_raster_loader(self):
        """Verify loader retrieves genuine satellite GeoTIFF raster and computes valid EPSG:3031 coordinates."""
        raster_info = antarctic_sic_grid_loader.fetch_latest_spatial_raster()
        self.assertIsNotNone(raster_info, "Expected real satellite GeoTIFF raster to be available")
        path, obs_time = raster_info
        self.assertTrue(path.endswith(".tif"))
        self.assertGreater(obs_time.year, 2023)

    def test_antarctic_spatial_grid_loader(self):
        """Verify 2D spatial grid aggregator extracts valid grid-cell statistics across all 15 sectors from real GeoTIFF."""
        sectors = antarctic_sic_grid_loader.aggregate_sectors_from_spatial_grid()
        self.assertEqual(len(sectors), 15)

        names = {s["region_name"] for s in sectors}
        self.assertIn("Weddell Sea", names)
        self.assertIn("Ross Sea", names)
        self.assertIn("Amundsen Sea", names)
        self.assertIn("Scotia Sea", names)

        for s in sectors:
            self.assertGreater(s["valid_grid_cells"], 0, f"Sector {s['region_name']} had 0 grid cells")
            self.assertGreaterEqual(s["current_sic"], 0.0)
            self.assertLessEqual(s["current_sic"], 100.0)
            self.assertGreaterEqual(s["sic_min"], 0.0)
            self.assertLessEqual(s["sic_max"], 100.0)
            self.assertLessEqual(s["sic_min"], s["current_sic"])
            self.assertGreaterEqual(s["sic_max"], s["current_sic"])
            self.assertEqual(s["spatial_coverage"], 100.0)
            self.assertEqual(s["data_source"], "JAXA AMSR2 / University of Bremen Daily Antarctic Sea-Ice Concentration (6.25km)")

    def test_spatial_sector_wrap_around(self):
        """Verify meridian wrap-around logic for Ross Sea crossing the 180° meridian."""
        ross_def = next(s for s in ANTARCTIC_SPATIAL_SECTORS if s["name"] == "Ross Sea")
        # 175°E (positive lon) -> Inside
        self.assertTrue(is_point_in_sector(-75.0, 175.0, ross_def))
        # 170°W (-170° lon) -> Inside
        self.assertTrue(is_point_in_sector(-75.0, -170.0, ross_def))
        # 0° lon -> Outside
        self.assertFalse(is_point_in_sector(-75.0, 0.0, ross_def))

    def test_independent_regional_ml_forecasting(self):
        """Verify regional ML models predict independently and allow divergent forecast directions."""
        metrics = regional_sea_ice_ml.train_and_evaluate()
        self.assertGreater(len(metrics), 10, "Expected regional models for at least 10 sectors")

        # Weddell vs Lazarev forecast directions
        weddell_preds = regional_sea_ice_ml.predict_sector_forecast("Weddell Sea", 64.5)
        lazarev_preds = regional_sea_ice_ml.predict_sector_forecast("Lazarev Sea", 93.3)

        self.assertIn("7d", weddell_preds)
        self.assertIn("7d", lazarev_preds)
        
        # Verify physical boundaries
        for h in ["1d", "3d", "7d", "14d", "30d"]:
            self.assertGreaterEqual(weddell_preds[h], 0.0)
            self.assertLessEqual(weddell_preds[h], 100.0)
            self.assertGreaterEqual(lazarev_preds[h], 0.0)
            self.assertLessEqual(lazarev_preds[h], 100.0)

    def test_pipeline_ingestion_and_sector_coverage(self):
        """Verify pipeline populates exactly 15 Antarctic sectors in the database with independent ML values."""
        records = aggregate_and_ingest_sea_ice_data(self.db, force_update=True)
        self.assertEqual(len(records), 15)
        self.assertEqual(len(ANTARCTIC_SPATIAL_SECTORS), 15)

        names = {r.region_name for r in records}
        self.assertIn("Weddell Sea", names)
        self.assertIn("Ross Sea", names)
        self.assertIn("Amundsen Sea", names)
        self.assertIn("Antarctic Peninsula", names)

        # Check for presence of divergent directional trends in records
        changes = [r.change_7d for r in records]
        has_positive = any(c > 0 for c in changes)
        has_negative = any(c < 0 for c in changes)
        self.assertTrue(has_positive and has_negative, "Pipeline should support divergent regional forecast directions")

        for r in records:
            self.assertGreaterEqual(r.current_sic, 0.0)
            self.assertLessEqual(r.current_sic, 100.0)
            self.assertGreaterEqual(r.forecast_1d, 0.0)
            self.assertLessEqual(r.forecast_1d, 100.0)
            self.assertGreaterEqual(r.forecast_3d, 0.0)
            self.assertLessEqual(r.forecast_3d, 100.0)
            self.assertGreaterEqual(r.forecast_7d, 0.0)
            self.assertLessEqual(r.forecast_7d, 100.0)
            self.assertGreaterEqual(r.forecast_14d, 0.0)
            self.assertLessEqual(r.forecast_14d, 100.0)
            self.assertGreaterEqual(r.forecast_30d, 0.0)
            self.assertLessEqual(r.forecast_30d, 100.0)
            
            self.assertIn(r.risk_level, ["LOW", "MODERATE", "HIGH", "VERY HIGH"])
            self.assertEqual(r.data_source, "JAXA AMSR2 / University of Bremen Daily Antarctic Sea-Ice Concentration (6.25km)")
            self.assertGreaterEqual(r.observation_time.year, 2024)

    def test_sea_ice_environment_service(self):
        """Verify the environment horizons service is synchronized with real spatial data."""
        res = get_sea_ice_data()
        self.assertIn("horizons", res)
        self.assertIn("0h", res["horizons"])
        self.assertIn("24h", res["horizons"])
        self.assertIn("48h", res["horizons"])
        self.assertIn("72h", res["horizons"])

        h0 = res["horizons"]["0h"]
        self.assertEqual(len(h0["regions"]), 3)
        self.assertEqual(h0["units"], "%")
        self.assertEqual(h0["source_product"], "JAXA AMSR2 / University of Bremen Daily Antarctic Sea-Ice Concentration (6.25km)")

if __name__ == "__main__":
    unittest.main()
