"""Quality control, range checking, coordinate normalization, and validity filters
for polar environmental datasets.
"""

import math
from typing import Tuple, Optional, Dict, Any

# Physically established Antarctic oceanographic and atmospheric limits:
LATITUDE_MIN_DEG = -90.0
LATITUDE_MAX_DEG = -40.0

LONGITUDE_MIN_DEG = -180.0
LONGITUDE_MAX_DEG = 180.0

OCEAN_VELOCITY_MAX_M_S = 3.5     # Max physical surface current velocity in Southern Ocean / ACC jets
WIND_SPEED_MAX_M_S = 65.0        # Max physical 10m wind velocity (severe Antarctic storms / katabatic winds)
SST_MIN_CELSIUS = -2.5           # Freezing point of polar seawater is ~ -1.9 C
SST_MAX_CELSIUS = 30.0           # Max global SST

SEA_ICE_CONCENTRATION_MIN = 0.0
SEA_ICE_CONCENTRATION_MAX = 1.0

BATHYMETRY_MIN_DEPTH_M = -11000.0 # Challenger Deep lower bound
BATHYMETRY_MAX_ELEV_M = 5000.0    # Antarctic ice sheet elevation bound

SENTINEL_MISSING_VALUES = {
    1e20, -1e20, 9999.0, -9999.0, 999.0, -999.0, 32767, -32767, 1e36, -1e36
}


def normalize_longitude_180(lon: float) -> float:
    """Normalize longitude from any convention (e.g. [0, 360] in ECCO2/ERA5) to [-180, 180]."""
    return ((lon + 180.0) % 360.0) - 180.0


def normalize_longitude_360(lon: float) -> float:
    """Normalize longitude from [-180, 180] to [0, 360] for datasets using positive east grid."""
    return lon % 360.0


def is_sentinel_missing(value: Optional[float]) -> bool:
    """Check if value is None, NaN, Inf, or a known NetCDF/GRIB sentinel missing value."""
    if value is None:
        return True
    if math.isnan(value) or math.isinf(value):
        return True
    for sentinel in SENTINEL_MISSING_VALUES:
        if math.isclose(value, sentinel, rel_tol=1e-4, abs_tol=1e-4):
            return True
    return False


def validate_coordinates(lat: float, lon: float) -> Tuple[bool, str]:
    """Validate that query coordinate lies within the valid Southern Ocean polar domain."""
    if not (LATITUDE_MIN_DEG <= lat <= LATITUDE_MAX_DEG):
        return False, f"Latitude {lat} out of Southern Ocean domain [{LATITUDE_MIN_DEG}, {LATITUDE_MAX_DEG}]"
    norm_lon = normalize_longitude_180(lon)
    if not (LONGITUDE_MIN_DEG <= norm_lon <= LONGITUDE_MAX_DEG):
        return False, f"Longitude {lon} out of bounds"
    return True, "VALID"


def validate_ocean_current(u: Optional[float], v: Optional[float]) -> Tuple[bool, str]:
    """Validate ocean current velocity components (u_w, v_w)."""
    if is_sentinel_missing(u) or is_sentinel_missing(v):
        return False, "MISSING"
    speed = math.sqrt(u ** 2 + v ** 2)
    if speed > OCEAN_VELOCITY_MAX_M_S:
        return False, f"OUT_OF_BOUNDS: Ocean speed {speed:.2f} m/s exceeds max limit {OCEAN_VELOCITY_MAX_M_S} m/s"
    return True, "VALID"


def validate_wind_velocity(u: Optional[float], v: Optional[float]) -> Tuple[bool, str]:
    """Validate 10m surface wind velocity components (u_a, v_a)."""
    if is_sentinel_missing(u) or is_sentinel_missing(v):
        return False, "MISSING"
    speed = math.sqrt(u ** 2 + v ** 2)
    if speed > WIND_SPEED_MAX_M_S:
        return False, f"OUT_OF_BOUNDS: Wind speed {speed:.2f} m/s exceeds physical limit {WIND_SPEED_MAX_M_S} m/s"
    return True, "VALID"


def validate_sst(sst_c: Optional[float]) -> Tuple[bool, str]:
    """Validate sea surface temperature in Celsius."""
    if is_sentinel_missing(sst_c):
        return False, "MISSING"
    if not (SST_MIN_CELSIUS <= sst_c <= SST_MAX_CELSIUS):
        return False, f"OUT_OF_BOUNDS: SST {sst_c:.2f} C outside valid range [{SST_MIN_CELSIUS}, {SST_MAX_CELSIUS}]"
    return True, "VALID"


def validate_sea_ice_concentration(sic: Optional[float]) -> Tuple[bool, str]:
    """Validate fractional sea-ice concentration [0.0, 1.0]."""
    if is_sentinel_missing(sic):
        return False, "MISSING"
    if not (SEA_ICE_CONCENTRATION_MIN <= sic <= SEA_ICE_CONCENTRATION_MAX):
        return False, f"OUT_OF_BOUNDS: SIC {sic:.2f} outside [0.0, 1.0]"
    return True, "VALID"


def validate_bathymetry(depth_m: Optional[float]) -> Tuple[bool, str]:
    """Validate seafloor bathymetric depth/elevation."""
    if is_sentinel_missing(depth_m):
        return False, "MISSING"
    if not (BATHYMETRY_MIN_DEPTH_M <= depth_m <= BATHYMETRY_MAX_ELEV_M):
        return False, f"OUT_OF_BOUNDS: Depth {depth_m} m outside valid range"
    return True, "VALID"
