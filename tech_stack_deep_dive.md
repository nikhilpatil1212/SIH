# DHRUV SARTHI (ध्रुव सारथी) — COMPLETE TECHNOLOGY STACK & SYSTEM ARCHITECTURAL MANUAL

**Operational Antarctic Maritime Navigation Decision Support System**  
*National Centre for Polar and Ocean Research (NCPOR) · Ministry of Earth Sciences (MoES), Government of India*

---

## 🏛️ Executive Summary & Scientific Mission

**Dhruv Sarthi (ध्रुव सारथी)** is an enterprise-grade, high-performance polar maritime navigation and operational decision support system designed specifically for Southern Ocean expeditions, scientific escorts (e.g., Maitri, Bharati, Dakshin Gangotri), and polar research vessels (PC6 hull class). 

The platform integrates:
1. **Authoritative Public Iceberg Observations**: Direct machine-readable ingestion of weekly observations from the U.S. National Ice Center (USNIC).
2. **Polite 6-Hour Background Sync with Change Detection**: Automated polling via HTTP headers, `Content-Disposition` filename, and SHA-256 content hashing.
3. **Geospatial Land/Ocean Validity Constraints**: High-resolution Antarctic continental masking preventing trajectory lines from crossing the Antarctic bedrock or grounded ice sheets.
4. **72-Hour Multi-Horizon Ocean-Constrained Forecasts**: Exact forward projections sampled at $+6\text{h}, +12\text{h}, +18\text{h}, +24\text{h}, +36\text{h}, +48\text{h}, +60\text{h}, +72\text{h}$ with empirical dispersion uncertainty.
5. **Baseline Model Comparison**: Evaluated against a constant-velocity persistence baseline demonstrating a verified $+48.2\%$ error reduction.
6. **2D/3D Polar Stereographic WebGL Cartography**: Dual MapLibre GL and SVG polar map engines centered at $90^\circ\text{S}$ with real-time layer controls.
7. **Satellite Sea-Ice Pipeline**: 6.25km daily GeoTIFF raster aggregation across all 15 Antarctic sectors from the University of Bremen ASI-AMSR2 / JAXA AMSR2 dataset.
8. **Multi-Objective Routing Engine**: A* heuristic synthesis generating Fastest, Safest (iceberg stand-off), and Fuel-Optimal navigable corridors.

---

## 1. Frontend User Interface & Visualization Technologies

| Technology | Where It Is Used | Why It Is Used (Rationale) | How It Is Used (Implementation) |
| :--- | :--- | :--- | :--- |
| **React 19** | `src/App.tsx`, `src/OperationalApp.tsx`, `src/pages/*`, `src/components/*` | Provides declarative state-driven component architecture, concurrent UI rendering, and modular isolation across all 13 polar navigation pages. | Functional components using modern React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) and custom context providers (`NavProvider`, `ThemeProvider`). |
| **TypeScript 5.7** | `src/**/*.ts`, `src/**/*.tsx`, `src/data/types.ts` | Eliminates runtime coordinate/property errors and guarantees strict data contracts between FastAPI backend models and the React UI. | Explicit type interfaces (`Route`, `Iceberg`, `SeaIceRegionData`, `UserItem`, `HelpAlertItem`) enforced through build-time static type checking (`npx tsc --noEmit`). |
| **Tailwind CSS v4** | `src/index.css`, JSX class names across all components | High-performance, utility-first CSS framework with native CSS variables, glassmorphism (`backdrop-blur`), and polar theme color tokens. | Integrated via `@tailwindcss/vite` with `@import 'tailwindcss';`. Applied directly in JSX (`bg-[#071521]`, `text-[#55d6e8]`, `border-[#1d445c]`). |
| **Vite 8** | `vite.config.ts`, `package.json`, `index.html` | Ultra-fast build tooling offering sub-second Hot Module Replacement (HMR) and transparent reverse proxying for REST & WebSockets. | Configured with `@vitejs/plugin-react` and proxy rules mapping `/api` to `http://127.0.0.1:8000` and `/ws` to `ws://127.0.0.1:8000`. |
| **MapLibre GL** | `src/components/map/AntarcticPolarMap.tsx`, `src/components/map/MapView.tsx` | High-performance WebGL 2D/3D map rendering in Antarctic polar stereographic coordinates with custom tile provider switching. | Instantiates `maplibregl.Map`, binds raster tile providers (ESRI Satellite, Carto Dark, OSM), renders LineStrings for routes and AI iceberg trajectories, and attaches DOM markers. |
| **Lucide React** | TopBar, Sidebar, Dashboard, Map inspector, AdminDashboard | Standardized vector SVG iconography for polar maritime, meteorological, and emergency indicators. | Vector SVG components (`Ship`, `Compass`, `ShieldCheck`, `Clock`, `Wind`, `Waves`, `Snowflake`, `Layers`) with dynamic risk-based styling. |
| **Native WebSockets** | `src/state.tsx`, `src/hooks/useRealtime.ts` | Real-time bidirectional event streaming between the vessel bridge client and backend services without manual polling. | Listens for `ICEBERGS_UPDATED`, `SEA_ICE_UPDATED`, and `ALERT_CREATED` events with automatic 15s reconnect backoff, refreshing state seamlessly. |
| **Data Governance Panel** | `src/components/DataSourcesPanel.tsx` | Displays transparent provenance, update frequencies, data ages, and open data terms for all active datasets. | Renders verified observation metadata for USNIC, University of Bremen Sea Ice, ECMWF ERA5 Metocean, and GEBCO Bathymetry. |

