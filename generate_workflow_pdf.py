import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, 800, "DHRUV SARTHI · Complete System Architecture & Operational Workflow")
            self.drawRightString(555, 800, "SIH 2024 · Polar Navigation Platform")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(40, 792, 555, 792)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 45, 555, 45)
        self.drawString(40, 32, "CONFIDENTIAL · Antarctic Maritime Navigation Decision Support System (NCPOR / MoES)")
        self.drawRightString(555, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="Dhruv_Sarthi_Complete_System_Workflow.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0f172a")     # Deep Slate
    accent_blue = colors.HexColor("#0284c7")       # Polar Blue
    accent_teal = colors.HexColor("#0d9488")       # Teal
    accent_dark = colors.HexColor("#1e293b")
    text_dark = colors.HexColor("#0f172a")
    text_muted = colors.HexColor("#475569")
    bg_light = colors.HexColor("#f8fafc")
    border_color = colors.HexColor("#e2e8f0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#ffffff")
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#93c5fd")
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=accent_blue,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_dark,
        spaceBefore=2,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    table_header_style = ParagraphStyle(
        'TH_Style',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#ffffff"),
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TD_Style',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=text_dark
    )

    code_cell_style = ParagraphStyle(
        'Code_Style',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f766e")
    )

    flow_box_title = ParagraphStyle(
        'FlowTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#ffffff")
    )

    flow_box_body = ParagraphStyle(
        'FlowBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#f1f5f9")
    )

    story = []

    # ==================== COVER / BANNER ====================
    banner_data = [
        [
            Paragraph("<b>DHRUV SARTHI (ध्रुव सारथी)</b><br/>Antarctic Maritime Navigation Decision Support Platform", title_style),
        ],
        [
            Paragraph("<b>COMPLETE SYSTEM ARCHITECTURE & OPERATIONAL WORKFLOW MANUAL</b><br/>End-to-End Technical Blueprints · Satellite Ingestion · 15-Sector ML Forecasters · Safety Operations", subtitle_style),
        ]
    ]
    banner_table = Table(banner_data, colWidths=[523])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#071521")),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 1), (-1, 1), 3, colors.HexColor("#38bdf8")),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # Metadata Strip
    meta_data = [
        [
            Paragraph("<b>Organization:</b> National Centre for Polar and Ocean Research (NCPOR)", table_cell_style),
            Paragraph("<b>Version:</b> 1.0.0 (Production Verified)", table_cell_style),
            Paragraph("<b>Date:</b> August 2026", table_cell_style),
        ]
    ]
    meta_table = Table(meta_data, colWidths=[240, 150, 133])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # ==================== 1. MASTER SYSTEM WORKFLOW ====================
    story.append(Paragraph("1. Master System End-to-End Workflow", h1_style))
    story.append(Paragraph("The platform operates as a cohesive, synchronized maritime intelligence system across 6 distinct functional tiers: External Data Stream, Ingestion & Masking, Multi-Horizon AI/ML Engines, Persistent Database Storage, FastAPI Services, and Role-Based User/Admin Frontend Consoles.", body_style))
    story.append(Spacer(1, 4))

    # Flow Tier Table
    flow_tiers = [
        [
            Paragraph("<b>TIER 1: EXTERNAL DATA</b>", flow_box_title),
            Paragraph("<b>JAXA AMSR2 Satellite:</b> Daily 6.25km SIC GeoTIFF rasters (Univ. of Bremen).<br/><b>USNIC Iceberg Tracking:</b> Tracked iceberg coordinates, size & drift.<br/><b>ECMWF / ERA5:</b> Wind speed/dir, waves, SST, ocean current vectors.<br/><b>Vessel Telemetry:</b> AIS GPS coordinates, heading, speed, destination.", flow_box_body)
        ],
        [
            Paragraph("<b>TIER 2: INGESTION & PIPELINE</b>", flow_box_title),
            Paragraph("<b>antarctic_sic_grid_loader.py:</b> Polar stereographic (EPSG:3031) raster transformation & grid validation.<br/><b>sea_ice_pipeline.py:</b> Polygon spatial aggregation across 15 Antarctic sectors (Mean SIC %, Min/Max %, Valid Coverage %).<br/><b>calculate_navigation_risk():</b> Evaluates navigational risk thresholds (LOW, MODERATE, HIGH, VERY HIGH).", flow_box_body)
        ],
        [
            Paragraph("<b>TIER 3: AI & ML FORECASTING</b>", flow_box_title),
            Paragraph("<b>Regional Sea-Ice ML:</b> 15 independent sector Ridge forecasters (lag_1..3, rolling_3, trend_3) -> Horizons: +1d, +3d, +7d, +14d, +30d.<br/><b>Iceberg Kinematic Model:</b> Physics drift (Current vector + 2% wind drag + Coriolis deflection) -> 0h, 24h, 48h, 72h.<br/><b>Passage Optimizer:</b> Multi-objective synthesize Route A (Fastest), Route B (Safest), Route C (Fuel-Optimal).", flow_box_body)
        ],
        [
            Paragraph("<b>TIER 4: DATABASE PERSISTENCE</b>", flow_box_title),
            Paragraph("<b>SQLite DB (polar_nav.db):</b> Tables for sea_ice_region_data, iceberg_records, weather_records, travel_records, users, help_alerts, feedback, system_logs. PBKDF2-HMAC-SHA256 password security.", flow_box_body)
        ],
        [
            Paragraph("<b>TIER 5: BACKEND REST & WS</b>", flow_box_title),
            Paragraph("<b>FastAPI Application (Port 8000):</b> Endpoints for sea-ice, routes, auth, travel, feedback, alerts, admin CRUD.<br/><b>WebSocketManager (ws.py):</b> Real-time broadcast engine for instantaneous SOS alerts and telemetry sync.", flow_box_body)
        ],
        [
            Paragraph("<b>TIER 6: FRONTEND USER & ADMIN</b>", flow_box_title),
            Paragraph("<b>Mission Console (Dashboard.tsx):</b> High-precision MapLibre polar map, metocean weather strip, route recommendations.<br/><b>Fleet Command Center (AdminDashboard.tsx):</b> 8 management modules (Users, Travel, Alerts, Icebergs, Weather, etc.).", flow_box_body)
        ]
    ]

    tier_table = Table(flow_tiers, colWidths=[140, 383])
    tier_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#0f172a")),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor("#1e293b")),
        ('BACKGROUND', (1, 1), (1, 1), colors.HexColor("#334155")),
        ('BACKGROUND', (1, 2), (1, 2), colors.HexColor("#1e293b")),
        ('BACKGROUND', (1, 3), (1, 3), colors.HexColor("#334155")),
        ('BACKGROUND', (1, 4), (1, 4), colors.HexColor("#1e293b")),
        ('BACKGROUND', (1, 5), (1, 5), colors.HexColor("#334155")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#0f172a")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#475569")),
    ]))
    story.append(tier_table)
    story.append(Spacer(1, 12))

    # ==================== 2. SEA-ICE WORKFLOW ====================
    story.append(Paragraph("2. Sea-Ice Observation & 15-Sector ML Forecasting Workflow", h1_style))
    story.append(Paragraph("A cornerstone capability of Dhruv Sarthi is the elimination of synthetic sea-ice data in favor of genuine spatial satellite GeoTIFF rasters paired with 15 independent regional time-series forecasting models.", body_style))
    story.append(Spacer(1, 4))

    si_data = [
        [
            Paragraph("<b>Stage</b>", table_header_style),
            Paragraph("<b>File / Service Component</b>", table_header_style),
            Paragraph("<b>Operational Description</b>", table_header_style),
        ],
        [
            Paragraph("<b>1. Raw Observation</b>", table_cell_style),
            Paragraph("JAXA AMSR2 Satellite / Univ. of Bremen Portal", code_cell_style),
            Paragraph("Downloads daily Antarctic 6.25km polar stereographic GeoTIFF rasters (1328 × 1264 grid matrix).", table_cell_style),
        ],
        [
            Paragraph("<b>2. Spatial Loader</b>", table_cell_style),
            Paragraph("antarctic_sic_grid_loader.py", code_cell_style),
            Paragraph("Loads raw pixels, validates affine transform, bounds checking (0-100% SIC, masking land/missing codes).", table_cell_style),
        ],
        [
            Paragraph("<b>3. Polygon Aggregation</b>", table_cell_style),
            Paragraph("aggregate_sectors_from_spatial_grid()", code_cell_style),
            Paragraph("Aggregates 15 Antarctic sectors (Weddell, Ross, Bellingshausen, Amundsen, Davis, Prydz, etc.) computing sector mean, min, max, and pixel count.", table_cell_style),
        ],
        [
            Paragraph("<b>4. ML Engine</b>", table_cell_style),
            Paragraph("regional_sea_ice_ml_model.py", code_cell_style),
            Paragraph("Trains 15 independent Ridge regression models on regional lag features (lag_1, lag_2, lag_3, rolling_3, trend_3) predicting +1d, +3d, +7d, +14d, +30d.", table_cell_style),
        ],
        [
            Paragraph("<b>5. Risk Engine</b>", table_cell_style),
            Paragraph("calculate_navigation_risk()", code_cell_style),
            Paragraph("Classifies navigational danger: 0-20% (LOW), 20-50% (MODERATE), 50-80% (HIGH), >80% (VERY HIGH).", table_cell_style),
        ],
        [
            Paragraph("<b>6. Persistence & API</b>", table_cell_style),
            Paragraph("sea_ice_region_data / GET /api/sea-ice/regions", code_cell_style),
            Paragraph("Stores records in SQLite database and exposes via REST API to SeaIceTable.tsx and Polar Map overlays.", table_cell_style),
        ],
    ]

    si_table = Table(si_data, colWidths=[90, 175, 258])
    si_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0369a1")),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(si_table)
    story.append(Spacer(1, 12))

    # ==================== 3. ICEBERG & METOCEAN WORKFLOW ====================
    story.append(Paragraph("3. Iceberg Drift Prediction & Metocean Environmental Pipelines", h1_style))
    
    ibg_data = [
        [
            Paragraph("<b>Pipeline Subsystem</b>", table_header_style),
            Paragraph("<b>Data Ingestion Source</b>", table_header_style),
            Paragraph("<b>Model / Calculation Logic</b>", table_header_style),
            Paragraph("<b>Operational Output</b>", table_header_style),
        ],
        [
            Paragraph("<b>Iceberg Drift & Tracking</b>", table_cell_style),
            Paragraph("US National Ice Center (USNIC) & SAR satellite tracking", table_cell_style),
            Paragraph("Physics kinematic drift: V_ice = V_ocean + 0.02 * V_wind + Deflection(Coriolis)", code_cell_style),
            Paragraph("Predicts +24h, +48h, +72h trajectory milestones; collision threat zone calculation on map.", table_cell_style),
        ],
        [
            Paragraph("<b>Metocean & Weather</b>", table_cell_style),
            Paragraph("ECMWF Integrated Forecasting System & ERA5 Reanalysis", table_cell_style),
            Paragraph("Atmospheric and oceanic vector analysis (wind, waves, surface currents, SST)", code_cell_style),
            Paragraph("Powers live 4-metric metocean strip (Wind, Current, Temp, Ice) and Environmental intelligence page.", table_cell_style),
        ],
        [
            Paragraph("<b>Multi-Corridor Passage Routing</b>", table_cell_style),
            Paragraph("Corridor parameters + Iceberg Threat Mask + Sea-Ice Concentration", table_cell_style),
            Paragraph("Multi-objective A* / Dijkstra passage synthesizer (routes.py / clientSideCalculateRoutes)", code_cell_style),
            Paragraph("Generates Route A (Fastest), Route B (Safest - Iceberg Avoidance), Route C (Fuel-Optimal).", table_cell_style),
        ],
    ]
    ibg_table = Table(ibg_data, colWidths=[100, 120, 163, 140])
    ibg_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(ibg_table)
    story.append(Spacer(1, 12))

    story.append(PageBreak())

    # ==================== 4. AUTHENTICATION & RBAC ====================
    story.append(Paragraph("4. Authentication, Security & Role-Based Access Control (RBAC)", h1_style))
    story.append(Paragraph("User access is strictly segregated into two operational roles: Polar Navigator / Researcher (USER) and Fleet Commander / Administrator (ADMIN). Passwords are cryptographically secured using PBKDF2-HMAC-SHA256 with 100,000 iterations and a 16-byte random salt.", body_style))
    story.append(Spacer(1, 4))

    auth_data = [
        [
            Paragraph("<b>Operational Role</b>", table_header_style),
            Paragraph("<b>Assigned User Persona</b>", table_header_style),
            Paragraph("<b>Authenticated Landing Target</b>", table_header_style),
            Paragraph("<b>Accessible Features & Capabilities</b>", table_header_style),
        ],
        [
            Paragraph("<b>USER</b><br/>(Polar Navigator)", table_cell_style),
            Paragraph("Dr. Ana Køhler<br/><i>(NCPOR Polar Expedition)</i>", table_cell_style),
            Paragraph("Mission Console<br/>(src/pages/Dashboard.tsx)", code_cell_style),
            Paragraph("Interactive Polar Map, multi-route selection, sea-ice table inspection, iceberg distance monitoring, emergency SOS dispatch, operational feedback submission.", table_cell_style),
        ],
        [
            Paragraph("<b>ADMIN</b><br/>(Fleet Commander)", table_cell_style),
            Paragraph("Fleet Commander R. Sharma<br/><i>(Ministry of Earth Sciences)</i>", table_cell_style),
            Paragraph("Fleet Operations Console<br/>(src/pages/AdminDashboard.tsx)", code_cell_style),
            Paragraph("Full CRUD over all 8 modules (Users, Travel/Voyages, Iceberg Tracks, Weather Stations), live SOS Alert Acknowledgment/Resolution, Feedback Review, System Health telemetry.", table_cell_style),
        ],
    ]
    auth_table = Table(auth_data, colWidths=[90, 115, 120, 198])
    auth_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(auth_table)
    story.append(Spacer(1, 12))

    # ==================== 5. EMERGENCY ALERTS & FEEDBACK ====================
    story.append(Paragraph("5. Emergency Alert (SOS) & User Feedback Lifecycle", h1_style))

    alert_flow_data = [
        [
            Paragraph("<b>Step</b>", table_header_style),
            Paragraph("<b>Emergency Alert (SOS) Dispatch Flow</b>", table_header_style),
            Paragraph("<b>User Operational Feedback Flow</b>", table_header_style),
        ],
        [
            Paragraph("<b>1. Trigger</b>", table_cell_style),
            Paragraph("Navigator clicks <b>'Alert Admin'</b> in TopBar modal (AlertAdminModal.tsx) entering message, position & severity (HIGH/CRITICAL).", table_cell_style),
            Paragraph("User fills Feedback form in Settings / Help page submitting rating (1-5), category, and operational feedback text.", table_cell_style),
        ],
        [
            Paragraph("<b>2. Backend API</b>", table_cell_style),
            Paragraph("POST /api/alerts/help -> Validates payload and generates unique ticket (ID: ALT-XXXXXX, status: OPEN).", code_cell_style),
            Paragraph("POST /api/feedback -> Creates record (ID: FB-XXXXXX, status: PENDING).", code_cell_style),
        ],
        [
            Paragraph("<b>3. Persistence</b>", table_cell_style),
            Paragraph("Inserts into help_alerts table with foreign key reference to users.id.", table_cell_style),
            Paragraph("Inserts into feedback table linked to user profile.", table_cell_style),
        ],
        [
            Paragraph("<b>4. Real-Time Push</b>", table_cell_style),
            Paragraph("ws_manager.broadcast('ALERT_CREATED', payload) pushes immediate event to all connected admin consoles.", code_cell_style),
            Paragraph("ws_manager.broadcast('FEEDBACK_CREATED', payload) notifies administrative reviewers.", code_cell_style),
        ],
        [
            Paragraph("<b>5. Admin Action</b>", table_cell_style),
            Paragraph("Commander acknowledges/resolves alert via PATCH /api/alerts/{id}/acknowledge; updates status to ACKNOWLEDGED / RESOLVED.", table_cell_style),
            Paragraph("Commander reviews feedback and marks as REVIEWED via PATCH /api/feedback/{id}/review.", table_cell_style),
        ],
    ]
    alert_table = Table(alert_flow_data, colWidths=[65, 230, 228])
    alert_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#dc2626")),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(alert_table)
    story.append(Spacer(1, 12))

    # ==================== 6. REAL-TIME ARCHITECTURE ====================
    story.append(Paragraph("6. Real-Time WebSocket & Push Notification Architecture", h1_style))
    story.append(Paragraph("The platform integrates an asynchronous WebSocket server (backend/app/api/ws.py) managed by a centralized broadcast singleton (backend/app/services/websocket_manager.py). The React frontend subscribes via the useRealtime.ts hook, enabling zero-latency UI updates without costly HTTP polling.", body_style))
    story.append(Spacer(1, 4))

    ws_data = [
        [
            Paragraph("<b>WebSocket Event Type</b>", table_header_style),
            Paragraph("<b>Originating Backend Action</b>", table_header_style),
            Paragraph("<b>Frontend Reaction & Visual Impact</b>", table_header_style),
        ],
        [
            Paragraph("ALERT_CREATED", code_cell_style),
            Paragraph("POST /api/alerts/help (User SOS dispatch)", table_cell_style),
            Paragraph("Admin header SOS badge pulses with updated count; audio distress chime triggers on Commander console.", table_cell_style),
        ],
        [
            Paragraph("ALERT_UPDATED", code_cell_style),
            Paragraph("PATCH /api/alerts/{id}/* (Admin acknowledgment)", table_cell_style),
            Paragraph("Navigator TopBar alert status updates from 'OPEN' to 'ACKNOWLEDGED' in real-time.", table_cell_style),
        ],
        [
            Paragraph("FEEDBACK_CREATED", code_cell_style),
            Paragraph("POST /api/feedback (User submits review)", table_cell_style),
            Paragraph("Admin Feedback tab table refreshes dynamically without page reload.", table_cell_style),
        ],
        [
            Paragraph("DATA_RECORD_CHANGED", code_cell_style),
            Paragraph("POST / DELETE on Admin Iceberg or Weather tables", table_cell_style),
            Paragraph("Map markers and weather strip synchronize instantly across all active vessel sessions.", table_cell_style),
        ],
    ]
    ws_table = Table(ws_data, colWidths=[120, 180, 223])
    ws_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#475569")),
        ('PADDING', (0, 0), (-1, -1), 4.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(ws_table)
    story.append(Spacer(1, 12))

    story.append(PageBreak())

    # ==================== 7. DATABASE SCHEMA & API MAP ====================
    story.append(Paragraph("7. Relational Database Schema & API Integration Map", h1_style))
    story.append(Paragraph("All persistent records are managed via SQLAlchemy ORM models mapped to SQLite (polar_nav.db) with write-ahead logging (WAL).", body_style))
    story.append(Spacer(1, 4))

    schema_data = [
        [
            Paragraph("<b>Database Table</b>", table_header_style),
            Paragraph("<b>Primary Key & Indexes</b>", table_header_style),
            Paragraph("<b>Foreign Keys</b>", table_header_style),
            Paragraph("<b>Core Fields & Data Types</b>", table_header_style),
            Paragraph("<b>Target API Routes</b>", table_header_style),
        ],
        [
            Paragraph("<b>users</b>", code_cell_style),
            Paragraph("id (PK, String)<br/>email (Unique, Idx)", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("name, email, password_hash, role (USER/ADMIN), status (ACTIVE/INACTIVE), organization, last_login", table_cell_style),
            Paragraph("/api/auth/login<br/>/api/users", code_cell_style),
        ],
        [
            Paragraph("<b>sea_ice_region_data</b>", code_cell_style),
            Paragraph("id (PK, String)<br/>region_name (Idx)<br/>observation_time (Idx)", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("region_name, current_sic, sic_min, sic_max, valid_grid_cells, forecast_1d..30d, change_7d, risk_level, data_source", table_cell_style),
            Paragraph("/api/sea-ice/regions<br/>/api/sea-ice/regions/{name}", code_cell_style),
        ],
        [
            Paragraph("<b>iceberg_records</b>", code_cell_style),
            Paragraph("id (PK, String)", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("name, latitude, longitude, size_km, movement_speed_kn, movement_heading_deg, risk_level, confidence, source", table_cell_style),
            Paragraph("/api/icebergs/nearby<br/>/api/admin/icebergs", code_cell_style),
        ],
        [
            Paragraph("<b>weather_records</b>", code_cell_style),
            Paragraph("id (PK, String)", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("location, latitude, longitude, temperature_c, wind_speed_kn, wind_direction_deg, visibility_km, pressure_hpa", table_cell_style),
            Paragraph("/api/environment/current<br/>/api/admin/weather", code_cell_style),
        ],
        [
            Paragraph("<b>travel_records</b>", code_cell_style),
            Paragraph("id (PK, String)<br/>travel_id (Unique, Idx)", table_cell_style),
            Paragraph("user_id -> users.id", table_cell_style),
            Paragraph("ship_name, travel_id, departure_time, estimated_arrival_time, destination, latitude, longitude, status", table_cell_style),
            Paragraph("/api/travel<br/>/api/travel/{id}/status", code_cell_style),
        ],
        [
            Paragraph("<b>help_alerts</b>", code_cell_style),
            Paragraph("id (PK, String)", table_cell_style),
            Paragraph("user_id -> users.id", table_cell_style),
            Paragraph("user_name, message, latitude, longitude, severity (HIGH/CRITICAL), status (OPEN/ACKNOWLEDGED/RESOLVED)", table_cell_style),
            Paragraph("/api/alerts/all<br/>/api/alerts/help<br/>/api/alerts/{id}/*", code_cell_style),
        ],
        [
            Paragraph("<b>feedback</b>", code_cell_style),
            Paragraph("id (PK, String)", table_cell_style),
            Paragraph("user_id -> users.id", table_cell_style),
            Paragraph("user_name, user_email, rating (1-5), feedback, category, status (PENDING/REVIEWED), submitted_at", table_cell_style),
            Paragraph("/api/feedback<br/>/api/feedback/{id}/review", code_cell_style),
        ],
        [
            Paragraph("<b>system_logs</b>", code_cell_style),
            Paragraph("id (PK, Integer)", table_cell_style),
            Paragraph("—", table_cell_style),
            Paragraph("event_type, message, environment (DEVELOPMENT/PRODUCTION), created_at", table_cell_style),
            Paragraph("/api/system-status", code_cell_style),
        ],
    ]

    schema_table = Table(schema_data, colWidths=[90, 85, 80, 160, 108])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('PADDING', (0, 0), (-1, -1), 3.5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#ffffff")]),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(schema_table)
    story.append(Spacer(1, 14))

    # ==================== 8. SUMMARY & VERIFICATION ====================
    story.append(Paragraph("8. Technical Verification & Architecture Summary", h1_style))
    
    summary_box_data = [
        [
            Paragraph("<b>SUMMARY OF TECHNICAL CAPABILITIES:</b><br/>"
                      "• <b>100% Genuine Satellite Ingestion:</b> Operational 6.25km AMSR2 raster processing with zero mock or synthetic coordinate generation.<br/>"
                      "• <b>15-Sector Regional ML:</b> Sector-independent Ridge models accounting for divergent local Antarctic sea-ice pack dynamics.<br/>"
                      "• <b>Real-Time WebSockets:</b> Bidirectional instant notification bus connecting ship navigators and fleet command.<br/>"
                      "• <b>Full Administrative CRUD:</b> Dedicated operations center for comprehensive oversight of ships, icebergs, weather, alerts, and users.<br/>"
                      "• <b>Cryptographic Security:</b> Production-standard PBKDF2-HMAC-SHA256 password hashing with role-based routing.", body_style)
        ]
    ]
    summary_table = Table(summary_box_data, colWidths=[523])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#22c55e")),
    ]))
    story.append(summary_table)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[+] Successfully generated downloadable PDF: {filename}")

if __name__ == "__main__":
    out_pdf = "Dhruv_Sarthi_Complete_System_Workflow.pdf"
    if len(sys.argv) > 1:
        out_pdf = sys.argv[1]
    build_pdf(out_pdf)
