"""Atmospheric 10m surface wind provider interface (ECMWF ERA5)."""

from typing import Dict, List, Optional, Any
from datetime import datetime
from .base import BaseEnvironmentalProvider
from ..schemas import EnvironmentalVariableProvenance, EnvironmentalQuery
from ..quality import validate_wind_velocity, validate_coordinates
from ..interpolation import bilinear_interpolate_2d


class AtmosphericWindProvider(BaseEnvironmentalProvider):
    """Abstract interface and grid-reader for 10m surface wind velocity (u_a, v_a)."""

    def __init__(self, dataset_name: str = "ERA5"):
        self._dataset_name = dataset_name
        self._grid_cache: Dict[str, Any] = {}

    @property
    def dataset_name(self) -> str:
        return self._dataset_name

    @property
    def supported_variables(self) -> List[str]:
        return ["wind_u_10m", "wind_v_10m"]

    def is_available_at(self, timestamp: datetime, latitude: float, longitude: float) -> bool:
        valid_coord, _ = validate_coordinates(latitude, longitude)
        # ERA5 covers 1940 to present
        valid_time = 1940 <= timestamp.year <= 2026
        return valid_coord and valid_time

    def get_variables(
        self, query: EnvironmentalQuery
    ) -> Dict[str, EnvironmentalVariableProvenance]:
        """Extract 10m surface wind velocity u_a and v_a."""
        if not self.is_available_at(query.timestamp, query.latitude, query.longitude):
            return {
                "wind_u_10m": EnvironmentalVariableProvenance(
                    variable_name="wind_u_10m",
                    value=None,
                    units="m/s",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="OUT_OF_BOUNDS",
                ),
                "wind_v_10m": EnvironmentalVariableProvenance(
                    variable_name="wind_v_10m",
                    value=None,
                    units="m/s",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="OUT_OF_BOUNDS",
                ),
            }

        if "u_grid" not in self._grid_cache or "v_grid" not in self._grid_cache:
            return {
                "wind_u_10m": EnvironmentalVariableProvenance(
                    variable_name="wind_u_10m",
                    value=None,
                    units="m/s",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="MISSING",
                ),
                "wind_v_10m": EnvironmentalVariableProvenance(
                    variable_name="wind_v_10m",
                    value=None,
                    units="m/s",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="MISSING",
                ),
            }

        u_val, u_meth, node_lat, node_lon, dist_km = bilinear_interpolate_2d(
            query.latitude,
            query.longitude,
            self._grid_cache["lat_grid"],
            self._grid_cache["lon_grid"],
            self._grid_cache["u_grid"],
            allow_nearest_fallback=query.allow_nearest_fallback,
        )
        v_val, v_meth, _, _, _ = bilinear_interpolate_2d(
            query.latitude,
            query.longitude,
            self._grid_cache["lat_grid"],
            self._grid_cache["lon_grid"],
            self._grid_cache["v_grid"],
            allow_nearest_fallback=query.allow_nearest_fallback,
        )

        is_valid, qc_flag = validate_wind_velocity(u_val, v_val)
        if not is_valid:
            u_val, v_val = None, None

        return {
            "wind_u_10m": EnvironmentalVariableProvenance(
                variable_name="wind_u_10m",
                value=u_val,
                units="m/s",
                source_dataset=self._dataset_name,
                source_timestamp=query.timestamp,
                source_latitude=node_lat,
                source_longitude=node_lon,
                interpolation_method=u_meth,
                spatial_distance_km=dist_km,
                is_interpolated=u_meth in ("bilinear", "nearest"),
                is_missing=u_val is None,
                quality_flag=qc_flag,
            ),
            "wind_v_10m": EnvironmentalVariableProvenance(
                variable_name="wind_v_10m",
                value=v_val,
                units="m/s",
                source_dataset=self._dataset_name,
                source_timestamp=query.timestamp,
                source_latitude=node_lat,
                source_longitude=node_lon,
                interpolation_method=v_meth,
                spatial_distance_km=dist_km,
                is_interpolated=v_meth in ("bilinear", "nearest"),
                is_missing=v_val is None,
                quality_flag=qc_flag,
            ),
        }

    def load_grid_slice(
        self,
        lat_grid: List[float],
        lon_grid: List[float],
        u_grid: List[List[Optional[float]]],
        v_grid: List[List[Optional[float]]],
    ) -> None:
        self._grid_cache = {
            "lat_grid": lat_grid,
            "lon_grid": lon_grid,
            "u_grid": u_grid,
            "v_grid": v_grid,
        }
