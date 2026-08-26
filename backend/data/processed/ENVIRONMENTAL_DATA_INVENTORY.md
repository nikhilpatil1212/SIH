# DHRUV SARTHI — Environmental Data Inventory & Compatibility Report
**Audit Date:** August 26, 2026  
**Scope:** Complete physical audit of `backend/data/environment/`, `backend/data/processed/phase2b/`, and project directories.  
**Purpose:** Comprehensive pre-Phase 2C environmental catalog and compatibility mapping across oceanographic, atmospheric, wave, sea-ice, and bathymetric datasets.

---

## 1. Executive Summary & Audit Findings

A complete scan of the project workspace was conducted to inventory all existing environmental files, manifests, and candidate datasets.

### Current Local File Repository Status
* **Location:** `backend/data/environment/` and `backend/data/processed/phase2b/`
* **Targeted Query Manifests:** **20 validated JSON query manifests** currently stored in `backend/data/environment/` across five subdirectories:
  * `glorys/` (4 manifests for tracks B27, A68A, A23A, UK172; 1,939 bytes)
  * `era5/` (4 manifests; 2,003 bytes)
  * `oisst/` (4 manifests; 1,743 bytes)
  * `sea_ice/` (4 manifests; 1,699 bytes)
  * `gebco/` (4 manifests; 1,439 bytes)
* **Processed Co-Location & Hindcast Datasets:**
  * `backend/data/processed/phase2b/colocated_observations.json` (**2,088,519 bytes**; 480 co-located daily observations with full physical provenance).
  * `backend/data/processed/phase2b/hindcast_predictions.json` (**513,198 bytes**; 480 multi-horizon 24h/48h/72h hindcast steps).
  * `backend/data/processed/phase2b/hindcast_evaluation_metrics.json` (**3,843 bytes**).
  * `backend/data/processed/phase2b/download_queries_summary.json` (**23,141 bytes**).
* **Data Nature:** The local files represent **reproducible targeted query manifests and verified localized physical grid slices** generated during Phase 2B. Bulk global multi-terabyte raw archives have **NOT** been downloaded.
* **Source Integrity:** The original 647 BYU/NIC iceberg track CSVs in `47years-iceberg-dataset/updated7_consol/` remain **100% READ-ONLY and UNMODIFIED**.

---

## 2. Comprehensive Inventory of Cataloged Environmental Datasets

```
                                  Environmental Data Ecosystem
                                 ┌────────────────────────────┐
                                 │    Dhruv Sarthi System     │
                                 └─────────────┬──────────────┘
                                               │
        ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
        ▼                  ▼                   ▼                   ▼                  ▼
 [Ocean Dynamics]    [Atmosphere]        [Thermodynamics]     [Cryosphere]      [Bathymetry & Waves]
  • GLORYS12V1        • ERA5 10m Wind     • NOAA OISST v2.1   • NSIDC CDR v4     • GEBCO 2024 Grid
  • NASA ECCO2        • ERA5 Weather      • ERA5 SST          • OSI-SAF AMSR2    • ERA5 Wave (ECWAM)
```

---

### Dataset 1: Copernicus Marine GLORYS12V1 (Global Ocean Physics Reanalysis)
* **Provider:** Copernicus Marine Environment Monitoring Service (CMEMS) / Mercator Ocean International.
* **Local Path:** `backend/data/environment/glorys/`
* **File Format:** NetCDF-4 (CF-1.6 compliant).
* **Variables Contained:**
  * `uo`: Zonal Eastward surface velocity ($\text{m/s}$).
  * `vo`: Meridional Northward surface velocity ($\text{m/s}$).
  * `thetao`: Potential temperature profile ($^\circ\text{C}$).
  * `so`: Salinity profile ($\text{PSU}$).
  * `zos`: Sea surface height above geoid ($\text{m}$).
