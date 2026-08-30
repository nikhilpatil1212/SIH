import urllib.request
import re

url = "https://seaice.uni-bremen.de/data/amsr2/asi_daygrid_swath/s6250/"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8")
        
    # Check directory listing
    years = re.findall(r'href="([0-9]{4}/)"', html)
    print("Available years in Bremen AMSR2 archive:", years)
    
    if years:
        latest_year = years[-1]
        year_url = f"{url}{latest_year}"
        print(f"Checking latest year: {year_url}")
        y_req = urllib.request.Request(year_url, headers=headers)
        with urllib.request.urlopen(y_req, timeout=10) as y_resp:
            y_html = y_resp.read().decode("utf-8")
        months = re.findall(r'href="([a-z]{3}/)"', y_html)
        print("Available months:", months)
        
        if months:
            latest_month = months[-1]
            month_url = f"{year_url}{latest_month}"
            print(f"Checking latest month: {month_url}")
            m_req = urllib.request.Request(month_url, headers=headers)
            with urllib.request.urlopen(m_req, timeout=10) as m_resp:
                m_html = m_resp.read().decode("utf-8")
            # Files: NetCDF (.nc), GeoTIFF (.tif), or HDF (.hdf)
            files = re.findall(r'href="([^"]*(?:asi-AMSR2-s6250-[^"]*|\.tif|\.nc|\.hdf|\.png))"', m_html)
            print(f"Found {len(files)} files in latest month. Sample:", files[:5])
except Exception as e:
    print("Failed:", e)
