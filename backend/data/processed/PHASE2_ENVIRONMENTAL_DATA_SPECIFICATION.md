# Phase 2A: Environmental Data Specification & Compatibility Report
**Platform:** Dhruv Sarthi — Polar Maritime Navigation AI  
**Document Purpose:** Complete technical specification and compatibility assessment of candidate environmental forcing datasets before download.

---

## 1. Candidate Dataset Matrix & Compatibility Evaluation

| Dataset Identifier | Domain & Variable | Temporal Coverage | Spatial Resolution | Temporal Res. | Native Longitude Grid | Missing Sentinel | Format | Overlap with BYU/NIC Database |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Copernicus Marine GLORYS12V1** | Ocean Current ($u_w, v_w$), $T_w$, Salinity | 1993-01-01 to present | $1/12^\circ$ ($\sim 3\text{--}4\,\text{km}$) | Daily Mean | $[-180.0, 180.0]$ | `1e20` (land) | NetCDF-4 | **1993–2026 (33.3 / 47.8 yrs)** |
| **NASA ECCO2** | Ocean Current ($u_w, v_w$), $T_w$ | 1992-01-01 to present | $1/4^\circ$ ($\sim 18\text{--}25\,\text{km}$) | 3-Day / Daily | $[0.0, 360.0]$ | `NaN` / `-9999` | NetCDF | **1992–2026 (34.3 / 47.8 yrs)** |
| **ECMWF ERA5** | 10m Wind ($u_a, v_a$), SST, MSLP | 1940-01-01 to present | $0.25^\circ \times 0.25^\circ$ ($\sim 28\,\text{km}$) | Hourly / Daily | $[0.0, 359.75]$ | `NaN` | GRIB2 / NetCDF | **1976–2026 (100% Full Overlap)** |
| **NOAA OISST v2.1** | Sea Surface Temp ($T_w$), SIC | 1981-09-01 to present | $0.25^\circ \times 0.25^\circ$ ($\sim 28\,\text{km}$) | Daily | $[0.125, 359.875]$ | `-999.0` | NetCDF-4 | **1981–2026 (44.7 / 47.8 yrs)** |
| **NSIDC CDR v4 (AMSR2)** | Sea-Ice Conc ($C_{\text{ice}}$) | 1978-10-25 to present | $25\,\text{km} / 12.5\,\text{km}$ | Daily | Polar Stereo | `2.54, 2.55` | NetCDF-4 | **1978–2026 (99.8% Overlap)** |
| **GEBCO 2024** | Bathymetric Depth ($D_{\text{bath}}$) | Static | 15 arc-sec ($\sim 450\,\text{m}$) | Static | $[-180.0, 180.0]$ | `NaN` | GeoTIFF / NetCDF | **Static 100%** |

---

## 2. Detailed Technical Specifications by Provider

### A. Ocean Surface Currents: Copernicus GLORYS12V1
* **Source Organization:** Copernicus Marine Environment Monitoring Service (CMEMS) / Mercator Ocean International.
* **Product ID:** `GLOBAL_MULTIYEAR_PHY_001_030` (1993–2021) & `GLOBAL_ANALYSISFORECAST_PHY_001_024` (2021–present).
* **Target Variables:**
  * `uo`: Zonal surface velocity (Eastward positive, $\text{m/s}$).
  * `vo`: Meridional surface velocity (Northward positive, $\text{m/s}$).
* **Coordinate Conventions:** Regular equirectangular grid; Latitude $[-80.0, 90.0]$ (ascending), Longitude $[-180.0, 180.0]$.
* **Data Volume:** Antarctic slice ($50^\circ\text{S} \text{ to } 80^\circ\text{S}$) $\approx 2.4\,\text{GB/year}$.
* **Access Protocol:** Python `copernicusmarine` CLI/API via free scientific credential.

### B. 10m Atmospheric Wind: ECMWF ERA5 Reanalysis
* **Source Organization:** European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus Climate Change Service (C3S).
* **Target Variables:**
  * `u10`: 10m Eastward wind component ($\text{m/s}$).
  * `v10`: 10m Northward wind component ($\text{m/s}$).
  * `sst`: Sea surface temperature ($\text{K}$, convert to $^\circ\text{C}$ via $T - 273.15$).
* **Coordinate Conventions:** Regular grid; Latitude $[90.0, -90.0]$ (descending North-to-South), Longitude $[0.0, 359.75]$.
* **Normalization Requirement:** Requires automatic wrapping of $[0, 360]$ longitudes to $[-180, 180]$.
* **Access Protocol:** Python `cdsapi` client via CDS API token.

### C. Sea Surface Temperature: NOAA OISST v2.1
* **Source Organization:** NOAA National Centers for Environmental Information (NCEI).
* **Target Variables:** `sst` (Sea surface temperature in $^\circ\text{C}$).
* **Sentinel Representation:** Land values encoded as `-999.0`.
* **Access Protocol:** Open HTTPS / OpenDAP direct access without authentication.