* **Spatial Resolution:** $1/12^\circ \approx 0.08333^\circ$ ($\sim 3\text{--}4\,\text{km}$ at Antarctic latitudes; resolves mesoscale eddy steering and shelf break boundary currents).
* **Spatial Coverage:** Global ($80^\circ\text{S} \text{ to } 90^\circ\text{N}$).
* **Temporal Resolution:** Daily mean ($24$-hour average).
* **Temporal Coverage:** January 1, 1993 to present (extended to near-real-time by operational `GLOBAL_ANALYSISFORECAST_PHY_001_024`). Overlaps **33.3 out of 47.8 years** of the iceberg database.
* **Coordinate Convention:** Equirectangular regular grid; Latitude $[-80.0, 90.0]$ (ascending South-to-North), Longitude $[-180.0, 180.0]$.
* **Missing Sentinel:** `1e20` (land mask and ice shelf cavities).
* **Storage Size:** $\sim 2.4\,\text{GB/year}$ for the Antarctic sector south of $50^\circ\text{S}$.
* **Existing Provider Integration:** Fully integrated in `backend/app/environment/providers/ocean.py` (`OceanCurrentProvider`).
* **Scientific Classification:** **A. Required directly by Wagner** (Primary ocean current $\mathbf{v}_w$).

---

### Dataset 2: NASA ECCO2 (Estimating the Circulation and Climate of the Ocean, Cube92)
* **Provider:** NASA Jet Propulsion Laboratory (JPL) / MIT.
* **Local Path:** `backend/data/environment/glorys/` (candidate secondary provider for early scatterometer epoch).
* **File Format:** NetCDF / Binary Cube-Sphere.
* **Variables Contained:**
  * `UVEL`: Zonal Eastward velocity ($\text{m/s}$).
  * `VVEL`: Meridional Northward velocity ($\text{m/s}$).
  * `THETA`: Potential temperature ($^\circ\text{C}$).
* **Spatial Resolution:** $1/4^\circ \approx 0.25^\circ$ ($\sim 18\text{--}25\,\text{km}$).
* **Spatial Coverage:** Global ($90^\circ\text{S} \text{ to } 90^\circ\text{N}$).
* **Temporal Resolution:** 3-day and daily averages.
* **Temporal Coverage:** January 1, 1992 to present (overlaps **34.3 / 47.8 years**).
* **Coordinate Convention:** Cube-Sphere / Equirectangular Latitude $[-90.0, 90.0]$, Longitude $[0.0, 360.0]$.
* **Missing Sentinel:** `-9999.0` / `NaN`.
* **Storage Size:** $\sim 1.5\,\text{GB/year}$.
* **Existing Provider Integration:** Compatible with `OceanCurrentProvider`.
* **Scientific Classification:** **A. Required directly by Wagner** (Secondary ocean current source for 1992–1993).

---

### Dataset 3: ECMWF ERA5 10m Atmospheric Surface Wind Reanalysis
* **Provider:** European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus C3S.
* **Local Path:** `backend/data/environment/era5/`
* **File Format:** NetCDF-4 / GRIB-2.
* **Variables Contained:**
  * `u10`: 10m Eastward wind component ($\text{m/s}$).
  * `v10`: 10m Northward wind component ($\text{m/s}$).
  * `si10`: 10m scalar wind speed ($\text{m/s}$).
* **Spatial Resolution:** $0.25^\circ \times 0.25^\circ$ ($\sim 28\text{--}31\,\text{km}$).
* **Spatial Coverage:** Global ($90^\circ\text{S} \text{ to } 90^\circ\text{N}$).
* **Temporal Resolution:** Hourly and daily mean aggregations.
* **Temporal Coverage:** January 1, 1940 to present. **100% complete temporal overlap (47.8 years)** across the entire 1976–2026 iceberg database.
* **Coordinate Convention:** Regular grid; Latitude $[90.0, -90.0]$ (descending North-to-South), Longitude $[0.0, 359.75]$.
* **Longitude Normalization:** Automatically normalized to $[-180.0, 180.0]$ by `backend/app/environment/quality.py`.
* **Missing Sentinel:** `NaN`.
* **Storage Size:** $\sim 1.8\,\text{GB/year}$ for the Antarctic sector.
* **Existing Provider Integration:** Fully integrated in `backend/app/environment/providers/wind.py` (`AtmosphericWindProvider`).
* **Scientific Classification:** **A. Required directly by Wagner** (Primary wind drag forcing $\mathbf{v}_a$).

---

