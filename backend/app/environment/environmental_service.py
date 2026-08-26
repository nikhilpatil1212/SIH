"""Central Environmental Service coordinator.

Decouples physics and ML pipelines from physical data providers, orchestrating
spatiotemporal queries, provenance aggregation, and Wagner input contract validation.
"""

from typing import Optional, Dict, List, Tuple
from datetime import datetime

from .schemas import (
    CanonicalEnvironmentalRecord,
    EnvironmentalVariableProvenance,
    EnvironmentalQuery,
    WagnerModelForcingContract,
)
from .providers.base import BaseEnvironmentalProvider
from .providers.ocean import OceanCurrentProvider
from .providers.wind import AtmosphericWindProvider
from .providers.sst import SeaSurfaceTemperatureProvider
from .providers.sea_ice import SeaIceConcentrationProvider
from .providers.bathymetry import BathymetryProvider
from .quality import validate_coordinates, normalize_longitude_180


class EnvironmentalService:
    """Orchestrator for polar environmental forcing datasets."""

    def __init__(
        self,
        ocean_provider: Optional[BaseEnvironmentalProvider] = None,
        wind_provider: Optional[BaseEnvironmentalProvider] = None,
        sst_provider: Optional[BaseEnvironmentalProvider] = None,
        sea_ice_provider: Optional[BaseEnvironmentalProvider] = None,
        bathymetry_provider: Optional[BaseEnvironmentalProvider] = None,
    ):
        self.ocean = ocean_provider or OceanCurrentProvider()
        self.wind = wind_provider or AtmosphericWindProvider()
        self.sst = sst_provider or SeaSurfaceTemperatureProvider()
        self.sea_ice = sea_ice_provider or SeaIceConcentrationProvider()
        self.bathymetry = bathymetry_provider or BathymetryProvider()

    def get_environment(
        self,
        latitude: float,
        longitude: float,
        timestamp: datetime,
        iceberg_id: Optional[str] = None,
        max_temporal_gap_hours: float = 24.0,
        max_spatial_gap_km: float = 50.0,
        allow_nearest_fallback: bool = False,
    ) -> CanonicalEnvironmentalRecord:
        """Extract all environmental forcing variables at a target coordinate and timestamp.
        
        Args:
            latitude: Target latitude in decimal degrees [-90, -40].
            longitude: Target longitude in decimal degrees [-180, 180].
            timestamp: UTC datetime of query.
            iceberg_id: Optional iceberg identifier for track context.
            max_temporal_gap_hours: Maximum allowable time separation from source grid slice.
            max_spatial_gap_km: Maximum allowable spatial distance from grid node.
            allow_nearest_fallback: If True, allows nearest neighbor fallback when bilinear fails.
            
        Returns:
            CanonicalEnvironmentalRecord with populated physical values and explicit provenance.
        """
        norm_lon = normalize_longitude_180(longitude)
        query = EnvironmentalQuery(
            iceberg_id=iceberg_id,
            timestamp=timestamp,
            latitude=latitude,
            longitude=norm_lon,
            max_temporal_gap_hours=max_temporal_gap_hours,
            max_spatial_gap_km=max_spatial_gap_km,
            allow_nearest_fallback=allow_nearest_fallback,
        )

        provenance_map: Dict[str, EnvironmentalVariableProvenance] = {}

        # 1. Ocean Currents (u_w, v_w)
        ocean_res = self.ocean.get_variables(query)
        provenance_map.update(ocean_res)
        ocean_u = ocean_res["ocean_u"].value
        ocean_v = ocean_res["ocean_v"].value

        # 2. 10m Atmospheric Wind (u_a, v_a)
        wind_res = self.wind.get_variables(query)
        provenance_map.update(wind_res)
        wind_u = wind_res["wind_u_10m"].value
        wind_v = wind_res["wind_v_10m"].value

        # 3. Sea Surface Temperature (T_w)
        sst_res = self.sst.get_variables(query)
        provenance_map.update(sst_res)
        sst_val = sst_res["sst"].value

        # 4. Sea-Ice Concentration (C_ice)
        sic_res = self.sea_ice.get_variables(query)
        provenance_map.update(sic_res)
        sic_val = sic_res["sea_ice_concentration"].value

        # 5. Bathymetry (D_bath)
        bathy_res = self.bathymetry.get_variables(query)
        provenance_map.update(bathy_res)
        bathy_depth = bathy_res["bathymetry_depth"].value

        # Check readiness for physics calculations
        is_kinematics_ready = (
            ocean_u is not None
            and ocean_v is not None
            and wind_u is not None
            and wind_v is not None
        )
        is_thermo_ready = is_kinematics_ready and sst_val is not None

        return CanonicalEnvironmentalRecord(
            timestamp=timestamp,
            latitude=latitude,
            longitude=norm_lon,
            ocean_u=ocean_u,
            ocean_v=ocean_v,
            wind_u_10m=wind_u,
            wind_v_10m=wind_v,
            sst=sst_val,
            sea_ice_concentration=sic_val,
            bathymetry_depth=bathy_depth,
            provenance=provenance_map,
            is_complete_for_kinematics=is_kinematics_ready,
            is_complete_for_thermodynamics=is_thermo_ready,
        )

    @staticmethod
    def build_wagner_forcing_contract(
        record: CanonicalEnvironmentalRecord,
    ) -> Tuple[Optional[WagnerModelForcingContract], List[str]]:
        """Validate canonical environmental record against Wagner et al. (2017) input contract.
        
        Returns:
            Tuple of (WagnerModelForcingContract if valid, list of missing/rejected error strings).
        """
        missing_errors = []
        if record.ocean_u is None or record.ocean_v is None:
            missing_errors.append("Missing surface ocean current velocity (u_w, v_w)")
        if record.wind_u_10m is None or record.wind_v_10m is None:
            missing_errors.append("Missing 10m surface wind velocity (u_a, v_a)")

        if missing_errors:
            return None, missing_errors

        contract = WagnerModelForcingContract(
            latitude=record.latitude,
            longitude=record.longitude,
            ocean_u=record.ocean_u,
            ocean_v=record.ocean_v,
            wind_u=record.wind_u_10m,
            wind_v=record.wind_v_10m,
            sea_surface_temp_c=record.sst,
            is_fully_validated=True,
        )
        return contract, []
