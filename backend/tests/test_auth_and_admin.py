import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_default_admin_login():
    """Test login with seeded admin credentials."""
    res = client.post("/api/auth/login", json={
        "username_or_email": "admin@ncpor.gov.in",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "Admin"
    assert data["user"]["email"] == "admin@ncpor.gov.in"

def test_user_registration_and_login():
    """Test creating a new user account and subsequent login."""
    test_email = "test_navigator@ncpor.gov.in"
    test_username = "test_nav_01"
    
    # Register
    reg_res = client.post("/api/auth/register", json={
        "username": test_username,
        "name": "Lt. Test Navigator",
        "email": test_email,
        "password": "polarpassword123",
        "organization": "Indian Antarctic Programme",
        "role": "Researcher"
    })
    assert reg_res.status_code in [201, 400]  # If already created in prior test run
    
    # Login
    login_res = client.post("/api/auth/login", json={
        "username_or_email": test_email,
        "password": "polarpassword123"
    })
    assert login_res.status_code == 200
    assert login_res.json()["user"]["username"] == test_username

def test_admin_get_users_and_crud():
    """Test admin users listing, update, and deletion."""
    # List users
    users_res = client.get("/api/auth/users")
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 3

    # Admin create user
    created_res = client.post("/api/auth/users", json={
        "username": "temp_officer",
        "name": "Temp Polar Officer",
        "email": "temp_officer@ncpor.res.in",
        "password": "temppassword123",
        "organization": "NCPOR Expedition 44",
        "role": "Vessel Operator",
        "status": "Active"
    })
    assert created_res.status_code in [201, 400]
    
    if created_res.status_code == 201:
        user_id = created_res.json()["id"]
        
        # Update user
        up_res = client.put(f"/api/auth/users/{user_id}", json={
            "role": "Admin",
            "status": "Active"
        })
        assert up_res.status_code == 200
        assert up_res.json()["role"] == "Admin"

        # Delete user
        del_res = client.delete(f"/api/auth/users/{user_id}")
        assert del_res.status_code == 200

def test_missions_api():
    """Test retrieving and modifying vessel expedition voyage data."""
    res = client.get("/api/missions")
    assert res.status_code == 200
    missions = res.json()
    assert len(missions) >= 1
    
    m0 = missions[0]
    assert "RV Polar Star" in m0["ship_name"]
    assert m0["ship_ice_class"] == "PC6 (Polar Class 6)"
    assert "Maitri Station" in m0["end_destination"]

def test_icebergs_registry_api():
    """Test retrieving and updating the 33 NIC icebergs database registry."""
    res = client.get("/api/icebergs/registry")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 33
    
    # Verify major icebergs exist
    names = [r["name"] for r in records]
    assert "A81" in names
    assert "D15A" in names
    assert "A76C" in names

def test_feedback_api():
    """Test submitting user feedback and admin fetching it."""
    # Submit feedback
    fb_res = client.post("/api/feedback", json={
        "user_id": "usr-test",
        "user_name": "Dr. Polar Scientist",
        "user_email": "scientist@ncpor.res.in",
        "category": "Route Safety",
        "rating": 5,
        "subject": "Great routing standoff for A81",
        "message": "The system recommended Route B which avoided iceberg A81 safely."
    })
    assert fb_res.status_code == 201
    fb_data = fb_res.json()
    assert fb_data["rating"] == 5
    fb_id = fb_data["id"]

    # Admin get all feedback
    get_res = client.get("/api/feedback")
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

    # Admin update status
    patch_res = client.patch(f"/api/feedback/{fb_id}", json={"status": "RESOLVED"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "RESOLVED"
