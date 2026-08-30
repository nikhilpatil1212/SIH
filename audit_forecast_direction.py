import urllib.request
import json

url = "http://127.0.0.1:8000/api/sea-ice/regions"
req = urllib.request.Request(url)
data = json.loads(urllib.request.urlopen(req).read())

print("| Region                 | Current SIC | +1d   | +3d   | +7d   | +14d  | +30d  | Change 7d |")
print("|------------------------|-------------|-------|-------|-------|-------|-------|-----------|")
for r in data["regions"]:
    name = r["region"]
    c_sic = r["current_sic"]
    f = r["forecast"]
    ch7 = r["change_7d"]
    print(f"| {name:22s} | {c_sic:10.1f}% | {f['1d']:4.1f}% | {f['3d']:4.1f}% | {f['7d']:4.1f}% | {f['14d']:4.1f}% | {f['30d']:4.1f}% | {ch7:+8.1f}% |")

# Let's inspect the ratio for each horizon
print("\n--- RATIO ANALYSIS (Forecast / Current SIC) ---")
for r in data["regions"]:
    if r["current_sic"] > 0:
        ratios = [f"{h}:{r['forecast'][h]/r['current_sic']:.4f}" for h in ["1d", "3d", "7d", "14d", "30d"]]
        print(f"{r['region']:22s} -> {', '.join(ratios)}")
