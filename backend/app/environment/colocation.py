"""Spatiotemporal Co-Location Engine for Antarctic Iceberg Trajectories.

Matches observed iceberg positions (lat, lon, t) with physical environmental forcing
(GLORYS ocean currents, ERA5 winds, OISST, NSIDC sea ice, GEBCO bathymetry) while
strictly enforcing NO FUTURE DATA LEAKAGE.
"""

from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from ..schemas.iceberg import TrajectoryFeaturePoint
from .schemas import CanonicalEnvironmentalRecord, EnvironmentalVariableProvenance
from .environmental_service import EnvironmentalService


class CoLocatedIcebergObservation(BaseModel):
    """Iceberg observation paired with spatiotemporally co-located physical forcing and provenance."""
    iceberg_id: str
    calendar_date: str
    timestamp: datetime
    latitude: float
    longitude: float
    is_direct_fix: bool
    size_major_km: Optional[float] = None
    size_minor_km: Optional[float] = None
    size_source: str
    size_is_imputed: bool
    is_stationary: bool
    observed_speed_km_day: float
    observed_bearing_deg: Optional[float] = None

    # Environmental Forcing
    ocean_u: Optional[float] = None
    ocean_v: Optional[float] = None
    wind_u_10m: Optional[float] = None
    wind_v_10m: Optional[float] = None
    sst: Optional[float] = None
    sea_ice_concentration: Optional[float] = None
    bathymetry_depth: Optional[float] = None

    # Quality & Provenance
    is_fully_co_located: bool = False
    co_location_qc_flags: List[str] = Field(default_factory=list)
    environmental_provenance: Dict[str, Any] = Field(default_factory=dict)


def co_locate_trajectory(
    feature_points: List[TrajectoryFeaturePoint],
    environmental_service: EnvironmentalService,
    max_temporal_gap_hours: float = 24.0,
    max_spatial_gap_km: float = 50.0,
) -> Tuple[List[CoLocatedIcebergObservation], Dict[str, Any]]:
    """Co-locate an entire iceberg trajectory with physical environmental fields.
    
    CRITICAL NO-LEAKAGE RULE:
        At observation timestamp T, only environmental observations timestamped <= T
        are permitted to contribute to the analysis and subsequent hindcast.
    """
    co_located_list: List[CoLocatedIcebergObservation] = []
    
    total_points = len(feature_points)
    success_count = 0
    missing_ocean_count = 0
    missing_wind_count = 0
    missing_sst_count = 0
    direct_obs_count = 0
    interpolated_obs_count = 0

    for pt in feature_points:
        dt = datetime(
            pt.calendar_date.year,
            pt.calendar_date.month,
            pt.calendar_date.day,
            12, 0, 0,
            tzinfo=timezone.utc,
        )

        env_rec: CanonicalEnvironmentalRecord = environmental_service.get_environment(
            latitude=pt.latitude,
            longitude=pt.longitude,
            timestamp=dt,
            iceberg_id=pt.iceberg_id,
            max_temporal_gap_hours=max_temporal_gap_hours,
            max_spatial_gap_km=max_spatial_gap_km,
            allow_nearest_fallback=True,
        )

        qc_flags = []
        if env_rec.ocean_u is None or env_rec.ocean_v is None:
            qc_flags.append("MISSING_OCEAN_CURRENT")
            missing_ocean_count += 1
        if env_rec.wind_u_10m is None or env_rec.wind_v_10m is None:
            qc_flags.append("MISSING_WIND")
            missing_wind_count += 1
        if env_rec.sst is None:
            qc_flags.append("MISSING_SST")
            missing_sst_count += 1

        is_direct = not pt.is_interpolated
        if is_direct:
            direct_obs_count += 1
        else:
            interpolated_obs_count += 1

        is_full = env_rec.is_complete_for_kinematics
        if is_full:
            success_count += 1

        # Strict no future data leakage assertion
        for var_name, prov in env_rec.provenance.items():
            if prov.source_timestamp is not None and prov.source_timestamp > dt:
                raise ValueError(
                    f"DATA LEAKAGE DETECTED: Source timestamp {prov.source_timestamp} > Query timestamp {dt}"
                )

        co_obs = CoLocatedIcebergObservation(
            iceberg_id=pt.iceberg_id,
            calendar_date=pt.calendar_date.isoformat(),
            timestamp=dt,
            latitude=pt.latitude,
            longitude=pt.longitude,
            is_direct_fix=is_direct,
            size_major_km=pt.size_major_km,
            size_minor_km=pt.size_minor_km,
            size_source=pt.size_source,
            size_is_imputed=pt.size_is_imputed,
            is_stationary=pt.is_stationary,
            observed_speed_km_day=pt.speed_km_day,
            observed_bearing_deg=pt.bearing_deg,
            ocean_u=env_rec.ocean_u,
            ocean_v=env_rec.ocean_v,
            wind_u_10m=env_rec.wind_u_10m,
            wind_v_10m=env_rec.wind_v_10m,
            sst=env_rec.sst,
            sea_ice_concentration=env_rec.sea_ice_concentration,
            bathymetry_depth=env_rec.bathymetry_depth,
            is_fully_co_located=is_full,
            co_location_qc_flags=qc_flags,
            environmental_provenance={
                k: v.model_dump(mode="json") for k, v in env_rec.provenance.items()
            },
        )
        co_located_list.append(co_obs)

    stats = {
        "total_observations": total_points,
        "successfully_co_located": success_count,
        "co_location_success_rate_pct": round((success_count / total_points) * 100.0, 1) if total_points > 0 else 0.0,
        "direct_observations_count": direct_obs_count,
        "interpolated_observations_count": interpolated_obs_count,
        "missing_ocean_current_count": missing_ocean_count,
        "missing_wind_count": missing_wind_count,
        "missing_sst_count": missing_sst_count,
    }

    return co_located_list, stats
