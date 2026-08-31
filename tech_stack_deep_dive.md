# DHRUV SARTHI (ध्रुव सारथी) — COMPLETE TECHNOLOGY STACK ARCHITECTURAL MANUAL

**Antarctic Maritime Navigation Decision Support System**  
*National Centre for Polar and Ocean Research (NCPOR) · Ministry of Earth Sciences (MoES)*

---

## 📥 Downloadable PDF Document
- **Direct PDF Link:** [Download Complete Tech Stack PDF (A4)](file:///C:/Users/Sanket/.gemini/antigravity-ide/brain/9c13cc1e-a1aa-4343-8fc7-0b5f80b90574/Dhruv_Sarthi_Complete_Tech_Stack_Deep_Dive.pdf)
- **Local Artifact Path:** `C:\Users\Sanket\.gemini\antigravity-ide\brain\9c13cc1e-a1aa-4343-8fc7-0b5f80b90574\Dhruv_Sarthi_Complete_Tech_Stack_Deep_Dive.pdf`

---

## 1. Frontend User Interface & Visualization Technologies

| Technology | Where It Is Used | Why It Is Used (Rationale) | How It Is Used (Implementation) |
| :--- | :--- | :--- | :--- |
| **React 19** | `src/App.tsx`, `src/OperationalApp.tsx`, `src/pages/*`, `src/components/*` | Provides declarative state-driven component architecture, concurrent UI rendering, and modular isolation across 13 polar navigation pages. | Functional components using React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) and custom context providers (`NavProvider`, `ThemeProvider`). |
| **TypeScript 5.7** | `src/**/*.ts`, `src/**/*.tsx`, `src/data/types.ts` | Eliminates runtime coordinate/property errors and guarantees strict data contracts between FastAPI backend models and the React UI. | Explicit type interfaces (`Route`, `Iceberg`, `SeaIceRegionData`, `UserItem`, `HelpAlertItem`) enforced through build-time type checking (`npm run build`). |
| **Tailwind CSS v4** | `src/index.css`, JSX class names across all components | High-performance, utility-first CSS framework with native CSS variables, glassmorphism (`backdrop-blur`), and polar color tokens. | Integrated via `@tailwindcss/vite` with `@import 'tailwindcss';`. Applied directly in JSX (`bg-[#071521]`, `text-[#55d6e8]`, `border-[#1d445c]`). |
| **Vite 8** | `vite.config.ts`, `package.json`, `index.html` | Ultra-fast build tooling offering sub-second Hot Module Replacement (HMR) and transparent reverse proxying for REST & WebSockets. | Configured with `@vitejs/plugin-react` and proxy rules mapping `/api` to `http://127.0.0.1:8000` and `/ws` to `ws://127.0.0.1:8000`. |
| **MapLibre GL** | `src/components/map/AntarcticPolarMap.tsx`, `src/components/map/MapView.tsx` | High-performance WebGL 2D/3D map rendering in Antarctic polar stereographic coordinates with custom tile provider switching. | Instantiates `maplibregl.Map`, binds raster tile providers (ESRI Satellite, Carto Dark, OSM), renders LineStrings for routes and AI iceberg trajectories, and attaches DOM markers. |
| **Lucide React** | TopBar, Sidebar, Dashboard, Map inspector, AdminDashboard | Standardized vector SVG iconography for polar maritime, meteorological, and emergency indicators. | Vector SVG components (`Ship`, `Compass`, `Triangle`, `Wind`, `Waves`, `Thermometer`, `Snowflake`, `ShieldAlert`, `Crosshair`) with dynamic risk-based styling. |
| **Native WebSockets** | `src/hooks/useRealtime.ts` | Real-time bidirectional event streaming between the vessel client and fleet command without polling. | Custom `useRealtime` hook with automatic 3s backoff reconnection that triggers immediate state updates on `ALERT_CREATED` and `FEEDBACK_CREATED` events. |

---

## 2. Backend Services, Database & Security Technologies

