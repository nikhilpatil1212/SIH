"""Automated unit tests for BYU/NIC iceberg data ingestion and feature engineering."""

import pytest
import os
import datetime
from app.services.iceberg_ingestion import (
    parse_ordinal_date,
    discover_iceberg_csv_files,
    parse_single_iceberg_file,
)
from app.services.trajectory_features import compute_trajectory_features

DATA_DIR = r"c:\Users\Nikhil\OneDrive\Desktop\Website creation\47years-iceberg-dataset"


def test_date_parser_7digit():
    # 2008 Day 3 -> 2008-01-03
    cal_date, year, doy = parse_ordinal_date(2008003)
    assert cal_date == datetime.date(2008, 1, 3)
    assert year == 2008
    assert doy == 3


def test_date_parser_5digit_legacy():
    # 92226 -> 1992 Day 226 -> 1992-08-13
    cal_date, year, doy = parse_ordinal_date(92226)
    assert cal_date == datetime.date(1992, 8, 13)
    assert year == 1992
    assert doy == 226


def test_date_parser_leap_year():
    # Leap year 2000 Day 60 -> 2000-02-29
    cal_date, year, doy = parse_ordinal_date(2000060)
    assert cal_date == datetime.date(2000, 2, 29)


def test_discover_files():
    files = discover_iceberg_csv_files(DATA_DIR)
    # Exactly 647 valid CSV files
    assert len(files) == 647
    # Ensure temporary file was excluded
    assert not any("#" in os.path.basename(f) for f in files)


def test_parse_known_iceberg_b27():
    b27_path = os.path.join(DATA_DIR, "updated7_consol", "b27.csv")
    assert os.path.exists(b27_path)
    
    canonical_obs, summary = parse_single_iceberg_file(b27_path)
    assert summary.iceberg_id == "B27"
    assert summary.total_observations > 2000
    assert summary.has_size_measurements
    assert len(canonical_obs) == summary.total_observations
    
    # Feature engineering
    feature_pts = compute_trajectory_features(canonical_obs)
    assert len(feature_pts) == len(canonical_obs)
    assert feature_pts[0].delta_distance_km == 0.0
    assert any(pt.is_stationary for pt in feature_pts)
