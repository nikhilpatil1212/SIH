"""Sea Surface Temperature (SST) provider interface (NOAA OISST v2.1 / ERA5 SST)."""

from typing import Dict, List, Optional, Any
from datetime import datetime
from .base import BaseEnvironmentalProvider
from ..schemas import EnvironmentalVariableProvenance, EnvironmentalQuery
from ..quality import validate_sst, validate_coordinates
from ..interpolation import bilinear_interpolate_2d


class SeaSurfaceTemperatureProvider(BaseEnvironmentalProvider):
    """Abstract interface and grid-reader for Sea Surface Temperature (T_w in Celsius)."""

    def __init__(self, dataset_name: str = "OISSTv2.1"):
        self._dataset_name = dataset_name
        self._grid_cache: Dict[str, Any] = {}

    @property
    def dataset_name(self) -> str:
        return self._dataset_name

    @property
    def supported_variables(self) -> List[str]:
        return ["sst"]

    def is_available_at(self, timestamp: datetime, latitude: float, longitude: float) -> bool:
        valid_coord, _ = validate_coordinates(latitude, longitude)
        # OISST v2.1 covers Sept 1981 to present
        valid_time = 1981 <= timestamp.year <= 2026
        return valid_coord and valid_time

    def get_variables(
        self, query: EnvironmentalQuery
    ) -> Dict[str, EnvironmentalVariableProvenance]:
        """Extract sea surface temperature in Celsius."""
        if not self.is_available_at(query.timestamp, query.latitude, query.longitude):
            return {
                "sst": EnvironmentalVariableProvenance(
                    variable_name="sst",
                    value=None,
                    units="degC",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="OUT_OF_BOUNDS",
                )
            }

        if "sst_grid" not in self._grid_cache:
            return {
                "sst": EnvironmentalVariableProvenance(
                    variable_name="sst",
                    value=None,
                    units="degC",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="MISSING",
                )
            }

        sst_val, sst_meth, node_lat, node_lon, dist_km = bilinear_interpolate_2d(
            query.latitude,
            query.longitude,
            self._grid_cache["lat_grid"],
            self._grid_cache["lon_grid"],
            self._grid_cache["sst_grid"],
            allow_nearest_fallback=query.allow_nearest_fallback,
        )

        is_valid, qc_flag = validate_sst(sst_val)
        if not is_valid:
            sst_val = None

        return {
            "sst": EnvironmentalVariableProvenance(
                variable_name="sst",
                value=sst_val,
                units="degC",
                source_dataset=self._dataset_name,
                source_timestamp=query.timestamp,
                source_latitude=node_lat,
                source_longitude=node_lon,
                interpolation_method=sst_meth,
                spatial_distance_km=dist_km,
                is_interpolated=sst_meth in ("bilinear", "nearest"),
                is_missing=sst_val is None,
                quality_flag=qc_flag,
            )
        }

    def load_grid_slice(
        self,
        lat_grid: List[float],
        lon_grid: List[float],
        sst_grid: List[List[Optional[float]]],
    ) -> None:
        self._grid_cache = {
            "lat_grid": lat_grid,
            "lon_grid": lon_grid,
            "sst_grid": sst_grid,
        }
