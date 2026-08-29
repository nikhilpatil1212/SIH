import sys
sys.path.append(".")
from backend.app.navigation.land_mask import is_point_on_land, does_segment_cross_land, COASTAL_STATION_APPROACH
from backend.app.navigation.router import find_single_leg_route, haversine_distance_km

start = (-54.80, -68.30) # Ushuaia
dest = (-67.57, -68.13)  # Rothera

# Channel lead from Ushuaia into Drake Passage
u_lead = (-56.5, -65.0) # Open Drake Passage south of Cape Horn

print("Segment Ushuaia -> Open Drake Passage land check:", does_segment_cross_land(start[0], start[1], u_lead[0], u_lead[1]))
print("Segment Open Drake Passage -> Rothera land check:", does_segment_cross_land(u_lead[0], u_lead[1], dest[0], dest[1]))

r1 = find_single_leg_route(u_lead, dest, [], safety_buffer_km=20.0, objective="SAFEST")
print("Found route from Drake Passage to Rothera:", r1 is not None)
if r1:
    print(f"Waypoints ({len(r1)}): {r1}")
    has_land = any(does_segment_cross_land(r1[i]["lat"], r1[i]["lon"], r1[i+1]["lat"], r1[i+1]["lon"]) for i in range(len(r1)-1))
    print(f"Zero land collision: {not has_land}")
