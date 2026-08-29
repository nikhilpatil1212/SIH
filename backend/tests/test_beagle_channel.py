import sys
sys.path.append(".")
from backend.app.navigation.land_mask import is_point_on_land, does_segment_cross_land, COASTAL_STATION_APPROACH

# Beagle channel sequence from Ushuaia port basin out to Drake Passage
ushuaia_channel = [
    (-54.80, -68.30), # Ushuaia port
    (-55.05, -67.20), # Beagle channel mid
    (-55.25, -65.80), # Beagle channel east entrance (Cape San Pio)
    (-56.00, -65.50), # Open Drake Passage
]

print("Checking Beagle Channel fairway segments:")
for i in range(len(ushuaia_channel) - 1):
    p1 = ushuaia_channel[i]
    p2 = ushuaia_channel[i+1]
    # Check if samples along fairway are near registered approach
    cross = does_segment_cross_land(p1[0], p1[1], p2[0], p2[1], num_samples=10)
    print(f"  {p1} -> {p2}: crosses land={cross}")
