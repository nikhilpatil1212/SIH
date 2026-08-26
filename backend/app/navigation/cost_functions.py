from typing import Dict, Any

def evaluate_route_costs(
    distance_nm: float,
    risk_score: float,
    fuel_tonnes: float,
    objective: str
) -> float:
    """Compute normalized composite cost for route optimization based on selected objective."""
    # Reference baselines for normalization (typical polar transit: 2500nm, 50 risk, 150t fuel)
    norm_dist = distance_nm / 2500.0
    norm_risk = risk_score / 100.0
    norm_fuel = fuel_tonnes / 150.0

    obj = objective.upper()

    if obj == "SHORTEST":
        # Pure geodesic distance minimization
        return round(norm_dist * 100.0, 2)
    elif obj == "SAFEST":
        # Heavy risk penalty
        return round((0.2 * norm_dist + 0.8 * norm_risk) * 100.0, 2)
    elif obj == "FUEL" or obj == "FUEL EFFICIENT":
        # Fuel burn minimization
        return round((0.7 * norm_fuel + 0.3 * norm_risk) * 100.0, 2)
    else:  # "BALANCED"
        # Balanced multi-criteria optimization
        return round((0.45 * norm_dist + 0.40 * norm_risk + 0.15 * norm_fuel) * 100.0, 2)