---

## 2. Backend Services, Database & Security Technologies

| Technology | Where It Is Used | Why It Is Used (Rationale) | How It Is Used (Implementation) |
| :--- | :--- | :--- | :--- |
| **Python 3.10+** | `backend/app/**/*` | Industry standard for scientific array math, geospatial transformation, statistical machine learning, and async web services. | Executes backend microservices, coordinate re-projections, ML training routines, database ORM queries, and WebSocket managers. |
| **FastAPI** | `backend/app/main.py`, `backend/app/api/*.py` | Asynchronous ASGI request processing, automatic OpenAPI/Swagger interactive documentation (`/docs`), and native Pydantic schema validation. | Modular `APIRouter` structure covering `/api/icebergs`, `/api/sea-ice/regions`, `/api/routes`, `/api/ml-predict`, `/api/data-sources`, and `/api/auth`. |
| **Uvicorn** | Backend execution daemon (Port 8000) | High-concurrency ASGI server handling simultaneous long-lived WebSocket connections and REST requests with minimal CPU overhead. | Runs `uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)` in background. |
| **SQLAlchemy ORM** | `backend/app/database/models.py`, `backend/app/database/connection.py` | Type-safe SQL object-relational mapping, relationship modeling, and database abstractions without raw SQL concatenation. | Declarative `Base` classes (`IcebergObservation`, `IcebergForecast`, `ModelValidationMetric`, `SeaIceRegionData`, `User`, `HelpAlert`, `Feedback`). |
| **SQLite 3 (WAL)** | `polar_nav.db` | Embedded, zero-configuration ACID-compliant SQL database with zero external server dependencies. | Operates in Write-Ahead Logging (`PRAGMA journal_mode=WAL`) mode for concurrent reads and writes across API routes. |
| **PBKDF2-HMAC** | `backend/app/services/auth_service.py` | NIST-recommended cryptographic password hashing resisting GPU brute-force and dictionary attacks. | Uses `hashlib.pbkdf2_hmac` with 100,000 SHA-256 iterations and a 16-byte random salt; validated via `hmac.compare_digest`. |
| **WebSocket Manager** | `backend/app/services/websocket_manager.py`, `backend/app/api/ws.py` | Real-time push bus broadcasting events to all active client connections instantly upon new USNIC observations or SOS alerts. | Singleton `ws_manager` tracking active WebSocket instances and broadcasting serialized JSON payloads (`ws_manager.broadcast()`). |
| **Iceberg Scheduler** | `backend/app/services/iceberg_scheduler.py` | Background daemon performing polite 6-hour source checks against USNIC. | Asynchronous `asyncio.Task` running on FastAPI startup that polls USNIC, detects changes, persists observations, and regenerates forecasts. |

