import os
import hashlib
import hmac
import base64
import json
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..database.models import User, TravelRecord, Feedback, HelpAlert, IcebergRecord, WeatherRecord, SeaIceRegionData
from ..database.connection import SessionLocal

JWT_SECRET = os.getenv("JWT_SECRET", "dhruva-sarthi-antarctic-secret-key-2026-auth-jwt")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

def hash_password(password: str) -> str:
    """Securely hash passwords using PBKDF2-HMAC-SHA256 with unique 16-byte salt."""
    salt = os.urandom(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    hash_b64 = base64.b64encode(derived).decode("utf-8")
    return f"pbkdf2_sha256${iterations}${salt_b64}${hash_b64}"

def verify_password(password: str, password_hash: str) -> bool:
    """Verify plain password against PBKDF2-HMAC-SHA256 hash."""
    try:
        parts = password_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = base64.b64decode(parts[2])
        expected_hash = base64.b64decode(parts[3])
        computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(expected_hash, computed_hash)
    except Exception:
        return False

def create_access_token(payload: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create lightweight signed JWT token."""
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    exp = int(time.time()) + (int(expires_delta.total_seconds()) if expires_delta else TOKEN_EXPIRY_SECONDS)
    token_payload = {**payload, "exp": exp, "iat": int(time.time())}
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header, separators=(',', ':')).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(token_payload, separators=(',', ':')).encode()).decode().rstrip("=")
    
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode signed JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        
        # Add padding back
        rem = len(sig_b64) % 4
        if rem > 0:
            sig_b64 += "=" * (4 - rem)
        actual_sig = base64.urlsafe_b64decode(sig_b64)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        rem = len(payload_b64) % 4
        if rem > 0:
            payload_b64 += "=" * (4 - rem)
        payload_json = base64.urlsafe_b64decode(payload_b64).decode()
        payload = json.loads(payload_json)
        
        # Check expiry
        if payload.get("exp", 0) < int(time.time()):
            return None
            
        return payload
    except Exception:
        return None

def seed_default_database_data(db: Session):
    """Seed initial database with required Admin and User demo accounts, fleet, and initial logs."""
    # 1. Admin User
    admin = db.query(User).filter(User.email == "admin@antarctica.com").first()
    if not admin:
        admin = User(
            id="usr-adm-001",
            name="Fleet Commander R. Sharma",
            email="admin@antarctica.com",
            phone="+91-832-2525555",
            password_hash=hash_password("Admin@123"),
            role="ADMIN",
            status="ACTIVE",
            organization="NCPOR Polar Operations Directorate",
            last_login=datetime.now(timezone.utc),
        )
        db.add(admin)

    # 2. Standard User
    user = db.query(User).filter(User.email == "user@antarctica.com").first()
    if not user:
        user = User(
            id="usr-nav-002",
            name="Dr. Ana Køhler",
            email="user@antarctica.com",
            phone="+47-776-44000",
            password_hash=hash_password("User@123"),
            role="USER",
            status="ACTIVE",
            organization="Norwegian Polar Institute / MoES Expedition",
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)

    # 3. Additional demo operator
    operator = db.query(User).filter(User.email == "operator@antarctica.com").first()
    if not operator:
        operator = User(
            id="usr-nav-003",
            name="Capt. Vikram Chauhan",
            email="operator@antarctica.com",
            phone="+91-22-26590000",
            password_hash=hash_password("Operator@123"),
            role="USER",
            status="ACTIVE",
            organization="Shipping Corporation of India (SCI)",
            last_login=datetime.now(timezone.utc),
        )
        db.add(operator)

    db.commit()

    # 4. Seed Travel Records
    if db.query(TravelRecord).count() == 0:
        now = datetime.now(timezone.utc)
        travels = [
            TravelRecord(
                id="TRV-2026-001",
                user_id="usr-nav-002",
                user_name="Dr. Ana Køhler",
                ship_name="RV Bharati Explorer",
                travel_id="BHARATI-EXP-44",
                departure_time=now - timedelta(days=2),
                estimated_arrival_time=now + timedelta(days=5, hours=9),
                required_time="177 hours (7.4 days)",
                destination="Bharati Station, Larsemann Hills",
                latitude=-69.40,
                longitude=76.19,
                departure_location="Cape Town, South Africa",
                departure_latitude=-33.92,
                departure_longitude=18.42,
                status="IN_TRANSIT",
            ),
            TravelRecord(
                id="TRV-2026-002",
                user_id="usr-nav-003",
                user_name="Capt. Vikram Chauhan",
                ship_name="MV Maitri Supplier",
                travel_id="MAITRI-LOG-12",
                departure_time=now - timedelta(days=1),
                estimated_arrival_time=now + timedelta(days=6, hours=4),
                required_time="172 hours (7.2 days)",
                destination="Maitri Station, Schirmacher Oasis",
                latitude=-70.77,
                longitude=11.73,
                departure_location="Ushuaia, Argentina",
                departure_latitude=-54.80,
                departure_longitude=-68.30,
                status="IN_TRANSIT",
            ),
            TravelRecord(
                id="TRV-2026-003",
                user_id="usr-adm-001",
                user_name="Fleet Commander R. Sharma",
                ship_name="RRS Sir David Attenborough",
                travel_id="BAS-SDA-09",
                departure_time=now - timedelta(days=4),
                estimated_arrival_time=now + timedelta(days=2),
                required_time="144 hours (6.0 days)",
                destination="Rothera Research Station",
                latitude=-67.57,
                longitude=-68.13,
                departure_location="Punta Arenas, Chile",
                departure_latitude=-53.16,
                departure_longitude=-70.91,
                status="IN_TRANSIT",
            ),
        ]
        db.add_all(travels)
        db.commit()

    # 5. Seed Help Alerts
    if db.query(HelpAlert).count() == 0:
        now = datetime.now(timezone.utc)
        alerts = [
            HelpAlert(
                id="ALT-2026-01",
                user_id="usr-nav-002",
                user_name="Dr. Ana Køhler",
                message="Extreme multi-year pack ice compression encountered at 68.2°S, 29.5°W. Requesting tactical corridor guidance.",
                latitude=-68.20,
                longitude=-29.50,
                severity="HIGH",
                status="OPEN",
                created_at=now - timedelta(minutes=45),
            ),
            HelpAlert(
                id="ALT-2026-02",
                user_id="usr-nav-003",
                user_name="Capt. Vikram Chauhan",
                message="Iceberg B-15K fragment detected on starboard bow at 1.8 NM. Vessel reducing speed to 6 knots.",
                latitude=-63.45,
                longitude=-58.12,
                severity="CRITICAL",
                status="ACKNOWLEDGED",
                created_at=now - timedelta(hours=2, minutes=15),
            ),
        ]
        db.add_all(alerts)
        db.commit()

    # 6. Seed Feedback
    if db.query(Feedback).count() == 0:
        feedbacks = [
            Feedback(
                id="FB-2026-01",
                user_id="usr-nav-002",
                user_name="Dr. Ana Køhler",
                user_email="user@antarctica.com",
                rating=5,
                feedback="The 72h iceberg drift vector saved us over 30 nautical miles of deviation around the Weddell Gyre. Excellent accuracy.",
                category="NAVIGATION",
                status="REVIEWED",
            ),
            Feedback(
                id="FB-2026-02",
                user_id="usr-nav-003",
                user_name="Capt. Vikram Chauhan",
                user_email="operator@antarctica.com",
                rating=4,
                feedback="Real-time sea-ice concentration table is very helpful for passage planning. Would love export to ECDIS format.",
                category="FEATURE_REQUEST",
                status="PENDING",
            ),
        ]
        db.add_all(feedbacks)
        db.commit()

    # 7. Seed Weather Updates
    if db.query(WeatherRecord).count() == 0:
        now = datetime.now(timezone.utc)
        weathers = [
            WeatherRecord(
                id="WX-001",
                location="Weddell Sea North Gateway",
                latitude=-63.5,
                longitude=-55.0,
                temperature_c=-14.2,
                wind_speed_kn=28.5,
                wind_direction_deg=225.0,
                visibility_km=14.0,
                pressure_hpa=988.4,
                conditions="Gale Warning / Freezing Spray",
                observation_time=now,
            ),
            WeatherRecord(
                id="WX-002",
                location="Prydz Bay / Larsemann Hills",
                latitude=-69.4,
                longitude=76.2,
                temperature_c=-8.5,
                wind_speed_kn=16.0,
                wind_direction_deg=140.0,
                visibility_km=22.0,
                pressure_hpa=996.1,
                conditions="Clear Polar",
                observation_time=now,
            ),
            WeatherRecord(
                id="WX-003",
                location="Ross Sea Continental Margin",
                latitude=-74.0,
                longitude=175.0,
                temperature_c=-19.8,
                wind_speed_kn=34.0,
                wind_direction_deg=310.0,
                visibility_km=6.5,
                pressure_hpa=974.2,
                conditions="Katabatic Wind Inflow",
                observation_time=now,
            ),
            WeatherRecord(
                id="WX-004",
                location="Maitri Approach / Princess Astrid Coast",
                latitude=-70.7,
                longitude=11.7,
                temperature_c=-11.0,
                wind_speed_kn=19.5,
                wind_direction_deg=180.0,
                visibility_km=18.0,
                pressure_hpa=992.0,
                conditions="Scattered Cloud",
                observation_time=now,
            ),
        ]
        db.add_all(weathers)
        db.commit()

    # 8. Seed Iceberg Records
    if db.query(IcebergRecord).count() == 0:
        now = datetime.now(timezone.utc)
        icebergs = [
            IcebergRecord(
                id="A-23A",
                name="Iceberg A-23a (Mega-Berg)",
                latitude=-61.85,
                longitude=-48.20,
                size_km=3880.0,
                movement_speed_kn=1.2,
                movement_heading_deg=38.0,
                risk_level="HIGH",
                confidence=94.0,
                source="USNIC / NIC Antarctic Weekly",
                last_updated=now,
            ),
            IcebergRecord(
                id="D-28",
                name="Iceberg D-28 (Prydz Bay Sector)",
                latitude=-67.12,
                longitude=64.80,
                size_km=1580.0,
                movement_speed_kn=0.8,
                movement_heading_deg=285.0,
                risk_level="HIGH",
                confidence=91.0,
                source="USNIC / Sentinel-1 SAR",
                last_updated=now,
            ),
            IcebergRecord(
                id="B-15Y",
                name="Iceberg B-15Y (Ross Outflow)",
                latitude=-65.40,
                longitude=172.10,
                size_km=420.0,
                movement_speed_kn=0.6,
                movement_heading_deg=315.0,
                risk_level="MEDIUM",
                confidence=87.0,
                source="USNIC / RADARSAT-2",
                last_updated=now,
            ),
            IcebergRecord(
                id="A-76A",
                name="Iceberg A-76A (Drake Passage Track)",
                latitude=-58.90,
                longitude=-56.30,
                size_km=640.0,
                movement_speed_kn=1.5,
                movement_heading_deg=55.0,
                risk_level="HIGH",
                confidence=89.0,
                source="USNIC / Sentinel-1 SAR",
                last_updated=now,
            ),
        ]
        db.add_all(icebergs)
        db.commit()
