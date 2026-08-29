import os
import csv
import urllib.request
import ssl
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Tuple
from ..physics.geodesy import haversine_distance_km, initial_bearing_degrees
from .iceberg_ingestion import parse_single_iceberg_file

USNIC_CSV_URL = "https://usicecenter.gov/File/DownloadCurrent?pId=134"

BACKEND_PROCESSED_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed")
)
ROOT_PROCESSED_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "processed")
)
RAW_DATA_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "47years-iceberg-dataset", "updated7_consol")
)

CACHE_FILE = os.path.join(ROOT_PROCESSED_DIR, "usnic_current_antarctic_icebergs.csv")
PROTOTYPE_CSV_FILE = os.path.join(ROOT_PROCESSED_DIR, "iceberg_trajectory_prototype.csv")


def download_usnic_csv() -> bytes:
    """Download the latest official USNIC Antarctic Iceberg CSV."""
    ssl_context = ssl._create_unverified_context()
    req = urllib.request.Request(USNIC_CSV_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ssl_context, timeout=10) as response:
        return response.read()


def ensure_usnic_data_fresh() -> str:
    """Ensure cached USNIC CSV is present and fresh (less than 24 hours old)."""
    os.makedirs(ROOT_PROCESSED_DIR, exist_ok=True)
    
    if os.path.exists(CACHE_FILE):
        mtime = datetime.fromtimestamp(os.path.getmtime(CACHE_FILE))
        if datetime.now() - mtime < timedelta(hours=24):
            return CACHE_FILE
            
    try:
        print("[*] Cache expired or missing. Fetching fresh USNIC data...")
        data = download_usnic_csv()
        with open(CACHE_FILE, "wb") as f:
            f.write(data)
        print(f"[+] Successfully saved USNIC data to {CACHE_FILE}")
    except Exception as e:
        print(f"[!] Error fetching USNIC data online: {e}")
        if not os.path.exists(CACHE_FILE):
            raise RuntimeError(f"Failed to fetch USNIC data and no cached file exists at {CACHE_FILE}")
            
    return CACHE_FILE


def get_region_for_iceberg(berg_name: str) -> str:
    """Map USNIC iceberg naming prefix (A, B, C, D) to its region quadrant."""
    if not berg_name:
        return "Unknown Antarctic Sector"
    prefix = berg_name[0].upper()
    if prefix == "A":
        return "Bellingshausen / Weddell Sea (Quadrant A)"
    elif prefix == "B":
        return "Amundsen / Ross Sea (Quadrant B)"
    elif prefix == "C":
        return "Ross Sea / Wilkes Land (Quadrant C)"
    elif prefix == "D":
        return "Wilkes Land / Weddell Sea (Quadrant D)"
    return "Antarctic Coastal Sector"