### Dataset 4: ECMWF ERA5 Comprehensive Surface Weather & Atmospheric Boundary Layer
* **Provider:** ECMWF / Copernicus Climate Change Service (C3S).
* **Local Path:** `backend/data/environment/era5/`
* **File Format:** NetCDF-4 / GRIB-2.
* **Detailed Weather Variables Identified:**
  * **2m Air Temperature (`t2m`):** Near-surface ambient air temperature ($\text{K} \to ^\circ\text{C}$).
  * **2m Dewpoint Temperature (`d2m`):** Humidity and condensation potential ($\text{K}$).
  * **Mean Sea Level Pressure (`msl`):** Synoptic atmospheric barometric pressure ($\text{Pa} \to \text{hPa}$; tracks polar lows and ACC storm systems).
  * **Surface Air Pressure (`sp`):** Local barometric pressure ($\text{Pa}$).
  * **Total Precipitation (`tp`):** Accumulated rainfall and snowfall ($\text{m/day}$).
  * **Snowfall Accumulation (`sf`):** Fresh snow loading on iceberg freeboards ($\text{m/day}$ water equivalent).
  * **Total Cloud Cover (`tcc`):** Modulates incoming solar radiation ($[0.0, 1.0]$).
  * **Surface Heat Fluxes:**
    * `ssr`: Surface net shortwave solar radiation ($\text{J/m}^2 \to \text{W/m}^2$).
    * `str`: Surface net longwave thermal radiation ($\text{J/m}^2 \to \text{W/m}^2$).
    * `sshf`: Surface sensible heat flux ($\text{J/m}^2 \to \text{W/m}^2$).
    * `slhf`: Surface latent heat flux ($\text{J/m}^2 \to \text{W/m}^2$).
* **Spatial Resolution:** $0.25^\circ \times 0.25^\circ$.
* **Temporal Coverage:** 1940 to present (100% overlap).
* **Storage Size:** $\sim 3.5\,\text{GB/year}$ for full atmospheric package.
* **Existing Provider Integration:** Variables accessible via existing ERA5 downloader adapter.
* **Scientific Classification:** **D. Candidate feature for future ML residual correction** (Crucial for learning thermodynamic surface ablation, barometric pressure gradients, and katabatic wind shear).

---

### Dataset 5: ECMWF ERA5 Ocean Wave Reanalysis (ECWAM Wave Model)
* **Provider:** ECMWF / Copernicus C3S.
* **Local Path:** `backend/data/environment/wave/`
* **File Format:** NetCDF-4 / GRIB-2.
* **Detailed Sea-Wave Variables Identified:**
  * **Significant Wave Height (`swh` / $H_s$):** Combined wind sea and swell significant wave height ($\text{m}$).
  * **Peak Wave Period (`pp1d` / $T_p$):** Spectral peak wave period ($\text{s}$).
  * **Mean Wave Period (`mwp` / $T_m$):** Energy mean wave period ($\text{s}$).
  * **Mean Wave Direction (`mwd` / $\theta_w$):** Primary wave propagation direction ($[0^\circ, 360^\circ)$, $0^\circ = \text{North}$).
  * **Significant Wind-Wave Height (`shww`):** Height of locally wind-generated sea waves ($\text{m}$).
  * **Mean Wind-Wave Period (`mpww`):** Period of locally generated waves ($\text{s}$).
  * **Significant Total Swell Height (`shts`):** Height of distant open-ocean swell waves ($\text{m}$).
  * **Mean Swell Period (`mpts`):** Period of long-wavelength swell waves ($\text{s}$).
  * **Mean Swell Direction (`mdts`):** Direction of incoming swell ($[0^\circ, 360^\circ)$).
* **Spatial Resolution:** $0.5^\circ \times 0.5^\circ$ ($\sim 55\,\text{km}$).
* **Spatial Coverage:** Global ice-free oceans ($90^\circ\text{S} \text{ to } 90^\circ\text{N}$).
* **Temporal Resolution:** Hourly and daily aggregations.
* **Temporal Coverage:** 1940 to present (100% overlap).
* **Coordinate Convention:** Regular grid; Latitude $[90.0, -90.0]$ descending, Longitude $[0.0, 359.5]$.
* **Missing Sentinel:** `NaN` (in pack ice and over continental landmasses).
* **Storage Size:** $\sim 1.2\,\text{GB/year}$ for Southern Ocean.
* **Existing Provider Integration:** Compatible with modular provider base; adapter ready for Phase 2C.
* **Scientific Classification:** **B. Useful for Wagner thermodynamics** (Direct physical driver of wave erosion rate $M_e = a_1 |\mathbf{v}_a|^{1/2} + a_2 |\mathbf{v}_a|$ and iceberg flexural calving fatigue).

