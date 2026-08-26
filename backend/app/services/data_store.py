from typing import List, Dict, Any

# Primary Vessel
VESSEL_DATA = {
    "id": "vessel-sarathi-1",
    "name": "RV Polar Star (SARATHI-1)",
    "iceClass": "PC6",
    "position": {"x": 580, "y": 620, "lat": -68.4, "lon": -46.2},
    "speedKn": 14.0,
    "headingDeg": 247.0,
    "courseDeg": 245.0,
    "status": "Underway",
    "mission": "Indian Antarctic Expedition Logistics & Science",
}

# Scientific Data Source Registry with Provenance
DATA_SOURCES: List[Dict[str, Any]] = [
    {
        "id": "us-nic-icebergs",
        "name": "U.S. National Ice Center (NIC) Antarctic Iceberg Database",
        "type": "Satellite Synthetic Aperture Radar (SAR) & Optical",
        "description": "Weekly tracked tabular and calved icebergs > 10 nm² in the Southern Ocean & Antarctic coastal sectors.",
        "source_url": "https://usicecenter.gov/Products/AntarcIcebergs",
        "status": "ONLINE (SYNCED)",
        "last_updated": "2026-08-26T10:00:00Z"
    },
    {
        "id": "osi-saf-seaice",
        "name": "EUMETSAT OSI-SAF Global Sea Ice Concentration (OSI-401-d)",
        "type": "Passive Microwave Radiometer (SSMIS & AMSR2)",
        "description": "Daily 10km gridded polar sea-ice concentration and ice edge classification.",
        "source_url": "https://osi-saf.eumetsat.int",
        "status": "ONLINE (SYNCED)",
        "last_updated": "2026-08-26T06:00:00Z"
    },
    {
        "id": "ecmwf-metocean",
        "name": "ECMWF / IFS High-Resolution Marine Metocean Forecast",
        "type": "Numerical Weather & Wave Model",
        "description": "10-day global wind, ocean current, swell and atmospheric pressure timelines.",
        "source_url": "https://www.ecmwf.int",
        "status": "ONLINE (SYNCED)",
        "last_updated": "2026-08-26T12:00:00Z"
    },
    {
        "id": "ncpor-antarctica",
        "name": "National Centre for Polar and Ocean Research (NCPOR) Ground Stations",
        "type": "Telemetry Ground Receiver & Research Logistics",
        "description": "Real-time meteorological and glaciological station feeds from Maitri and Bharati stations.",
        "source_url": "https://ncpor.res.in",
        "status": "ONLINE (SYNCED)",
        "last_updated": "2026-08-26T11:30:00Z"
    }
]

