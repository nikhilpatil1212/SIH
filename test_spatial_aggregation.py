import numpy as np
from PIL import Image

# AMSR2 Polar Stereographic South grid mapping (EPSG:3031)
# 1328 rows, 1264 cols, resolution 6.25 km (6250 m)
# Grid origin and extents
x_min = -3950000.0
x_max = 3950000.0
y_max = 4350000.0
y_min = -3950000.0

img = Image.open("data/spatial_sic/asi-AMSR2-s6250-20260829-v5.4.tif")
arr = np.array(img)
rows, cols = arr.shape

x = np.linspace(x_min, x_max, cols)
y = np.linspace(y_max, y_min, rows)
xx, yy = np.meshgrid(x, y)

# Polar stereographic (South, 71°S standard parallel) to lat/lon conversion:
# lon = atan2(x, -y) * 180 / pi
# r = sqrt(x^2 + y^2)
# lat = -90 + 2 * atan2(r, 2 * R * k0) * 180 / pi (approximate spherical/ellipsoid inversion)
lon_grid = np.degrees(np.arctan2(xx, -yy))
r_grid = np.hypot(xx, yy)
# Mapping r to latitude for South Polar Stereographic (R_earth = 6378137m, lat_ts = -70°)
# At South Pole (r=0), lat = -90°
# At r ~ 3.95e6 m, lat ~ -50°
c = 2.0 * np.arctan(r_grid / (2.0 * 6378137.0 * 0.9727))  # k0 ~ 0.9727 for 70°S
lat_grid = -90.0 + np.degrees(c)

print(f"Lat range: {lat_grid.min():.2f}° to {lat_grid.max():.2f}°")
print(f"Lon range: {lon_grid.min():.2f}° to {lon_grid.max():.2f}°")

# Let's test spatial sector aggregation for Weddell Sea, Ross Sea, and Amundsen Sea on the REAL grid!
from backend.app.services.antarctic_sic_grid_loader import ANTARCTIC_SPATIAL_SECTORS, is_point_in_sector

# Valid ocean pack ice filter (0 to 100%)
ocean_mask = (arr >= 0) & (arr <= 100)

for sector in ANTARCTIC_SPATIAL_SECTORS:
    name = sector["name"]
    lat_min, lat_max = sector["lat_min"], sector["lat_max"]
    lon_min, lon_max = sector["lon_min"], sector["lon_max"]
    
    lat_mask = (lat_grid >= lat_min) & (lat_grid <= lat_max)
    if lon_min > lon_max:  # Ross Sea wrap-around
        lon_mask = (lon_grid >= lon_min) | (lon_grid <= lon_max)
    else:
        lon_mask = (lon_grid >= lon_min) & (lon_grid <= lon_max)
        
    sec_mask = lat_mask & lon_mask & ocean_mask
    valid_cells = arr[sec_mask]
    
    # Filter pack ice cells (SIC > 0) vs total ocean cells in the sector
    # Maritime standard regional SIC is calculated over the active ice zone or oceanic sector
    ice_cells = valid_cells[valid_cells > 0]
    
    if len(valid_cells) > 0:
        mean_ocean_sic = float(valid_cells.mean())
        mean_pack_sic = float(ice_cells.mean()) if len(ice_cells) > 0 else 0.0
        min_sic = float(valid_cells.min())
        max_sic = float(valid_cells.max())
        print(f"Sector '{name:22s}': {len(valid_cells):6d} ocean cells ({len(ice_cells):5d} ice cells) | Mean Oceanic SIC = {mean_ocean_sic:5.1f}% | Pack SIC = {mean_pack_sic:5.1f}% | Min = {min_sic:4.1f}% | Max = {max_sic:4.1f}%")