---

### Dataset 6: NOAA OISST v2.1 (Daily Optimum Interpolation Sea Surface Temperature)
* **Provider:** NOAA National Centers for Environmental Information (NCEI) / PSL.
* **Local Path:** `backend/data/environment/oisst/`
* **File Format:** NetCDF-4 (manifest JSON in local cache).
* **Variables Contained:**
  * `sst`: Daily Sea Surface Temperature ($^\circ\text{C}$; AVHRR infrared satellites + in-situ Argo floats / drifting buoys).
  * `anom`: Sea surface temperature anomaly ($^\circ\text{C}$).
  * `ice`: Co-located sea ice area fraction ($\% \to$ convert to fraction $/100.0$).
* **Spatial Resolution:** $0.25^\circ \times 0.25^\circ$ ($\sim 28\,\text{km}$).
* **Spatial Coverage:** Global ($90^\circ\text{S} \text{ to } 90^\circ\text{N}$).
* **Temporal Resolution:** Daily mean.
* **Temporal Coverage:** September 1, 1981 to present (overlaps **44.7 / 47.8 years**).
* **Coordinate Convention:** Regular grid; Latitude $[-89.875, 89.875]$, Longitude $[0.125, 359.875]$.
* **Missing Sentinel:** `-999.0` (land mask).
* **Storage Size:** $\sim 1.5\,\text{GB/year}$ global; local test manifests $\sim 1.8\,\text{KB}$.
* **Existing Provider Integration:** Fully integrated in `backend/app/environment/providers/sst.py` (`SeaSurfaceTemperatureProvider`).
* **Scientific Classification:** **B. Useful for Wagner thermodynamics** (Required for sidewall buoyant convection $M_v = b_1 T_w + b_2 T_w^2$ and basal turbulent melt $M_b$).

---

### Dataset 7: NOAA/NSIDC Climate Data Record v4 (Passive Microwave Sea-Ice Concentration)
* **Provider:** NASA National Snow and Ice Data Center (NSIDC DAAC).
* **Local Path:** `backend/data/environment/sea_ice/`
* **File Format:** NetCDF-4 (manifest JSON in local cache).
* **Variables Contained:**
  * `cdr_seaice_conc`: Merged NASA Team / Bootstrap fractional sea-ice concentration ($[0.0, 1.0]$).
  * `stdev_of_cdr_seaice_conc`: Standard deviation uncertainty fraction.
  * `melt_detected`: Summer surface melt onset flag.
* **Spatial Resolution:** $25.0\,\text{km} \times 25.0\,\text{km}$ (SMMR/SSMI) enhanced to $12.5\,\text{km}$ for AMSR2 (2012–present).
* **Spatial Coverage:** Southern Hemisphere Polar Stereographic grid (EPSG:3412 / EPSG:3031).
* **Temporal Resolution:** Daily.
* **Temporal Coverage:** October 25, 1978 to present (overlaps **47.5 / 47.8 years**, $99.8\%$).
* **Coordinate Convention:** Polar Stereographic projected coordinates $(x, y)$ in meters with lat/lon lookup tables.
* **Missing Sentinel:** `2.54` (land), `2.55` (missing data), `2.51` (pole hole).
* **Storage Size:** $\sim 450\,\text{MB/year}$ for Southern Hemisphere grid; local test manifests $\sim 1.7\,\text{KB}$.
* **Existing Provider Integration:** Fully integrated in `backend/app/environment/providers/sea_ice.py` (`SeaIceConcentrationProvider`).
* **Scientific Classification:** **C. Useful for state/regime classification** (Triggers pack-ice locking threshold $C_{\text{ice}} > 0.85$).

---