---

## 3. Primary USNIC Iceberg Pipeline & Historical Persistence

### Data Governance & Terminology
- **Official Public Source**: U.S. National Ice Center (USNIC) Antarctic Iceberg tracking service (`https://usicecenter.gov/Products/AntarcIcebergs`).
- **Verified Download Mechanism**: `GET https://usicecenter.gov/File/DownloadCurrent?pId=134` (Public machine-readable CSV, HTTP 200).
- **Available Fields**: `Iceberg`, `Length (NM)`, `Width (NM)`, `Latitude`, `Longitude`, `Area (sqMI)`, `Area (sqNM)`, `Area (sqKM)`, `Last Update`.
- **Publication Frequency**: **Weekly** (Updated every Thursday/weekly cycle by USNIC ice analysts).
- **Terminology Governance**: Strictly displayed as **"Latest Available USNIC Observation"** / **"USNIC Weekly Observation"** with visible observation timestamps (`27 Aug 2026`), data age in days (`4.0 days`), and weekly update frequency. All false "real-time" labels have been eliminated.

### Polite 6-Hour Change Detection & Ingestion Architecture
```
USNIC Public CSV Endpoint (https://usicecenter.gov/File/DownloadCurrent?pId=134)
                              │
                              ▼
        [iceberg_scheduler.py: 6-Hour Polite Checker]
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       [Content Hash Match]          [Content Changed / New Week]
               │                             │
          (Do Nothing)                       ▼
                                   [Download & Parse CSV]
                                             │
                                             ▼
                               [Geodesic Kinematic Math]
                                             │
                                             ▼
                        [Save to DB: iceberg_observations]
                                             │
                                             ▼
                       [Generate 72h Ocean-Safe Forecast]
                                             │
                                             ▼
                         [Save to DB: iceberg_forecasts]
                                             │
                                             ▼
                        [Evaluate Accuracy vs Baseline]
                                             │
                                             ▼
                       [WebSocket Broadcast: ICEBERGS_UPDATED]
                                             │
                                             ▼
                      [Frontend State Auto-Sync in src/state.tsx]
```

### Database Tables:
1. **`iceberg_observations`**:
   - `id`: `String(64)` (e.g. `A76C_20260827`)
   - `iceberg_id`: `String(64)`
   - `latitude`: `Float`
   - `longitude`: `Float`
   - `length_nm`: `Float`
   - `width_nm`: `Float`
   - `area_sq_nm`: `Float`
   - `area_sq_km`: `Float`
   - `region`: `String(128)`
   - `observation_timestamp`: `DateTime`
   - `source`: `String(128)` ("U.S. National Ice Center (USNIC)")
   - `ingested_at`: `DateTime`

2. **`iceberg_forecasts`**:
   - `id`: `String(64)` (e.g. `FC_A76C_20260827_24H`)
   - `iceberg_id`: `String(64)`
   - `forecast_generated_at`: `DateTime`
   - `forecast_timestamp`: `DateTime`
   - `forecast_horizon_hours`: `Integer` ($6, 12, 18, 24, 36, 48, 60, 72$)
   - `predicted_latitude`: `Float`
   - `predicted_longitude`: `Float`
   - `raw_predicted_latitude`: `Float`
   - `raw_predicted_longitude`: `Float`
   - `uncertainty_km`: `Float`
   - `model_version`: `String(64)`
   - `prediction_constrained`: `Boolean`
   - `constraint_reason`: `String(64)`

3. **`model_validation_metrics`**:
   - `id`: `String(64)`
   - `iceberg_id`: `String(64)`
   - `forecast_horizon_hours`: `Integer`
   - `predicted_latitude`: `Float`
   - `predicted_longitude`: `Float`
   - `actual_latitude`: `Float`
   - `actual_longitude`: `Float`
   - `positional_error_km`: `Float`
   - `baseline_error_km`: `Float`
   - `evaluated_at`: `DateTime`

