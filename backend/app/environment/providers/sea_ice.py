"""Sea-Ice Concentration (SIC) provider interface (NSIDC CDR / OSI-SAF)."""

from typing import Dict, List, Optional, Any
from datetime import datetime
from .base import BaseEnvironmentalProvider
from ..schemas import EnvironmentalVariableProvenance, EnvironmentalQuery
from ..quality import validate_sea_ice_concentration, validate_coordinates
from ..interpolation import bilinear_interpolate_2d


class SeaIceConcentrationProvider(BaseEnvironmentalProvider):
    """Abstract interface and grid-reader for fractional Sea-Ice Concentration (C_ice in [0.0, 1.0])."""

    def __init__(self, dataset_name: str = "NSIDC_CDR_v4"):
        self._dataset_name = dataset_name
        self._grid_cache: Dict[str, Any] = {}

    @property
    def dataset_name(self) -> str:
        return self._dataset_name

    @property
    def supported_variables(self) -> List[str]:
        return ["sea_ice_concentration"]

    def is_available_at(self, timestamp: datetime, latitude: float, longitude: float) -> bool:
        valid_coord, _ = validate_coordinates(latitude, longitude)
        # SMMR/SSMI/AMSR2 CDR covers Oct 1978 to present
        valid_time = 1978 <= timestamp.year <= 2026
        return valid_coord and valid_time

    def get_variables(
        self, query: EnvironmentalQuery
    ) -> Dict[str, EnvironmentalVariableProvenance]:
        """Extract fractional sea-ice concentration."""
        if not self.is_available_at(query.timestamp, query.latitude, query.longitude):
            return {
                "sea_ice_concentration": EnvironmentalVariableProvenance(
                    variable_name="sea_ice_concentration",
                    value=None,
                    units="fraction",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="OUT_OF_BOUNDS",
                )
            }

        if "sic_grid" not in self._grid_cache:
            return {
                "sea_ice_concentration": EnvironmentalVariableProvenance(
                    variable_name="sea_ice_concentration",
                    value=None,
                    units="fraction",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="MISSING",
                )
            }

        sic_val, sic_meth, node_lat, node_lon, dist_km = bilinear_interpolate_2d(
            query.latitude,
            query.longitude,
            self._grid_cache["lat_grid"],
            self._grid_cache["lon_grid"],
            self._grid_cache["sic_grid"],
            allow_nearest_fallback=query.allow_nearest_fallback,
        )

        is_valid, qc_flag = validate_sea_ice_concentration(sic_val)
        if not is_valid:
            sic_val = None

        return {
            "sea_ice_concentration": EnvironmentalVariableProvenance(
                variable_name="sea_ice_concentration",
                value=sic_val,
                units="fraction",
                source_dataset=self._dataset_name,
                source_timestamp=query.timestamp,
                source_latitude=node_lat,
                source_longitude=node_lon,
                interpolation_method=sic_meth,
                spatial_distance_km=dist_km,
                is_interpolated=sic_meth in ("bilinear", "nearest"),
                is_missing=sic_val is None,
                quality_flag=qc_flag,
            )
        }

    def load_grid_slice(
        self,
        lat_grid: List[float],
        lon_grid: List[float],
        sic_grid: List[List[Optional[float]]],
    ) -> None:
        self._grid_cache = {
            "lat_grid": lat_grid,
            "lon_grid": lon_grid,
            "sic_grid": sic_grid,
        }
