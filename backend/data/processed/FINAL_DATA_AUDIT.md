# DHRUV SARTHI — Final Pre-Modeling Data Audit Report
**Audit Date:** August 26, 2026  
**Scope:** Comprehensive physical data audit of all raw datasets, co-located trajectories, environmental archives, and enriched meteorological records before Phase 3 ML modeling.

---

## 1. Inventory of Available Data Assets

```
                                      Dhruv Sarthi Data Ecosystem
                                     ┌───────────────────────────┐
                                     │  Canonical Data Archives  │
                                     └─────────────┬─────────────┘
                                                   │
        ┌─────────────────────────┬────────────────┼─────────────────────────┬─────────────────────────┐
        ▼                         ▼                ▼                         ▼                         ▼
 [BYU/NIC 47-Year Database]  [Canonical Traj.] [Phase 2B Co-Location]    [Enriched Met Dataset]    [Environmental Grids]
  • 647 Iceberg CSVs          • 647 JSON tracks • 480 Co-located obs.     • sample_enriched_500     • GLORYS12V1 (uo, vo)
  • 516,439 Observations      • Provenance flags• Multi-horizon steps     • 500 records (68 bergs)  • ERA5 (u10, v10, Met)
  • 1976–2026 Coverage        • Geodesy features• 100% Zero-leakage       • ERA5 u10, v10, T, P, Q  • OISST v2.1, NSIDC, GEBCO
```

| Asset Name | Local File Path | Records / Files | Format | Temporal Coverage | Variables Contained | Primary Role in Dhruv Sarthi |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **BYU/NIC Raw Archive** | `47years-iceberg-dataset/updated7_consol/*.csv` | 647 files (516,439 rows) | CSV (Read-Only) | 1976–2026 | Day, Pos, Lat, Lon, Dim, Obs, Sensors | Ground-truth iceberg tracking positions |
| **Canonical Trajectories** | `backend/data/processed/*.json` | 647 files + Master Catalog | JSON | 1976–2026 | Kinematics, bearings, speeds, size provenance | Standardized clean input trajectories |
| **Phase 2B Co-Location** | `backend/data/processed/phase2b/colocated_observations.json` | 480 rows (2.08 MB) | JSON | 2008–2021 | $(u_w, v_w, u_a, v_a, T_w, C_{\text{ice}}, D_{\text{bath}})$ | Validated co-located physical forcing |
| **Phase 2B Hindcasts** | `backend/data/processed/phase2b/hindcast_predictions.json` | 480 rows (513 KB) | JSON | 2008–2021 | Wagner 24/48/72h preds, persistence preds | Analytical physics baseline predictions |
| **Enriched Met Dataset** | `sample_enriched_icebergs_500.csv` | 500 rows (83.1 KB) | CSV | 2019-08-16 to 2022-08-12 | Wind $u/v$, $T_{2m}$, $P_{\text{msl}}$, $q$, Dimensions | Real ERA5 meteorological co-location slice |

---

## 2. In-Depth Analysis of Newly Obtained Meteorological Dataset (`sample_enriched_icebergs_500.csv`)

### A. Dataset Structure & Fields
* **Total Rows:** 500 valid observations across **68 unique icebergs** (e.g. `A69B`, `B39`, `D28`, `B42`, `A76B`, `B46`, `B09B`, `A69A`, `D20A`, `A23A`, `A68H`, `C35`, `C38B`).
* **Source Files:** 104 weekly snapshot files from the US National Ice Center (NIC) Antarctic archive (e.g. `AntarcticIcebergs_20210507.csv`).
* **Temporal Range:** `2019-08-16` to `2022-08-12` (modern satellite scatterometer & SAR era).

### B. Scientific Variable Definitions & Unit Validation