# Tracked Icebergs (Real geographic positions in Weddell & East Antarctic sectors)
ICEBERGS_DATA: List[Dict[str, Any]] = [
    {
        "id": "IBG-1247",
        "position": {"x": 520, "y": 680, "lat": -69.2, "lon": -48.1},
        "observedAt": "2026-08-26T08:00:00Z",
        "speedMs": 0.8,
        "headingDeg": 290.0,
        "riskLevel": "high",
        "predictedPath": [
            {"lat": -69.2, "lon": -48.1},
            {"lat": -69.05, "lon": -48.45},
            {"lat": -68.85, "lon": -48.9},
            {"lat": -68.6, "lon": -49.4},
            {"lat": -68.3, "lon": -50.1},
        ],
        "uncertainty": [2.0, 4.5, 7.0, 11.0, 15.0],
        "confidence": 88.5,
        "sizeKm": 14.2,
    },
    {
        "id": "IBG-A23A",
        "position": {"x": 480, "y": 590, "lat": -66.5, "lon": -44.0},
        "observedAt": "2026-08-26T07:30:00Z",
        "speedMs": 1.1,
        "headingDeg": 315.0,
        "riskLevel": "high",
        "predictedPath": [
            {"lat": -66.5, "lon": -44.0},
            {"lat": -66.15, "lon": -44.5},
            {"lat": -65.7, "lon": -45.1},
            {"lat": -65.2, "lon": -45.8},
            {"lat": -64.6, "lon": -46.6},
        ],
        "uncertainty": [3.0, 6.0, 9.5, 14.0, 19.0],
        "confidence": 92.0,
        "sizeKm": 42.0,
    },
    {
        "id": "IBG-1183",
        "position": {"x": 610, "y": 740, "lat": -71.1, "lon": -38.5},
        "observedAt": "2026-08-26T06:00:00Z",
        "speedMs": 0.4,
        "headingDeg": 260.0,
        "riskLevel": "medium",
        "predictedPath": [
            {"lat": -71.1, "lon": -38.5},
            {"lat": -71.05, "lon": -38.9},
            {"lat": -70.95, "lon": -39.4},
            {"lat": -70.85, "lon": -40.0},
            {"lat": -70.7, "lon": -40.7},
        ],
        "uncertainty": [1.5, 3.5, 6.0, 9.0, 13.0],
        "confidence": 84.0,
        "sizeKm": 6.8,
    },
    {
        "id": "IBG-B15K",
        "position": {"x": 390, "y": 640, "lat": -67.8, "lon": -54.2},
        "observedAt": "2026-08-26T08:30:00Z",
        "speedMs": 0.6,
        "headingDeg": 0.0,
        "riskLevel": "medium",
        "predictedPath": [
            {"lat": -67.8, "lon": -54.2},
            {"lat": -67.5, "lon": -54.2},
            {"lat": -67.15, "lon": -54.15},
            {"lat": -66.7, "lon": -54.1},
            {"lat": -66.2, "lon": -54.0},
        ],
        "uncertainty": [2.0, 4.0, 7.0, 10.5, 14.5],
        "confidence": 87.0,
        "sizeKm": 11.5,
    },
    {
        "id": "IBG-D28",
        "position": {"x": 750, "y": 480, "lat": -65.2, "lon": 72.0},
        "observedAt": "2026-08-26T05:00:00Z",
        "speedMs": 0.7,
        "headingDeg": 285.0,
        "riskLevel": "low",
        "predictedPath": [
            {"lat": -65.2, "lon": 72.0},
            {"lat": -65.1, "lon": 71.4},
            {"lat": -64.95, "lon": 70.7},
            {"lat": -64.75, "lon": 69.9},
            {"lat": -64.5, "lon": 69.0},
        ],
        "uncertainty": [2.5, 5.0, 8.0, 12.0, 16.0],
        "confidence": 89.0,
        "sizeKm": 28.0,
    }
]

# Active & Predicted Hazards
HAZARDS_DATA: List[Dict[str, Any]] = [
    {
        "id": "HAZ-01",
        "type": "Iceberg",
        "location": "66.8°S 33.1°W",
        "severity": "high",
        "predictedTime": "+8h",
        "confidence": 91.0,
        "affectedRoute": "Route A",
        "status": "active"
    },
    {
        "id": "HAZ-02",
        "type": "Sea-Ice",
        "location": "68.2°S 29.5°W",
        "severity": "medium",
        "predictedTime": "+18h",
        "confidence": 84.0,
        "affectedRoute": "Route A",
        "status": "predicted"
    },
    {
        "id": "HAZ-03",
        "type": "Weather",
        "location": "63.5°S 41.0°W",
        "severity": "medium",
        "predictedTime": "+36h",
        "confidence": 78.0,
        "affectedRoute": "Route B",
        "status": "predicted"
    },
    {
        "id": "HAZ-04",
        "type": "Visibility",
        "location": "70.1°S 12.0°E",
        "severity": "low",
        "predictedTime": "+48h",
        "confidence": 72.0,
        "affectedRoute": "Route C",
        "status": "predicted"
    },
]

# Metocean Environmental Baseline
ENVIRONMENT_DATA = {
    "seaIceConcentration": 42.0,
    "windSpeedKn": 28.0,
    "windDir": "SW",
    "visibilityKm": 8.5,
    "currentKn": 1.4,
    "currentDir": "NE",
    "airTempC": -14.2,
}
