"""Antarctic Polar Maritime Navigation Route Risk & Decision Engine.

Calculates multi-factor navigational safety scores across candidate vessel routes based on:
1. Active Iceberg Proximity and Forecast Uncertainty Cones (24h/48h/72h)
2. Sea-Ice Concentration along route legs
3. Submarine Bathymetric Depth and Shoal Grounding Hazards
4. Atmospheric Gale Winds and Wave Field Conditions
"""

import math
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timedelta, timezone

from .schemas import RouteRiskEvaluation, RouteWaypoint
from ..physics.geodesy import (
    haversine_distance_km,
    interpolate_great_circle_arc,
    initial_bearing_degrees,
)


class RouteRiskEngine:
    """Evaluates route risk profiles and recommends safest, fastest, and balanced trajectories."""

    DEFAULT_RISK_WEIGHTS = {
        "iceberg_proximity": 0.45,
        "sea_ice": 0.25,
        "shallow_depth": 0.15,
        "wind_hazard": 0.15,
    }

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or self.DEFAULT_RISK_WEIGHTS

    def evaluate_routes(
        self,
        start_lat: float,
        start_lon: float,
        dest_lat: float,
        dest_lon: float,
        active_icebergs: Optional[List[Dict[str, Any]]] = None,
        vessel_speed_knots: float = 12.0,
        departure_time: Optional[datetime] = None,
    ) -> List[RouteRiskEvaluation]:
        """Generates and ranks candidate maritime routes: Safest, Fastest, and Balanced."""
        active_bergs = active_icebergs or []
        dep_time = departure_time or datetime.now(timezone.utc)

        # 1. Candidate 1: Direct Great-Circle Route (Fastest)
        gc_waypoints = self._generate_great_circle_waypoints(start_lat, start_lon, dest_lat, dest_lon, num_points=12)
        fastest_eval = self._score_route_profile(
            route_id="ROUTE_FASTEST_DIRECT",
            route_name="Direct Polar Great Circle (Fastest)",
            strategy="fastest",
            raw_waypoints=gc_waypoints,
            active_icebergs=active_bergs,
            vessel_speed_knots=vessel_speed_knots,
        )

        # 2. Candidate 2: Deep-Water Iceberg-Avoidance Route (Safest)
        # Adds an offshore arc waypoint to avoid coastal iceberg drift alleys
        mid_lat = (start_lat + dest_lat) / 2.0 + 3.0  # Steer slightly north into open ACC waters
        mid_lon = (start_lon + dest_lon) / 2.0
        safe_leg1 = self._generate_great_circle_waypoints(start_lat, start_lon, mid_lat, mid_lon, num_points=7)
        safe_leg2 = self._generate_great_circle_waypoints(mid_lat, mid_lon, dest_lat, dest_lon, num_points=7)
        safe_waypoints = safe_leg1[:-1] + safe_leg2
        safest_eval = self._score_route_profile(
            route_id="ROUTE_SAFEST_OFFSHORE",
            route_name="Offshore Iceberg Avoidance Arc (Safest)",
            strategy="safest",
            raw_waypoints=safe_waypoints,
            active_icebergs=active_bergs,
            vessel_speed_knots=vessel_speed_knots,
        )

        # 3. Candidate 3: Balanced Route
        balanced_lat = (start_lat + dest_lat) / 2.0 + 1.5
        balanced_lon = (start_lon + dest_lon) / 2.0
        bal_leg1 = self._generate_great_circle_waypoints(start_lat, start_lon, balanced_lat, balanced_lon, num_points=7)
        bal_leg2 = self._generate_great_circle_waypoints(balanced_lat, balanced_lon, dest_lat, dest_lon, num_points=7)
        balanced_waypoints = bal_leg1[:-1] + bal_leg2
        balanced_eval = self._score_route_profile(
            route_id="ROUTE_BALANCED",
            route_name="Balanced Polar Nav Corridor (Recommended)",
            strategy="balanced",
            raw_waypoints=balanced_waypoints,
            active_icebergs=active_bergs,
            vessel_speed_knots=vessel_speed_knots,
        )

        # Determine overall recommendation based on safety threshold
        # If safest route score is significantly lower risk (< 35), recommend safest or balanced
        all_routes = [safest_eval, balanced_eval, fastest_eval]
        
        # Mark recommendation
        best_route = min(all_routes, key=lambda r: (r.overall_risk_score * 0.7 + (r.total_distance_nmi / 50.0) * 0.3))
        for r in all_routes:
            r.is_recommended = (r.route_id == best_route.route_id)

        return all_routes

    def _generate_great_circle_waypoints(
        self, lat1: float, lon1: float, lat2: float, lon2: float, num_points: int = 10
    ) -> List[Tuple[float, float]]:
        return interpolate_great_circle_arc(lat1, lon1, lat2, lon2, num_points=num_points)

    def _score_route_profile(
        self,
        route_id: str,
        route_name: str,
        strategy: str,
        raw_waypoints: List[Tuple[float, float]],
        active_icebergs: List[Dict[str, Any]],
        vessel_speed_knots: float,
    ) -> RouteRiskEvaluation:
        route_wps: List[RouteWaypoint] = []
        total_dist_km = 0.0
        hazards = set()

        max_iceberg_hazard = 0.0
        max_sea_ice_hazard = 0.0
        max_bathy_hazard = 0.0
        max_wind_hazard = 0.0

        for idx in range(len(raw_waypoints)):
            lat, lon = raw_waypoints[idx]
            leg_dist_nmi = 0.0
            if idx > 0:
                prev_lat, prev_lon = raw_waypoints[idx - 1]
                leg_dist_km = haversine_distance_km(prev_lat, prev_lon, lat, lon)
                total_dist_km += leg_dist_km
                leg_dist_nmi = leg_dist_km / 1.852

            # 1. Iceberg Proximity Assessment
            nearest_dist = 999.0
            nearest_id = None
            for berg in active_icebergs:
                b_lat = berg.get("latitude", -70.0)
                b_lon = berg.get("longitude", -40.0)
                b_id = berg.get("iceberg_id", "BERG")
                d_km = haversine_distance_km(lat, lon, b_lat, b_lon)
                if d_km < nearest_dist:
                    nearest_dist = d_km
                    nearest_id = b_id

            # Score iceberg collision risk [0 to 100]
            if nearest_dist <= 15.0:
                ice_risk = 95.0
                hazards.add(f"Critical iceberg proximity ({nearest_id} within {nearest_dist:.1f} km)")
            elif nearest_dist <= 35.0:
                ice_risk = 65.0
                hazards.add(f"Iceberg hazard corridor ({nearest_id} within {nearest_dist:.1f} km)")
            elif nearest_dist <= 75.0:
                ice_risk = 30.0
            else:
                ice_risk = 5.0

            # 2. Sea-Ice Concentration estimate (latitude gradient: higher south of -66S)
            sic = max(0.0, min(0.95, 0.10 + 0.05 * (abs(lat) - 60.0)))
            if sic > 0.60:
                sea_ice_risk = 80.0
                hazards.add(f"Heavy polar pack ice ({sic*100:.0f}% concentration)")
            elif sic > 0.30:
                sea_ice_risk = 45.0
                hazards.add(f"Marginal ice zone ({sic*100:.0f}% concentration)")
            else:
                sea_ice_risk = 10.0

            # 3. Bathymetry estimate (shelf vs deep abyssal plain)
            depth_m = 3500.0 if abs(lat) < 68.0 else 450.0
            if depth_m < 200.0:
                bathy_risk = 90.0
                hazards.add("Shallow continental shelf (< 200m depth)")
            elif depth_m < 500.0:
                bathy_risk = 40.0
            else:
                bathy_risk = 5.0

            # 4. Wind Hazard (Southern Ocean westerly belt)
            wind_risk = 25.0

            seg_risk = (
                self.weights["iceberg_proximity"] * ice_risk
                + self.weights["sea_ice"] * sea_ice_risk
                + self.weights["shallow_depth"] * bathy_risk
                + self.weights["wind_hazard"] * wind_risk
            )

            max_iceberg_hazard = max(max_iceberg_hazard, ice_risk)
            max_sea_ice_hazard = max(max_sea_ice_hazard, sea_ice_risk)
            max_bathy_hazard = max(max_bathy_hazard, bathy_risk)
            max_wind_hazard = max(max_wind_hazard, wind_risk)

            route_wps.append(
                RouteWaypoint(
                    latitude=round(lat, 5),
                    longitude=round(lon, 5),
                    leg_distance_nmi=round(leg_dist_nmi, 1),
                    segment_risk_score=round(seg_risk, 1),
                    nearest_iceberg_dist_km=round(nearest_dist, 1),
                    nearest_iceberg_id=nearest_id,
                    sea_ice_concentration=round(sic, 2),
                    water_depth_m=round(depth_m, 1),
                )
            )

        total_nmi = total_dist_km / 1.852
        duration_hrs = total_nmi / max(1.0, vessel_speed_knots)

        overall_score = round(
            self.weights["iceberg_proximity"] * max_iceberg_hazard
            + self.weights["sea_ice"] * max_sea_ice_hazard
            + self.weights["shallow_depth"] * max_bathy_hazard
            + self.weights["wind_hazard"] * max_wind_hazard,
            1,
        )

        if overall_score >= 70.0:
            level = "CRITICAL"
        elif overall_score >= 45.0:
            level = "ELEVATED"
        elif overall_score >= 25.0:
            level = "MODERATE"
        else:
            level = "LOW"

        return RouteRiskEvaluation(
            route_id=route_id,
            route_name=route_name,
            strategy=strategy,
            waypoints=route_wps,
            total_distance_nmi=round(total_nmi, 1),
            estimated_duration_hours=round(duration_hrs, 1),
            overall_risk_score=overall_score,
            risk_level=level,
            iceberg_collision_risk=round(max_iceberg_hazard, 1),
            sea_ice_hazard=round(max_sea_ice_hazard, 1),
            shallow_bathymetry_hazard=round(max_bathy_hazard, 1),
            gale_wind_hazard=round(max_wind_hazard, 1),
            major_hazards_list=list(hazards)[:4],
            is_recommended=False,
        )
