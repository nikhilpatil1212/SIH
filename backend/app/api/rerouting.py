from fastapi import APIRouter
from datetime import datetime, timezone
from ..schemas.schemas import ReroutingSimulateRequest, ReroutingSimulateResponse
from ..navigation.router import calculate_route_alternatives

router = APIRouter(prefix="/rerouting", tags=["Tactical Re-Routing"])

@router.post("/simulate", response_model=ReroutingSimulateResponse)
def simulate_rerouting(req: ReroutingSimulateRequest):
    """
    Simulate real-time hazard detection triggering autonomous corridor evaluation.
    Route B degrades due to projected tabular iceberg intercept, elevating Route C as optimal.
    """
    # Calculate base routes
    res = calculate_route_alternatives(
        start_lat=-33.92,
        start_lon=18.42,
        dest_lat=-70.77,
        dest_lon=11.73,
        vessel_speed_kn=14.0,
        objective="SAFEST"
    )

    # In degraded scenario, Route B risk jumps to 67 due to iceberg intersection
    updated_routes = []
    for r in res["routes"]:
        if r["id"] == "route-b":
            updated_routes.append({**r, "riskScore": 67, "riskLevel": "high"})
        elif r["id"] == "route-c":
            updated_routes.append({**r, "riskScore": 41, "riskLevel": "medium"})
        else:
            updated_routes.append(r)

    return {
        "rerouted": True,
        "trigger_description": f"Accelerated drift vector for {req.trigger_hazard_id or 'A76C'} intersects Route B corridor in ~8h.",

        "old_route_id": "route-b",
        "new_recommended_route_id": "route-c",
        "old_risk_score": 32,
        "new_risk_score": 67,
        "routes": updated_routes,
        "alert": {
            "id": f"al-{int(datetime.now(timezone.utc).timestamp())}",
            "title": "ROUTE RISK ESCALATED",
            "message": "New tabular iceberg trajectory intersects predicted Route B corridor in ~8 hours. Route C recommended.",
            "severity": "critical",
            "time": datetime.now(timezone.utc).strftime("%H:%M UTC"),
        }
    }
