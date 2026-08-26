"""Spatiotemporal interpolation engine for geophysical grids (bilinear, IDW, and time interpolation)."""

import math
from datetime import datetime
from typing import List, Tuple, Optional, Any
from ..physics.geodesy import haversine_distance_km
from .quality import normalize_longitude_180, is_sentinel_missing


def find_grid_indices_1d(val: float, grid_1d: List[float]) -> Tuple[int, int, float]:
    """Find lower and upper indices and normalized interpolation fraction in sorted 1D array.
    
    Returns:
        Tuple of (idx_low, idx_high, fraction t in [0, 1]).
    """
    n = len(grid_1d)
    if n < 2:
        return 0, 0, 0.0

    is_ascending = grid_1d[-1] > grid_1d[0]

    if is_ascending:
        if val <= grid_1d[0]:
            return 0, 0, 0.0
        if val >= grid_1d[-1]:
            return n - 1, n - 1, 0.0
        for i in range(n - 1):
            if grid_1d[i] <= val <= grid_1d[i + 1]:
                span = grid_1d[i + 1] - grid_1d[i]
                t = (val - grid_1d[i]) / span if span != 0 else 0.0
                return i, i + 1, t
    else:
        # Descending grid (common in latitude grids, e.g. 90 to -90)
        if val >= grid_1d[0]:
            return 0, 0, 0.0
        if val <= grid_1d[-1]:
            return n - 1, n - 1, 0.0
        for i in range(n - 1):
            if grid_1d[i] >= val >= grid_1d[i + 1]:
                span = grid_1d[i + 1] - grid_1d[i]
                t = (val - grid_1d[i]) / span if span != 0 else 0.0
                return i, i + 1, t

    return 0, 0, 0.0


def bilinear_interpolate_2d(
    target_lat: float,
    target_lon: float,
    lat_grid: List[float],
    lon_grid: List[float],
    values_2d: List[List[Optional[float]]],
    allow_nearest_fallback: bool = False,
) -> Tuple[Optional[float], str, Optional[float], Optional[float], float]:
    """Perform 2D bilinear interpolation over a structured regular latitude/longitude grid.
    
    Args:
        target_lat: Query latitude [-90, 90].
        target_lon: Query longitude [-180, 180].
        lat_grid: 1D array of grid latitudes.
        lon_grid: 1D array of grid longitudes.
        values_2d: 2D array of grid values [len(lat)][len(lon)].
        allow_nearest_fallback: Fallback to valid nearest neighbor if bounding cell has land/missing nodes.
        
    Returns:
        Tuple of (interpolated_value, method_used, node_lat, node_lon, distance_km).
    """
    target_lon_norm = normalize_longitude_180(target_lon)
    norm_lon_grid = [normalize_longitude_180(x) for x in lon_grid]

    i0, i1, t = find_grid_indices_1d(target_lat, lat_grid)
    j0, j1, u = find_grid_indices_1d(target_lon_norm, norm_lon_grid)

    lat0, lat1 = lat_grid[i0], lat_grid[i1]
    lon0, lon1 = norm_lon_grid[j0], norm_lon_grid[j1]

    # Bounding cell values
    q00 = values_2d[i0][j0]
    q01 = values_2d[i0][j1]
    q10 = values_2d[i1][j0]
    q11 = values_2d[i1][j1]

    # Check if all 4 corners are valid
    if (
        not is_sentinel_missing(q00)
        and not is_sentinel_missing(q01)
        and not is_sentinel_missing(q10)
        and not is_sentinel_missing(q11)
    ):
        # Full bilinear interpolation
        # f(t, u) = (1-t)*(1-u)*q00 + (1-t)*u*q01 + t*(1-u)*q10 + t*u*q11
        interp_val = (
            (1.0 - t) * (1.0 - u) * q00
            + (1.0 - t) * u * q01
            + t * (1.0 - u) * q10
            + t * u * q11
        )
        dist_km = haversine_distance_km(target_lat, target_lon_norm, lat0, lon0)
        return round(interp_val, 5), "bilinear", lat0, lon0, round(dist_km, 2)

    # If partial corners are masked (e.g. coastal land mask) and fallback allowed
    if allow_nearest_fallback:
        candidates = [
            (q00, lat0, lon0),
            (q01, lat0, lon1),
            (q10, lat1, lon0),
            (q11, lat1, lon1),
        ]
        valid_candidates = [c for c in candidates if not is_sentinel_missing(c[0])]
        if valid_candidates:
            # Pick valid candidate closest to target coordinate
            best = min(
                valid_candidates,
                key=lambda c: haversine_distance_km(target_lat, target_lon_norm, c[1], c[2]),
            )
            d_km = haversine_distance_km(target_lat, target_lon_norm, best[1], best[2])
            return round(best[0], 5), "nearest", best[1], best[2], round(d_km, 2)

    return None, "none", None, None, 0.0


def linear_interpolate_time(
    target_dt: datetime,
    dt0: datetime,
    dt1: datetime,
    val0: Optional[float],
    val1: Optional[float],
    max_gap_seconds: float = 86400.0,
) -> Tuple[Optional[float], bool]:
    """Perform linear temporal interpolation between two bounding time slices.
    
    Returns:
        Tuple of (interpolated_value, is_interpolated_flag).
    """
    if is_sentinel_missing(val0) and is_sentinel_missing(val1):
        return None, False
    if is_sentinel_missing(val0):
        return val1, False
    if is_sentinel_missing(val1):
        return val0, False

    t_span = (dt1 - dt0).total_seconds()
    if t_span <= 0.0:
        return val0, False
    if t_span > max_gap_seconds:
        # Exceeds maximum allowable temporal interpolation gap
        return None, False

    t_offset = (target_dt - dt0).total_seconds()
    frac = max(0.0, min(1.0, t_offset / t_span))
    interp_val = val0 + frac * (val1 - val0)
    return round(interp_val, 5), True