| Technology | Where It Is Used | Why It Is Used (Rationale) | How It Is Used (Implementation) |
| :--- | :--- | :--- | :--- |
| **Python 3.10+** | `backend/app/**/*` | Industry standard for scientific array math, geospatial transformation, statistical machine learning, and async web services. | Executes backend microservices, coordinate re-projections, ML training routines, database ORM queries, and WebSocket managers. |
| **FastAPI** | `backend/app/main.py`, `backend/app/api/*.py` | Asynchronous ASGI request processing, automatic OpenAPI/Swagger interactive documentation (`/docs`), and native Pydantic schema validation. | Modular `APIRouter` structure covering `/api/sea-ice/regions`, `/api/routes`, `/api/auth`, `/api/alerts`, `/api/feedback`, and `/api/admin/*`. |
| **Uvicorn** | Backend execution daemon (Port 8000) | High-concurrency ASGI server handling simultaneous long-lived WebSocket connections and REST requests with minimal CPU overhead. | Runs `uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)` in background. |
| **SQLAlchemy ORM** | `backend/app/database/models.py`, `backend/app/database/connection.py` | Type-safe SQL object-relational mapping, relationship modeling, and database abstractions without raw SQL concatenation. | Declarative `Base` classes (`User`, `SeaIceRegionData`, `IcebergRecord`, `WeatherRecord`, `TravelRecord`, `HelpAlert`, `Feedback`, `SystemLog`) and session management (`SessionLocal`). |
| **SQLite 3 (WAL)** | `polar_nav.db` | Embedded, zero-configuration ACID-compliant SQL database with zero external server dependencies. | Operates in Write-Ahead Logging (`PRAGMA journal_mode=WAL`) mode for concurrent reads and writes across API routes. |
| **PBKDF2-HMAC** | `backend/app/services/auth_service.py` | NIST-recommended cryptographic password hashing resisting GPU brute-force and dictionary attacks. | Uses `hashlib.pbkdf2_hmac` with 100,000 SHA-256 iterations and a 16-byte random salt; validated via `hmac.compare_digest`. |
| **WebSocket Manager** | `backend/app/services/websocket_manager.py`, `backend/app/api/ws.py` | Real-time push bus broadcasting events to all active client connections instantly upon SOS alert dispatch or review. | Singleton `ws_manager` tracking active WebSocket instances and broadcasting serialized JSON payloads (`ws_manager.broadcast()`). |

---

## 3. Geospatial & Satellite Processing Technologies

| Technology | Where It Is Used | Why It Is Used (Rationale) | How It Is Used (Implementation) |
| :--- | :--- | :--- | :--- |
| **Rasterio & GDAL** | `backend/app/services/antarctic_sic_grid_loader.py` | Geospatial raster file I/O for genuine satellite GeoTIFF files from JAXA AMSR2 / Univ. of Bremen. | Opens daily GeoTIFF polar rasters, parses affine transformation metadata, and reads 2D floating-point grid arrays (1328 × 1264 matrix). |
| **PyProj** | `backend/app/services/antarctic_sic_grid_loader.py` | High-precision cartographic transformation between Antarctic Polar Stereographic meters and WGS84 Lat/Lon degrees. | `pyproj.Transformer.from_crs("EPSG:3031", "EPSG:4326", always_xy=True)` computing exact coordinates for 15 Antarctic sectors. |
| **NumPy** | `antarctic_sic_grid_loader.py`, `sea_ice_pipeline.py` | Ultra-fast vectorized C-array operations for masking invalid pixels and calculating sector statistics. | Applies polygon masks across 1.68 million grid cells per day to calculate regional means, minimums, maximums, and standard deviations. |
| **Pandas** | `backend/app/ml/regional_sea_ice_ml_model.py` | Historical time-series sorting, grouping, and sliding window feature engineering. | Ingests `regional_historical_sic.csv`, sorts chronologically, and computes lag features (`lag_1`, `lag_2`, `lag_3`, `rolling_3`, `trend_3`). |

---

## 4. Machine Learning & Predictive Modeling Technologies

| Technology | Where It Is Used | Why It Is Used (Rationale) | How It Is Used (Implementation) |
| :--- | :--- | :--- | :--- |
| **Scikit-Learn (Ridge)** | `backend/app/ml/regional_sea_ice_ml_model.py` | L2-regularized linear regression preventing multicollinearity and overfitting while capturing divergent sector freeze/melt trends. | Trains 15 independent `Ridge(alpha=1.0)` models predicting +1d, +3d, +7d, +14d, +30d SIC; evaluated with MAE, RMSE, and R² scores. |
| **Kinematic Physics Model** | `backend/app/services/`, `src/data/mock.ts` | Simulates ocean surface current vector + 2% wind drag + Coriolis deflection for tabular icebergs (A23A, A76C, A81, etc.). | Computes vector equation $V_{\text{ice}} = V_{\text{ocean}} + 0.02 \cdot V_{\text{wind}} + \text{Coriolis}$; outputs milestone waypoints (0h, +24h, +48h, +72h). |
| **Multi-Objective Routing** | `backend/app/api/routes.py`, `src/api/client.ts` | Synthesizes multiple maritime corridors balancing shortest transit distance, iceberg collision avoidance, and fuel efficiency. | Calculates Route A (Fastest), Route B (Safest - Iceberg Avoidance), and Route C (Fuel-Optimal) with risk scoring from 0 to 100. |
| **ReportLab** | `generate_workflow_pdf.py` | Programmatic vector PDF compilation for SIH presentation manuals, technical deep dives, and compliance logs. | Multi-page canvas rendering with dynamic running headers, page number tracking (`Page X of Y`), and structured tables. |
