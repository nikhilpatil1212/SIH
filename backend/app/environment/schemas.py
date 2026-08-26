"""Canonical schemas for Antarctic environmental forcing variables and provenance metadata."""

from datetime import datetime
from typing import Dict, Optional, List
from pydantic import BaseModel, Field


class EnvironmentalVariableProvenance(BaseModel):
    """Detailed scientific provenance, spatial/temporal offsets, and interpolation metadata for a single variable."""
    variable_name: str = Field(..., description="Standard variable identifier (e.g., 'ocean_u', 'wind_u_10m')")
    value: Optional[float] = Field(None, description="Extracted numerical value (None if missing/out-of-bounds)")
    units: str = Field(..., description="Physical SI/standard units (e.g., 'm/s', 'degC', 'fraction')")
    source_dataset: str = Field(..., description="Authoritative dataset name (e.g., 'GLORYS12V1', 'ERA5', 'OISSTv2.1', 'GEBCO2024')")
    source_timestamp: Optional[datetime] = Field(None, description="Exact timestamp of source grid time slice")
    source_latitude: Optional[float] = Field(None, description="Grid latitude of matched/nearest node")
    source_longitude: Optional[float] = Field(None, description="Grid longitude of matched/nearest node")
    interpolation_method: str = Field("none", description="Method applied: 'exact', 'bilinear', 'idw', 'nearest', 'none'")
    temporal_delta_seconds: Optional[float] = Field(None, description="Time gap between query and source slice in seconds")
    spatial_distance_km: Optional[float] = Field(None, description="Spatial offset between query coordinate and grid node in km")
    is_interpolated: bool = Field(False, description="True if value is spatiotemporally interpolated across grid nodes")
    is_missing: bool = Field(True, description="True if variable is unavailable, missing, or rejected by QC")
    quality_flag: str = Field("MISSING", description="QC flag: 'VALID', 'SUSPECT', 'OUT_OF_BOUNDS', 'MISSING'")


class CanonicalEnvironmentalRecord(BaseModel):
    """Canonical environmental forcing record at a specific timestamp and geographic coordinate."""
    timestamp: datetime = Field(..., description="Query UTC timestamp")
    latitude: float = Field(..., description="Query latitude in decimal degrees [-90, -40]")
    longitude: float = Field(..., description="Query longitude in decimal degrees [-180, 180]")

    # Ocean Surface Velocity (Wagner et al. 2017 primary forcing v_w)
    ocean_u: Optional[float] = Field(None, description="Surface ocean current zonal velocity in m/s (Eastward positive)")
    ocean_v: Optional[float] = Field(None, description="Surface ocean current meridional velocity in m/s (Northward positive)")

    # 10m Atmospheric Wind (Wagner et al. 2017 air drag forcing v_a)
    wind_u_10m: Optional[float] = Field(None, description="10m surface wind zonal velocity in m/s (Eastward positive)")
    wind_v_10m: Optional[float] = Field(None, description="10m surface wind meridional velocity in m/s (Northward positive)")

    # Sea Surface Temperature (Wagner et al. 2017 thermodynamic decay T_w)
    sst: Optional[float] = Field(None, description="Sea surface temperature in Celsius")

    # Sea-Ice Concentration (Boundary resistance / pack-ice lock)
    sea_ice_concentration: Optional[float] = Field(None, description="Fractional sea-ice concentration [0.0, 1.0]")

    # Bathymetry (Grounding evaluation)
    bathymetry_depth: Optional[float] = Field(None, description="Seafloor elevation/depth in meters (negative below sea level)")

    # Explicit provenance map for every variable
    provenance: Dict[str, EnvironmentalVariableProvenance] = Field(
        default_factory=dict, description="Metadata dictionary keyed by standard variable name"
    )

    # Readiness flags
    is_complete_for_kinematics: bool = Field(
        False, description="True if ocean currents (u_w, v_w) and wind (u_a, v_a) are both valid and present"
    )
    is_complete_for_thermodynamics: bool = Field(
        False, description="True if kinematics + SST are valid and present"
    )


class EnvironmentalQuery(BaseModel):
    """Spatiotemporal query parameters for extracting environmental conditions."""
    iceberg_id: Optional[str] = Field(None, description="Iceberg identifier for tracking and context")
    timestamp: datetime = Field(..., description="Target UTC datetime")
    latitude: float = Field(..., description="Target latitude in decimal degrees [-90, -40]")
    longitude: float = Field(..., description="Target longitude in decimal degrees [-180, 180]")
    max_temporal_gap_hours: float = Field(24.0, description="Maximum allowable time separation from source grid")
    max_spatial_gap_km: float = Field(50.0, description="Maximum allowable distance from source grid node")
    allow_nearest_fallback: bool = Field(False, description="Allow nearest-neighbor fallback if bilinear fails")


class WagnerModelForcingContract(BaseModel):
    """Validated input contract ready for direct execution by the Wagner et al. (2017) physics engine."""
    latitude: float = Field(..., description="Latitude in decimal degrees (determines Coriolis parameter f)")
    longitude: float = Field(..., description="Longitude in decimal degrees")
    ocean_u: float = Field(..., description="Surface ocean current zonal velocity u_w in m/s")
    ocean_v: float = Field(..., description="Surface ocean current meridional velocity v_w in m/s")
    wind_u: float = Field(..., description="Surface 10m wind zonal velocity u_a in m/s")
    wind_v: float = Field(..., description="Surface 10m wind meridional velocity v_a in m/s")
    sea_surface_temp_c: Optional[float] = Field(None, description="Sea surface temperature in Celsius")
    is_fully_validated: bool = Field(..., description="True if all physics velocity components passed physical bounds checks")