### D. Sea-Ice Concentration: NSIDC Climate Data Record v4
* **Source Organization:** NASA National Snow and Ice Data Center (NSIDC DAAC).
* **Target Variables:** `cdr_seaice_conc` (fraction in $[0.0, 1.0]$).
* **Coordinate Projection:** Southern Hemisphere Polar Stereographic grid (EPSG:3412).
* **Access Protocol:** NASA Earthdata Login via HTTPS.

### E. Bathymetry: GEBCO 2024
* **Source Organization:** General Bathymetric Chart of the Oceans (GEBCO) / IHO / IOC UNESCO.
* **Target Variable:** `elevation` (elevation relative to sea level; negative = ocean depth in meters).
* **Access Protocol:** Open HTTPS direct download.

---

## 3. Wagner et al. (2017) Input Contract Specification

The environmental integration layer must fulfill the exact input contract required by the analytical physics model without synthesizing data:

```
                                  Wagner Input Contract
                                 ┌───────────────────────┐
                                 │ WagnerPhysicsInput    │
                                 ├───────────────────────┤
                                 │ • latitude (deg)      │
                                 │ • ocean_u (m/s)       │
                                 │ • ocean_v (m/s)       │
                                 │ • wind_u (m/s)        │
                                 │ • wind_v (m/s)        │
                                 │ • length_m (m)        │
                                 │ • width_m (m)         │
                                 │ • thickness_m (m)     │
                                 │ • sst_c (deg C)       │
                                 └───────────▲───────────┘
                                             │
                          ┌──────────────────┴──────────────────┐
                          │     EnvironmentalService Bridge     │
                          └──────────────────▲──────────────────┘
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      ▼                  ▼                   ▼                   ▼                  ▼
GLORYS / ECCO2         ERA5            NOAA OISST            NSIDC SIC            GEBCO
 (u_w, v_w)         (u_a, v_a)           (T_w)                (C_ice)            (D_bath)
```

| Model Variable | Physical Meaning | Exact Required Unit | Coordinate System | Mandatory for Kinematics? |
| :--- | :--- | :---: | :--- | :---: |
| `latitude` | Determines Coriolis parameter $f = 2\Omega\sin\phi$ | Decimal degrees $[-90, -40]$ | WGS84 Geodetic | **YES** |
| `ocean_u` | Zonal surface ocean current velocity ($u_w$) | $\text{m/s}$ | Eastward Positive ($+u$) | **YES** |
| `ocean_v` | Meridional surface ocean current velocity ($v_w$) | $\text{m/s}$ | Northward Positive ($+v$) | **YES** |
| `wind_u` | 10m zonal atmospheric wind velocity ($u_a$) | $\text{m/s}$ | Eastward Positive ($+u$) | **YES** |
| `wind_v` | 10m meridional atmospheric wind velocity ($v_a$) | $\text{m/s}$ | Northward Positive ($+v$) | **YES** |
| `length_m` | Iceberg major horizontal axis ($L$) | Meters ($\text{m}$) | Horizontal Dimension | **YES** |
| `width_m` | Iceberg minor horizontal axis ($W$) | Meters ($\text{m}$) | Horizontal Dimension | **YES** |
| `thickness_m` | Iceberg draft/thickness ($H$) | Meters ($\text{m}$) | Vertical Dimension | **YES** (Default $250\,\text{m}$) |
| `sea_surface_temp_c` | Seawater temperature ($T_w$) | $^\circ\text{C}$ | Thermodynamic decay only | NO (Kinematics only) / YES (Decay) |

---

## 4. Spatiotemporal Gap & Quality Control Policy

1. **Temporal Gap Rule:** Maximum allowable temporal interpolation window between source reanalysis time slices is **24.0 hours**. Any query exceeding this threshold is flagged `is_missing = True, quality_flag = 'TEMPORAL_GAP_EXCEEDED'`.
2. **Spatial Gap Rule:** Maximum allowable distance between query coordinate and nearest grid node is **50.0 km**.
3. **Coastal / Land Mask Rule:** When querying points near shelf ice or islands, masked grid nodes are identified. If `allow_nearest_fallback = False`, the point is flagged `is_missing = True`. If `allow_nearest_fallback = True`, the nearest valid ocean node within $25\,\text{km}$ is selected with `interpolation_method = 'nearest'`.
4. **Physical Sanity Bounds:**
   * Ocean current speed: $\le 3.5\,\text{m/s}$
   * 10m Wind speed: $\le 65.0\,\text{m/s}$
   * SST: $[-2.5^\circ\text{C}, 30.0^\circ\text{C}]$
   * Sea-ice concentration: $[0.0, 1.0]$

---

## 5. Recommended Environmental Integration Strategy for Phase 2B

1. **Primary Ocean Currents:** **Copernicus GLORYS12V1** ($1/12^\circ$ daily) for modern era (1993–2026); **ECCO2** ($1/4^\circ$) for 1992–1993.
2. **Primary Atmospheric Wind:** **ECMWF ERA5** ($0.25^\circ$ hourly/daily) covering 100% of historical iceberg records (1976–2026).
3. **Primary SST:** **NOAA OISST v2.1** ($0.25^\circ$ daily) or ERA5 SST.
4. **Targeted Subsetting:** In Phase 2B, download localized spatiotemporal bounding boxes strictly matching active iceberg trajectories rather than the complete global archive.
