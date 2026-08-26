"""Thermodynamic Iceberg Decay and Hydrostatic Rollover Stability Model.

Authoritative Reference:
    Wagner et al. (2017), Appendix: "Iceberg Decay Representation",
    Journal of Physical Oceanography, 47(7), p. 1614, Eq. (A1) & (A2).
    Adapted from Bigg et al. (1997) and Martin & Adcroft (2010).
"""

import math
from typing import Dict, Any

# Empirical coefficients explicitly specified in Wagner et al. (2017), Appendix A1 (p. 1614)
A1_COEFF = 8.7e-6     # m^(1/2) * s^(-1/2) (wave erosion velocity coefficient)
A2_COEFF = 5.8e-7     # dimensionless (wave erosion linear wind coefficient)
B1_COEFF = 8.8e-8     # m * s^(-1) * C^(-1) (sidewall buoyant convection linear coeff)
B2_COEFF = 1.5e-8     # m * s^(-1) * C^(-2) (sidewall buoyant convection quadratic coeff)
C_BASAL = 6.7e-6      # m^(-2/5) * s^(-1/5) * C^(-1) (turbulent basal melt coefficient)
T_ICE_CORE_C = -4.0   # Ice core temperature in Celsius (El-Tahan et al., 1987)

# Densities
RHO_W = 1027.0        # kg/m^3
RHO_I = 850.0         # kg/m^3

# Critical capsize aspect ratio epsilon_c (Eq. A2, p. 1614):
# epsilon_c = sqrt( 6 * (rho_i / rho_w) * (1 - (rho_i / rho_w)) )
EPSILON_CRITICAL = math.sqrt(6.0 * (RHO_I / RHO_W) * (1.0 - (RHO_I / RHO_W)))  # ~0.9253


def compute_wave_erosion_rate(wind_speed_m_s: float) -> float:
    """Compute wind-driven wave erosion rate M_e in m/s (Eq. A1).
    
    Equation:
        M_e = a1 * |v_a|^(1/2) + a2 * |v_a|
    """
    abs_va = max(0.0, wind_speed_m_s)
    return A1_COEFF * math.sqrt(abs_va) + A2_COEFF * abs_va


def compute_sidewall_convection_rate(sea_surface_temp_c: float) -> float:
    """Compute thermal sidewall erosion rate M_v from buoyant convection in m/s (Eq. A1).
    
    Equation:
        M_v = b1 * T_w + b2 * T_w^2
        
    Note: For sub-zero polar seawater (e.g. -1.8 C), convective melt is minimal and clamped >= 0.
    """
    tw = max(0.0, sea_surface_temp_c)
    return B1_COEFF * tw + B2_COEFF * (tw ** 2)


def compute_basal_melt_rate(
    relative_speed_m_s: float,
    sea_surface_temp_c: float,
    length_m: float,
) -> float:
    """Compute turbulent basal melt rate M_b in m/s (Eq. A1).
    
    Equation:
        M_b = c * |v_w - v_i|^(4/5) * (T_w - T_i) * L^(-1/5)
    """
    abs_dv = max(1e-4, relative_speed_m_s)
    abs_l = max(10.0, length_m)
    delta_t = max(0.0, sea_surface_temp_c - T_ICE_CORE_C)

    return C_BASAL * (abs_dv ** 0.8) * delta_t * (abs_l ** -0.2)


def evaluate_hydrostatic_stability(width_m: float, thickness_m: float) -> Dict[str, Any]:
    """Evaluate iceberg capsize rollover criterion (Eq. A2, p. 1614).
    
    Condition:
        epsilon = W / H < epsilon_c
        
    When width W erodes such that W/H < epsilon_c (~0.9253), the iceberg rolls over,
    exchanging its width and thickness.
    """
    if thickness_m <= 0.0:
        return {"is_unstable": True, "rolled_over": True, "new_width_m": 0.0, "new_thickness_m": 0.0}

    aspect_ratio = width_m / thickness_m
    is_unstable = aspect_ratio < EPSILON_CRITICAL

    new_w = thickness_m if is_unstable else width_m
    new_h = width_m if is_unstable else thickness_m

    return {
        "aspect_ratio": round(aspect_ratio, 4),
        "critical_aspect_ratio": round(EPSILON_CRITICAL, 4),
        "is_unstable": is_unstable,
        "new_width_m": round(new_w, 2),
        "new_thickness_m": round(new_h, 2),
    }


def step_iceberg_decay(
    length_m: float,
    width_m: float,
    thickness_m: float,
    wind_speed_m_s: float,
    relative_speed_m_s: float,
    sea_surface_temp_c: float,
    delta_time_days: float = 1.0,
) -> Dict[str, Any]:
    """Integrate 1 time step of thermodynamic decay and rollover for an iceberg.
    
    Evolution equations:
        dL/dt = dW/dt = -(M_e + M_v)
        dH/dt = -M_b
        
    Returns:
        Updated dimensions and daily melt loss rates in meters/day.
    """
    dt_seconds = delta_time_days * 86400.0

    m_e = compute_wave_erosion_rate(wind_speed_m_s)
    m_v = compute_sidewall_convection_rate(sea_surface_temp_c)
    m_b = compute_basal_melt_rate(relative_speed_m_s, sea_surface_temp_c, length_m)

    # Convert rates from m/s to delta meters over dt
    delta_horizontal_m = (m_e + m_v) * dt_seconds
    delta_vertical_m = m_b * dt_seconds

    new_l = max(0.0, length_m - delta_horizontal_m)
    new_w = max(0.0, width_m - delta_horizontal_m)
    new_h = max(0.0, thickness_m - delta_vertical_m)

    # Rollover check
    rollover = evaluate_hydrostatic_stability(new_w, new_h)

    return {
        "length_m": round(new_l, 2),
        "width_m": round(rollover["new_width_m"], 2),
        "thickness_m": round(rollover["new_thickness_m"], 2),
        "wave_erosion_rate_m_day": round(m_e * 86400.0, 4),
        "sidewall_convection_rate_m_day": round(m_v * 86400.0, 4),
        "basal_melt_rate_m_day": round(m_b * 86400.0, 4),
        "total_horizontal_loss_m_day": round((m_e + m_v) * 86400.0, 4),
        "total_vertical_loss_m_day": round(m_b * 86400.0, 4),
        "rolled_over": rollover["is_unstable"],
        "is_melted": new_l <= 1.0 or new_w <= 1.0 or new_h <= 1.0,
    }