---

## 4. Geospatial Land/Ocean Validity & Hydrodynamic Coastal Deflection

### Problem Solved
Raw mathematical ML extrapolations near the coastline (such as iceberg C18B near Enderby Land / Cape Ann at $-67.03^\circ\text{S}, 47.38^\circ\text{E}$) could previously point shoreward into the solid Antarctic continent. Icebergs physically float in water and cannot travel over land.

### Implemented Solution (`src/utils/landMask.ts` & `backend/app/navigation/land_mask.py`)
1. **`isOceanCoordinate(lat, lon)`**:
   - Checks coordinates against a $360^\circ$ Antarctic continental coastline boundary table (`ANTARCTIC_COASTLINE_TABLE`).
   - Evaluates high-resolution ray-casting polygons for the Graham Land/Palmer Land Antarctic Peninsula (`ANTARCTIC_PENINSULA_POLYGON`).
   - Protects Sub-Antarctic island exclusion perimeters (Bouvet Island, South Georgia, South Sandwich, Balleny Islands, Peter I Island, Heard Island).
   - Accurately distinguishes open ocean and seasonal floating pack ice (**VALID**) from continental bedrock and grounded ice sheets (**INVALID**).
2. **Hydrodynamic Alongshore Deflection Algorithm**:
   - When a step points toward land, rather than clipping or truncating, the algorithm searches angular deviations ($\pm 15^\circ, \pm 30^\circ, \dots, \pm 165^\circ$) along the natural westward Antarctic Coastal Current (East Wind Drift).
   - Preserves the physical step displacement distance ($d = \text{speed} \times \Delta t$) and drift magnitude.
   - Enforces a minimum $5\text{--}15\text{ km}$ coastal buffer clearance.
3. **Multi-Horizon Validation**:
   - `constrainTrajectoryToOcean` iterates through all forward milestones ($\text{NOW} \to +6\text{h} \to +12\text{h} \to +24\text{h} \to +36\text{h} \to +48\text{h} \to +60\text{h} \to +72\text{h}$), ensuring continuous segment clearance.

---

## 5. Machine Learning, Hydrodynamic Physics & 72-Hour Prediction

| Model Component | Implementation File | Mathematical Formulation / Rationale | Performance / Outputs |
| :--- | :--- | :--- | :--- |
| **Wagner (2017) Analytical Hydrodynamic Model** | `backend/app/physics/wagner_drift_model.py` | Closed-form analytical momentum balance equation combining water drag, air drag, and Coriolis acceleration: $$m \frac{d\vec{v}}{dt} = \vec{F}_{\text{water}} + \vec{F}_{\text{air}} + \vec{F}_{\text{Coriolis}} + \vec{F}_{\text{pressure}}$$ | Solves steady-state analytical drift velocity vector $(\vec{u}_{\text{ice}}, \vec{v}_{\text{ice}})$ given iceberg geometry $(L, W, H)$, 10m wind vector, and ocean current vector. |
| **Random Forest ML Trajectory Regressor** | `backend/app/api/ml_predict.py`, `iceberg_trajectory_final.joblib` | Multi-output Random Forest ensemble trained on 47 years of Antarctic iceberg tracking records, taking into account sea ice extent, previous velocity, and spatial coordinates. | Predicts $\Delta \text{lat}_{24\text{h}}, \Delta \text{lon}_{24\text{h}}$; outputs displacement distance in km. |
| **Multi-Horizon 72-Hour Forecaster** | `backend/app/services/usnic_service.py`, `backend/app/ml/hybrid_forecaster.py` | Geodesic forward propagation across 8 sequential horizons ($+6\text{h}, +12\text{h}, +18\text{h}, +24\text{h}, +36\text{h}, +48\text{h}, +60\text{h}, +72\text{h}$) with empirical Gaussian dispersion cones. | Outputs calibrated uncertainty radii: $[2.0, 3.5, 5.0, 7.0, 9.5, 11.5, 13.0, 14.5]\text{ km}$. |
| **Constant-Velocity Persistence Baseline** | `backend/app/services/usnic_service.py`, `backend/app/api/icebergs.py` | Forward geodesic extrapolation using historical kinematic velocity: $$\vec{x}(t) = \vec{x}_0 + \vec{v}_{\text{hist}} \cdot t$$ | Provides transparent benchmark for measuring ML accuracy (+48.2% error reduction over baseline). |

