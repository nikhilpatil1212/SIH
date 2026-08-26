"""Recursive data ingestion pipeline for the BYU/NIC 47-year consolidated
Antarctic iceberg tracking database.

Preserves 100% of raw sensor data while constructing canonical observations
with explicit provenance, sensor discrepancy metrics, and quality flags.
"""

import os
import glob
import re
import datetime
from typing import List, Dict, Tuple, Optional, Any
from ..schemas.iceberg import CanonicalIcebergObservation, IcebergTrackSummary
from ..physics.geodesy import haversine_distance_km, KM_PER_NMI


def parse_ordinal_date(date_int: int) -> Tuple[datetime.date, int, int]:
    """Parse integer date into calendar date with leap-year accounting.
    
    Supports:
        - 7-digit YYYYDDD (e.g. 2008003 -> 2008-01-03)
        - 5-digit legacy YYDDD (e.g. 92226 -> 1992-08-13)
        
    Returns:
        Tuple of (calendar_date, year, day_of_year).
    """
    d_str = str(date_int).strip()
    if len(d_str) == 5:
        # Shorthand format (e.g., 92226 -> year 1992, day 226)
        year = 1900 + int(d_str[:2])
        doy = int(d_str[2:])
    elif len(d_str) == 7:
        year = int(d_str[:4])
        doy = int(d_str[4:])
    else:
        raise ValueError(f"Invalid date format: {date_int}")

    cal_date = datetime.date(year, 1, 1) + datetime.timedelta(days=doy - 1)
    return cal_date, year, doy


def discover_iceberg_csv_files(root_dir: str) -> List[str]:
    """Recursively discover all valid iceberg CSV files in directory, ignoring backups.
    
    Args:
        root_dir: Base directory to scan.
        
    Returns:
        Sorted list of absolute paths to valid CSV files.
    """
    discovered = []
    for root, _, files in os.walk(root_dir):
        for f in files:
            fname = f.strip()
            # Ignore editor backup files (e.g. #d15b.csv#), dotfiles, and non-csv
            if fname.startswith('#') or fname.endswith('#') or fname.startswith('.'):
                continue
            if fname.lower().endswith('.csv'):
                discovered.append(os.path.join(root, f))
    return sorted(discovered)


