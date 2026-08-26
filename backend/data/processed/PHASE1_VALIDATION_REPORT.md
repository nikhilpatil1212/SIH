# DHRUV SARTHI — Phase 1 Final Validation Report
**Dataset:** BYU MERS / National Ice Center Antarctic Iceberg Tracking Database  
**Validation Date:** August 26, 2026  
**Pipeline Status:** Ingestion, Quality Audit, Feature Engineering & Wagner Physics Verified (ML Training Halted)

---

## Section A: Dataset Version & Date Coverage Finding

### 1. Investigation of Date Range vs. Documentation
* **Documentation Statement:** `README_consolidated.TXT` states that the database release v8.0 was compiled through April 22, 2025.
* **Direct Raw CSV Investigation:**
  * Audited all **647 raw CSV files** in `47years-iceberg-dataset/updated7_consol/`.
  * **15,283 genuine daily rows** in the raw source files contain observation dates **after April 22, 2025 (`> 2025112`)**.
  * **46 distinct iceberg files** contain continuous daily observations through late 2025 and 2026 (e.g. `A23A`, `A76C`, `A81`, `A82`, `A83`, `A84`, `A85`, `B09B`, `B22A`, `C15`, `C18B`, `D15C`, `D33C`, `UK324`).
  * The latest raw observation in the source files is **`2026120` (April 30, 2026)** in `d15c.csv` (Line 89) and `d33c.csv` (Line 702).
  * In addition, **30 historical observations from 1976–1977** exist in early NIC quadrant sighting files (e.g. `b09.csv`, `c02.csv`).

### 2. Latest 20 Raw Observations in Source Files

| Date Code | Calendar Date | Iceberg ID | Source CSV File | Line # | Raw CSV Content |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **2026120** | 2026-04-30 | **D15C** | `d15c.csv` | 89 | `0,0,0,2026120,-67.14,79.65,1,14,7` |
| **2026120** | 2026-04-30 | **D33C** | `d33c.csv` | 702 | `-65.2166,-57.9087,1,2026120,0,0,0,0,0` |
| **2026119** | 2026-04-29 | **D15C** | `d15c.csv` | 88 | `0,0,0,2026119,-67.1318,79.6745,0,0,0` |
| **2026119** | 2026-04-29 | **D33C** | `d33c.csv` | 701 | `-65.3536,-57.9249,1,2026119,0,0,0,0,0` |
| **2026118** | 2026-04-28 | **D15C** | `d15c.csv` | 87 | `0,0,0,2026118,-67.1235,79.7006,0,0,0` |
| **2026118** | 2026-04-28 | **D33C** | `d33c.csv` | 700 | `-65.3536,-57.9249,1,2026118,0,0,0,0,0` |
| **2026117** | 2026-04-27 | **D15C** | `d15c.csv` | 86 | `0,0,0,2026117,-67.1152,79.7283,0,0,0` |
| **2026117** | 2026-04-27 | **D33C** | `d33c.csv` | 699 | `-65.4016,-58.0536,1,2026117,0,0,0,0,0` |
| **2026116** | 2026-04-26 | **D15C** | `d15c.csv` | 85 | `0,0,0,2026116,-67.1068,79.7575,0,0,0` |
| **2026116** | 2026-04-26 | **D33C** | `d33c.csv` | 698 | `-65.4125,-58.028,1,2026116,0,0,0,0,0` |
| **2026115** | 2026-04-25 | **D15C** | `d15c.csv` | 84 | `0,0,0,2026115,-67.0984,79.7881,0,0,0` |
| **2026115** | 2026-04-25 | **D33C** | `d33c.csv` | 697 | `-65.4125,-58.028,1,2026115,0,0,0,0,0` |
| **2026114** | 2026-04-24 | **D15C** | `d15c.csv` | 83 | `0,0,0,2026114,-67.09,79.82,1,14,7` |
| **2026114** | 2026-04-24 | **D33C** | `d33c.csv` | 696 | `-65.4642,-58.0926,1,2026114,0,0,0,0,0` |
| **2026113** | 2026-04-23 | **D15C** | `d15c.csv` | 82 | `0,0,0,2026113,-67.0816,79.8551,0,0,0` |
| **2026113** | 2026-04-23 | **D33C** | `d33c.csv` | 695 | `-65.5726,-58.1222,1,2026113,0,0,0,0,0` |
| **2026112** | 2026-04-22 | **A76C** | `a76c.csv` | 1753 | `-58.6567,-36.1843,1,2026112,0,0,0,0,0` |
| **2026112** | 2026-04-22 | **A81** | `a81.csv` | 1144 | `-64.6874,-56.3011,1,2026112,0,0,0,0,0` |
| **2026112** | 2026-04-22 | **A82** | `a82.csv` | 851 | `-68.8259,-90.623,1,2026112,0,0,0,0,0` |
| **2026112** | 2026-04-22 | **A83** | `a83.csv` | 701 | `-66.9895,-53.0361,1,2026112,0,0,0,0,0` |