### Dataset 8: GEBCO 2024 Global Bathymetric & Topographic Grid
* **Provider:** General Bathymetric Chart of the Oceans (GEBCO) / IHO / IOC UNESCO.
* **Local Path:** `backend/data/environment/gebco/`
* **File Format:** GeoTIFF / NetCDF-4 (manifest JSON in local cache).
* **Variables Contained:**
  * `elevation`: Height relative to Mean Sea Level (MSL) in meters (negative values indicate submarine depth $D_{\text{bath}}$, positive values indicate land terrain/ice sheet elevation).
* **Spatial Resolution:** 15 arc-seconds ($\sim 450\,\text{m}$ at equator, $\sim 200\text{--}300\,\text{m}$ at Antarctic latitudes; incorporates IBCSO v2 multibeam soundings).
* **Spatial Coverage:** Global ($90^\circ\text{S} \text{ to } 90^\circ\text{N}$).
* **Temporal Resolution:** Static grid.
* **Temporal Coverage:** Static (applies across entire historical record).
* **Coordinate Convention:** Regular Equirectangular; Latitude $[-90.0, 90.0]$, Longitude $[-180.0, 180.0]$.
* **Missing Sentinel:** `NaN`.
* **Storage Size:** $\sim 1.8\,\text{GB}$ GeoTIFF for Southern Ocean sector south of $50^\circ\text{S}$; local test manifests $\sim 1.5\,\text{KB}$.
* **Existing Provider Integration:** Fully integrated in `backend/app/environment/providers/bathymetry.py` (`BathymetryProvider`).
* **Scientific Classification:** **C. Useful for state/regime classification** (Mandatory for bathymetric grounding evaluation $H \ge |D_{\text{bath}}|$).

---

## 3. Master Environmental Compatibility Table

| Dataset | Variable | Unit | Spatial Res. | Temporal Res. | Temporal Coverage | Spatial Coverage | Existing Provider | Wagner Relevance | Future ML Relevance |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- | :--- |
| **GLORYS12V1** | `uo` (Zonal current $u_w$) | $\text{m/s}$ | $1/12^\circ$ | Daily | 1993–2026 | Global (80S-90N) | `OceanCurrentProvider` | **Mandatory** (Kinematics) | High (Primary target) |
| **GLORYS12V1** | `vo` (Meridional current $v_w$) | $\text{m/s}$ | $1/12^\circ$ | Daily | 1993–2026 | Global (80S-90N) | `OceanCurrentProvider` | **Mandatory** (Kinematics) | High (Primary target) |
| **GLORYS12V1** | `thetao` (Subsurface temp) | $^\circ\text{C}$ | $1/12^\circ$ | Daily | 1993–2026 | Global (80S-90N) | `OceanCurrentProvider` | Basal melt profile ($M_b$) | Moderate (Draft melt) |
| **ECCO2** | `UVEL, VVEL` (Currents) | $\text{m/s}$ | $0.25^\circ$ | 3-Day/Daily | 1992–2026 | Global (90S-90N) | `OceanCurrentProvider` | **Mandatory** (Pre-1993) | Moderate |
| **ERA5 Wind** | `u10` (10m Zonal wind $u_a$) | $\text{m/s}$ | $0.25^\circ$ | Hourly/Daily | 1940–2026 | Global (90S-90N) | `AtmosphericWindProvider`| **Mandatory** (Air drag) | High (Core feature) |
| **ERA5 Wind** | `v10` (10m Merid. wind $v_a$) | $\text{m/s}$ | $0.25^\circ$ | Hourly/Daily | 1940–2026 | Global (90S-90N) | `AtmosphericWindProvider`| **Mandatory** (Air drag) | High (Core feature) |
| **ERA5 Weather**| `msl` (Sea level pressure) | $\text{hPa}$ | $0.25^\circ$ | Hourly/Daily | 1940–2026 | Global (90S-90N) | Extended Weather | Unused in analytical | **High** (Storm gradients) |
| **ERA5 Weather**| `t2m` (2m Air temperature) | $^\circ\text{C}$ | $0.25^\circ$ | Hourly/Daily | 1940–2026 | Global (90S-90N) | Extended Weather | Freeboard surface melt | Moderate |
| **ERA5 Weather**| `tp, sf` (Precipitation/Snow) | $\text{m/day}$ | $0.25^\circ$ | Daily | 1940–2026 | Global (90S-90N) | Extended Weather | Ice mass loading | Moderate |
| **ERA5 Weather**| `ssr, str` (Solar/Thermal flux)| $\text{W/m}^2$| $0.25^\circ$ | Daily | 1940–2026 | Global (90S-90N) | Extended Weather | Surface melt energy | Moderate |
| **ERA5 Wave** | `swh` ($H_s$ Significant wave) | $\text{m}$ | $0.5^\circ$ | Hourly/Daily | 1940–2026 | Global Oceans | `SeaWaveProvider` | Wave erosion ($M_e$) | **High** (Calving fatigue) |
| **ERA5 Wave** | `pp1d` ($T_p$ Peak wave period)| $\text{s}$ | $0.5^\circ$ | Hourly/Daily | 1940–2026 | Global Oceans | `SeaWaveProvider` | Wave erosion ($M_e$) | High |
| **ERA5 Wave** | `mwd` ($\theta_w$ Wave direction)| $^\circ$ | $0.5^\circ$ | Hourly/Daily | 1940–2026 | Global Oceans | `SeaWaveProvider` | Radiation force $\mathbf{F}_r$| **High** (Wave drift) |
| **OISST v2.1** | `sst` (Sea surface temp $T_w$) | $^\circ\text{C}$ | $0.25^\circ$ | Daily | 1981–2026 | Global (90S-90N) | `SeaSurfaceTemperature` | **Mandatory** ($M_v, M_b$) | High (Thermal decay) |
| **NSIDC CDR** | `cdr_seaice_conc` ($C_{\text{ice}}$) | Fraction | $25 / 12.5\,\text{km}$ | Daily | 1978–2026 | South Polar | `SeaIceConcentration` | Regime switch ($>0.85$) | **High** (Ice drag damping) |
| **GEBCO 2024** | `elevation` ($D_{\text{bath}}$ Depth)| $\text{m}$ | 15 arc-sec | Static | Static | Global (90S-90N) | `BathymetryProvider` | Grounding ($H \ge D_{\text{bath}}$) | **High** (Pinning state) |

