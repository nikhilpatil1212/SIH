import urllib.request
import json

url = "http://127.0.0.1:8000/api/sea-ice/regions"
req = urllib.request.Request(url)
with urllib.request.urlopen(req, timeout=5) as resp:
    data = json.loads(resp.read().decode("utf-8"))

print("=== LIVE API RESPONSE TRACE ===")
print("HTTP Status:", resp.status)
print("Data Source:", data.get("data_source"))
print("Observation Timestamp:", data.get("observation_timestamp"))
print("Regions Monitored:", data.get("regions_monitored"))
print("\nAll 15 Sector Values:")
for r in data.get("regions", []):
    print(f"  - {r['region']:22s} | Current SIC: {r['current_sic']:5.1f}% | Cells: {r['valid_grid_cells']:6d} | Min: {r['sic_min']:4.1f}% | Max: {r['sic_max']:4.1f}% | Risk: {r['risk']:9s} | +7d: {r['forecast']['7d']:5.1f}%")
