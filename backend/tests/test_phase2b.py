"""Automated unit and integration tests for Phase 2B Targeted Environmental Ingestion & Hindcast."""

import pytest
import os
import shutil
import math
from datetime import datetime, timezone

from app.environment.download import (
    GLORYSDownloader,
    ERA5Downloader,
    OISSTDownloader,
    SeaIceDownloader,
    GEBCODownloader,
)
from app.environment.colocation import (
    co_locate_trajectory,
    CoLocatedIcebergObservation,
)
from app.environment.environmental_service import EnvironmentalService
from app.environment.providers.ocean import OceanCurrentProvider
from app.environment.providers.wind import AtmosphericWindProvider
from app.schemas.iceberg import TrajectoryFeaturePoint
from app.physics.hindcast_engine import (
    run_trajectory_hindcast,
    SingleStepHindcast,
)


def test_downloaders_metadata_and_validation():
    test_out_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "data", "environment", "test_downloads")
    )
    os.makedirs(test_out_dir, exist_ok=True)
    
    try:
        # 1. GLORYS
        g_down = GLORYSDownloader()
        g_res = g_down.download_subset(-65.0, -60.0, -50.0, -40.0, "2020-01-01", "2020-01-10", test_out_dir)
        assert g_res.success
        assert g_res.dataset_name == "GLORYS12V1"
        assert g_res.bytes_downloaded > 0

        # 2. ERA5
        e_down = ERA5Downloader()
        e_res = e_down.download_subset(-65.0, -60.0, -50.0, -40.0, "2020-01-01", "2020-01-10", test_out_dir)
        assert e_res.success
        assert e_res.dataset_name == "ERA5"
    finally:
        if os.path.exists(test_out_dir):
            shutil.rmtree(test_out_dir, ignore_errors=True)


def test_anti_leakage_assertion():
    ocean = OceanCurrentProvider()
    lat_grid = [-70.0, -60.0]
    lon_grid = [-50.0, -40.0]
    ocean.load_grid_slice(lat_grid, lon_grid, [[0.2, 0.2], [0.2, 0.2]], [[0.1, 0.1], [0.1, 0.1]])

    wind = AtmosphericWindProvider()
    wind.load_grid_slice(lat_grid, lon_grid, [[10.0, 10.0], [10.0, 10.0]], [[-5.0, -5.0], [-5.0, -5.0]])

    service = EnvironmentalService(ocean_provider=ocean, wind_provider=wind)

    # Valid non-leakage co-location
    dt_now = datetime(2020, 1, 5, 12, 0, tzinfo=timezone.utc)
    rec = service.get_environment(latitude=-65.0, longitude=-45.0, timestamp=dt_now)
    assert rec.is_complete_for_kinematics
    for var, prov in rec.provenance.items():
        if prov.source_timestamp:
            assert prov.source_timestamp <= dt_now


def test_hindcast_propagation_and_metrics():
    # Build 4 consecutive co-located observations
    dt1 = datetime(2020, 1, 1, 12, 0, tzinfo=timezone.utc)
    dt2 = datetime(2020, 1, 2, 12, 0, tzinfo=timezone.utc)
    dt3 = datetime(2020, 1, 3, 12, 0, tzinfo=timezone.utc)
    dt4 = datetime(2020, 1, 4, 12, 0, tzinfo=timezone.utc)

    obs = [
        CoLocatedIcebergObservation(
            iceberg_id="TEST_BERG",
            calendar_date="2020-01-01",
            timestamp=dt1,
            latitude=-65.0,
            longitude=-45.0,
            is_direct_fix=True,
            size_major_km=20.0,
            size_minor_km=10.0,
            size_source="nic_direct",
            size_is_imputed=False,
            is_stationary=False,
            observed_speed_km_day=15.0,
            observed_bearing_deg=45.0,
            ocean_u=0.20,
            ocean_v=0.10,
            wind_u_10m=10.0,
            wind_v_10m=-5.0,
            is_fully_co_located=True,
        ),
        CoLocatedIcebergObservation(
            iceberg_id="TEST_BERG",
            calendar_date="2020-01-02",
            timestamp=dt2,
            latitude=-64.85,
            longitude=-44.75,
            is_direct_fix=True,
            size_major_km=20.0,
            size_minor_km=10.0,
            size_source="nic_direct",
            size_is_imputed=False,
            is_stationary=False,
            observed_speed_km_day=18.0,
            observed_bearing_deg=50.0,
            ocean_u=0.22,
            ocean_v=0.12,
            wind_u_10m=11.0,
            wind_v_10m=-4.0,
            is_fully_co_located=True,
        ),
        CoLocatedIcebergObservation(
            iceberg_id="TEST_BERG",
            calendar_date="2020-01-03",
            timestamp=dt3,
            latitude=-64.68,
            longitude=-44.48,
            is_direct_fix=True,
            size_major_km=20.0,
            size_minor_km=10.0,
            size_source="nic_direct",
            size_is_imputed=False,
            is_stationary=False,
            observed_speed_km_day=17.0,
            observed_bearing_deg=48.0,
            ocean_u=0.21,
            ocean_v=0.11,
            wind_u_10m=10.5,
            wind_v_10m=-4.5,
            is_fully_co_located=True,
        ),
        CoLocatedIcebergObservation(
            iceberg_id="TEST_BERG",
            calendar_date="2020-01-04",
            timestamp=dt4,
            latitude=-64.50,
            longitude=-44.20,
            is_direct_fix=True,
            size_major_km=20.0,
            size_minor_km=10.0,
            size_source="nic_direct",
            size_is_imputed=False,
            is_stationary=False,
            observed_speed_km_day=16.0,
            observed_bearing_deg=46.0,
            ocean_u=0.20,
            ocean_v=0.10,
            wind_u_10m=10.0,
            wind_v_10m=-5.0,
            is_fully_co_located=True,
        ),
    ]

    steps, metrics = run_trajectory_hindcast(obs)
    assert len(steps) == 4
    
    step0 = steps[0]
    assert step0.has_gt_24h
    assert step0.has_gt_48h
    assert step0.has_gt_72h
    assert step0.wagner_error_24h_km is not None
    assert step0.persistence_error_24h_km is not None
    assert step0.wagner_along_track_24h_km is not None
    assert step0.wagner_cross_track_24h_km is not None

    # Error increases with forecast horizon (24h < 48h < 72h)
    assert step0.wagner_error_24h_km < step0.wagner_error_48h_km < step0.wagner_error_72h_km
    assert metrics["wagner_errors_overall"]["mae_24h_km"] is not None
