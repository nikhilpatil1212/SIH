"""Automated unit and integration tests for the Environmental Data Integration Layer."""

import pytest
import math
from datetime import datetime, timezone

from app.environment.schemas import (
    EnvironmentalVariableProvenance,
    CanonicalEnvironmentalRecord,
    EnvironmentalQuery,
    WagnerModelForcingContract,
)
from app.environment.quality import (
    normalize_longitude_180,
    normalize_longitude_360,
    validate_coordinates,
    validate_ocean_current,
    validate_wind_velocity,
    validate_sst,
    validate_sea_ice_concentration,
    validate_bathymetry,
    is_sentinel_missing,
)
from app.environment.interpolation import (
    find_grid_indices_1d,
    bilinear_interpolate_2d,
    linear_interpolate_time,
)
from app.environment.providers.ocean import OceanCurrentProvider
from app.environment.providers.wind import AtmosphericWindProvider
from app.environment.providers.sst import SeaSurfaceTemperatureProvider
from app.environment.providers.sea_ice import SeaIceConcentrationProvider
from app.environment.providers.bathymetry import BathymetryProvider
from app.environment.environmental_service import EnvironmentalService


def test_longitude_normalization():
    # ERA5 / ECCO2 0..360 to -180..180
    assert normalize_longitude_180(350.0) == -10.0
    assert normalize_longitude_180(190.0) == -170.0
    assert normalize_longitude_180(0.0) == -180.0 or normalize_longitude_180(0.0) == 0.0 or math.isclose(normalize_longitude_180(0.0), 0.0, abs_tol=1e-5)
    assert normalize_longitude_180(180.0) == 0.0 or math.isclose(abs(normalize_longitude_180(180.0)), 180.0, abs_tol=1e-5)
    assert normalize_longitude_180(45.0) == 45.0
    assert normalize_longitude_180(-45.0) == -45.0


def test_quality_control_bounds():
    # Valid Southern Ocean coordinate
    valid, msg = validate_coordinates(-65.0, -45.0)
    assert valid

    # Tropical / Northern latitude rejected
    invalid, msg = validate_coordinates(10.0, -45.0)
    assert not invalid
    assert "Southern Ocean domain" in msg

    # Ocean current sanity check
    assert validate_ocean_current(0.3, -0.2)[0]
    assert not validate_ocean_current(5.0, 0.0)[0]  # Impossible speed > 3.5 m/s

    # Wind speed sanity check
    assert validate_wind_velocity(15.0, -10.0)[0]
    assert not validate_wind_velocity(80.0, 0.0)[0]  # Impossible wind > 65 m/s

    # SST sanity check
    assert validate_sst(-1.5)[0]
    assert not validate_sst(-5.0)[0]  # Below freezing limit

    # SIC sanity check
    assert validate_sea_ice_concentration(0.85)[0]
    assert not validate_sea_ice_concentration(1.5)[0]  # Out of [0, 1]

    # Sentinel detection
    assert is_sentinel_missing(1e20)
    assert is_sentinel_missing(-9999.0)
    assert is_sentinel_missing(float("nan"))
    assert not is_sentinel_missing(0.25)


def test_1d_grid_search():
    grid_asc = [-70.0, -65.0, -60.0, -55.0]
    i0, i1, t = find_grid_indices_1d(-62.5, grid_asc)
    assert (i0, i1) == (1, 2)
    assert math.isclose(t, 0.5, abs_tol=1e-4)

    grid_desc = [-55.0, -60.0, -65.0, -70.0]
    j0, j1, u = find_grid_indices_1d(-62.5, grid_desc)
    assert (j0, j1) == (1, 2)
    assert math.isclose(u, 0.5, abs_tol=1e-4)