### 3. Conclusion on Date Discrepancy
* The supplied dataset archive (`updated7_consol`) is a **newer active continuation snapshot** of the BYU database that has been updated through April 30, 2026.
* The static `README_consolidated.TXT` documentation file reflected an earlier snapshot release note.
* **Integrity Verified:** Zero dates were introduced or synthesized by the ingestion code; all 516,439 dates map 1:1 with genuine rows in the source CSVs.

---

## Section B: Final Ingestion Statistics

* **Raw CSV Tracks Discovered:** **647 files** (plus 1 editor backup `#d15b.csv#` and 1 documentation file)
* **Total Raw Data Rows:** **516,691 rows**
* **Total Canonical Observations Processed:** **516,439 records**
* **Zero-Padding Skipped Rows (all sensors `0,0`):** **252 rows**
* **Invalid or Unreadable Records:** **0**
* **Direct Sensor Fixes (`_3 == 1`):** **422,099 records (81.7%)**
* **Interpolated Gap-Fill Fixes (`_3 == 0`):** **94,340 records (18.3%)**
* **Raw Dataset Integrity:** **100% READ-ONLY**. All source files in `47years-iceberg-dataset/updated7_consol/` remain completely untouched.

---

## Section C: Stationary Observation Statistics & Refined Terminology

* **Stationary Records Count:** **286,625 observations (55.5%)**
* **Classification Definition:** A purely kinematic condition where daily great-circle displacement is less than $1.0\,\text{km}$ ($\Delta d < 1.0\,\text{km/day}$).
* **Refined Terminology & Disclaimer:**
  * All references attributing stationary periods specifically to "bathymetric grounding" or "pack-ice locking" have been **removed from automated classification**.
  * The field `is_stationary = True` indicates strictly that the iceberg exhibited near-zero spatial displacement on that date.
  * *Physical causation (bathymetry vs. sea ice vs. ocean gyres) requires independent validation against GEBCO bathymetry or AMSR2 sea ice grids in Phase 2.*

---

## Section D: Dimension Provenance & Imputation Statistics

To ensure future ML models never treat filled/imputed values as ground-truth physical measurements, explicit metadata tags (`size_source` and `size_is_imputed`) have been added to all records:

| Size Category (`size_source`) | Imputed Flag (`size_is_imputed`) | Number of Records | Percentage | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`nic_direct`** | `False` | **47,912** | **9.3%** | Direct physical measurement reported by National Ice Center in source CSV. |
| **`forward_fill`** | `True` | **359,868** | **69.7%** | Imputed forward along track from most recent prior NIC measurement. |
| **`backward_fill`** | `True` | **9,611** | **1.9%** | Imputed backward for initial scatterometer sightings prior to first NIC report. |
| **`missing`** | `False` | **99,048** | **19.2%** | Unnamed scatterometer tracks with no NIC dimension measurements ever reported. |

---

## Section E: Physics Model Implementation Status (Wagner et al., 2017)

The analytical physics engine has been implemented and tested against all governing equations from the authoritative paper:

* **Analytical Momentum Balance (Eq. 6–9):**
  $$\mathbf{v}_i = \mathbf{v}_w + \gamma \left( -\text{sgn}(f) \alpha \hat{\mathbf{k}} \times \mathbf{v}_a + \beta \mathbf{v}_a \right)$$
* **Verified Physical Parameters:**
  * Exact coupling parameter: $\gamma = \left[\frac{\rho_a(\rho_w - \rho_i)}{\rho_w \rho_i}\frac{C_a}{C_w}\right]^{1/2} = 0.0129787$
  * Harmonic mean length: $S = \frac{LW}{L+W}$
  * Dimensionless wind-to-size parameter: $\Lambda = \frac{\gamma C_w}{\pi |f|}\frac{|\mathbf{v}_a|}{S}$
  * Coriolis parameter: $f = 2\Omega \sin\phi$ ($f < 0$ in Southern Ocean)
