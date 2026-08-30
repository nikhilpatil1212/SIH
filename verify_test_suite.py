import os
import sys
import time
import json
import urllib.request
import urllib.parse
import threading
import uvicorn
from backend.app.main import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()

# Wait for server to start
time.sleep(2.0)

BASE_URL = "http://127.0.0.1:8001"

def request_json(path, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    encoded_data = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("===============================================================")
print("[TEST] FULL SYSTEM END-TO-END VERIFICATION & AUDIT SUITE")
print("===============================================================")

# 1. Health Checks
status, health = request_json("/health")
assert status == 200, f"Health check failed: {status}"
print(f"[PASSED] 1. Health check passed: {health}")

# 2. Authentication: Invalid login
status, err_resp = request_json("/api/auth/login", method="POST", data={"email": "wrong@test.com", "password": "WrongPassword"})
assert status == 401, f"Expected 401 for bad login, got {status}"
print(f"[PASSED] 2. Invalid login rejected (401 Unauthorized): {err_resp}")

# 3. Authentication: User login
status, user_auth = request_json("/api/auth/login", method="POST", data={"email": "user@antarctica.com", "password": "User@123"})
assert status == 200, f"User login failed: {status}"
user_token = user_auth["access_token"]
assert user_auth["user"]["role"] == "USER"
assert user_auth["redirect_url"] == "/dashboard"
print(f"[PASSED] 3. User login succeeded: {user_auth['user']['name']} ({user_auth['user']['role']}) -> {user_auth['redirect_url']}")

# 4. Authentication: Admin login
status, admin_auth = request_json("/api/auth/login", method="POST", data={"email": "admin@antarctica.com", "password": "Admin@123"})
assert status == 200, f"Admin login failed: {status}"
admin_token = admin_auth["access_token"]
assert admin_auth["user"]["role"] == "ADMIN"
assert admin_auth["redirect_url"] == "/admin/dashboard"
print(f"[PASSED] 4. Admin login succeeded: {admin_auth['user']['name']} ({admin_auth['user']['role']}) -> {admin_auth['redirect_url']}")

# 5. Role-based Authorization: Normal user cannot access Admin stats
status, _ = request_json("/api/admin/stats", method="GET", headers={"Authorization": f"Bearer {user_token}"})
assert status == 403, f"Expected 403 Forbidden for User accessing Admin stats, got {status}"
print("[PASSED] 5. RBAC Protection verified: User denied access to Admin APIs (403 Forbidden)")

# 6. Admin stats endpoint
status, stats = request_json("/api/admin/stats", method="GET", headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200, f"Admin stats failed: {status}"
print(f"[PASSED] 6. Admin Stats retrieved: Users={stats['total_users']}, Trips={stats['total_trips']}, Icebergs={stats['iceberg_records']}, Open Alerts={stats['open_help_alerts']}")

# 7. Sea-Ice 15-Region Table
status, sea_ice = request_json("/api/sea-ice/regions", method="GET")
assert status == 200, f"Sea Ice endpoint failed: {status}"
assert sea_ice["regions_monitored"] == 15
assert len(sea_ice["regions"]) == 15
first_region = sea_ice["regions"][0]
assert "current_sic" in first_region
assert "forecast" in first_region
assert "1d" in first_region["forecast"]
assert "7d" in first_region["forecast"]
assert "change_7d" in first_region
assert "confidence" in first_region
assert "risk" in first_region
print(f"[PASSED] 7. Real Sea Ice 15-Region Table verified: {len(sea_ice['regions'])} regions | Sample: {first_region['region']} (Current SIC={first_region['current_sic']}%, +7d={first_region['forecast']['7d']}%, Risk={first_region['risk']})")

# 8. User Management CRUD
new_user_payload = {
    "name": "Lt. Samantha Ray",
    "email": "samantha.ray@polar.org",
    "phone": "+44-20-79460991",
    "password": "Password@123",
    "role": "USER",
    "organization": "British Antarctic Survey"
}
status, created_user = request_json("/api/users", method="POST", data=new_user_payload, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 201, f"User creation failed: {status}"
new_user_id = created_user["id"]
print(f"[PASSED] 8a. User Created: {created_user['name']} (ID: {new_user_id})")

# List Users
status, users_list = request_json("/api/users", method="GET", headers={"Authorization": f"Bearer {admin_token}"})
assert any(u["id"] == new_user_id for u in users_list)
print(f"[PASSED] 8b. User Listing verified: {len(users_list)} users found")

# Delete User
status, del_resp = request_json(f"/api/users/{new_user_id}", method="DELETE", headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
print(f"[PASSED] 8c. User Deleted: {del_resp['message']}")

# 9. Travel Records CRUD
trip_payload = {
    "user_id": user_auth["user"]["id"],
    "user_name": user_auth["user"]["name"],
    "ship_name": "R/V Polarstern",
    "travel_id": "AWI-PS-139",
    "departure_time": "2026-09-01T08:00:00Z",
    "estimated_arrival_time": "2026-09-09T14:00:00Z",
    "required_time": "198 hours (8.2 days)",
    "destination": "Neumayer-Station III",
    "latitude": -70.67,
    "longitude": -8.27,
    "departure_location": "Cape Town, South Africa",
    "departure_latitude": -33.92,
    "departure_longitude": 18.42,
    "status": "SCHEDULED"
}
status, created_trip = request_json("/api/travel", method="POST", data=trip_payload, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 201, f"Trip creation failed: {status}"
trip_id = created_trip["id"]
print(f"[PASSED] 9a. Travel Record Created: {created_trip['ship_name']} -> {created_trip['destination']}")

# Update Trip Status
status, updated_trip = request_json(f"/api/travel/{trip_id}", method="PUT", data={"status": "IN_TRANSIT"}, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
assert updated_trip["status"] == "IN_TRANSIT"
print(f"[PASSED] 9b. Travel Record Updated: Status is now {updated_trip['status']}")

# Delete Trip
status, del_trip_resp = request_json(f"/api/travel/{trip_id}", method="DELETE", headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
print(f"[PASSED] 9c. Travel Record Deleted: {del_trip_resp['message']}")

# 10. Help Alerts
alert_payload = {
    "user_id": user_auth["user"]["id"],
    "user_name": user_auth["user"]["name"],
    "message": "Pack ice pressure building rapidly along western channel. Requesting satellite ice lead update.",
    "latitude": -65.25,
    "longitude": -64.10,
    "severity": "HIGH"
}
status, created_alert = request_json("/api/alerts", method="POST", data=alert_payload, headers={"Authorization": f"Bearer {user_token}"})
assert status == 201, f"Alert creation failed: {status}"
alert_id = created_alert["id"]
print(f"[PASSED] 10a. User Help Alert Dispatched: ID={alert_id} | Status={created_alert['status']} | Severity={created_alert['severity']}")

# Admin acknowledges and resolves alert
status, ack_alert = request_json(f"/api/alerts/{alert_id}", method="PUT", data={"status": "ACKNOWLEDGED"}, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
assert ack_alert["status"] == "ACKNOWLEDGED"
print(f"[PASSED] 10b. Alert Acknowledged by Admin: Status={ack_alert['status']}")

# 11. Feedback Management
fb_payload = {
    "user_name": user_auth["user"]["name"],
    "user_email": user_auth["user"]["email"],
    "rating": 5,
    "feedback": "The multi-horizon sea ice forecasting table gave us accurate compression indices.",
    "category": "SEA_ICE"
}
status, created_fb = request_json("/api/feedback", method="POST", data=fb_payload, headers={"Authorization": f"Bearer {user_token}"})
assert status == 201
fb_id = created_fb["id"]
print(f"[PASSED] 11a. User Feedback Submitted: ID={fb_id} | Rating={created_fb['rating']}/5")

status, reviewed_fb = request_json(f"/api/feedback/{fb_id}", method="PUT", data={"status": "REVIEWED"}, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
assert reviewed_fb["status"] == "REVIEWED"
print(f"[PASSED] 11b. Feedback Reviewed by Admin: Status={reviewed_fb['status']}")

# 12. Iceberg Records CRUD
iceberg_payload = {
    "id": "A-83",
    "name": "Iceberg A-83 (Brunt Ice Shelf Calving)",
    "latitude": -75.45,
    "longitude": -26.10,
    "size_km": 380.0,
    "movement_speed_kn": 0.7,
    "movement_heading_deg": 310.0,
    "risk_level": "HIGH",
    "confidence": 92.0,
    "source": "USNIC / Sentinel-1"
}
status, created_iceberg = request_json("/api/admin/icebergs", method="POST", data=iceberg_payload, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 201, f"Iceberg creation failed: {status}"
print(f"[PASSED] 12a. Iceberg Record Created: {created_iceberg['name']} (Size: {created_iceberg['size_km']} km²)")

# Delete Iceberg
status, del_ib = request_json(f"/api/admin/icebergs/{created_iceberg['id']}", method="DELETE", headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
print(f"[PASSED] 12b. Iceberg Record Deleted: {del_ib['message']}")

# 13. Weather Updates CRUD
weather_payload = {
    "location": "Amundsen Sea Sector Gateway",
    "latitude": -71.2,
    "longitude": -115.4,
    "temperature_c": -18.5,
    "wind_speed_kn": 32.0,
    "wind_direction_deg": 280.0,
    "visibility_km": 8.0,
    "pressure_hpa": 982.1,
    "conditions": "Blizzard / Whiteout Conditions",
    "source": "ECMWF / ERA5"
}
status, created_wx = request_json("/api/admin/weather", method="POST", data=weather_payload, headers={"Authorization": f"Bearer {admin_token}"})
assert status == 201, f"Weather creation failed: {status}"
wx_id = created_wx["id"]
print(f"[PASSED] 13a. Weather Record Created: {created_wx['location']} (Temp: {created_wx['temperature_c']}°C, Wind: {created_wx['wind_speed_kn']} kn)")

# Delete Weather
status, del_wx = request_json(f"/api/admin/weather/{wx_id}", method="DELETE", headers={"Authorization": f"Bearer {admin_token}"})
assert status == 200
print(f"[PASSED] 13b. Weather Record Deleted: {del_wx['message']}")

print("\n===============================================================")
print("[SUCCESS] ALL 13 TEST PHASES PASSED 100% WITH ZERO ERRORS!")
print("===============================================================")
