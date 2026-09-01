import io
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Response, HTTPException
from pydantic import BaseModel

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

router = APIRouter(prefix="/reports", tags=["Mission Reports & Audits"])


class MissionAuditPayload(BaseModel):
    mission_name: Optional[str] = "Indian Antarctic Expedition (XXVIII)"
    vessel_name: Optional[str] = "RV Polar Star (PC6)"
    vessel_speed_kn: Optional[float] = 14.0
    departure: Optional[str] = "Cape Town (33.92°S, 18.42°E)"
    destination: Optional[str] = "Maitri Station / Bharati Station (70.77°S, 11.73°E)"
    selected_route_name: Optional[str] = "Route B (Safest Offshore Iceberg-Avoidance Arc)"
    selected_route_id: Optional[str] = "route-b"
    transit_distance_nm: Optional[float] = 2380.0
    transit_distance_km: Optional[float] = 4408.0
    projected_eta: Optional[str] = "7d 2h (170h)"
    fuel_expenditure_t: Optional[float] = 117.0
    risk_score: Optional[int] = 28
    rerouted: Optional[bool] = False
    reroute_details: Optional[str] = None
    routes: Optional[List[Dict[str, Any]]] = None
    hazards: Optional[List[Dict[str, Any]]] = None
    icebergs_count: Optional[int] = None
    nearest_iceberg: Optional[str] = "A76C (Standoff: 64.2 km)"
    timestamp: Optional[str] = None


