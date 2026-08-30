import urllib.request
import json

url = "http://127.0.0.1:8000/api/sea-ice/regions"
req = urllib.request.Request(url)
data = json.loads(urllib.request.urlopen(req).read())

print("| Region                 | Current | +1d   | +3d   | +7d   | +14d  | +30d  | Change 7d | Direction   |")
print("|------------------------|---------|-------|-------|-------|-------|-------|-----------|-------------|")
for r in data["regions"]:
    c = r["current_sic"]
    f = r["forecast"]
    ch = r["change_7d"]
    if ch > 0.5:
        d = "INCREASING"
    elif ch < -0.5:
        d = "DECREASING"
    else:
        d = "STABLE"
    print(f"| {r['region']:22s} | {c:6.1f}% | {f['1d']:4.1f}% | {f['3d']:4.1f}% | {f['7d']:4.1f}% | {f['14d']:4.1f}% | {f['30d']:4.1f}% | {ch:+8.1f}% | {d:11s} |")
