"""Transparent AI Decision-Support and Physics Explanation Layer for Iceberg Drift."""

import math
from typing import Dict, Any, Optional


def generate_drift_decision_explanation(
    iceberg_id: str,
    physical_regime: str,
    wagner_u: float,
    wagner_v: float,
    ml_res_u: float,
    ml_res_v: float,
    hybrid_u: float,
    hybrid_v: float,
    ocean_u: float,
    ocean_v: float,
    wind_u: float,
    wind_v: float,
    length_m: float,
    width_m: float,
    sea_ice_conc: Optional[float] = None,
    bathymetry_depth: Optional[float] = None,
    uncertainty_radius_24h: float = 8.5,
) -> str:
    """Generates transparent, scientifically rigorous plain-language decision support explanations."""
    sentences = []

    # 1. State / Physical Regime Explanation
    if physical_regime == "GROUNDED":
        sentences.append(
            f"Iceberg {iceberg_id} is classified as GROUNDED on the submarine shelf (water depth ~{abs(bathymetry_depth or 250):.0f}m)."
        )
        sentences.append(
            "Seabed normal and frictional reaction forces prevent free drift despite surrounding ocean currents; position is predicted to remain pinned."
        )
        return " ".join(sentences)

    if physical_regime == "ICE_LOCKED":
        sentences.append(
            f"Iceberg {iceberg_id} is embedded in heavy winter pack ice ({((sea_ice_conc or 0.85)*100):.0f}% concentration)."
        )
        sentences.append(
            "Internal sea-ice rheological stress dampens open-water drag forces, constraining motion to slow pack-ice drift."
        )
        return " ".join(sentences)

    # 2. Free Drift Hydrodynamic / Aerodynamic Balance
    ocean_spd = math.sqrt(ocean_u ** 2 + ocean_v ** 2)
    wind_spd = math.sqrt(wind_u ** 2 + wind_v ** 2)
    hybrid_spd_km_day = math.sqrt(hybrid_u ** 2 + hybrid_v ** 2) * 86.4
    hybrid_brg = (math.degrees(math.atan2(hybrid_u, hybrid_v)) + 360.0) % 360.0

    # Direction descriptions
    def _cardinal(deg: float) -> str:
        dirs = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"]
        idx = int((deg + 22.5) // 45) % 8
        return dirs[idx]

    hybrid_card = _cardinal(hybrid_brg)
    ocean_card = _cardinal((math.degrees(math.atan2(ocean_u, ocean_v)) + 360.0) % 360.0)
    wind_card = _cardinal((math.degrees(math.atan2(wind_u, wind_v)) + 360.0) % 360.0)

    # Scale regimes
    harmonic_s_km = (length_m * width_m / (length_m + width_m)) / 1000.0 if (length_m + width_m) > 0 else 5.0
    if harmonic_s_km >= 6.0:
        scale_desc = f"Large tabular geometry (L={length_m/1000.0:.1f}km, S={harmonic_s_km:.1f}km, Lambda << 1) makes deep ocean current drag the dominant steering force."
    else:
        scale_desc = f"Moderate iceberg dimensions (S={harmonic_s_km:.1f}km) yield coupled atmospheric wind and oceanic steering."

    sentences.append(
        f"Iceberg {iceberg_id} is in free drift, heading {hybrid_card} ({hybrid_brg:.0f} deg) at {hybrid_spd_km_day:.1f} km/day."
    )
    sentences.append(scale_desc)
    sentences.append(
        f"Surface ocean currents ({ocean_spd:.2f} m/s towards {ocean_card}) provide the primary hydrodynamic advection, with 10m surface winds ({wind_spd:.1f} m/s towards {wind_card}) adding a leftward Coriolis-deflected secondary drift component."
    )

    # ML Residual Contribution
    res_mag = math.sqrt(ml_res_u ** 2 + ml_res_v ** 2) * 86.4
    if res_mag > 0.5:
        sentences.append(
            f"The ML residual correction refines the analytical trajectory by +{res_mag:.1f} km/day to account for localized ageostrophic shear and wave radiation stress."
        )

    sentences.append(
        f"Estimated 24-hour position uncertainty radius is +/-{uncertainty_radius_24h:.1f} km, expanding gradually over 48h and 72h horizons."
    )

    return " ".join(sentences)
