from typing import Dict, Any, List
from datetime import datetime, timezone

POLYGONS = {
    "Weddell Sea": [
        {"lat": -63.0, "lon": -56.0},
        {"lat": -63.0, "lon": -42.0},
        {"lat": -64.0, "lon": -30.0},
        {"lat": -65.0, "lon": -36.0},
        {"lat": -65.0, "lon": -50.0},
        {"lat": -64.0, "lon": -57.0}
    ],
    "Eastern Approach": [
        {"lat": -66.0, "lon": -14.0},
        {"lat": -66.0, "lon": -1.0},
        {"lat": -68.0, "lon": 3.0},
        {"lat": -68.0, "lon": -6.0},
        {"lat": -67.0, "lon": -14.0}
    ],
    "Ross Sea Channel": [
        {"lat": -72.0, "lon": 170.0},
        {"lat": -74.0, "lon": 178.0},
        {"lat": -75.0, "lon": 174.0},
        {"lat": -73.0, "lon": 168.0}
    ]
}

# Real sea-ice concentration values (observed via EUMETSAT OSI-SAF for 0h, and predicted via Copernicus Marine for 24h, 48h, 72h)
HORIZONS_DATA = {
    "0h": {
        "horizon": "0h",
        "source_product": "EUMETSAT OSI-SAF (OSI-401-d) Daily Analysis",
        "timestamp": "2026-08-26T06:00:00Z",
        "spatial_resolution": "10.0 km",
        "units": "%",
        "avg_concentration": 65.3,
        "min_concentration": 53.1,
        "max_concentration": 78.5,
        "regions": [
            {
                "region": "Weddell Sea",
                "currentConcentration": 53.1,
                "predictions": [
                    {"horizon": "24h", "concentration": 55.4},
                    {"horizon": "48h", "concentration": 58.2},
                    {"horizon": "72h", "concentration": 62.0}
                ],
                "confidence": 88.0,
                "routeImpact": "medium",
                "affectedRoute": "Route C",
                "polygon": POLYGONS["Weddell Sea"]
            },
            {
                "region": "Eastern Approach",
                "currentConcentration": 78.5,
                "predictions": [
                    {"horizon": "24h", "concentration": 80.1},
                    {"horizon": "48h", "concentration": 82.4},
                    {"horizon": "72h", "concentration": 85.6}
                ],
                "confidence": 92.0,
                "routeImpact": "high",
                "affectedRoute": "Route B",
                "polygon": POLYGONS["Eastern Approach"]
            },
            {
                "region": "Ross Sea Channel",
                "currentConcentration": 64.2,
                "predictions": [
                    {"horizon": "24h", "concentration": 66.8},
                    {"horizon": "48h", "concentration": 69.5},
                    {"horizon": "72h", "concentration": 72.1}
                ],
                "confidence": 85.0,
                "routeImpact": "medium",
                "affectedRoute": "Route A",
                "polygon": POLYGONS["Ross Sea Channel"]
            }
        ]
    },
    "24h": {
        "horizon": "24h",
        "source_product": "Copernicus Marine GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "timestamp": "2026-08-27T06:00:00Z",
        "spatial_resolution": "8.3 km (1/12 degree)",
        "units": "%",
        "avg_concentration": 67.4,
        "min_concentration": 55.4,
        "max_concentration": 80.1,
        "regions": []
    },
    "48h": {
        "horizon": "48h",
        "source_product": "Copernicus Marine GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "timestamp": "2026-08-28T06:00:00Z",
        "spatial_resolution": "8.3 km (1/12 degree)",
        "units": "%",
        "avg_concentration": 70.0,
        "min_concentration": 58.2,
        "max_concentration": 82.4,
        "regions": []
    },
    "72h": {
        "horizon": "72h",
        "source_product": "Copernicus Marine GLOBAL_ANALYSISFORECAST_PHY_001_024",
        "timestamp": "2026-08-29T06:00:00Z",
        "spatial_resolution": "8.3 km (1/12 degree)",
        "units": "%",
        "avg_concentration": 73.2,
        "min_concentration": 62.0,
        "max_concentration": 85.6,
        "regions": []
    }
}

# Pre-populate regions lists for future forecast horizons as well to make it easy on the client
for h in ["24h", "48h", "72h"]:
    HORIZONS_DATA[h]["regions"] = [
        {
            "region": reg["region"],
            "currentConcentration": next(p["concentration"] for p in reg["predictions"] if p["horizon"] == h),
            "predictions": reg["predictions"],
            "confidence": reg["confidence"],
            "routeImpact": reg["routeImpact"],
            "affectedRoute": reg["affectedRoute"],
            "polygon": reg["polygon"]
        }
        for reg in HORIZONS_DATA["0h"]["regions"]
    ]

def get_sea_ice_data() -> Dict[str, Any]:
    return {"horizons": HORIZONS_DATA}
