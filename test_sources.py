import urllib.request
import json
import re

sources = [
    ("NOAA PolarWatch Daily Antarctic VIIRS NetCDF slice", "https://polarwatch.noaa.gov/erddap/griddap/noaacwVIIRSn21iceconcSP06Daily.nc?IceConc[(2024-08-20T12:00:00Z)][(0.0)][(0):(50):(1100)][(0):(50):(1100)]"),
    ("Uni Bremen AMSR2 Antarctic Daily Sea Ice", "https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/"),
    ("NOAA ERDDAP Global Analysis", "https://polarwatch.noaa.gov/erddap/status.json"),
    ("OSI-SAF Sea Ice Index", "https://osisaf-hl.met.no/v2p-sea-ice-index"),
    ("NASA NCCS Portal", "https://portal.nccs.nasa.gov/datashare/sea_ice/"),
]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

for name, url in sources:
    print(f"Testing {name}: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"  -> HTTP {resp.status}, Content-Type: {resp.headers.get('Content-Type')}, Size: {len(resp.read(50000))} bytes sample")
    except Exception as e:
        print(f"  -> Failed: {e}")
