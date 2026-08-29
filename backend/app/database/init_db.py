import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .connection import engine, Base, SessionLocal
from .models import User, MissionVoyage, IcebergRecord, UserFeedback, DataSource, hash_password

NIC_ICEBERGS = [
    ("A76C", "Scotia Sea / Weddell Sector", -52.99, -30.20, 16.0, 7.0, 84.90, 29.6, 0.21, 55.0, "medium", 87.0),
    ("A81", "Weddell Sea Front", -58.90, -51.01, 28.0, 25.0, 391.20, 51.9, 0.38, 42.0, "high", 93.0),
    ("A83", "Weddell Sea Outflow", -60.90, -50.45, 12.0, 7.0, 55.34, 22.2, 0.26, 58.0, "medium", 84.0),
    ("A84", "Amundsen Sea Sector", -71.70, -102.79, 12.0, 6.0, 57.43, 22.2, 0.17, 290.0, "medium", 80.0),
    ("A85", "Antarctic Peninsula", -63.33, -53.40, 10.0, 3.0, 18.26, 18.5, 0.19, 65.0, "medium", 79.0),
    ("B09B", "Wilkes Land Sector", -66.07, 143.15, 27.0, 10.0, 148.38, 50.0, 0.33, 258.0, "high", 91.0),
    ("B09G", "Enderby Land / Dronning Maud", -68.18, 41.50, 12.0, 7.0, 46.66, 22.2, 0.22, 274.0, "medium", 81.0),
    ("B22A", "Ross Sea Basin", -69.24, 171.19, 29.0, 25.0, 414.92, 53.7, 0.41, 315.0, "high", 94.0),
    ("B22F", "Ross Sea Outflow", -67.18, -176.77, 14.0, 7.0, 66.01, 25.9, 0.28, 328.0, "medium", 82.0),
    ("B22H", "Wilkes Coast", -70.21, 163.99, 8.0, 6.0, 22.00, 14.8, 0.18, 280.0, "medium", 78.0),
    ("B51", "Marie Byrd Land / Amundsen", -74.24, -131.68, 15.0, 3.0, 23.03, 27.8, 0.20, 298.0, "medium", 77.0),
    ("C15", "Wilkes Land Shelf", -65.84, 143.02, 14.0, 10.0, 62.25, 25.9, 0.27, 261.0, "medium", 83.0),
    ("C18B", "Enderby Land", -67.03, 47.36, 10.0, 4.0, 32.19, 18.5, 0.23, 268.0, "medium", 80.0),
    ("C18C", "Riiser-Larsen Peninsula", -68.47, 39.07, 10.0, 2.0, 15.47, 18.5, 0.19, 275.0, "medium", 76.0),
    ("C21B", "Davis Sea / Shackleton", -64.98, 95.83, 12.0, 8.0, 75.50, 22.2, 0.25, 271.0, "medium", 82.0),
    ("C24", "Davis Sea", -64.84, 96.02, 11.0, 3.0, 16.87, 20.4, 0.22, 268.0, "medium", 79.0),
    ("C30", "Davis Sea", -64.78, 96.27, 9.0, 3.0, 21.89, 16.7, 0.20, 270.0, "medium", 76.0),
    ("C31", "Davis Sea", -64.68, 96.49, 9.0, 3.0, 21.30, 16.7, 0.20, 270.0, "medium", 76.0),
    ("C36", "George V Coast", -67.46, 146.48, 23.0, 16.0, 247.28, 42.6, 0.36, 260.0, "high", 90.0),
    ("C39", "Kemp Coast", -66.12, 58.24, 8.0, 3.0, 15.20, 14.8, 0.18, 265.0, "low", 74.0),
    ("D15A", "West Ice Shelf / Davis Sea", -66.63, 81.92, 51.0, 22.0, 885.59, 94.5, 0.45, 278.0, "high", 95.0),
    ("D15B", "Davis Sea", -67.02, 81.58, 20.0, 12.0, 178.00, 37.0, 0.34, 275.0, "high", 91.0),
    ("D15C", "Davis Sea", -67.21, 79.44, 14.0, 7.0, 33.71, 25.9, 0.27, 272.0, "medium", 83.0),
    ("D15D", "Davis Sea", -67.29, 79.32, 8.0, 6.0, 16.30, 14.8, 0.20, 269.0, "medium", 78.0),
    ("D23", "Amery Ice Shelf / Prydz Bay", -69.44, 74.71, 7.0, 6.0, 30.79, 13.0, 0.16, 267.0, "low", 74.0),
    ("D32", "South Georgia / Scotia Sea", -58.57, -36.95, 9.0, 6.0, 31.02, 16.7, 0.23, 62.0, "medium", 80.0),
    ("D33A", "Larsen C / Weddell Outflow", -63.99, -55.83, 19.0, 10.0, 130.04, 35.2, 0.31, 49.0, "high", 88.0),
    ("D33B", "Weddell Sea", -60.02, -51.32, 21.0, 12.0, 93.49, 38.9, 0.33, 53.0, "high", 89.0),
    ("D33C", "Weddell Sea", -61.93, -54.41, 9.0, 5.0, 23.82, 16.7, 0.22, 45.0, "medium", 80.0),
    ("D33D", "Joinville Island Sector", -63.57, -55.21, 15.0, 6.0, 62.73, 27.8, 0.28, 47.0, "medium", 82.0),
    ("D34", "Davis Sea", -67.16, 82.06, 11.0, 8.0, 48.34, 20.4, 0.24, 273.0, "medium", 80.0),
    ("D35", "South Orkney Sector", -60.89, -43.71, 15.0, 6.0, 63.01, 27.8, 0.26, 58.0, "medium", 83.0),
    ("D37", "Princess Ragnhild Coast", -69.21, 36.36, 30.0, 7.0, 139.29, 55.6, 0.29, 282.0, "high", 86.0),
]

