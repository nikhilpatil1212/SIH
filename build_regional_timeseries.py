import urllib.request
import re
import os
import time
from datetime import datetime, timezone
import numpy as np
from PIL import Image

from backend.app.services.antarctic_sic_grid_loader import (
    ANTARCTIC_SPATIAL_SECTORS,
    SPATIAL_DATA_DIR,
    X_MIN, X_MAX, Y_MAX, Y_MIN, R_EARTH, K0
)

# Download daily GeoTIFF files for August 2026 from Bremen AMSR2
base_url = "https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/2026/aug/Antarctic/"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

req = urllib.request.Request(base_url, headers=headers)
with urllib.request.urlopen(req, timeout=15) as resp:
    html = resp.read().decode("utf-8")

tif_files = re.findall(r'href="([^"]*asi-AMSR2-s6250-([0-9]{8})-[^"]*\.tif)"', html)
print(f"Found {len(tif_files)} available daily GeoTIFF rasters in archive.")

# Select daily sequence (e.g., last 20 daily observations)
selected_tifs = tif_files[-20:]
print(f"Downloading and processing {len(selected_tifs)} daily spatial GeoTIFFs...")

# Compute coordinate grids once
sample_path = os.path.join(SPATIAL_DATA_DIR, "asi-AMSR2-s6250-20260829-v5.4.tif")
img = Image.open(sample_path)
arr = np.array(img)
rows, cols = arr.shape

x = np.linspace(X_MIN, X_MAX, cols)
y = np.linspace(Y_MAX, Y_MIN, rows)
xx, yy = np.meshgrid(x, y)
lon_grid = np.degrees(np.arctan2(xx, -yy))
r_grid = np.hypot(xx, yy)
c = 2.0 * np.arctan(r_grid / (2.0 * R_EARTH * K0))
lat_grid = -90.0 + np.degrees(c)

# Precompute sector masks for all 15 regions
sector_masks = {}
for sec in ANTARCTIC_SPATIAL_SECTORS:
    name = sec["name"]
    lat_min, lat_max = sec["lat_min"], sec["lat_max"]
    lon_min, lon_max = sec["lon_min"], sec["lon_max"]
    lat_cond = (lat_grid >= lat_min) & (lat_grid <= lat_max)
    if lon_min > lon_max:
        lon_cond = (lon_grid >= lon_min) | (lon_grid <= lon_max)
    else:
        lon_cond = (lon_grid >= lon_min) & (lon_grid <= lon_max)
    sector_masks[name] = lat_cond & lon_cond

regional_records = []

for rel_path, date_str in selected_tifs:
    fname = rel_path.split("/")[-1]
    local_p = os.path.join(SPATIAL_DATA_DIR, fname)
    if not os.path.exists(local_p):
        f_url = f"{base_url}{fname}"
        print(f"Downloading {fname}...")
        try:
            f_req = urllib.request.Request(f_url, headers=headers)
            with urllib.request.urlopen(f_req, timeout=20) as f_resp:
                b = f_resp.read()
            with open(local_p, "wb") as f:
                f.write(b)
        except Exception as e:
            print(f"Failed {fname}: {e}")
            continue

    # Process raster
    img_d = Image.open(local_p)
    arr_d = np.array(img_d)
    ocean_mask_d = (arr_d >= 0) & (arr_d <= 100)
    obs_date = datetime.strptime(date_str, "%Y%m%d").strftime("%Y-%m-%d")

    for name, mask in sector_masks.items():
        valid_cells = arr_d[mask & ocean_mask_d]
        if len(valid_cells) > 0:
            m_sic = float(valid_cells.mean())
            min_s = float(valid_cells.min())
            max_s = float(valid_cells.max())
        else:
            m_sic, min_s, max_s = 0.0, 0.0, 0.0
        regional_records.append({
            "date": obs_date,
            "region": name,
            "mean_sic": round(m_sic, 2),
            "min_sic": round(min_s, 2),
            "max_sic": round(max_s, 2),
            "valid_cells": len(valid_cells)
        })

print(f"Processed {len(regional_records)} real regional historical observations across 15 regions!")
import pandas as pd
df = pd.DataFrame(regional_records)
os.makedirs("data/processed", exist_ok=True)
df.to_csv("data/processed/regional_historical_sic.csv", index=False)
print("Saved real regional time series to data/processed/regional_historical_sic.csv")

# Print summary table for Weddell Sea, Ross Sea, and Amundsen Sea
print("\n--- SAMPLE REAL HISTORICAL REGIONAL TIME SERIES ---")
for r_name in ["Weddell Sea", "Ross Sea", "Amundsen Sea", "Bellingshausen Sea", "Scotia Sea"]:
    sub = df[df["region"] == r_name].sort_values("date")
    print(f"\nRegion: {r_name} (Latest 5 real observations):")
    for _, row in sub.tail(5).iterrows():
        print(f"  {row['date']} | Mean SIC: {row['mean_sic']:5.2f}% | Valid Cells: {row['valid_cells']}")