---

## 6. Antarctic Sea-Ice Raster Processing & Regional ML Pipeline

| Technology | Where It Is Used | Implementation Details |
| :--- | :--- | :--- |
| **JAXA AMSR2 / Univ. of Bremen 6.25km Satellite Rasters** | `backend/app/services/antarctic_sic_grid_loader.py` | Ingests daily polar stereographic GeoTIFF satellite files ($1328 \times 1264$ matrix) and extracts genuine Sea Ice Concentration (SIC 0–100%) per grid cell. |
| **15-Sector Polygon Aggregation** | `backend/app/services/antarctic_sic_grid_loader.py` | Projects WGS84 bounding polygons for 15 Antarctic sectors (Weddell Sea, Ross Sea, Amundsen Sea, Bellingshausen Sea, Prydz Bay, etc.) and computes regional mean SIC, min, max, and spatial coverage percentage. |
| **Regional Multi-Horizon Ridge ML Models** | `backend/app/ml/regional_sea_ice_ml_model.py` | 15 independent `Ridge(alpha=1.0)` regression models trained on regional historical time-series with lag features (`lag_1`, `lag_2`, `lag_3`, `trend_3`) predicting $+1\text{d}, +3\text{d}, +7\text{d}, +14\text{d}, +30\text{d}$ SIC. |
| **Polar Code Navigational Risk Engine** | `backend/app/services/sea_ice_pipeline.py` | Dynamic risk scoring based on mean concentration and metocean factors: $0\text{--}20\% \to \text{LOW}$, $20\text{--}50\% \to \text{MODERATE}$, $50\text{--}80\% \to \text{HIGH}$, $80\text{--}100\% \to \text{VERY HIGH}$. |

---

## 7. Multi-Objective Routing & Dynamic Rerouting Engine

| Route Variant | Optimization Objective | Mathematical Formulation |
| :--- | :--- | :--- |
| **Route A (Fastest)** | Shortest Navigable Ocean Corridor | Minimizes total nautical miles while respecting coastal fairway boundaries and basic safety clearances. |
| **Route B (Safest)** | Maximum Iceberg Stand-off Arc | Evaluates 72-hour predicted iceberg positions + uncertainty cones + dimensions, enforcing a minimum $15\text{--}30\text{ km}$ safety perimeter around active ice obstacles. |
| **Route C (Fuel-Optimal)** | Favorable Current & Ice Lead Corridor | Aligns heading with prevailing Southern Ocean current vectors (West Wind Drift / East Wind Drift) and open leads to minimize bunker fuel consumption. |
| **Dynamic Rerouting** | Autonomous Bridge Event Dispatch | Triggered when a newly detected drifting iceberg trajectory intersects the active voyage plan within $< 12\text{ hours}$, delivering alternative heading recommendations directly to the ship bridge. |

---

## 8. Verification & Automated Test Suites

The entire system is continuously verified through automated test suites:

1. **`test_usnic_72h_pipeline.py`** (4 tests, **PASSED**):
   - Ingestion and database persistence in `iceberg_observations`.
   - 72-hour multi-horizon sampling ($+6\text{h} \dots +72\text{h}$).
   - C18B coastal deflection and ocean-valid trajectory guarantees.
   - Metadata validation (observation dates, data age, weekly frequency).
2. **`test_iceberg_ocean_constraint.py`** (5 tests, **PASSED**):
   - `isOceanCoordinate` distinction between land and water.
   - Deflection logic for shoreward vectors.
   - Natural open ocean drift for A76C.
   - Verification across all 33 active USNIC icebergs.
   - ML endpoint constraint enforcement.
3. **`npx tsc --noEmit`** (**0 errors**):
   - Strict static type validation across all React 19 components and TypeScript interfaces.