def test_bilinear_interpolation_2d():
    lat_grid = [-70.0, -60.0]
    lon_grid = [10.0, 20.0]
    # Unit plane f(lat, lon) = lat + lon
    values = [
        [-70.0 + 10.0, -70.0 + 20.0],  # [-60, -50]
        [-60.0 + 10.0, -60.0 + 20.0],  # [-50, -40]
    ]

    val, meth, n_lat, n_lon, dist_km = bilinear_interpolate_2d(
        target_lat=-65.0, target_lon=15.0, lat_grid=lat_grid, lon_grid=lon_grid, values_2d=values
    )
    assert meth == "bilinear"
    # Exact midpoint value should be -65.0 + 15.0 = -50.0
    assert math.isclose(val, -50.0, abs_tol=1e-3)


def test_linear_time_interpolation():
    t0 = datetime(2020, 1, 1, 0, 0, tzinfo=timezone.utc)
    t1 = datetime(2020, 1, 2, 0, 0, tzinfo=timezone.utc)
    target = datetime(2020, 1, 1, 12, 0, tzinfo=timezone.utc)

    val, is_interp = linear_interpolate_time(target, t0, t1, 10.0, 20.0)
    assert is_interp
    assert math.isclose(val, 15.0, abs_tol=1e-3)


def test_environmental_service_with_loaded_providers():
    # Setup mock grid slices for small representative test
    lat_grid = [-70.0, -65.0, -60.0]
    lon_grid = [-50.0, -45.0, -40.0]

    ocean = OceanCurrentProvider()
    ocean.load_grid_slice(
        lat_grid=lat_grid,
        lon_grid=lon_grid,
        u_grid=[[0.15, 0.20, 0.25], [0.18, 0.22, 0.28], [0.20, 0.25, 0.30]],
        v_grid=[[0.05, 0.08, 0.10], [0.06, 0.09, 0.12], [0.08, 0.10, 0.15]],
    )

    wind = AtmosphericWindProvider()
    wind.load_grid_slice(
        lat_grid=lat_grid,
        lon_grid=lon_grid,
        u_grid=[[8.0, 9.0, 10.0], [8.5, 9.5, 10.5], [9.0, 10.0, 11.0]],
        v_grid=[[-4.0, -5.0, -6.0], [-4.5, -5.5, -6.5], [-5.0, -6.0, -7.0]],
    )

    sst = SeaSurfaceTemperatureProvider()
    sst.load_grid_slice(
        lat_grid=lat_grid,
        lon_grid=lon_grid,
        sst_grid=[[-1.2, -1.0, -0.8], [-0.5, 0.0, 0.5], [1.0, 1.5, 2.0]],
    )

    service = EnvironmentalService(ocean_provider=ocean, wind_provider=wind, sst_provider=sst)

    # Query coordinate inside grid
    query_dt = datetime(2020, 5, 15, 12, 0, tzinfo=timezone.utc)
    rec = service.get_environment(latitude=-67.5, longitude=-47.5, timestamp=query_dt, iceberg_id="B27")

    assert rec.is_complete_for_kinematics
    assert rec.is_complete_for_thermodynamics
    assert rec.ocean_u is not None
    assert rec.wind_u_10m is not None
    assert rec.sst is not None
    assert rec.provenance["ocean_u"].interpolation_method == "bilinear"
    assert rec.provenance["ocean_u"].quality_flag == "VALID"

    # Contract generation
    contract, errors = service.build_wagner_forcing_contract(rec)
    assert errors == []
    assert contract is not None
    assert contract.is_fully_validated
    assert math.isclose(contract.latitude, -67.5)


def test_missing_variable_contract_rejection():
    # Empty service with no loaded grids
    service = EnvironmentalService()
    query_dt = datetime(2020, 5, 15, 12, 0, tzinfo=timezone.utc)
    rec = service.get_environment(latitude=-67.5, longitude=-47.5, timestamp=query_dt)

    assert not rec.is_complete_for_kinematics
    assert rec.provenance["ocean_u"].is_missing
    assert rec.provenance["wind_u_10m"].is_missing

    # Contract must reject missing values rather than synthesizing zeros
    contract, errors = service.build_wagner_forcing_contract(rec)
    assert contract is None
    assert len(errors) >= 2
