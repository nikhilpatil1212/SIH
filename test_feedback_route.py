import urllib.request
import json

base_url = "http://127.0.0.1:8000"

# 1. Login as user and admin
user_req = urllib.request.Request(f"{base_url}/api/auth/login", data=json.dumps({"email": "user@antarctica.com", "password": "User@123"}).encode(), headers={"Content-Type": "application/json"})
user_token = json.loads(urllib.request.urlopen(user_req).read())["access_token"]

admin_req = urllib.request.Request(f"{base_url}/api/auth/login", data=json.dumps({"email": "admin@antarctica.com", "password": "Admin@123"}).encode(), headers={"Content-Type": "application/json"})
admin_token = json.loads(urllib.request.urlopen(admin_req).read())["access_token"]

# 2. Create feedback as user
fb_payload = {
    "rating": 5,
    "feedback": "Testing feedback status transition from PENDING to REVIEWED",
    "category": "GENERAL"
}
fb_req = urllib.request.Request(f"{base_url}/api/feedback", data=json.dumps(fb_payload).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {user_token}"})
with urllib.request.urlopen(fb_req) as r:
    fb_res = json.loads(r.read())
    fb_id = fb_res["id"]
    print(f"Created feedback: ID={fb_id} | Status={fb_res['status']} | HTTP={r.status}")

# 3. Update feedback status as admin: POST /api/feedback/{feedback_id}/status
status_payload = {"status": "REVIEWED"}
status_req = urllib.request.Request(f"{base_url}/api/feedback/{fb_id}/status", data=json.dumps(status_payload).encode(), headers={"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
with urllib.request.urlopen(status_req) as r:
    updated_res = json.loads(r.read())
    print(f"Updated feedback status: ID={updated_res['id']} | Status={updated_res['status']} | HTTP={r.status}")
