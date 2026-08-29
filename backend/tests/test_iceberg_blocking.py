"""Verify that routes actively deflect around an iceberg placed directly on the track."""
import urllib.request
import json
import sys
sys.path.append(".")
from backend.app.navigation.router import calculate_route_alternatives, haversine_distance_km

# Direct track from Cape Town (-33.92, 18.42) to Maitri (-70.77, 11.73) passes near (-50.0, 15.0)
blocking_iceberg = {
    "id": "IBG-BLOCK-99",
    "name": "IBG-BLOCK-99 (Obstacle on Track)",
    "position": {"lat": -50.0, "lon": 15.0},
    "predictedPath": [
        {"lat": -50.0, "lon": 15.0},
        {"lat": -50.2, "lon": 14.8},
        {"lat": -50.4, "lon": 14.6},
        {"lat": -50.6, "lon": 14.4},
    ],
    "riskLevel": "high"
}

res = calculate_route_alternatives(
    start_lat=-33.92,
    start_lon=18.42,
    dest_lat=-70.77,
    dest_lon=11.73,
    active_icebergs=[blocking_iceberg],
    safety_buffer_km=25.0
)

print("=" * 60)
print("TESTING ACTIVE ICEBERG AVOIDANCE & DEFLECTION")
print("=" * 60)
for r in res["routes"]:
    clr = r["minimumIcebergClearanceKm"]
    land = r["landCollision"]
    safe = r["safe"]
    status = "[PASSED]" if (clr >= 25.0 and not land and safe) else "[FAILED]"
    print(f"Route: {r['name']} ({r['type']})")
    print(f"  Min Iceberg Clearance: {clr:.2f} km (Required: >= 25.0 km)")
    print(f"  Land Collision: {land} | Safe: {safe} -> {status}")
print("=" * 60)
