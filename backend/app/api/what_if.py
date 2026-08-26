from fastapi import APIRouter
from ..schemas.schemas import WhatIfRequest, WhatIfResponse
from ..navigation.geodesy import format_eta

router = APIRouter(prefix="/what-if", tags=["What-If Scenario Simulation"])

SCENARIOS_META = {
    "normal": {"label": "Normal polar conditions", "risk_mod": 0, "eta_mod": 0, "fuel_mod": 0},
    "heavy-ice": {"label": "Heavy sea ice & compression", "risk_mod": 22, "eta_mod": 14, "fuel_mod": 12},
    "iceberg": {"label": "High iceberg activity & tabular calvings", "risk_mod": 30, "eta_mod": 8, "fuel_mod": 6},
    "poor-vis": {"label": "Polar whiteout & poor visibility", "risk_mod": 16, "eta_mod": 10, "fuel_mod": 4},
    "high-wind": {"label": "Katabatic gale winds & swell", "risk_mod": 18, "eta_mod": 6, "fuel_mod": 9},
}

@router.post("", response_model=WhatIfResponse)
def evaluate_what_if_scenario(req: WhatIfRequest):
    """
    Calculate sensitivity outcome for vessel speed, environmental scenarios, and risk tolerance profile.
    """
    sc = SCENARIOS_META.get(req.scenario, SCENARIOS_META["normal"])
    
    base_dist_nm = 2480.0
    speed = max(6.0, min(22.0, req.speed))
    speed_factor = 14.0 / speed
    base_hours = base_dist_nm / 14.0
    
    eta_h = round(base_hours * speed_factor * (1.0 + sc["eta_mod"] / 100.0), 1)
    fuel_t = int(round(112.0 * (1.0 + sc["fuel_mod"] / 100.0) * (0.9 + speed / 140.0)))
    
    risk = int(round(38.0 + sc["risk_mod"] + (50 - req.tolerance) * 0.25 + (speed - 14.0) * 1.5))
    risk = max(8, min(96, risk))
    
    recommended = "Route B — Safest" if risk >= 60 else ("Route C — Fuel Efficient" if risk >= 42 else "Route A — Fastest")
    
    return {
        "eta": format_eta(eta_h),
        "fuel": fuel_t,
        "risk": risk,
        "recommended": recommended,
        "distance_nm": base_dist_nm,
        "scenario_label": sc["label"],
    }