def get_historical_kinematics(berg_id: str) -> Tuple[float, float, float, float, bool]:
    """Retrieve the latest two historical observations to calculate actual kinematics.
    
    Checks:
        1. JSON file (e.g. B09B.json)
        2. Raw CSV file (e.g. b09b.csv) in raw dataset
        3. Prototype CSV file (iceberg_trajectory_prototype.csv)
        
    Returns:
        Tuple of (speed_m_s, bearing_deg, prev_delta_lat, prev_delta_lon, has_kinematics)
    """
    berg_key = berg_id.strip().upper()
    
    # 1. Try reading from individual JSON track file
    json_path = os.path.join(BACKEND_PROCESSED_DIR, f"{berg_key}.json")
    if os.path.exists(json_path):
        try:
            import json
            with open(json_path, "r", encoding="utf-8") as f:
                points = json.load(f)
                
            if len(points) >= 2:
                obs_1 = points[-1]
                obs_2 = points[-2]
                
                d1 = obs_1["calendar_date"]
                d2 = obs_2["calendar_date"]
                if isinstance(d1, str):
                    d1 = datetime.strptime(d1, "%Y-%m-%d").date()
                if isinstance(d2, str):
                    d2 = datetime.strptime(d2, "%Y-%m-%d").date()
                    
                dt_days = (d1 - d2).days
                if dt_days <= 0:
                    dt_days = 1.0
                    
                prev_delta_lat = (obs_1["latitude"] - obs_2["latitude"]) / dt_days
                prev_delta_lon = (obs_1["longitude"] - obs_2["longitude"]) / dt_days
                
                dist_km = haversine_distance_km(obs_2["latitude"], obs_2["longitude"], obs_1["latitude"], obs_1["longitude"])
                speed_kmh = dist_km / (dt_days * 24.0)
                speed_m_s = speed_kmh / 3.6
                bearing_deg = initial_bearing_degrees(obs_2["latitude"], obs_2["longitude"], obs_1["latitude"], obs_1["longitude"])
                
                return speed_m_s, bearing_deg, prev_delta_lat, prev_delta_lon, True
        except Exception as e:
            print(f"[!] Error reading JSON kinematics for {berg_id}: {e}")
            
    # 2. Try reading from raw CSV file in consolidated dataset
    raw_csv_path = os.path.join(RAW_DATA_DIR, f"{berg_key.lower()}.csv")
    if os.path.exists(raw_csv_path):
        try:
            obs, summary = parse_single_iceberg_file(raw_csv_path)
            if len(obs) >= 2:
                obs_1 = obs[-1]
                obs_2 = obs[-2]
                
                d1 = obs_1.calendar_date
                d2 = obs_2.calendar_date
                if isinstance(d1, str):
                    d1 = datetime.strptime(d1, "%Y-%m-%d").date()
                if isinstance(d2, str):
                    d2 = datetime.strptime(d2, "%Y-%m-%d").date()
                    
                dt_days = (d1 - d2).days
                if dt_days <= 0:
                    dt_days = 1.0
                    
                prev_delta_lat = (obs_1.latitude - obs_2.latitude) / dt_days
                prev_delta_lon = (obs_1.longitude - obs_2.longitude) / dt_days
                
                dist_km = haversine_distance_km(obs_2.latitude, obs_2.longitude, obs_1.latitude, obs_1.longitude)
                speed_kmh = dist_km / (dt_days * 24.0)
                speed_m_s = speed_kmh / 3.6
                bearing_deg = initial_bearing_degrees(obs_2.latitude, obs_2.longitude, obs_1.latitude, obs_1.longitude)
                
                return speed_m_s, bearing_deg, prev_delta_lat, prev_delta_lon, True
        except Exception as e:
            print(f"[!] Error reading raw CSV kinematics for {berg_id}: {e}")
            
    # 3. Try reading from full prototype CSV dataset
    if os.path.exists(PROTOTYPE_CSV_FILE):
        try:
            pts = []
            with open(PROTOTYPE_CSV_FILE, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row["iceberg_id"].strip().upper() == berg_key:
                        pts.append(row)
            
            # Sort by date
            pts.sort(key=lambda r: r["date"])
            
            if len(pts) >= 2:
                obs_1 = pts[-1]
                obs_2 = pts[-2]
                
                d1 = obs_1["date"]
                d2 = obs_2["date"]
                if isinstance(d1, str):
                    d1 = datetime.strptime(d1, "%Y-%m-%d").date()
                if isinstance(d2, str):
                    d2 = datetime.strptime(d2, "%Y-%m-%d").date()
                    
                dt_days = (d1 - d2).days
                if dt_days <= 0:
                    dt_days = 1.0
                    
                lat1, lon1 = float(obs_2["latitude"]), float(obs_2["longitude"])
                lat2, lon2 = float(obs_1["latitude"]), float(obs_1["longitude"])
                
                prev_delta_lat = (lat2 - lat1) / dt_days
                prev_delta_lon = (lon2 - lon1) / dt_days
                
                dist_km = haversine_distance_km(lat1, lon1, lat2, lon2)
                speed_kmh = dist_km / (dt_days * 24.0)
                speed_m_s = speed_kmh / 3.6
                bearing_deg = initial_bearing_degrees(lat1, lon1, lat2, lon2)
                
                return speed_m_s, bearing_deg, prev_delta_lat, prev_delta_lon, True
        except Exception as e:
            print(f"[!] Error reading prototype CSV kinematics for {berg_id}: {e}")
            
    return 0.0, 0.0, 0.0, 0.0, False


def load_current_icebergs() -> List[Dict[str, Any]]:
    """Parse USNIC CSV, merge with historical kinematics, and build Iceberg objects."""
    csv_path = ensure_usnic_data_fresh()
    icebergs = []
    
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                name = row["Iceberg"].strip()
                length_nm = float(row["Length (NM)"] or 5.0)
                width_nm = float(row["Width (NM)"] or 2.5)
                lat = float(row["Latitude"])
                lon = float(row["Longitude"])
                last_update = row["Last Update"].strip()
                
                # Geodesic size in km (1 NM = 1.852 km)
                size_km = round(length_nm * 1.852, 2)
                
                # Fetch actual kinematics from history if available
                speed_m_s, bearing_deg, prev_lat, prev_lon, has_kin = get_historical_kinematics(name)
                
                # Classify risk based on iceberg dimensions and speed
                if size_km > 25.0 or (speed_m_s > 0.8 and size_km > 15.0):
                    risk = "high"
                elif size_km > 10.0 or speed_m_s > 0.4:
                    risk = "medium"
                else:
                    risk = "low"
                
                region = get_region_for_iceberg(name)
                
                # Center projection around Weddell Sea: x=500, y=500 for lat=-70, lon=-45
                x = round(500.0 + (lon - (-45.0)) * 18.0)
                y = round(500.0 + (lat - (-70.0)) * (-90.0))
                
                # Build canonical Iceberg dict matching UI types
                icebergs.append({
                    "id": name,
                    "position": {"x": x, "y": y, "lat": lat, "lon": lon},
                    "observedAt": f"{last_update} (USNIC tracked)",
                    "speedMs": round(speed_m_s, 2),
                    "headingDeg": round(bearing_deg, 1),
                    "riskLevel": risk,
                    "predictedPath": [],
                    "uncertainty": [2.0, 4.0, 7.0, 10.5, 14.5],
                    "confidence": 85,
                    "sizeKm": size_km,
                    "lengthNm": length_nm,
                    "widthNm": width_nm,
                    "region": region,
                    "hasKinematics": has_kin,
                    "previous_delta_latitude": round(prev_lat, 6),
                    "previous_delta_longitude": round(prev_lon, 6),
                    "metadata": {
                        "source": "US National Ice Center (USNIC)",
                        "last_update": last_update,
                        "fetched_at": datetime.fromtimestamp(os.path.getmtime(csv_path)).isoformat(),
                        "data_frequency": "Weekly"
                    }
                })
            except Exception as e:
                print(f"[!] Error parsing CSV row: {row}. Error: {e}")
                
    return icebergs
