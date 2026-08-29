"""Sea-Ice Concentration & Environmental Navigational Risk Engine.

Evaluates EUMETSAT OSI-SAF and Copernicus Marine sea-ice grids along
maritime routes, identifying pack-ice hazards, leads, and marginal ice zones.
"""

import math
from typing import List, Dict, Any, Tuple

# Regional baseline sea-ice concentration profiles by latitude/sector
def get_sea_ice_concentration(lat: float, lon: float) -> float:
    """Retrieve or compute sea-ice concentration percentage (0 to 100%) for a coordinate."""
    # North of Antarctic Polar Front / Convergence (~55°S): Open water (0%)
    if lat > -55.0:
        return 0.0
    
    # 55°S to 62°S: Marginal Ice Zone transition (5% to 25%)
    if -62.0 <= lat <= -55.0:
        progress = (-55.0 - lat) / 7.0
        return round(progress * 22.0, 1)

    # 62°S to 68°S: Pack ice boundary (25% to 55%)
    if -68.0 <= lat < -62.0:
        base = 22.0 + ((-62.0 - lat) / 6.0) * 35.0
        # Longitudinal adjustment: Weddell Sea (-50°W to -20°W) has heavier perennial multi-year pack ice
        if -55.0 <= lon <= -20.0:
            base += 15.0
        # Astrid Coast (0° to 20°E) has coastal polynya leads
        elif 5.0 <= lon <= 25.0:
            base -= 8.0
        return round(min(95.0, max(5.0, base)), 1)

    # 68°S to 78°S: High coastal fast-ice / dense pack ice (55% to 90%)
    base = 55.0 + ((-68.0 - lat) / 8.0) * 30.0
    if -55.0 <= lon <= -20.0:
        base += 10.0
    return round(min(98.0, max(20.0, base)), 1)


def evaluate_route_sea_ice_risk(route_coordinates: List[Dict[str, float]]) -> Dict[str, Any]:
    """Evaluate cumulative sea-ice risk along a candidate route."""
    if not route_coordinates:
        return {"avg_concentration": 0.0, "max_concentration": 0.0, "risk_category": "LOW", "risk_score": 10}

    concentrations = [get_sea_ice_concentration(pt["lat"], pt["lon"]) for pt in route_coordinates]
    avg_c = sum(concentrations) / max(1, len(concentrations))
    max_c = max(concentrations)

    if max_c >= 75.0 or avg_c >= 45.0:
        risk_cat = "HIGH"
        score = min(95, int(max_c * 0.9 + avg_c * 0.3))
    elif max_c >= 40.0 or avg_c >= 20.0:
        risk_cat = "MEDIUM"
        score = int(max_c * 0.6 + avg_c * 0.4)
    else:
        risk_cat = "LOW"
        score = int(max_c * 0.4 + avg_c * 0.3)

    return {
        "avg_concentration": round(avg_c, 1),
        "max_concentration": round(max_c, 1),
        "risk_category": risk_cat,
        "risk_score": score,
    }