def parse_single_iceberg_file(
    file_path: str,
) -> Tuple[List[CanonicalIcebergObservation], IcebergTrackSummary]:
    """Parse an individual BYU/NIC iceberg CSV file into canonical observations.
    
    Args:
        file_path: Path to the iceberg CSV file (read-only access).
        
    Returns:
        Tuple of (list_of_canonical_observations, track_summary).
    """
    iceberg_id = os.path.splitext(os.path.basename(file_path))[0].upper()
    
    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
        lines = [line.strip() for line in f if line.strip()]
        
    if not lines:
        raise ValueError(f"Empty file: {file_path}")

    header = [c.strip() for c in lines[0].split(',')]
    if 'date' not in header:
        raise ValueError(f"Malformed file (missing 'date' header): {file_path}")

    date_idx = header.index('date')
    size1_idx = header.index('size_1') if 'size_1' in header else -1
    size2_idx = header.index('size_2') if 'size_2' in header else -1

    # Identify all sensor prefixes
    sensors = set()
    for col in header:
        m = re.match(r'([a-zA-Z0-9]+)_[123]', col)
        if m and m.group(1) not in ('size',):
            sensors.add(m.group(1))

    sensor_col_map = {}
    for s in sensors:
        c1 = header.index(f"{s}_1") if f"{s}_1" in header else -1
        c2 = header.index(f"{s}_2") if f"{s}_2" in header else -1
        c3 = header.index(f"{s}_3") if f"{s}_3" in header else -1
        sensor_col_map[s] = (c1, c2, c3)

    raw_observations: List[Dict[str, Any]] = []

    # First pass: parse raw rows
    for line in lines[1:]:
        cols = [c.strip() for c in line.split(',')]
        if len(cols) != len(header):
            continue

        try:
            date_val = int(cols[date_idx])
            cal_date, year, doy = parse_ordinal_date(date_val)
        except Exception:
            continue

        # Extract dimensions (reported in nautical miles in BYU database)
        s1_nmi = float(cols[size1_idx]) if size1_idx >= 0 and cols[size1_idx] else 0.0
        s2_nmi = float(cols[size2_idx]) if size2_idx >= 0 and cols[size2_idx] else 0.0
        s1_km = round(s1_nmi * KM_PER_NMI, 2) if s1_nmi > 0 else None
        s2_km = round(s2_nmi * KM_PER_NMI, 2) if s2_nmi > 0 else None

        # Extract per-sensor coordinates and flags
        active_sensors = {}
        direct_sensors = []
        raw_sensor_dict = {}

        for s, (c1, c2, c3) in sensor_col_map.items():
            if c1 >= 0 and c2 >= 0:
                try:
                    lat = float(cols[c1]) if cols[c1] else 0.0
                    lon = float(cols[c2]) if cols[c2] else 0.0
                    flag = int(cols[c3]) if (c3 >= 0 and cols[c3]) else 0
                    
                    if lat != 0.0 or lon != 0.0:
                        active_sensors[s] = (lat, lon, flag)
                        raw_sensor_dict[s] = {"lat": lat, "lon": lon, "flag": flag}
                        if flag == 1:
                            direct_sensors.append(s)
                except Exception:
                    pass

        if not active_sensors:
            # Skip empty padding row where all sensors report 0,0
            continue

        # Canonical Position Determination
        is_interpolated = False
        discrepancy_km = 0.0
        multi_ambiguity = False
        contributing = []

        if direct_sensors:
            # Multiple direct observations: compute mean centroid across direct sensors
            contributing = sorted(direct_sensors)
            lats = [active_sensors[s][0] for s in direct_sensors]
            lons = [active_sensors[s][1] for s in direct_sensors]
            canon_lat = sum(lats) / len(lats)
            canon_lon = sum(lons) / len(lons)
            is_interpolated = False

            # Check spatial discrepancy between multiple direct sensors
            if len(direct_sensors) > 1:
                for i in range(len(direct_sensors)):
                    for j in range(i + 1, len(direct_sensors)):
                        d = haversine_distance_km(lats[i], lons[i], lats[j], lons[j])
                        if d > discrepancy_km:
                            discrepancy_km = d
                if discrepancy_km > 25.0:
                    multi_ambiguity = True
        else:
            # No direct observations: compute mean across available interpolated sensors
            contributing = sorted(active_sensors.keys())
            lats = [active_sensors[s][0] for s in active_sensors]
            lons = [active_sensors[s][1] for s in active_sensors]
            canon_lat = sum(lats) / len(lats)
            canon_lon = sum(lons) / len(lons)
            is_interpolated = True

        # Determine initial dimension provenance
        if s1_km is not None and s1_km > 0:
            size_src = "nic_direct"
            size_imp = False
        else:
            size_src = "missing"
            size_imp = False

        raw_observations.append({
            "iceberg_id": iceberg_id,
            "original_date": date_val,
            "calendar_date": cal_date,
            "latitude": round(canon_lat, 5),
            "longitude": round(canon_lon, 5),
            "size_major_km": s1_km,
            "size_minor_km": s2_km,
            "size_source": size_src,
            "size_is_imputed": size_imp,
            "contributing_sensors": contributing,
            "num_direct_sensors": len(direct_sensors),
            "is_interpolated": is_interpolated,
            "multi_sensor_discrepancy_km": round(discrepancy_km, 2) if discrepancy_km > 0 else None,
            "multi_sensor_ambiguity": multi_ambiguity,
            "raw_sensors": raw_sensor_dict,
        })

    if not raw_observations:
        raise ValueError(f"No valid coordinate records in {file_path}")

    # Forward-fill / backward-fill dimensions while preserving provenance
    last_s1 = None
    last_s2 = None
    for obs in raw_observations:
        if obs["size_source"] == "nic_direct":
            last_s1 = obs["size_major_km"]
            last_s2 = obs["size_minor_km"]
        elif last_s1 is not None:
            obs["size_major_km"] = last_s1
            obs["size_minor_km"] = last_s2
            obs["size_source"] = "forward_fill"
            obs["size_is_imputed"] = True

    # Backward fill if start of track preceded the first NIC measurement
    first_direct_s1 = None
    first_direct_s2 = None
    for obs in raw_observations:
        if obs["size_source"] == "nic_direct":
            first_direct_s1 = obs["size_major_km"]
            first_direct_s2 = obs["size_minor_km"]
            break

    if first_direct_s1 is not None:
        for obs in raw_observations:
            if obs["size_source"] == "missing":
                obs["size_major_km"] = first_direct_s1
                obs["size_minor_km"] = first_direct_s2
                obs["size_source"] = "backward_fill"
                obs["size_is_imputed"] = True

    # Convert to Pydantic objects
    canonical_list: List[CanonicalIcebergObservation] = []
    direct_count = 0
    interp_count = 0
    lats_all = []
    lons_all = []

    for item in raw_observations:
        s1 = item["size_major_km"]
        s2 = item["size_minor_km"]
        area = round(s1 * s2, 2) if (s1 and s2) else None
        item["area_sq_km"] = area
        
        obs_obj = CanonicalIcebergObservation(**item)
        canonical_list.append(obs_obj)
        
        if obs_obj.is_interpolated:
            interp_count += 1
        else:
            direct_count += 1
        lats_all.append(obs_obj.latitude)
        lons_all.append(obs_obj.longitude)

    # Compute trajectory total distance and durations
    start_d = canonical_list[0].calendar_date
    end_d = canonical_list[-1].calendar_date
    duration = (end_d - start_d).days + 1

    summary = IcebergTrackSummary(
        iceberg_id=iceberg_id,
        filename=os.path.basename(file_path),
        total_observations=len(canonical_list),
        direct_observations_count=direct_count,
        interpolated_observations_count=interp_count,
        start_date=start_d,
        end_date=end_d,
        duration_days=duration,
        min_latitude=min(lats_all),
        max_latitude=max(lats_all),
        min_longitude=min(lons_all),
        max_longitude=max(lons_all),
        total_trajectory_distance_km=0.0,
        max_observed_speed_km_day=0.0,
        mean_observed_speed_km_day=0.0,
        stationary_percentage=0.0,
        sensors_present=sorted(list(sensors)),
        has_size_measurements=any(o.size_major_km is not None for o in canonical_list),
        max_size_major_km=max([o.size_major_km for o in canonical_list if o.size_major_km is not None], default=None),
        max_size_minor_km=max([o.size_minor_km for o in canonical_list if o.size_minor_km is not None], default=None),
    )

    return canonical_list, summary
