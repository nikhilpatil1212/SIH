import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
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
        self.setFillColor(colors.HexColor("#071e2e"))
        if self._pageNumber > 1:
            self.drawString(40, 760, "DHRUV SARTHI · SIH INTERNAL HACKATHON QUICK PREP KIT")
            self.setStrokeColor(colors.HexColor("#0077b6"))
            self.setLineWidth(0.75)
            self.line(40, 752, 572, 752)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(40, 30, "SIH 2026 INTERNAL HACKATHON · RAPID INTERVIEW & PRESENTATION GUIDE")
        self.drawRightString(572, 30, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)
        self.restoreState()

def generate_prep_kit():
    filename = "SIH_Internal_Hackathon_Prep_Kit.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=48, bottomMargin=50)
    
    c_primary = colors.HexColor("#071e2e")
    c_sec = colors.HexColor("#0077b6")
    c_cyan = colors.HexColor("#0096c7")
    c_box = colors.HexColor("#e0f2fe")
    c_alt = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#94a3b8")
    
    t_style = ParagraphStyle("T", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=c_primary)
    sub_style = ParagraphStyle("S", fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=c_sec)
    h1 = ParagraphStyle("H1", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=c_primary, spaceBefore=8, spaceAfter=4, keepWithNext=True)
    b = ParagraphStyle("B", fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor("#334155"), spaceBefore=1, spaceAfter=2)
    q = ParagraphStyle("Q", fontName="Helvetica-Oblique", fontSize=8, leading=11, textColor=colors.HexColor("#034064"))
    tc = ParagraphStyle("TC", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#1e293b"))
    tcb = ParagraphStyle("TCB", fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=c_primary)
    th = ParagraphStyle("TH", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white)
    
    story = []
    story.append(Paragraph("DHRUV SARTHI (ध्रुव सारथी)", t_style))
    story.append(Paragraph("SIH INTERNAL HACKATHON — ULTIMATE QUICK PREP KIT", sub_style))
    story.append(Paragraph("<b>Essential Tech Stack, 60s Pitch, Presentation Slide Bullets & Tough Judge Q&A Answers</b>", b))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_cyan, spaceBefore=2, spaceAfter=6))
    
    # ── 1. 60-SECOND ELEVATOR PITCH ──────────────────────────────────────────
    story.append(Paragraph("1. The 60-Second Winning Pitch (Memorize This!)", h1))
    pitch = (
        "<i>'Good morning, respected judges. For <b>Dhruv Sarthi</b>, we developed an operational AI-powered decision support platform for Antarctic maritime navigation.<br/><br/>"
        "<b>Frontend:</b> Built with <b>React 19, TypeScript, and MapLibre GL</b>, providing navigators with a 60-FPS WebGL polar map displaying real-time GeoJSON layers for icebergs, sea-ice contours, and routes.<br/>"
        "<b>Backend & API:</b> Powered by <b>FastAPI and Uvicorn in Python</b>, delivering asynchronous calculations with strict Pydantic type safety.<br/>"
        "<b>Real Data Feeds:</b> Ingests live satellite data from the <b>U.S. National Ice Center (USNIC)</b>, <b>EUMETSAT OSI-SAF</b> 10km sea-ice grids, and <b>Copernicus Marine</b> forecasts.<br/>"
        "<b>Iceberg AI & Physics:</b> Uses a <b>Hybrid Physics-ML engine</b> combining the <b>Wagner hydrodynamic ocean-wind drag equation</b> with a <b>Scikit-learn Multi-Output Random Forest model</b> trained on 65,000+ historical satellite records across 37 years, achieving a median error of just 3.38 km at 24 hours.<br/>"
        "<b>Routing Engine:</b> Employs <b>Spherical Geodesic A* Pathfinding</b> with a <b>Ray-Casting Landmask Engine</b>, generating <b>Shortest, Safest, and Fuel-Efficient</b> routes while enforcing 25–50 km dynamic safety buffers around moving icebergs. Everything is verified and running in our live codebase!'</i>"
    )
    t_p = Table([[Paragraph(pitch, q)]], colWidths=[532])
    t_p.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_box),
        ('BOX', (0,0), (-1,-1), 1, c_sec),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_p)
    story.append(Spacer(1, 6))
    
    # ── 2. PPT SLIDE BULLETS ──────────────────────────────────────────────────
    story.append(Paragraph("2. Slide-by-Slide Tech Stack Summary (For Your Presentation)", h1))
    slide_data = [
        [Paragraph("<b>Component</b>", th), Paragraph("<b>Verified Technology</b>", th), Paragraph("<b>Key Pitching Point for Judges</b>", th)],
        [Paragraph("Frontend", tcb), Paragraph("React 19 + TypeScript + Tailwind v4", tc), Paragraph("Modular polar HUD with dark maritime radar glassmorphism and type safety.", tc)],
        [Paragraph("Polar Map GIS", tcb), Paragraph("MapLibre GL v6 (WebGL)", tc), Paragraph("GPU-accelerated 60 FPS rendering of dynamic GeoJSON layers and vessel radar.", tc)],
        [Paragraph("Backend REST", tcb), Paragraph("FastAPI + Uvicorn (Python)", tc), Paragraph("Asynchronous high-concurrency engine with automated Swagger docs & CORS.", tc)],
        [Paragraph("AI / ML Engine", tcb), Paragraph("Scikit-learn Multi-Output Random Forest", tc), Paragraph("Trained on 65k+ samples over 37 years; 3.38 km median error at T+24h.", tc)],
        [Paragraph("Physics Drag", tcb), Paragraph("Wagner et al. (2017) Model", tc), Paragraph("Analytical hydrodynamic drag vector factoring wind, ocean currents & Coriolis.", tc)],
        [Paragraph("Routing Engine", tcb), Paragraph("Spherical Geodesic A* Pathfinding", tc), Paragraph("Obstacle-aware mesh pathfinder with 25-50km dynamic iceberg clearance.", tc)],
        [Paragraph("Land Avoidance", tcb), Paragraph("Ray-Casting Landmask Engine", tc), Paragraph("Guarantees routes never cross Antarctic continental landmasses (Cost = ∞).", tc)],
        [Paragraph("Real Data Sources", tcb), Paragraph("USNIC, EUMETSAT OSI-SAF, Copernicus", tc), Paragraph("Real satellite optical/SAR tracked icebergs and 10km gridded sea-ice feeds.", tc)],
        [Paragraph("Data Storage", tcb), Paragraph("In-Memory Master JSON + SQLite", tc), Paragraph("Sub-millisecond geodata persistence + SQLAlchemy 2.0 audit logging.", tc)],
    ]
    t_s = Table(slide_data, colWidths=[85, 155, 292])
    t_s.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_alt]),
        ('TOPPADDING', (0,0), (-1,-1), 2.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_s)
    story.append(Spacer(1, 6))
    
    # ── 3. TOUGH JUDGE QUESTIONS & BULLETPROOF ANSWERS ────────────────────────
    story.append(Paragraph("3. Top 6 Tough Questions Judges Will Ask & How to Answer", h1))
    
    qas = [
        ("Q1: 'Where is your data coming from? Is it fake/mock data?'",
         "Answer: 'No, sir. We ingest real satellite data from the U.S. National Ice Center (USNIC) for tracked icebergs (>10 nm²), EUMETSAT OSI-SAF for 10km daily microwave radiometer sea-ice concentration, and Copernicus Marine for 8.3km forecasts. We also have a 47-year historical tracking archive (1989-2026) with 65,000+ observations used to train our AI model.'"),
        ("Q2: 'Why use a Hybrid Physics-ML model instead of just pure Deep Learning or pure Physics?'",
         "Answer: 'Pure physics alone misses chaotic sub-mesoscale ocean eddies, bathymetric deflection, and sail deformation. Pure deep learning alone acts as an unconstrained black box that can violate physical laws near coasts. Our Hybrid approach uses Wagner analytical drag equations for the physical baseline and Random Forest regression to learn the residual correction, achieving high accuracy with physical plausibility.'"),
        ("Q3: 'How does your routing algorithm prevent collisions with moving icebergs?'",
         "Answer: 'Our routing engine doesn't just check iceberg positions NOW (0h). It takes our ML multi-horizon drift predictions (+24h, +48h, +72h) and projects expanding safety buffer zones (25 to 50 km). If any route segment violates this clearance, the cost function sets the edge cost to Infinity, forcing the A* pathfinder to steer around the hazard.'"),
        ("Q4: 'How do you prevent ships from crossing land or ice shelves near Antarctica?'",
         "Answer: 'We built an Antarctic Landmask Engine based on verified Natural Earth continental shape polygons. Using a Ray-Casting Point-in-Polygon and segment intersection algorithm, any route segment intersecting land is assigned an infinite cost, guaranteeing safe maritime water passage.'"),
        ("Q5: 'What database are you using to store your data?'",
         "Answer: 'We use a high-speed multi-tier architecture: 60+ preprocessed canonical JSON trackfiles cached directly in server memory for sub-millisecond route calculations, paired with SQLAlchemy 2.0 ORM connected to SQLite (polar_nav.db) for system event logs and data feed sync audits.'"),
        ("Q6: 'Why did you choose MapLibre GL instead of Leaflet or Google Maps?'",
         "Answer: 'Antarctic navigation requires high-density GeoJSON rendering with dozens of route lines, dynamic drift vectors, and sea-ice heatmaps. MapLibre GL uses GPU-accelerated WebGL shaders to render everything at a buttery-smooth 60 FPS without browser stutter or API token costs.'")
    ]
    
    for q_text, a_text in qas:
        p_q_text = Paragraph(f"<b>{q_text}</b>", ParagraphStyle("QText", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=c_primary, spaceBefore=2, spaceAfter=1))
        p_a_text = Paragraph(a_text, ParagraphStyle("AText", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#334155"), spaceBefore=0, spaceAfter=2))
        story.append(p_q_text)
        story.append(p_a_text)
        
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated: {filename}")

if __name__ == "__main__":
    generate_prep_kit()
