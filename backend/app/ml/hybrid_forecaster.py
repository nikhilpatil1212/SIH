"""Multi-Horizon Hybrid Physics-ML Iceberg Drift Forecast Engine.

Synthesizes:
1. Physical Regime Detection (Grounding / Sea-Ice Lock / Free Drift)
2. Wagner Analytical Physics Vector (Coriolis, Ocean drag, Air drag, Geometry scaling)
3. ML Residual Velocity Vector (Delta u, Delta v)
4. Geodesic Trajectory Propagation (24h, 48h, 72h horizons)
5. Evidence-based Uncertainty Radii
6. Plain-Language AI Decision Explanations
"""

import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple, Optional, Any

from .schemas import HybridForecastResult, HybridForecastWaypoint
from .regime_detector import detect_physical_regime, PhysicalRegime
from .residual_model import HybridDriftModel
from .uncertainty import UncertaintyEstimator
from .ai_explanation import generate_drift_decision_explanation
from ..physics.wagner_drift_model import compute_iceberg_velocity, compute_harmonic_mean_length
from ..physics.geodesy import destination_point, initial_bearing_degrees, haversine_distance_km


class HybridForecaster:
    """Production forecaster generating state-aware hybrid physics-ML iceberg trajectories."""

    def __init__(self, hybrid_model: Optional[HybridDriftModel] = None):
        self.hybrid_model = hybrid_model or HybridDriftModel()

    def forecast(
        self,
        iceberg_id: str,
        origin_lat: float,
        origin_lon: float,
        origin_timestamp: Optional[datetime] = None,
        length_m: float = 10000.0,
        width_m: float = 5000.0,
        thickness_m: float = 250.0,
        ocean_u: float = 0.15,
        ocean_v: float = 0.05,
        wind_u_10m: float = 8.0,
        wind_v_10m: float = -4.0,
        air_temperature_c: float = -10.0,
        pressure_hpa: float = 985.0,
        specific_humidity: float = 0.0018,
        sst_c: float = -0.5,
        sea_ice_concentration: float = 0.20,
        bathymetry_depth: float = -3000.0,
        significant_wave_height: float = 1.5,
        peak_wave_period: float = 6.0,
        forecast_horizon_hours: int = 72,
    ) -> HybridForecastResult:
        origin_dt = origin_timestamp or datetime.now(timezone.utc)

        # 1. Detect Physical Regime
        regime_info = detect_physical_regime(
            latitude=origin_lat,
            longitude=origin_lon,
            draft_m=thickness_m,
            bathymetry_depth_m=bathymetry_depth,
            sea_ice_concentration=sea_ice_concentration,
        )
        regime = regime_info["regime"]

        # 2. Compute Analytical Wagner Physics Vector
        wagner_res = compute_iceberg_velocity(
            ocean_u=ocean_u,
            ocean_v=ocean_v,
            wind_u=wind_u_10m,
            wind_v=wind_v_10m,
            length_m=length_m,
            width_m=width_m,
            latitude_deg=origin_lat,
        )

        w_u = wagner_res["iceberg_u"]
        w_v = wagner_res["iceberg_v"]

        # 3. Predict ML Residual Correction
        aspect_ratio = length_m / max(1.0, width_m)
        s_m = compute_harmonic_mean_length(length_m, width_m)
        wind_spd = math.sqrt(wind_u_10m ** 2 + wind_v_10m ** 2)
        wind_ang = (math.degrees(math.atan2(wind_u_10m, wind_v_10m)) + 360.0) % 360.0

        raw_features = [
            w_u,
            w_v,
            wagner_res["iceberg_speed_m_s"] * 86.4,
            wagner_res["iceberg_bearing_deg"],
            ocean_u,
            ocean_v,
            wind_u_10m,
            wind_v_10m,
            wind_spd,
            wind_ang,
            air_temperature_c,
            pressure_hpa,
            specific_humidity,
            sst_c,
            sea_ice_concentration,
            thickness_m / max(100.0, abs(bathymetry_depth)),
            significant_wave_height,
            peak_wave_period,
            (wind_ang + 15.0) % 360.0,
            length_m,
            width_m,
            aspect_ratio,
            s_m,
            origin_lat,
            origin_lon,
        ]

        if regime == PhysicalRegime.FREE_DRIFT.value:
            ml_res_u, ml_res_v, ens_unc_km = self.hybrid_model.predict_residual(raw_features)
            hybrid_u = w_u + ml_res_u
            hybrid_v = w_v + ml_res_v
        elif regime == PhysicalRegime.ICE_LOCKED.value:
            # Sea-ice drag dampens drift velocity by ~60-80%
            damping = max(0.15, 1.0 - sea_ice_concentration)
            hybrid_u = w_u * damping
            hybrid_v = w_v * damping
            ml_res_u = hybrid_u - w_u
            ml_res_v = hybrid_v - w_v
            ens_unc_km = 3.0
        else:  # GROUNDED
            hybrid_u = 0.0
            hybrid_v = 0.0
            ml_res_u = -w_u
            ml_res_v = -w_v
            ens_unc_km = 1.5

        hybrid_speed_m_s = math.sqrt(hybrid_u ** 2 + hybrid_v ** 2)
        hybrid_speed_km_day = hybrid_speed_m_s * 86.4
        hybrid_bearing_deg = (math.degrees(math.atan2(hybrid_u, hybrid_v)) + 360.0) % 360.0 if hybrid_speed_m_s > 1e-4 else 0.0

        # 4. Multi-Horizon Geodesic Forward Propagation (24h, 48h, 72h)
        waypoints: List[HybridForecastWaypoint] = []
        horizons = [24, 48, 72] if forecast_horizon_hours >= 72 else [24, 48] if forecast_horizon_hours >= 48 else [24]

        # Dominant driving force
        ocean_spd = math.sqrt(ocean_u ** 2 + ocean_v ** 2)
        dom_forcing = "OCEAN_CURRENT" if (ocean_spd > 0.02 * wind_spd and s_m > 4000.0) else "WIND_DRAG"
        if regime != PhysicalRegime.FREE_DRIFT.value:
            dom_forcing = regime

        from ..navigation.land_mask import constrain_trajectory_point
        prev_w_lat, prev_w_lon = origin_lat, origin_lon
        any_constrained = False

        for h in horizons:
            step_days = h / 24.0
            step_dist_km = hybrid_speed_km_day * step_days
            raw_lat, raw_lon = destination_point(origin_lat, origin_lon, hybrid_bearing_deg, step_dist_km)

            # Apply geographic land/ocean constraint
            pred_lat, pred_lon, is_c = constrain_trajectory_point(prev_w_lat, prev_w_lon, raw_lat, raw_lon)
            if is_c:
                any_constrained = True
            prev_w_lat, prev_w_lon = pred_lat, pred_lon

            unc = UncertaintyEstimator.estimate_uncertainty(
                horizon_hours=h,
                physical_regime=regime,
                ensemble_std_km=ens_unc_km,
                wind_speed_m_s=wind_spd,
            )

            wp = HybridForecastWaypoint(
                horizon_hours=h,
                forecast_timestamp=(origin_dt + timedelta(hours=h)).isoformat(),
                latitude=round(pred_lat, 5),
                longitude=round(pred_lon, 5),
                hybrid_velocity_u_m_s=round(hybrid_u, 4),
                hybrid_velocity_v_m_s=round(hybrid_v, 4),
                hybrid_speed_km_day=round(hybrid_speed_km_day, 2),
                hybrid_bearing_deg=round(hybrid_bearing_deg, 1),
                wagner_velocity_u_m_s=round(w_u, 4),
                wagner_velocity_v_m_s=round(w_v, 4),
                ml_residual_u_m_s=round(ml_res_u, 4),
                ml_residual_v_m_s=round(ml_res_v, 4),
                physical_regime=regime,
                uncertainty_radius_km=unc["uncertainty_radius_km"],
                confidence_score=unc["confidence_score"],
                dominant_forcing=dom_forcing,
            )
            waypoints.append(wp)


        # 5. Generate AI Decision Support Explanation
        unc_24 = waypoints[0].uncertainty_radius_km if waypoints else 8.5
        explanation = generate_drift_decision_explanation(
            iceberg_id=iceberg_id,
            physical_regime=regime,
            wagner_u=w_u,
            wagner_v=w_v,
            ml_res_u=ml_res_u,
            ml_res_v=ml_res_v,
            hybrid_u=hybrid_u,
            hybrid_v=hybrid_v,
            ocean_u=ocean_u,
            ocean_v=ocean_v,
            wind_u=wind_u_10m,
            wind_v=wind_v_10m,
            length_m=length_m,
            width_m=width_m,
            sea_ice_conc=sea_ice_concentration,
            bathymetry_depth=bathymetry_depth,
            uncertainty_radius_24h=unc_24,
        )

        return HybridForecastResult(
            iceberg_id=iceberg_id,
            origin_timestamp=origin_dt.isoformat(),
            origin_latitude=origin_lat,
            origin_longitude=origin_lon,
            physical_regime=regime,
            forecast_horizon_hours=forecast_horizon_hours,
            waypoints=waypoints,
            ai_explanation=explanation,
            dominant_environmental_factors={
                "dominant_forcing": dom_forcing,
                "ocean_current_speed_m_s": round(ocean_spd, 3),
                "wind_speed_10m_m_s": round(wind_spd, 2),
                "sea_ice_concentration": sea_ice_concentration,
                "bathymetry_depth_m": bathymetry_depth,
            },
            provenance_metadata={
                "model_version": "Dhruv_Sarthi_Hybrid_v1.0",
                "physics_baseline": "Wagner_et_al_2017",
                "ml_residual_engine": self.hybrid_model.model_type,
            },
        )