* **Asymptotic Protection:**
  * Small $\Lambda$ limit ($\Lambda < 10^{-3}$): Taylor expansion $\alpha \approx \Lambda - \Lambda^5, \beta \approx \Lambda^3$ (prevents $0/0$ floating-point indeterminate form; proves $\mathbf{v}_i \to \mathbf{v}_w$ for large Antarctic icebergs).
  * Large $\Lambda$ limit ($\Lambda > 100$): $\alpha \approx 1/\Lambda, \beta \approx 1.0$ (proves 2% wind rule $\mathbf{v}_i \to \mathbf{v}_w + \gamma \mathbf{v}_a$).
* **Thermodynamic Decay & Stability (Appendix A1–A2):**
  * Wave erosion: $M_e = a_1 |\mathbf{v}_a|^{1/2} + a_2 |\mathbf{v}_a|$
  * Buoyant convection: $M_v = b_1 T_w + b_2 T_w^2$
  * Basal melt: $M_b = c |\mathbf{v}_w - \mathbf{v}_i|^{4/5}(T_w - T_i)L^{-1/5}$
  * Critical rollover aspect ratio: $\epsilon_c = \sqrt{6\frac{\rho_i}{\rho_w}\left(1 - \frac{\rho_i}{\rho_w}\right)} \approx 0.9253$.
* **Zero Fabrication Guarantee:** The physics module accepts explicit inputs and does **NOT** synthesize or fabricate missing ocean currents or wind fields.

---

## Section F: Current Missing Environmental Variables

To run forward simulations or evaluate trajectory predictions with the Wagner physics model, the following external datasets must be acquired and co-located:

| Variable | Symbol | Required Dataset | Spatial/Temporal Resolution |
| :--- | :---: | :--- | :--- |
| **Surface Ocean Velocity** | $\mathbf{v}_w = (u_w, v_w)$ | Copernicus Marine GLORYS12V1 or NASA ECCO2 | $1/12^\circ$ Daily |
| **10m Surface Wind** | $\mathbf{v}_a = (u_a, v_a)$ | ECMWF ERA5 Reanalysis | $0.25^\circ$ Hourly/Daily |
| **Sea Surface Temperature** | $T_w$ | NOAA OISST v2.1 or ERA5 SST | $0.25^\circ$ Daily |
| **Sea-Ice Concentration** | $C_{\text{ice}}$ | NSIDC / OSI-SAF AMSR2 Satellite CDR | $12.5\,\text{km}$ Daily |
| **Bathymetric Depth** | $D_{\text{bath}}$ | GEBCO 2024 Grid | 15 arc-second |

---

## Section G: Remaining Issues & Data Characteristics

1. **Non-Uniform Temporal Sampling:** Scatterometers report fixes daily, but NIC size surveys occur on weekly/bi-weekly cadences. The explicit `size_is_imputed` metadata flag addresses this.
2. **Missing Iceberg Thickness ($H$):** Standard initial draft $H_0 = 250\,\text{m}$ is assumed until ICESat-2 altimetry freeboard data is co-located.
3. **Multi-Sensor Geolocation Ambiguity:** $1,241$ records ($0.24\%$) show sensor discrepancies $> 25\,\text{km}$, primarily during calvings or fragmentations. These remain explicitly flagged with `multi_sensor_ambiguity = True`.

---

## Section H: Exact Recommendations for Phase 2

1. **Environmental Data Ingestion Pipeline:** Build automated download and NetCDF/Zarr spatial interpolators for ERA5 winds ($\mathbf{v}_a$) and GLORYS/ECCO2 ocean currents ($\mathbf{v}_w$) co-located along historical iceberg tracks.
2. **Bathymetric Grounding Validation:** Integrate GEBCO bathymetric grids to compare water depth $D_{\text{bath}}$ against iceberg draft $H$ to physically validate stationary periods.
3. **Trajectory Evaluation Benchmark:** Run the verified Wagner physics baseline against the historical tracks using the `backend/app/evaluation/` metrics module before initiating any ML model training.
4. **Strict Partitioning:** Enforce group-based trajectory splitting by **Iceberg Track ID** (never random row splitting) to prevent temporal autocorrelation data leakage.
