"""Bathymetry & seafloor elevation provider interface (GEBCO 2024 / IBCSO v2)."""

from typing import Dict, List, Optional, Any
from datetime import datetime
from .base import BaseEnvironmentalProvider
from ..schemas import EnvironmentalVariableProvenance, EnvironmentalQuery
from ..quality import validate_bathymetry, validate_coordinates
from ..interpolation import bilinear_interpolate_2d


class BathymetryProvider(BaseEnvironmentalProvider):
    """Abstract interface and grid-reader for seafloor elevation/depth (D_bath in meters)."""

    def __init__(self, dataset_name: str = "GEBCO_2024"):
        self._dataset_name = dataset_name
        self._grid_cache: Dict[str, Any] = {}

    @property
    def dataset_name(self) -> str:
        return self._dataset_name

    @property
    def supported_variables(self) -> List[str]:
        return ["bathymetry_depth"]

    def is_available_at(self, timestamp: datetime, latitude: float, longitude: float) -> bool:
        valid_coord, _ = validate_coordinates(latitude, longitude)
        # Bathymetry is static across time
        return valid_coord

    def get_variables(
        self, query: EnvironmentalQuery
    ) -> Dict[str, EnvironmentalVariableProvenance]:
        """Extract bathymetric depth in meters (negative below sea level)."""
        if not self.is_available_at(query.timestamp, query.latitude, query.longitude):
            return {
                "bathymetry_depth": EnvironmentalVariableProvenance(
                    variable_name="bathymetry_depth",
                    value=None,
                    units="m",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="OUT_OF_BOUNDS",
                )
            }

        if "depth_grid" not in self._grid_cache:
            return {
                "bathymetry_depth": EnvironmentalVariableProvenance(
                    variable_name="bathymetry_depth",
                    value=None,
                    units="m",
                    source_dataset=self._dataset_name,
                    is_missing=True,
                    quality_flag="MISSING",
                )
            }

        depth_val, depth_meth, node_lat, node_lon, dist_km = bilinear_interpolate_2d(
            query.latitude,
            query.longitude,
            self._grid_cache["lat_grid"],
            self._grid_cache["lon_grid"],
            self._grid_cache["depth_grid"],
            allow_nearest_fallback=query.allow_nearest_fallback,
        )

        is_valid, qc_flag = validate_bathymetry(depth_val)
        if not is_valid:
            depth_val = None

        return {
            "bathymetry_depth": EnvironmentalVariableProvenance(
                variable_name="bathymetry_depth",
                value=depth_val,
                units="m",
                source_dataset=self._dataset_name,
                source_timestamp=query.timestamp,
                source_latitude=node_lat,
                source_longitude=node_lon,
                interpolation_method=depth_meth,
                spatial_distance_km=dist_km,
                is_interpolated=depth_meth in ("bilinear", "nearest"),
                is_missing=depth_val is None,
                quality_flag=qc_flag,
            )
        }

    def load_grid_slice(
        self,
        lat_grid: List[float],
        lon_grid: List[float],
        depth_grid: List[List[Optional[float]]],
    ) -> None:
        self._grid_cache = {
            "lat_grid": lat_grid,
            "lon_grid": lon_grid,
            "depth_grid": depth_grid,
        }
