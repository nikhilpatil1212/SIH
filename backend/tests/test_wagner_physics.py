"""Automated unit tests for Wagner et al. (2017) Analytical Iceberg Drift and Decay Model."""

import pytest
import math
from app.physics.wagner_drift_model import (
    GAMMA,
    compute_harmonic_mean_length,
    compute_lambda_parameter,
    compute_alpha_beta,
    compute_iceberg_velocity,
    compute_coriolis_parameter,
)
from app.physics.decay_model import (
    EPSILON_CRITICAL,
    compute_wave_erosion_rate,
    compute_sidewall_convection_rate,
    compute_basal_melt_rate,
    evaluate_hydrostatic_stability,
    step_iceberg_decay,
)


def test_coupling_parameter_gamma():
    # Exact formula from Eq. 7 (p. 1608): gamma = sqrt((rho_a*(rho_w - rho_i)/(rho_w*rho_i)) * (C_a/C_w))
    # Evaluates to ~0.01298 with standard constants rho_a=1.2, rho_w=1027, rho_i=850, Ca=0.9, Cw=1.3
    assert math.isclose(GAMMA, 0.0129787, rel_tol=1e-3)


def test_harmonic_mean_length():
    # Square iceberg 1000m x 1000m: S = (1000 * 1000) / 2000 = 500m
    assert compute_harmonic_mean_length(1000.0, 1000.0) == 500.0
    
    # Aspect ratio 2:1 (2000m x 1000m): S = 2000000 / 3000 = 666.67m
    assert math.isclose(compute_harmonic_mean_length(2000.0, 1000.0), 666.6667, rel_tol=1e-4)


def test_coriolis_hemisphere_sign():
    # North latitude (+60): f > 0
    f_north = compute_coriolis_parameter(60.0)
    assert f_north > 0.0
    
    # Antarctic latitude (-65): f < 0
    f_south = compute_coriolis_parameter(-65.0)
    assert f_south < 0.0
    assert math.isclose(abs(f_south), 2.0 * 7.292115e-5 * math.sin(math.radians(65)), rel_tol=1e-4)


def test_small_lambda_asymptotics_antarctic_limit():
    """Verify that for giant Antarctic tabular icebergs (L > 15 km) or calm winds (Lambda -> 0),
    alpha -> 0, beta -> 0, and iceberg drifts purely with ocean current: v_i -> v_w.
    """
    # Giant iceberg: L = 30,000m, W = 15,000m in Southern Ocean (-70 deg) under light breeze (1.0 m/s)
    res = compute_iceberg_velocity(
        ocean_u=0.25,
        ocean_v=0.10,
        wind_u=1.0,
        wind_v=0.0,
        length_m=30000.0,
        width_m=15000.0,
        latitude_deg=-70.0,
    )
    
    # Lambda should be << 0.01
    assert res["lambda_param"] < 0.01
    # Alpha and Beta should be near zero
    assert res["alpha_param"] < 0.01
    assert res["beta_param"] < 0.001
    # Iceberg velocity should match ocean current within 0.001 m/s
    assert math.isclose(res["iceberg_u"], 0.25, abs_tol=1e-3)
    assert math.isclose(res["iceberg_v"], 0.10, abs_tol=1e-3)
    assert "Ocean-Current-Dominated" in res["regime_description"]


def test_large_lambda_asymptotics_arctic_2percent_rule():
    """Verify that for small icebergs under strong wind (Lambda -> inf),
    alpha -> 0, beta -> 1, and the asymptotic wind coupling emerges analytically: v_i -> v_w + gamma * v_a.
    """
    # Small iceberg: L = 100m, W = 100m in storm wind (25 m/s)
    res = compute_iceberg_velocity(
        ocean_u=0.10,
        ocean_v=0.0,
        wind_u=25.0,
        wind_v=0.0,
        length_m=100.0,
        width_m=100.0,
        latitude_deg=-65.0,
    )
    
    assert res["lambda_param"] > 5.0
    # Beta approaches 1.0, alpha approaches 0
    assert math.isclose(res["beta_param"], 1.0, rel_tol=0.05)
    
    # Expected u_i = ocean_u + gamma * wind_u
    expected_u = 0.10 + GAMMA * 25.0
    assert math.isclose(res["iceberg_u"], expected_u, rel_tol=0.05)
    assert "Wind-Dominated" in res["regime_description"]


def test_critical_rollover_criterion():
    # Critical ratio is ~0.9253 (Eq. A2)
    assert math.isclose(EPSILON_CRITICAL, 0.9253, rel_tol=1e-3)
    
    # Stable: W = 200m, H = 200m -> aspect ratio 1.0 > 0.9253
    stable_eval = evaluate_hydrostatic_stability(width_m=200.0, thickness_m=200.0)
    assert not stable_eval["is_unstable"]
    assert stable_eval["new_width_m"] == 200.0
    
    # Unstable: W = 150m, H = 200m -> aspect ratio 0.75 < 0.9253 -> should rollover
    unstable_eval = evaluate_hydrostatic_stability(width_m=150.0, thickness_m=200.0)
    assert unstable_eval["is_unstable"]
    assert unstable_eval["new_width_m"] == 200.0  # swapped
    assert unstable_eval["new_thickness_m"] == 150.0


def test_thermodynamic_decay_integration():
    # Step decay for 10 days
    result = step_iceberg_decay(
        length_m=1000.0,
        width_m=600.0,
        thickness_m=250.0,
        wind_speed_m_s=10.0,
        relative_speed_m_s=0.2,
        sea_surface_temp_c=1.5,
        delta_time_days=10.0,
    )
    
    # Dimensions should decrease smoothly
    assert result["length_m"] < 1000.0
    assert result["width_m"] < 600.0
    assert result["thickness_m"] < 250.0
    assert result["wave_erosion_rate_m_day"] > 0.0
    assert result["basal_melt_rate_m_day"] > 0.0