def init_database():
    """Initializes tables and seeds default records if empty."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # 1. Seed Users if not present
        if db.query(User).count() == 0:
            default_users = [
                User(
                    id="usr-admin",
                    username="admin",
                    name="NCPOR Mission Controller",
                    email="admin@ncpor.gov.in",
                    password_hash=hash_password("admin123"),
                    organization="National Centre for Polar and Ocean Research (MoES)",
                    role="Admin",
                    status="Active",
                ),
                User(
                    id="usr-researcher",
                    username="dr_ananya",
                    name="Dr. Ananya Sharma",
                    email="researcher@ncpor.res.in",
                    password_hash=hash_password("polar2026"),
                    organization="NCPOR Polar Oceanography Wing",
                    role="Researcher",
                    status="Active",
                ),
                User(
                    id="usr-captain",
                    username="capt_menon",
                    name="Capt. Ravi Menon",
                    email="captain@polarstar.gov.in",
                    password_hash=hash_password("captain2026"),
                    organization="RV Polar Star (SARATHI-1) Bridge",
                    role="Vessel Operator",
                    status="Active",
                ),
            ]
            db.add_all(default_users)
            db.commit()

        # 2. Seed Default Active Voyage / Mission
        if db.query(MissionVoyage).count() == 0:
            default_missions = [
                MissionVoyage(
                    id="voyage-44-ind",
                    ship_name="RV Polar Star (SARATHI-1)",
                    ship_no="IMO 9821430 / IND-77",
                    ship_ice_class="PC6 (Polar Class 6)",
                    start_destination="Port of Cape Town (33.92°S, 18.42°E)",
                    end_destination="Maitri Station · Schirmacher Oasis (70.77°S, 11.73°E)",
                    no_of_break_points=6,
                    departure_time="2026-08-26 06:00 UTC",
                    expected_arrival_time="2026-08-30 18:30 UTC",
                    expected_travel_duration="4 Days 12.5 Hours (108.5 hrs)",
                    distance_nm=2450.8,
                    fuel_expected_tons=184.2,
                    status="UNDERWAY",
                ),
                MissionVoyage(
                    id="voyage-45-ind",
                    ship_name="ORV Sagar Kanya (EXPEDITION-2)",
                    ship_no="IMO 8003187 / IND-24",
                    ship_ice_class="PC3 (Polar Class 3)",
                    start_destination="Port of Hobart (42.88°S, 147.32°E)",
                    end_destination="Bharati Station · Larsemann Hills (69.41°S, 76.19°E)",
                    no_of_break_points=8,
                    departure_time="2026-09-02 00:00 UTC",
                    expected_arrival_time="2026-09-08 12:00 UTC",
                    expected_travel_duration="6 Days 12.0 Hours (156.0 hrs)",
                    distance_nm=3120.4,
                    fuel_expected_tons=265.0,
                    status="PLANNING",
                ),
            ]
            db.add_all(default_missions)
            db.commit()

        # 3. Seed All 33 NIC Icebergs
        if db.query(IcebergRecord).count() == 0:
            records = [
                IcebergRecord(
                    id=f"NIC-{row[0]}",
                    name=row[0],
                    sector=row[1],
                    latitude=row[2],
                    longitude=row[3],
                    length_nm=row[4],
                    width_nm=row[5],
                    area_sqnm=row[6],
                    size_km=row[7],
                    speed_ms=row[8],
                    heading_deg=row[9],
                    risk_level=row[10],
                    confidence=row[11],
                    last_updated="18 Aug 2026 00:00 UTC",
                )
                for row in NIC_ICEBERGS
            ]
            db.add_all(records)
            db.commit()

        # 4. Seed Initial User Feedback entries
        if db.query(UserFeedback).count() == 0:
            feedbacks = [
                UserFeedback(
                    user_id="usr-captain",
                    user_name="Capt. Ravi Menon",
                    user_email="captain@polarstar.gov.in",
                    category="Route Safety",
                    rating=5,
                    subject="Smooth standoff navigation around Tabular Megaberg A81",
                    message="The +24h neural drift prediction correctly anticipated the northeast outflow of A81 in the Scotia Sea sector, allowing us to maintain a 12 nm safety margin without reducing engine speed.",
                    status="REVIEWED",
                ),
                UserFeedback(
                    user_id="usr-researcher",
                    user_name="Dr. Ananya Sharma",
                    user_email="researcher@ncpor.res.in",
                    category="Iceberg Detection",
                    rating=5,
                    subject="SAR + Radiometry high accuracy on Giant Iceberg D15A",
                    message="Surface dimensions of D15A (51x22 NM) were validated with NISAR SAR imagery. The PINN hydrodynamic drag model gave less than 0.04 m/s residual velocity error.",
                    status="RESOLVED",
                ),
            ]
            db.add_all(feedbacks)
            db.commit()

    finally:
        db.close()
