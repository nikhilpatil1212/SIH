import urllib.request
import re

url = "https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/2026/aug/"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8")
        
    files = re.findall(r'href="([^"]+)"', html)
    print("Files/dirs in aug 2026:", files[:15])
    
    # Check if there are daily .nc or .tif or .hdf or .png or .zip
    for f in files:
        if any(ext in f for ext in ['.nc', '.tif', '.hdf', '.png', '.zip', '.tar', '.dat', '.grd']):
            print("Found data file:", f)
            break
except Exception as e:
    print("Failed:", e)
