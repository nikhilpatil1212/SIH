import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0f3952"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 760, "DHRUV SARTHI (ध्रुव सारथी) · TECH STACK AUDIT & SYSTEM ARCHITECTURE")
            self.setStrokeColor(colors.HexColor("#0096c7"))
            self.setLineWidth(0.75)
            self.line(40, 752, 572, 752)
        
        # Footer
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4a6878"))
        self.drawString(40, 30, "CONFIDENTIAL · SIH 2026 TECHNICAL PRESENTATION & EVALUATION REPORT")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 30, page_text)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)
        self.restoreState()


def build_pdf(filename="Dhruv_Sarthi_Tech_Stack_Audit.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=50,
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#071e2e")
    c_secondary = colors.HexColor("#0077b6")
    c_cyan = colors.HexColor("#0096c7")
    c_dark = colors.HexColor("#1e293b")
    c_body = colors.HexColor("#334155")
    c_bg_light = colors.HexColor("#f1f5f9")
    c_accent_box = colors.HexColor("#e0f2fe")
    c_table_alt = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#94a3b8")
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=c_primary,
        alignment=0,
    )
    
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        fontName="Helvetica",
        fontSize=10,
        leading=13,
        textColor=c_secondary,
        alignment=0,
    )
    
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )
    
    h2_style = ParagraphStyle(
        "Heading2_Custom",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=c_secondary,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )
    
    body_style = ParagraphStyle(
        "Body_Custom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=c_body,
        spaceBefore=2,
        spaceAfter=4,
    )
    
    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=c_body,
        leftIndent=12,
        spaceBefore=1,
        spaceAfter=2,
    )
    
    code_style = ParagraphStyle(
        "Code_Custom",
        fontName="Courier",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a"),
    )
    
    quote_style = ParagraphStyle(
        "Quote_Custom",
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#034064"),
    )
    
    table_cell = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=c_dark,
    )
    
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=c_primary,
    )
    
    table_hdr = ParagraphStyle(
        "TableHdr",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    
    story = []
    
    # ── HEADER BLOCK ──────────────────────────────────────────────────────────
    story.append(Paragraph("DHRUV SARTHI (ध्रुव सारथी)", title_style))
    story.append(Paragraph("OPERATIONAL ANTARCTIC MARITIME NAVIGATION DECISION SUPPORT PLATFORM", subtitle_style))
    story.append(Paragraph("<b>Comprehensive Technical Stack Audit, System Architecture & Verification Report</b>", subtitle_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_cyan, spaceBefore=2, spaceAfter=8))
    
    # Executive Metadata Card
    meta_data = [
        [
            Paragraph("<b>Target Domain:</b> Polar Navigational AI", table_cell),
            Paragraph("<b>Primary Vessel:</b> RV Polar Star (PC6)", table_cell),
            Paragraph("<b>Audit Date:</b> August 2026", table_cell),
        ],
        [
            Paragraph("<b>Codebase State:</b> Verified & Operational", table_cell),
            Paragraph("<b>Real Datasets:</b> USNIC, OSI-SAF, CMEMS", table_cell),
            Paragraph("<b>ML Model:</b> Wagner Physics + Multi-Output RF", table_cell),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[175, 175, 182])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    
    # ── 1. OVERALL TECH STACK ──────────────────────────────────────────────────
    story.append(Paragraph("1. Overall Verified System Tech Stack", h1_style))
    story.append(Paragraph(
        "Dhruv Sarthi is an operational maritime decision support system engineered specifically for Southern Ocean navigation. "
        "Every technology listed below is confirmed from the live active codebase:", body_style
    ))
    
    stack_categories = [
        ("FRONTEND", "React 19, TypeScript 5.7, Vite 8, Tailwind CSS v4 (@tailwindcss/vite), MapLibre GL v6, Lucide React icons, React Context API."),
        ("BACKEND", "Python 3.10+, FastAPI (>=0.115.0), Uvicorn ASGI Server, Pydantic v2 & Pydantic-Settings, CORS Middleware."),
        ("AI / ML ENGINE", "Scikit-learn (RandomForestRegressor), Joblib, NumPy, Wagner et al. (2017) Analytical Hydrodynamic Drag Model, Multi-Horizon Geodesic RK4 Propagator."),
        ("ROUTING ENGINE", "Spherical Geodesic A* Pathfinding Mesh, Great-Circle Haversine Geodesy, Ray-Casting Landmask Barrier Engine, Multi-Horizon Dynamic Iceberg Safety Buffers."),
        ("REAL DATA SOURCES", "U.S. National Ice Center (USNIC) Tracked Icebergs & 47-Yr Archive (1989-2026), EUMETSAT OSI-SAF (OSI-401-d) 10km Sea-Ice Concentration, Copernicus Marine (CMEMS) 8.3km Forecasts, ECMWF/ERA5 Marine Metocean, Natural Earth/GEBCO."),
        ("DATABASE & STORAGE", "High-speed in-memory spatial caches + 60+ master historical JSON tracks + SQLAlchemy 2.0 ORM with SQLite (polar_nav.db) for system audit logs and data source health tracking."),
        ("MAP & GIS", "MapLibre GL v6 WebGL vector rendering, GeoJSON standard geometries, Carto Dark/Positron, ESRI Satellite & GEBCO Bathymetry tile layers."),
        ("DEVELOPMENT & QA", "Vite 8, TypeScript 5.7, oxfmt, Pytest test suites (test_full_suite.py, test_iceberg_blocking.py, test_beagle_channel.py).")
    ]
    
    t_stack_rows = [[Paragraph(f"<b>{cat}</b>", table_cell_bold), Paragraph(desc, table_cell)] for cat, desc in stack_categories]
    t_stack = Table(t_stack_rows, colWidths=[120, 412])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, c_table_alt]),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 10))
    
    # ── 2. FRONTEND & 3. BACKEND ──────────────────────────────────────────────
    story.append(Paragraph("2. Frontend & Backend Architecture", h1_style))
    story.append(Paragraph("<b>Frontend Subsystem:</b>", h2_style))
    story.append(Paragraph("• <b>React 19 & TypeScript 5.7:</b> Powers modular components (Dashboard, Polar Map HUD, Route Configurator, What-If Simulator) with compile-time type safety across complex geospatial schemas.", bullet_style))
    story.append(Paragraph("• <b>Vite 8 & Tailwind CSS v4:</b> Instant HMR development server and zero-runtime CSS engine providing an Antarctic polar glassmorphism HUD theme (dark maritime radar aesthetic with cyan accents).", bullet_style))
    story.append(Paragraph("• <b>MapLibre GL v6:</b> GPU-accelerated WebGL polar map canvas displaying dynamic GeoJSON route tracks, iceberg vectors, and sea-ice heat polygons at 60 FPS.", bullet_style))
    
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Backend Subsystem & API Architecture:</b>", h2_style))
    story.append(Paragraph("• <b>FastAPI + Uvicorn:</b> High-concurrency asynchronous REST engine exposing typed Pydantic endpoints with automatic OpenAPI documentation and CORS protection.", bullet_style))
    story.append(Paragraph("• <b>Core API Endpoints Confirmed in Code:</b>", bullet_style))
    
    endpoints = [
        ("GET /api/health", "Basic microservice liveness and health probe."),
        ("GET /api/system-status", "Comprehensive subsystem state, active hazard counts, database and data sync status."),
        ("GET /api/icebergs/current", "Live USNIC tracked icebergs (A23A, A76C, A68A, etc.) with coordinates and dimensions."),
        ("POST /api/icebergs/predict-drift-ml", "Fast 24-hour Random Forest ML drift prediction endpoint using kinematic features."),
        ("POST /api/icebergs/predict", "State-aware multi-horizon (24h/48h/72h) Hybrid Physics-ML trajectory simulation."),
        ("GET /api/environment/sea-ice", "0h, 24h, 48h, and 72h satellite sea-ice concentration grids across Antarctic sectors."),
        ("POST /api/routes/calculate", "Multi-objective obstacle-aware route generation (Shortest, Safest, Fuel-Efficient)."),
        ("POST /api/routes/reroute", "Dynamic emergency waypoint detour generator avoiding newly emerging iceberg hazards."),
        ("POST /api/what-if/simulate", "Voyage penalty simulator under extreme storms and expanding sea-ice pack conditions."),
        ("GET /api/hazards & /vessels", "Real-time maritime hazard list and primary expedition vessel telemetry (RV Polar Star).")
    ]
    t_end_rows = [[Paragraph(f"<b>{ep}</b>", table_cell_bold), Paragraph(desc, table_cell)] for ep, desc in endpoints]
    t_end = Table(t_end_rows, colWidths=[160, 372])
    t_end.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, c_table_alt]),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_end)
    story.append(Spacer(1, 10))
    
    # ── 4. DATABASE & 5. REAL DATA SOURCES ────────────────────────────────────
    story.append(Paragraph("3. Storage Mechanisms & Real Data Provenance", h1_style))
    story.append(Paragraph(
        "<b>Storage Architecture:</b> Dhruv Sarthi employs a multi-tiered data storage pattern: "
        "(1) <b>High-Speed Spatial Cache & Master JSON Store:</b> Over 60 historical iceberg track files (A01.json through A68A.json, 469KB catalog summary) and USNIC weekly CSV files for sub-millisecond retrieval without database overhead; "
        "(2) <b>Relational Engine:</b> SQLAlchemy 2.0 ORM with SQLite (<code>polar_nav.db</code>) storing operational audit logs (<code>SystemLog</code>) and external data feed health (<code>DataSource</code>); "
        "(3) <b>Model Artifacts:</b> Joblib binary model files (<code>iceberg_trajectory_final.joblib</code>, 16.5 MB).",
        body_style
    ))
    story.append(Spacer(1, 4))
    
    data_sources = [
        ("U.S. National Ice Center (USNIC)", "Weekly active tracked Antarctic icebergs and 47-year historical database (1989–2026). Real satellite optical/SAR tracking.", "backend/app/services/usnic_service.py"),
        ("EUMETSAT OSI-SAF (OSI-401-d)", "Daily 10km gridded satellite microwave radiometer sea-ice concentration (SSMIS & AMSR2).", "backend/app/services/sea_ice_service.py"),
        ("Copernicus Marine (CMEMS)", "8.3 km physical numerical ocean-ice forecasts across 24h, 48h, and 72h horizons.", "backend/app/services/sea_ice_service.py"),
        ("ECMWF / ERA5 Reanalysis", "10m wind velocity vectors (u10, v10), ocean currents (uo, vo), swell, SST, and pressure.", "backend/app/ml/feature_builder.py"),
        ("Natural Earth / GEBCO", "Antarctic continental boundary polygons, ice shelf geometries, and seafloor bathymetry.", "backend/app/navigation/land_mask.py")
    ]
    t_ds_rows = [
        [Paragraph("<b>Source Agency</b>", table_hdr), Paragraph("<b>Dataset & Satellite Modality</b>", table_hdr), Paragraph("<b>Ingestion Module</b>", table_hdr)]
    ] + [
        [Paragraph(f"<b>{s[0]}</b>", table_cell_bold), Paragraph(s[1], table_cell), Paragraph(f"<code>{s[2]}</code>", table_cell)] for s in data_sources
    ]
    t_ds = Table(t_ds_rows, colWidths=[120, 242, 170])
    t_ds.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_secondary),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_table_alt]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_ds)
    story.append(Spacer(1, 10))
    
    # ── 6. AI / ML & ICEBERG PREDICTION ───────────────────────────────────────
    story.append(Paragraph("4. AI / Machine Learning & Drift Prediction Engine", h1_style))
    story.append(Paragraph(
        "The iceberg prediction engine uses a verified <b>Hybrid Physics-ML architecture</b> that combines deterministic hydrodynamic principles with machine learning:",
        body_style
    ))
    story.append(Paragraph("• <b>Primary ML Model:</b> Multi-Output <code>RandomForestRegressor</code> (100 trees, max depth 16) serialized in <code>iceberg_trajectory_final.joblib</code> (16.5 MB).", bullet_style))
    story.append(Paragraph("• <b>Training & Validation:</b> Trained on 65,775 historical observations across 12 complete iceberg tracks over 37 years (1989–2026). Validated on 13,764 unseen test samples using deterministic <code>GroupKFold</code> by iceberg ID.", bullet_style))
    story.append(Paragraph("• <b>Verified Accuracy:</b> <b>Mean Error: 10.91 km</b> | <b>Median Error: 3.38 km</b> | <b>90th Percentile: 15.82 km</b> at T+24 hours.", bullet_style))
    story.append(Paragraph("• <b>11 Input Features:</b> <code>latitude, longitude, previous_delta_lat, previous_delta_lon, drift_speed_kmh, drift_heading_deg, size_1_nm, size_2_nm, sin_doy, cos_doy, current_extent</code>.", bullet_style))
    story.append(Paragraph("• <b>Analytical Physics Baseline:</b> Implements the <b>Wagner et al. (2017)</b> closed-form drag momentum equations incorporating 10m wind velocity, surface ocean current, iceberg keel draft, and latitude Coriolis parameter <code>f = 2Ω sin(lat)</code>.", bullet_style))
    story.append(Paragraph("• <b>State-Aware Regime Detector:</b> Dynamically categorizes iceberg state into <i>Grounding</i> (bathymetry shallower than keel draft), <i>Sea-Ice Locked</i> (>85% sea ice), or <i>Free Drift</i>.", bullet_style))
    story.append(Paragraph("• <b>Multi-Horizon Uncertainty Propagation:</b> Computes 24h, 48h, and 72h positions with expanding empirical dispersion uncertainty cones (15 km at 24h, 28 km at 48h, 42 km at 72h).", bullet_style))
    story.append(Spacer(1, 10))
    
    # ── 7. ROUTING & GIS ──────────────────────────────────────────────────────
    story.append(Paragraph("5. Routing Engine, Geodesy & GIS Technology", h1_style))
    story.append(Paragraph("• <b>Spherical Geodesic A* Pathfinding:</b> Computes obstacle-aware maritime routes across a spherical geodesic mesh, accounting for Earth curvature near the South Pole (Haversine & Slerp interpolation).", bullet_style))
    story.append(Paragraph("• <b>Ray-Casting Landmask Engine:</b> Evaluates route line segments against Natural Earth Antarctic continental boundary polygons, assigning infinite cost (<code>Cost = ∞</code>) to any land-crossing segment.", bullet_style))
    story.append(Paragraph("• <b>Dynamic Iceberg Clearance Buffers:</b> Enforces strict standoff clearance zones (25 km to 50 km) around both current (0h) and predicted (+24h, +48h, +72h) iceberg positions.", bullet_style))
    story.append(Paragraph("• <b>Three Route Alternatives Generated:</b>", bullet_style))
    story.append(Paragraph("   1. <b>Route A (Shortest):</b> Minimum distance along the great-circle arc with baseline safety buffers.", bullet_style))
    story.append(Paragraph("   2. <b>Route B (Safest - Recommended):</b> Maximum iceberg clearance (+50 km buffer) and sea-ice avoidance.", bullet_style))
    story.append(Paragraph("   3. <b>Route C (Fuel-Efficient):</b> Optimizes vessel speed and fuel burn along calmer ocean current corridors.", bullet_style))
    story.append(Paragraph("• <b>Polar Map Visualization (MapLibre GL):</b> WebGL-accelerated rendering supporting Carto Dark Matter, Positron, ESRI Satellite, and GEBCO Bathymetry with GeoJSON route, vessel, and hazard layers.", bullet_style))
    story.append(Spacer(1, 10))
    
    # ── 8. PPT SLIDE & PITCH SCRIPT ───────────────────────────────────────────
    story.append(Paragraph("6. Presentation Summary & 60-90 Second Judge Pitch", h1_style))
    
    pitch_text = (
        "<b>What to Say to Judges:</b><br/>"
        "<i>'Good morning, respected judges. For <b>Dhruv Sarthi</b>, our Antarctic Maritime Navigation Platform, we engineered a high-performance tech stack purpose-built for the Southern Ocean.<br/><br/>"
        "On the <b>Frontend</b>, we use <b>React 19</b> with <b>TypeScript</b>, <b>Tailwind CSS v4</b>, and <b>MapLibre GL</b>, providing navigators with a 60-FPS WebGL polar navigation map displaying dynamic GeoJSON layers for icebergs, sea-ice contours, and routes.<br/><br/>"
        "Our <b>Backend</b> is powered by <b>Python and FastAPI</b> with <b>Uvicorn</b>, offering ultra-low latency for complex geospatial calculations with strict Pydantic type safety.<br/><br/>"
        "For <b>Real Data</b>, we ingest live feeds from the <b>U.S. National Ice Center (USNIC)</b>, <b>EUMETSAT OSI-SAF</b> 10km satellite sea-ice grids, and <b>Copernicus Marine</b> ocean-ice models.<br/><br/>"
        "For <b>Iceberg Prediction</b>, we built a <b>Hybrid Physics-ML engine</b> combining the analytical <b>Wagner hydrodynamic drag equations</b> with a <b>Scikit-learn Multi-Output Random Forest model</b> trained on over 65,000 observations across 37 years of satellite data, achieving a median error of just 3.38 km at 24 hours.<br/><br/>"
        "Finally, our <b>Routing Engine</b> uses <b>Spherical Geodesic A* Pathfinding</b> with a <b>Ray-Casting Landmask Engine</b>, generating three distinct passage options — <b>Shortest, Safest, and Fuel-Efficient</b> — while enforcing dynamic 25 to 50 km safety buffers around moving icebergs. Every technology is verified and running in our live codebase. Thank you!'</i>"
    )
    
    t_pitch = Table([[Paragraph(pitch_text, quote_style)]], colWidths=[532])
    t_pitch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_accent_box),
        ('BOX', (0,0), (-1,-1), 1, c_secondary),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_pitch)
    story.append(Spacer(1, 14))
    
    # ── 9. MASTER TABLE ───────────────────────────────────────────────────────
    story.append(Paragraph("7. Master Verified Tech Stack Audit Table", h1_style))
    
    master_table_data = [
        [Paragraph("<b>Category</b>", table_hdr), Paragraph("<b>Technology & Version</b>", table_hdr), Paragraph("<b>Role in Dhruv Sarthi</b>", table_hdr)],
        [Paragraph("Frontend Framework", table_cell_bold), Paragraph("React 19.0.0", table_cell), Paragraph("Modular HUD UI rendering, reactive state flow, and component lifecycle.", table_cell)],
        [Paragraph("Frontend Language", table_cell_bold), Paragraph("TypeScript 5.7.0", table_cell), Paragraph("Static type safety for coordinates, routes, vessel telemetry, and API payloads.", table_cell)],
        [Paragraph("Build Tool & Server", table_cell_bold), Paragraph("Vite 8.0.5", table_cell), Paragraph("Instant HMR development server and optimized ES-module production bundling.", table_cell)],
        [Paragraph("CSS & Design System", table_cell_bold), Paragraph("Tailwind CSS v4.0.0", table_cell), Paragraph("Dark polar maritime glassmorphic styling, custom borders, responsive layout.", table_cell)],
        [Paragraph("Map Engine", table_cell_bold), Paragraph("MapLibre GL 6.6.0", table_cell), Paragraph("WebGL-rendered 60 FPS interactive Antarctic polar map with GeoJSON overlays.", table_cell)],
        [Paragraph("Backend Framework", table_cell_bold), Paragraph("FastAPI >=0.115.0", table_cell), Paragraph("Asynchronous REST API framework with automated OpenAPI Swagger docs.", table_cell)],
        [Paragraph("ASGI Web Server", table_cell_bold), Paragraph("Uvicorn >=0.30.0", table_cell), Paragraph("High-concurrency asynchronous HTTP server handling spatial API requests.", table_cell)],
        [Paragraph("Data Validation", table_cell_bold), Paragraph("Pydantic v2 >=2.8.0", table_cell), Paragraph("Strict validation and serialization for polar coordinates and marine physics.", table_cell)],
        [Paragraph("AI / ML Framework", table_cell_bold), Paragraph("Scikit-learn >=1.4.0", table_cell), Paragraph("Multi-Output RandomForestRegressor for 24h iceberg drift prediction.", table_cell)],
        [Paragraph("Model Serialization", table_cell_bold), Paragraph("Joblib >=1.3.0", table_cell), Paragraph("Binary loading of trained 16.5 MB Random Forest model into memory.", table_cell)],
        [Paragraph("Numerical Math", table_cell_bold), Paragraph("NumPy >=1.26.0", table_cell), Paragraph("Vectorized Haversine math, Coriolis parameters, and feature matrix ops.", table_cell)],
        [Paragraph("Database ORM", table_cell_bold), Paragraph("SQLAlchemy >=2.0.30", table_cell), Paragraph("Relational schema abstraction and session management.", table_cell)],
        [Paragraph("Relational Database", table_cell_bold), Paragraph("SQLite (polar_nav.db)", table_cell), Paragraph("Local persistence for operational audit logs and data source health tracking.", table_cell)],
        [Paragraph("Master Geodata Store", table_cell_bold), Paragraph("JSON File Cache", table_cell), Paragraph("In-memory persistence of 60+ historical iceberg tracks and catalog summary.", table_cell)],
        [Paragraph("Physics Model", table_cell_bold), Paragraph("Wagner et al. (2017)", table_cell), Paragraph("Closed-form hydrodynamic ocean drag and 10m wind momentum equations.", table_cell)],
        [Paragraph("Routing Algorithm", table_cell_bold), Paragraph("Spherical Geodesic A*", table_cell), Paragraph("Obstacle-aware multi-objective route generation (Shortest, Safest, Fuel).", table_cell)],
        [Paragraph("Land Avoidance", table_cell_bold), Paragraph("Ray-Casting Landmask", table_cell), Paragraph("Ray-intersection checking paths against Antarctic continental shapes.", table_cell)],
        [Paragraph("Iceberg Data", table_cell_bold), Paragraph("USNIC & BYU Archive", table_cell), Paragraph("47-year historical database (1989–2026) and weekly active tracked icebergs.", table_cell)],
        [Paragraph("Sea-Ice Observation", table_cell_bold), Paragraph("EUMETSAT OSI-SAF", table_cell), Paragraph("10km gridded satellite microwave radiometer sea-ice observations.", table_cell)],
        [Paragraph("Sea-Ice Forecast", table_cell_bold), Paragraph("Copernicus Marine", table_cell), Paragraph("8.3 km numerical ocean-ice forecasts across 24h, 48h, and 72h horizons.", table_cell)],
        [Paragraph("Metocean Forcing", table_cell_bold), Paragraph("ECMWF / ERA5", table_cell), Paragraph("High-resolution surface wind, ocean currents, swell, and temperature fields.", table_cell)],
        [Paragraph("Automated Testing", table_cell_bold), Paragraph("Pytest >=8.0.0", table_cell), Paragraph("Automated test suite verifying routing, ML, landmask, and API endpoints.", table_cell)],
    ]
    
    t_master = Table(master_table_data, colWidths=[110, 130, 292])
    t_master.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_table_alt]),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_master)
    
    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "Dhruv_Sarthi_Tech_Stack_Audit.pdf"
    build_pdf(out_file)
