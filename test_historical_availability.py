import urllib.request
import re

url = "https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/2026/aug/Antarctic/"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8")
    tifs = re.findall(r'href="([^"]*asi-AMSR2-s6250-([0-9]{8})-[^"]*\.tif)"', html)
    print(f"Found {len(tifs)} daily GeoTIFF files in August 2026!")
    for t, d in tifs[:3]:
        print("  -", d, t)
    for t, d in tifs[-3:]:
        print("  -", d, t)
except Exception as e:
    print("Failed:", e)