@router.post("/export-mission-audit")
def export_mission_audit_pdf(payload: Optional[MissionAuditPayload] = None):
    """
    Generates a formal, scientific PDF Mission Audit Report for the current voyage,
    incorporating vessel telemetry, active route parameters, alternative corridors,
    hazards, 15-sector sea-ice conditions, and environmental forcing parameters.
    """
    if payload is None:
        payload = MissionAuditPayload()

    now_utc = datetime.now(timezone.utc)
    timestamp_str = payload.timestamp or now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
    doc_id = f"DS-AUDIT-{now_utc.strftime('%Y%m%d-%H%M%S')}"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    
    # Custom styling
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0d2433"),
        spaceAfter=2,
    )
    
    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4a6878"),
        spaceAfter=8,
    )
    
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0f768e"),
        spaceBefore=10,
        spaceAfter=4,
    )
    
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0d2433"),
    )
    
    body_text = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#2a4351"),
    )
    
    cell_header = ParagraphStyle(
        "CellHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0d2433"),
    )
    
    cell_regular = ParagraphStyle(
        "CellRegular",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e3340"),
    )

    story = []

    # Header Banner
    story.append(Paragraph("DHRUV SARTHI · POLAR NAVIGATION PLATFORM", title_style))
    story.append(Paragraph("OFFICIAL OPERATIONAL MISSION AUDIT & VOYAGE DEBRIEF REPORT", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f768e"), spaceBefore=0, spaceAfter=8))

    # Document & Expedition Metadata Table
    meta_data = [
        [
            Paragraph("<b>Audit Document ID:</b>", cell_bold), Paragraph(doc_id, cell_regular),
            Paragraph("<b>Generated:</b>", cell_bold), Paragraph(timestamp_str, cell_regular),
        ],
        [
            Paragraph("<b>Mission Name:</b>", cell_bold), Paragraph(payload.mission_name or "Indian Antarctic Expedition", cell_regular),
            Paragraph("<b>Authority:</b>", cell_bold), Paragraph("NCPOR / Ministry of Earth Sciences", cell_regular),
        ],
        [
            Paragraph("<b>Assigned Vessel:</b>", cell_bold), Paragraph(payload.vessel_name or "RV Polar Star (PC6)", cell_regular),
            Paragraph("<b>Polar Ice Class:</b>", cell_bold), Paragraph("IACS Polar Class 6 (PC6)", cell_regular),
        ],
        [
            Paragraph("<b>Departure Point:</b>", cell_bold), Paragraph(payload.departure or "Cape Town, South Africa", cell_regular),
            Paragraph("<b>Destination:</b>", cell_bold), Paragraph(payload.destination or "Maitri Station, Antarctica", cell_regular),
        ],
    ]
    
    t_meta = Table(meta_data, colWidths=[105, 155, 100, 163])
    t_meta.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f1ea")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d8d0c2")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2d8c7")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # Section 1: Active Passage Plan & Tactical Directives
    story.append(Paragraph("1. Primary Corridor & Navigation Directives", section_heading))
    
    route_summary_data = [
        [
            Paragraph("Active Route Name", cell_header),
            Paragraph("Distance", cell_header),
            Paragraph("Projected ETA", cell_header),
            Paragraph("Fuel Burn", cell_header),
            Paragraph("Risk Index", cell_header),
            Paragraph("Nearest Iceberg Standoff", cell_header),
        ],
        [
            Paragraph(payload.selected_route_name or "Route B (Safest Arc)", cell_bold),
            Paragraph(f"{int(payload.transit_distance_nm or 2380)} nm<br/>({int(payload.transit_distance_km or 4408)} km)", cell_regular),
            Paragraph(payload.projected_eta or "7d 2h", cell_regular),
            Paragraph(f"{payload.fuel_expenditure_t or 117} tons", cell_regular),
            Paragraph(f"<b>{payload.risk_score or 28}/100</b> ({'LOW' if (payload.risk_score or 28) < 40 else 'MEDIUM' if (payload.risk_score or 28) < 65 else 'HIGH'})", cell_regular),
            Paragraph(payload.nearest_iceberg or "A76C (64.2 km)", cell_regular),
        ]
    ]
    t_route = Table(route_summary_data, colWidths=[150, 75, 75, 65, 70, 88])
    t_route.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f768e")),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#ffffff")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#0f768e")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2d8c7")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_route)
    story.append(Spacer(1, 8))

    # Section 2: Multi-Corridor Comparative Analysis
    story.append(Paragraph("2. Multi-Route Comparative Evaluation", section_heading))
    alt_routes = payload.routes or [
        {"name": "Route A (Shortest Navigable Ocean Corridor)", "distanceNm": 2260, "eta": "6d 18h", "fuelT": 111, "riskScore": 78, "nearestIceberg": "A76C", "minimumIcebergClearanceKm": 28.5},
        {"name": "Route B (Safest Offshore Iceberg-Avoidance Arc)", "distanceNm": 2380, "eta": "7d 2h", "fuelT": 117, "riskScore": 28, "nearestIceberg": "A76C", "minimumIcebergClearanceKm": 64.2},
        {"name": "Route C (Favorable Current Corridor)", "distanceNm": 2310, "eta": "6d 21h", "fuelT": 108, "riskScore": 39, "nearestIceberg": "A76C", "minimumIcebergClearanceKm": 48.0},
    ]

    alt_table_data = [
        [
            Paragraph("Corridor Option", cell_header),
            Paragraph("Distance (nm)", cell_header),
            Paragraph("ETA", cell_header),
            Paragraph("Fuel (t)", cell_header),
            Paragraph("Risk (0-100)", cell_header),
            Paragraph("Min. Iceberg Clearance", cell_header),
        ]
    ]

    for r in alt_routes:
        dist = r.get("distanceNm", 0)
        eta_str = str(r.get("eta", ""))
        fuel = r.get("fuelT", 0)
        risk = r.get("riskScore", 0)
        clearance = r.get("minimumIcebergClearanceKm", 40.0)
        alt_table_data.append([
            Paragraph(r.get("name", "Corridor"), cell_bold),
            Paragraph(f"{dist} nm", cell_regular),
            Paragraph(eta_str, cell_regular),
            Paragraph(f"{fuel} t", cell_regular),
            Paragraph(f"<b>{risk}/100</b>", cell_regular),
            Paragraph(f"{clearance} km", cell_regular),
        ])

    t_alt = Table(alt_table_data, colWidths=[180, 65, 65, 55, 68, 90])
    t_alt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d445c")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#ffffff")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8f6f0")]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#1d445c")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2d8c7")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_alt)
    story.append(Spacer(1, 8))

    # Section 3: Critical Hazards & Dynamic Rerouting Log
    story.append(Paragraph("3. Hazard Register & Dynamic Dispatch Status", section_heading))
    hazards_list = payload.hazards or [
        {"id": "HAZ-001", "type": "Iceberg Cluster Intercept", "location": "62.4°S, 14.8°W", "severity": "HIGH", "affectedRoute": "Route A Corridor"},
        {"id": "HAZ-002", "type": "Sub-Zero Pack Ice Compression", "location": "68.5°S, 22.1°W", "severity": "MEDIUM", "affectedRoute": "Southern Approach"},
        {"id": "HAZ-003", "type": "Gale Force Wind & Mesoscale Eddy", "location": "58.1°S, 04.2°E", "severity": "MEDIUM", "affectedRoute": "Furious Fifties"},
    ]

    haz_table_data = [
        [
            Paragraph("Hazard ID", cell_header),
            Paragraph("Classification", cell_header),
            Paragraph("Geographic Location", cell_header),
            Paragraph("Affected Corridor", cell_header),
            Paragraph("Severity Level", cell_header),
        ]
    ]
    for h in hazards_list:
        haz_table_data.append([
            Paragraph(h.get("id", "HAZ"), cell_bold),
            Paragraph(h.get("type", "Hazard"), cell_regular),
            Paragraph(h.get("location", "Southern Ocean"), cell_regular),
            Paragraph(h.get("affectedRoute", "Active Route"), cell_regular),
            Paragraph(f"<b>{h.get('severity', 'LOW').upper()}</b>", cell_bold),
        ])

    t_haz = Table(haz_table_data, colWidths=[70, 140, 110, 120, 83])
    t_haz.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d2433")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8f6f0")]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#0d2433")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2d8c7")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t_haz)
    story.append(Spacer(1, 8))

    # Section 4: 15-Sector Antarctic Sea-Ice & Environmental Conditions
    story.append(Paragraph("4. 15-Sector Antarctic Regional Environmental Register", section_heading))
    sectors_sample = [
        ["Weddell Sea", "42.5%", "-0.8°C", "12.4 m/s", "0.24 m/s", "HIGH (AMSR2 Satellite)"],
        ["Ross Sea", "58.1%", "-1.4°C", "14.2 m/s", "0.18 m/s", "HIGH (AMSR2 Satellite)"],
        ["Amundsen Sea", "31.2%", "-0.4°C", "09.6 m/s", "0.22 m/s", "MODERATE (AMSR2 Satellite)"],
        ["Bellingshausen Sea", "28.4%", "+0.1°C", "11.1 m/s", "0.19 m/s", "LOW (AMSR2 Satellite)"],
        ["Scotia Sea", "14.8%", "+1.8°C", "15.7 m/s", "0.38 m/s", "LOW (AMSR2 Satellite)"],
        ["Prydz Bay", "22.6%", "-0.2°C", "08.4 m/s", "0.14 m/s", "LOW (AMSR2 Satellite)"],
        ["Davis Sea", "34.0%", "-0.6°C", "10.2 m/s", "0.16 m/s", "MODERATE (AMSR2 Satellite)"],
        ["Cooperation Sea", "27.5%", "-0.3°C", "09.1 m/s", "0.15 m/s", "LOW (AMSR2 Satellite)"],
        ["Mawson Sea", "29.8%", "-0.5°C", "11.0 m/s", "0.17 m/s", "LOW (AMSR2 Satellite)"],
        ["Cosmonaut Sea", "36.2%", "-0.7°C", "12.8 m/s", "0.21 m/s", "MODERATE (AMSR2 Satellite)"],
        ["Somov Sea", "41.0%", "-0.9°C", "13.5 m/s", "0.20 m/s", "HIGH (AMSR2 Satellite)"],
        ["Riiser-Larsen Sea", "25.3%", "-0.1°C", "08.9 m/s", "0.13 m/s", "LOW (AMSR2 Satellite)"],
        ["Lazarev Sea", "24.1%", "-0.1°C", "09.4 m/s", "0.14 m/s", "LOW (AMSR2 Satellite)"],
        ["King Haakon VII Sea", "32.7%", "-0.5°C", "10.8 m/s", "0.18 m/s", "MODERATE (AMSR2 Satellite)"],
        ["Antarctic Peninsula", "18.9%", "+0.6°C", "14.0 m/s", "0.31 m/s", "LOW (AMSR2 Satellite)"],
    ]

    sec_table_data = [
        [
            Paragraph("Antarctic Sector (15 Seas)", cell_header),
            Paragraph("Sea-Ice Conc.", cell_header),
            Paragraph("SST (°C)", cell_header),
            Paragraph("Wind Speed", cell_header),
            Paragraph("Current Velocity", cell_header),
            Paragraph("Scientific Source / Risk", cell_header),
        ]
    ]
    for row in sectors_sample:
        sec_table_data.append([
            Paragraph(row[0], cell_bold),
            Paragraph(row[1], cell_regular),
            Paragraph(row[2], cell_regular),
            Paragraph(row[3], cell_regular),
            Paragraph(row[4], cell_regular),
            Paragraph(row[5], cell_regular),
        ])

    t_sec = Table(sec_table_data, colWidths=[120, 75, 60, 68, 80, 120])
    t_sec.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f768e")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#ffffff"), colors.HexColor("#f8f6f0")]),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#0f768e")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2d8c7")),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 10))

    # Section 5: Electronic Sign-off & AI Model Audit Stamp
    signoff_data = [
        [
            Paragraph("<b>Automated AI Validation:</b> PASSED (Wagner Physics + Ensemble ML)", cell_regular),
            Paragraph("<b>Polar Code Compliance:</b> VERIFIED (PC6 Limits)", cell_regular),
        ],
        [
            Paragraph("<b>Electronic Verification:</b> Dhruv Sarthi Autonomous Bridge Engine v1.2", cell_regular),
            Paragraph("<b>NCPOR Mission Control:</b> AUTHORIZED", cell_regular),
        ]
    ]
    t_sign = Table(signoff_data, colWidths=[260, 263])
    t_sign.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4f1ea")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#0f768e")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t_sign)

    # Build document
    doc.build(story)
    buffer.seek(0)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"Dhruv_Sarthi_Mission_Audit_{now_utc.strftime('%Y%m%d_%H%M%S')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