| Column Name | Inferred Field Meaning | Native Units | Value Range in Dataset | Mean Value | Conversion / Pipeline Normalization Required |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `Iceberg` | Iceberg Identifier | String | 68 IDs | — | None |
| `Length_(NM)` | Major horizontal dimension ($L$) | Nautical Miles (NM) | $2.0\text{--}82.0\,\text{NM}$ | $16.11\,\text{NM}$ | Convert to meters: $L = \text{Length\_NM} \times 1852.0$ ($3.7\text{--}151.9\,\text{km}$) |
| `Width_(NM)` | Minor horizontal dimension ($W$) | Nautical Miles (NM) | $2.0\text{--}34.0\,\text{NM}$ | $7.57\,\text{NM}$ | Convert to meters: $W = \text{Width\_NM} \times 1852.0$ ($3.7\text{--}63.0\,\text{km}$) |
| `Latitude` | Geodetic Latitude | Decimal Degrees | $[-77.61^\circ, -52.72^\circ]$ | $-69.18^\circ$ | Valid Southern Ocean domain |
| `Longitude` | Geodetic Longitude | Decimal Degrees | $[-168.86^\circ, 148.14^\circ]$ | $-17.74^\circ$ | WGS84 $[-180, 180]$ compliant |
| `Remarks` | Sector / Quadrant Tag | String | `wilke, amerw, belle, wilkw` | — | Sector tracking metadata |
| `Last_Update` | Observation Date | `YYYY-MM-DD` | 2019-08-16 to 2022-08-12 | — | ISO-8601 UTC timestamp |
| `wind_u` | 10m Zonal Wind ($u_a$) | $\text{m/s}$ (Eastward +) | $[-32.45, +12.34]\,\text{m/s}$ | $-1.81\,\text{m/s}$ | Direct input to Wagner analytical model |
| `wind_v` | 10m Meridional Wind ($v_a$) | $\text{m/s}$ (Northward +) | $[-14.19, +14.51]\,\text{m/s}$ | $+1.85\,\text{m/s}$ | Direct input to Wagner analytical model |
| `temperature` | 2m Surface Air Temperature ($T_a$) | Kelvin ($\text{K}$) | $[238.39, 278.55]\,\text{K}$ | $262.05\,\text{K}$ | Convert to Celsius: $T_a (^\circ\text{C}) = T_a (\text{K}) - 273.15$ (Range $-34.76^\circ\text{C} \text{ to } +5.40^\circ\text{C}$) |
| `pressure` | Atmospheric Pressure ($P$) | Pascals ($\text{Pa}$) | $[94428.95, 102190.56]\,\text{Pa}$ | $98446.09\,\text{Pa}$ | Convert to hPa: $P (\text{hPa}) = P (\text{Pa}) / 100.0$ (Range $944.3\text{--}1021.9\,\text{hPa}$) |
| `humidity` | Specific Humidity ($q$) | $\text{kg/kg}$ | $[0.000189, 0.005451]$ | $0.001722$ | Preserved as atmospheric boundary layer feature |

### C. Scientific Compatibility Assessment
1. **Source Reanalysis:** The wind, temperature, pressure, and humidity values represent co-located **ECMWF ERA5 surface reanalysis fields** matched at the iceberg observation fixes.
2. **10m Wind Compatibility:** `wind_u` and `wind_v` are in standard meteorological $\text{m/s}$ units (Eastward/Northward positive) and are **directly compatible with Wagner's 10m wind input vector $\mathbf{v}_a$**.
3. **Dimension Consistency:** `Length_(NM)` and `Width_(NM)` are recorded on the exact `Last_Update` observation dates by the US National Ice Center analysts, providing clean observed geometry without requiring imputation.
4. **Data Cleanliness:** Zero missing timestamps, zero NaN coordinates, zero corrupted records.

---

## 3. Master Feature Table Architecture for Phase 3B

The unified feature matrix fuses:
1. **Kinematic Track History:** $(lat_t, lon_t)$, observed velocity $(\dot{u}_t, \dot{v}_t)$, observed speed, bearing, turn rate, stationary flag.
2. **Iceberg Geometry:** $L$ (m), $W$ (m), aspect ratio $L/W$, harmonic mean length $S = LW/(L+W)$, scaling parameter $\Lambda$, size provenance.
3. **Physical Ocean Forcing:** GLORYS12V1 surface ocean current $(u_w, v_w)$, sea surface height $zos$.
4. **Physical Atmospheric Forcing:** ERA5 10m wind $(u_a, v_a)$, wind magnitude $|\mathbf{v}_a|$, wind angle $\theta_a$, 2m temperature $T_a$, pressure $P_{\text{msl}}$, specific humidity $q$.
5. **Cryospheric & Bathymetric State:** NSIDC sea ice concentration $C_{\text{ice}}$, GEBCO seafloor depth $D_{\text{bath}}$, draft-to-depth ratio $H / |D_{\text{bath}}|$.
6. **Wagner Analytical Baseline:** Analytical velocity $\mathbf{v}_{\text{Wagner}} = (u_{\text{Wagner}}, v_{\text{Wagner}})$, analytical speed, analytical bearing.
7. **Residual Target:**
   $$\Delta u = u_{\text{observed future}} - u_{\text{Wagner}}$$
   $$\Delta v = v_{\text{observed future}} - v_{\text{Wagner}}$$

---

## 4. Pre-Modeling Verification & Next Steps

* **Strict Anti-Leakage Rule Confirmed:** Training, validation, and test sets will be partitioned strictly by **independent Iceberg Track IDs** and historical time windows. Under no circumstance will rows within a single track be randomly shuffled across splits.
* **Physics Baseline Integrity Confirmed:** The ML model will strictly learn the residual $\Delta \mathbf{v}$, guaranteeing that whenever environmental features are missing or uncertain, the system defaults smoothly to the analytical Wagner model.
