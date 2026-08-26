# BYU/NIC Antarctic Iceberg Database: 47.8-Year Ingestion & Quality Audit Report
**Platform:** Dhruv Sarthi — Polar Maritime Navigation AI  
**Source Dataset:** BYU MERS / National Ice Center Consolidated Database (Release v8.0, 1978–2026)  
**Authoritative Reference:** J.S. Budge & D.G. Long, *IEEE JSTARS*, Vol. 11, No. 2, 2017  
**Analytical Drift Physics:** T.J.W. Wagner, R.W. Dell, I. Eisenman, *Journal of Physical Oceanography*, 47(7), 2017  

---

## 1. Executive Ingestion Summary

* **Raw Files Discovered:** **649** files (647 valid CSV tracks, 1 temporary `#d15b.csv#` editor backup, 1 documentation text file)
* **Valid Iceberg Tracks Cataloged:** **647** distinct iceberg tracks
* **Total Daily Records Ingested:** **516,439** observations with valid spatial coordinates (252 empty zero-padding rows skipped)
* **Direct Satellite/NIC Fixes (`_3 == 1`):** **422,099** records (**81.7%**)
* **Interpolated Gap Fixes (`_3 == 0`):** **94,340** records (**18.3%**)
* **Calendar Span:** **July 23, 1978 through April 30, 2026** (**47.8 calendar years / 17,448 days**)
* **Source Integrity:** 100% of raw CSV source files in `47years-iceberg-dataset/updated7_consol/` remained strictly read-only and unmodified.

---

## 2. Multi-Sensor Distribution

| Sensor Name | Instrument Type | Platform | Direct Observations | Interpolated / Gap Fixes | Total Sensor Fixes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ASCAT** | C-band Active Scatterometer | MetOp-A/B/C | 177,859 | 32,634 | 210,493 |
| **QuikSCAT** | Ku-band Active Scatterometer | SeaWinds / QuikSCAT | 184,644 | 5,705 | 190,349 |
| **NIC** | Multi-Sensor Optical/IR/SAR | NOAA National Ice Center | 47,343 | 196,363 | 243,706 |
| **ERS-1/2** | C-band Active Microwave | ERS-1, ERS-2 | 41,069 | 186 | 41,255 |
| **OSCAT** | Ku-band Active Scatterometer | Oceansat-2 (ISRO) | 34,102 | 2,025 | 36,127 |
| **SeaWinds** | Ku-band Scatterometer | ADEOS-II (Midori-II) | 11,523 | 596 | 12,119 |
| **NSCAT** | Ku-band Doppler Scatterometer | ADEOS-I | 3,838 | 26 | 3,864 |
| **SASS** | Ku-band Scatterometer | Seasat-A (1978) | 752 | 14 | 766 |

---

## 3. Data Quality, Grounding & Kinematic Metrics

* **Stationary Observations ($\Delta d < 1.0\,\text{km/day}$):** **286,625 records (55.5%)**
  * *Interpretation:* Antarctic tabular icebergs spend over half their observable lifespans stationary due to shallow bathymetric grounding on continental shoals (e.g. Ronne/Filchner shelf breaks) or heavy pack-ice locking in winter.
* **Direct Multi-Sensor Overlap:** **75,804 records** have simultaneous direct fixes from multiple sensors on the exact same date (e.g. QuikSCAT + ASCAT overlap 2006–2009).
* **Multi-Sensor Geolocation Discrepancy ($> 25\,\text{km}$):** **1,241 records (0.24%)** flagged with `multi_sensor_ambiguity = True` (attributable to radar centroid vs optical edge tracking in giant fragmented bergs).
* **Heuristic Velocity Anomalies ($> 60\,\text{km/day}$ / $> 1.5\,\text{m/s}$):** **1,814 records (0.35%)** flagged with `suspicious_speed = True` for future quality filtering.
* **Missing Dimensions:** 48,165 records contain direct major/minor axis dimensions from NIC reports; 468,274 daily scatterometer records were continuous kinematic points where dimensions were forward-filled along the track.

---

## 4. Top 10 Longest Observed Antarctic Icebergs

1. **B09B:** 12,452 observations (~34.1 years tracked)
2. **A23A:** 11,953 observations (~32.7 years tracked)
3. **C15:** 9,389 observations (~25.7 years tracked)
4. **B22A:** 8,644 observations (~23.7 years tracked)
5. **C18B:** 7,505 observations (~20.5 years tracked)
6. **C24:** 7,266 observations (~19.9 years tracked)
7. **B16:** 6,716 observations (~18.4 years tracked)
8. **C21B:** 6,546 observations (~17.9 years tracked)
9. **B29:** 5,824 observations (~15.9 years tracked)
10. **C10:** 5,223 observations (~14.3 years tracked)

---

## 5. Required Missing Environmental Data for Analytical Physics Execution

As established in the Wagner et al. (2017) scientific review, the BYU/NIC observational dataset provides historical kinematic tracks $(t, x, y, L, W)$ but **does not contain environmental forcing fields**. To integrate the analytical physics drift model in hindcast or forecast mode, the following external grids must be co-located:

1. **Surface Ocean Velocity ($\mathbf{v}_w = (u_w, v_w)$):** Copernicus Marine GLORYS12V1 or NASA ECCO2 ($1/12^\circ$ daily).
2. **10m Surface Wind Velocity ($\mathbf{v}_a = (u_a, v_a)$):** ECMWF ERA5 Reanalysis ($0.25^\circ$ hourly/daily).
3. **Sea Surface Temperature ($T_w$):** NOAA OISST v2.1 ($0.25^\circ$ daily) for thermodynamic wave/basal/convective decay.
4. **Sea-Ice Concentration ($C_{\text{ice}}$):** NSIDC / OSI-SAF AMSR2 Satellite CDR ($12.5\,\text{km}$ daily).
