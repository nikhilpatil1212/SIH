"""Physical Regime Detection and State Classifier for Antarctic Icebergs.

Classifies iceberg state into:
1. GROUNDED (Seabed reaction force dominates; zero drift / pinning)
2. ICE_LOCKED (Dense pack-ice internal stress damping; slow / constrained drift)
3. FREE_DRIFT (Open-water equilibrium; Wagner analytical drift + ML residual)
"""

from enum import Enum
from typing import Dict, Any, Optional


class PhysicalRegime(str, Enum):
    GROUNDED = "GROUNDED"
    ICE_LOCKED = "ICE_LOCKED"
    FREE_DRIFT = "FREE_DRIFT"


def detect_physical_regime(
    latitude: float,
    longitude: float,
    draft_m: float = 250.0,
    bathymetry_depth_m: Optional[float] = None,
    sea_ice_concentration: Optional[float] = None,
    observed_speed_km_day: Optional[float] = None,
    stationary_streak_days: int = 0,
    sea_ice_threshold: float = 0.85,
) -> Dict[str, Any]:
    """Detects physical drift regime using bathymetry, sea-ice concentration, and kinematic history."""
    reasons = []
    
    # 1. Grounding check
    # In Antarctic waters, shelf banks (Berkner Bank, Pennell Bank, Filchner sill) are 150-350m deep
    is_grounded = False
    if bathymetry_depth_m is not None:
        depth_abs = abs(bathymetry_depth_m)
        if depth_abs <= draft_m + 30.0:  # Bathymetric grounding contact
            is_grounded = True
            reasons.append(f"Water depth ({depth_abs:.1f}m) <= Iceberg draft ({draft_m:.1f}m + margin)")
    
    if not is_grounded and stationary_streak_days >= 7 and (observed_speed_km_day is not None and observed_speed_km_day < 0.8):
        # Kinematic evidence of shallow shoal pinning
        if bathymetry_depth_m is not None and abs(bathymetry_depth_m) < 450.0:
            is_grounded = True
            reasons.append(f"Stationary streak ({stationary_streak_days} days) on shallow shelf ({abs(bathymetry_depth_m):.0f}m)")

    if is_grounded:
        return {
            "regime": PhysicalRegime.GROUNDED.value,
            "is_grounded": True,
            "is_ice_locked": False,
            "confidence": 0.92,
            "description": "Grounded on submarine continental shelf or shoal; forward drift halted by seabed friction.",
            "reasons": reasons,
        }

    # 2. Sea-Ice Lock check
    is_ice_locked = False
    if sea_ice_concentration is not None and sea_ice_concentration >= sea_ice_threshold:
        is_ice_locked = True
        reasons.append(f"High sea-ice concentration ({sea_ice_concentration*100:.1f}% >= {sea_ice_threshold*100:.0f}%)")

    if is_ice_locked:
        return {
            "regime": PhysicalRegime.ICE_LOCKED.value,
            "is_grounded": False,
            "is_ice_locked": True,
            "confidence": 0.88,
            "description": "Captured in dense winter pack ice / coastal fast ice; drift heavily constrained by sea-ice rheology.",
            "reasons": reasons,
        }

    # 3. Free Drift
    reasons.append("Deep water and low sea-ice concentration; free-floating balance of Coriolis, ocean current, and wind drag.")
    return {
        "regime": PhysicalRegime.FREE_DRIFT.value,
        "is_grounded": False,
        "is_ice_locked": False,
        "confidence": 0.95,
        "description": "Free-drifting in open Southern Ocean waters.",
        "reasons": reasons,
    }
