import urllib.request
import os
import numpy as np

# Download the actual GeoTIFF raster for Antarctic Sea Ice
tif_filename = "asi-AMSR2-s6250-20260829-v5.4.tif"
url = f"https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/2026/aug/Antarctic/{tif_filename}"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

print(f"Downloading real GeoTIFF: {url}")
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=30) as resp:
    data = resp.read()

local_path = os.path.join("data", "spatial_sic", tif_filename)
with open(local_path, "wb") as f:
    f.write(data)

print(f"Downloaded {len(data)} bytes to {local_path}!")

# Read GeoTIFF with PIL / imageio / matplotlib / numpy
from PIL import Image
img = Image.open(local_path)
arr = np.array(img)

print("=== REAL SPATIAL ANTARCTIC GEOTIFF METADATA ===")
print(f"Dimensions: {arr.shape} ({arr.shape[0]} rows x {arr.shape[1]} cols = {arr.size} grid cells)")
print(f"Data type: {arr.dtype}")
print(f"Min value in raw array: {arr.min()}, Max value: {arr.max()}")

# In AMSR2 ASI 6.25km:
# 0 to 100: Sea Ice Concentration in %
# 110: Land mask
# 120: Missing data / fill
ocean_mask = (arr >= 0) & (arr <= 100)
ice_mask = (arr > 0) & (arr <= 100)
land_mask = (arr == 110)

print(f"Total ocean cells (0-100%): {ocean_mask.sum()} / {arr.size}")
print(f"Pack ice cells (>0%): {ice_mask.sum()}")
print(f"Land cells (110): {land_mask.sum()}")
print(f"Mean SIC across entire Southern Ocean pack ice: {arr[ice_mask].mean():.2f}%")
