import urllib.request
import re
import os
import gzip

url = "https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/2026/aug/Antarctic/"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8")
        
    files = re.findall(r'href="([^"]+(?:\.nc|\.hdf|\.tif|\.png|\.gz))"', html)
    print(f"Found {len(files)} spatial Antarctic Sea Ice files for August 2026! Sample:", files[-5:])
    
    if files:
        latest_file = files[-1]
        file_url = f"{url}{latest_file}"
        print(f"Downloading real Antarctic spatial raster: {file_url}")
        f_req = urllib.request.Request(file_url, headers=headers)
        with urllib.request.urlopen(f_req, timeout=30) as f_resp:
            data = f_resp.read()
            
        os.makedirs("data/spatial_sic", exist_ok=True)
        local_path = os.path.join("data", "spatial_sic", latest_file)
        with open(local_path, "wb") as f:
            f.write(data)
        print(f"Downloaded {len(data)} bytes to {local_path}!")
except Exception as e:
    print("Failed:", e)