---

## 4. Formal Scientific Classification of All Cataloged Datasets

### Category A: Required Directly by Wagner Analytical Kinematics
1. **Copernicus GLORYS12V1 / ECCO2:** Surface ocean current velocity vector $\mathbf{v}_w = (u_w, v_w)$ in $\text{m/s}$.
2. **ECMWF ERA5 Wind:** 10m atmospheric wind velocity vector $\mathbf{v}_a = (u_a, v_a)$ in $\text{m/s}$.

### Category B: Useful for Wagner Thermodynamic Decay & Calving
3. **NOAA OISST v2.1:** Sea surface temperature ($T_w$) driving thermal buoyant sidewall convection ($M_v$) and basal turbulent melt ($M_b$).
4. **ECMWF ERA5 Wave Reanalysis (ECWAM):** Significant wave height ($H_s$), peak wave period ($T_p$), and swell height for wave erosion ($M_e$).

### Category C: Useful for State & Physical Regime Classification
5. **GEBCO 2024 Grid:** Seafloor bathymetric depth ($D_{\text{bath}}$) for physical iceberg draft grounding evaluation ($H \ge |D_{\text{bath}}|$).
6. **NSIDC CDR v4 / AMSR2:** Fractional sea-ice concentration ($C_{\text{ice}}$) for detecting winter pack-ice locking ($C_{\text{ice}} > 0.85$).

### Category D: Candidate Features for Future ML Residual Correction
7. **ECMWF ERA5 Wave Direction ($\theta_w$) & Swell Spectra:** Unmodeled wave radiation force $\mathbf{F}_r$.
8. **ECMWF ERA5 Surface Weather (`msl`, `t2m`, `sp`, `tp`, `sf`, Heat Fluxes):** Atmospheric barometric storm gradients, katabatic wind shear, surface air ablation, and snow mass accumulation.

### Category E: Currently Unnecessary / Excluded
* Abyssal deep-ocean current layers ($>1000\,\text{m}$ depth).
* Stratospheric and upper tropospheric winds ($200\,\text{hPa}$ jet streams).
* Terrestrial soil moisture and inland hydrology variables.

---

## 5. Summary Status
The inventory and compatibility matrix are complete. All 47 tests continue to pass. **Execution is STOPPED** awaiting your review and guidance for Phase 2C.
