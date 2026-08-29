"""Comprehensive End-to-End Test Suite for Physically Safe Maritime Routing."""
import urllib.request
import json
import time

API_URL = "http://127.0.0.1:8000/api/routes/calculate"

test_cases = [
    {
        "name": "Cape Town -> Maitri Station (Standard Baseline)",
        "payload": {
            "start": {"lat": -33.92, "lon": 18.42, "name": "Port of Cape Town"},
            "destination": {"lat": -70.77, "lon": 11.73, "name": "Maitri Station"},
            "objective": "SAFEST",
            "vessel_speed_kn": 14.0,
            "safety_buffer_km": 20.0,
        }
    },
    {
        "name": "Cape Town -> Maitri Station (Shortest Objective)",
        "payload": {
            "start": {"lat": -33.92, "lon": 18.42, "name": "Port of Cape Town"},
            "destination": {"lat": -70.77, "lon": 11.73, "name": "Maitri Station"},
            "objective": "SHORTEST",
            "vessel_speed_kn": 14.0,
            "safety_buffer_km": 20.0,
        }
    },
    {
        "name": "Cape Town -> Maitri Station (Fuel-Efficient Objective)",
        "payload": {
            "start": {"lat": -33.92, "lon": 18.42, "name": "Port of Cape Town"},
            "destination": {"lat": -70.77, "lon": 11.73, "name": "Maitri Station"},
            "objective": "FUEL EFFICIENT",
            "vessel_speed_kn": 14.0,
            "safety_buffer_km": 30.0,
        }
    },
    {
        "name": "Port of Hobart -> Casey Station (East Antarctica Corridor)",
        "payload": {
            "start": {"lat": -42.88, "lon": 147.33, "name": "Port of Hobart"},
            "destination": {"lat": -66.28, "lon": 110.53, "name": "Casey Station"},
            "objective": "SAFEST",
            "vessel_speed_kn": 14.0,
            "safety_buffer_km": 20.0,
        }
    },
    {
        "name": "Ushuaia -> Rothera Station (Drake Passage & Antarctic Peninsula Approach)",
        "payload": {
            "start": {"lat": -54.80, "lon": -68.30, "name": "Port of Ushuaia"},
            "destination": {"lat": -67.57, "lon": -68.13, "name": "Rothera Station"},
            "objective": "SAFEST",
            "vessel_speed_kn": 13.5,
            "safety_buffer_km": 20.0,
        }
    },
    {
        "name": "Cape Town -> Maitri with Intermediate Bouvet Island Rest Stop",
        "payload": {
            "start": {"lat": -33.92, "lon": 18.42, "name": "Port of Cape Town"},
            "destination": {"lat": -70.77, "lon": 11.73, "name": "Maitri Station"},
            "waypoints": [
                {"lat": -54.0, "lon": 10.0, "name": "Bouvet Staging Point", "breakDurationHours": 6}
            ],
            "objective": "SAFEST",
            "vessel_speed_kn": 14.0,
            "safety_buffer_km": 20.0,
        }
    }
]

print("=" * 70)
print("RUNNING AUTOMATED MARITIME NAVIGATION VERIFICATION SUITE")
print("=" * 70)

all_passed = True

for tc in test_cases:
    print(f"\nScenario: {tc['name']}")
    req_data = json.dumps(tc["payload"]).encode("utf-8")
    req = urllib.request.Request(API_URL, data=req_data, headers={"Content-Type": "application/json"})
    
    t0 = time.time()
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
    dur = (time.time() - t0) * 1000
    
    buf = res.get("safety_buffer_km", 20.0)
    print(f"  Calculation ID: {res['calculation_id']} ({dur:.1f} ms) | Safety Buffer: {buf} km")
    
    for r in res["routes"]:
        r_type = r["type"].upper()
        clr = r.get("minimumIcebergClearanceKm", 0.0)
        land = r.get("landCollision", True)
        safe = r.get("safe", False)
        
        passed_leg = (not land) and (clr >= buf) and safe
        if not passed_leg:
            all_passed = False
            
        status = "[PASSED]" if passed_leg else "[FAILED]"
        print(f"    [{r['id']}] {r['name']} ({r_type})")
        print(f"       Distance: {r['distanceNm']} nm ({r.get('distanceKm')} km) | ETA: {r['eta']} | Fuel: {r['fuelT']} t")
        print(f"       Iceberg Clearance: {clr} km (Min: {buf} km) | Land Collision: {land} | Safe: {safe} -> {status}")

print("\n" + "=" * 70)
if all_passed:
    print("ALL NAVIGATION TEST SUITES 100% PASSED PHYSICALLY SAFE CONSTRAINTS!")
else:
    print("SOME TEST SUITES FAILED")
print("=" * 70)

