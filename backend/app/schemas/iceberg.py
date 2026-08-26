"""Pydantic data schemas for Antarctic iceberg tracking, canonical observations,
kinematic features, and Wagner et al. (2017) physics parameters.
"""

from datetime import date as dt_date
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field


class RawSensorObservation(BaseModel):
    """Raw coordinate fix and interpolation flag from an individual satellite sensor or NIC."""
    sensor_name: str
    latitude: float = Field(..., description="Latitude in decimal degrees (negative for South)")
    longitude: float = Field(..., description="Longitude in decimal degrees (negative for West, positive for East)")
    is_direct_observation: bool = Field(..., description="True if _3 == 1 (direct fix), False if _3 == 0 (interpolated/no-data)")


class CanonicalIcebergObservation(BaseModel):
    """Canonical daily consolidated iceberg observation with quality flags and provenance."""
    iceberg_id: str = Field(..., description="Iceberg identifier (e.g., 'B15A', 'A68', 'UK172')")
    original_date: int = Field(..., description="Raw YYYYDDD or YYDDD integer from source CSV")
    calendar_date: dt_date = Field(..., description="ISO 8601 calendar date")
    
    # Canonical consolidated position
    latitude: float = Field(..., description="Canonical consolidated latitude in decimal degrees")
    longitude: float = Field(..., description="Canonical consolidated longitude in decimal degrees")
    
    # Dimensions (converted from nautical miles to km: km = nmi * 1.852)
    size_major_km: Optional[float] = Field(None, description="Major axis dimension in km")
    size_minor_km: Optional[float] = Field(None, description="Minor axis dimension in km")
    area_sq_km: Optional[float] = Field(None, description="Estimated elliptical/cuboid surface area in sq km")
    size_source: str = Field("missing", description="Provenance of size dimensions: 'nic_direct', 'forward_fill', 'backward_fill', or 'missing'")
    size_is_imputed: bool = Field(False, description="True if dimensions were imputed from neighboring records; False if directly measured")
    
    # Sensor metadata and quality flags
    contributing_sensors: List[str] = Field(default_factory=list, description="List of sensors reporting on this date")
    num_direct_sensors: int = Field(0, description="Count of sensors with direct observation flag == 1")
    is_interpolated: bool = Field(False, description="True if canonical position was derived from interpolated source data")
    multi_sensor_discrepancy_km: Optional[float] = Field(None, description="Great-circle distance between conflicting sensor fixes")
    multi_sensor_ambiguity: bool = Field(False, description="True if direct sensor fixes differ by > 25 km")
    
    # Raw multi-sensor dictionary
    raw_sensors: Dict[str, Dict[str, Union[float, int]]] = Field(default_factory=dict, description="Raw coordinates per sensor")


class TrajectoryFeaturePoint(CanonicalIcebergObservation):
    """Derived kinematic and physical trajectory features calculated between sequential observations."""
    step_index: int = Field(0, description="0-indexed sequence along trajectory")
    delta_time_days: float = Field(0.0, description="Time elapsed since previous observation in days")
    delta_distance_km: float = Field(0.0, description="Great-circle distance from previous observation in km")
    speed_km_day: float = Field(0.0, description="Estimated drift speed in km/day")
    speed_knots: float = Field(0.0, description="Estimated drift speed in knots")
    speed_m_s: float = Field(0.0, description="Estimated drift speed in m/s")
    bearing_deg: Optional[float] = Field(None, description="Forward azimuth bearing in degrees [0, 360)")
    
    # Kinematic anomaly and operational state flags
    is_stationary: bool = Field(False, description="True if daily displacement < 1.0 km. Kinematic classification only; does not infer physical mechanism.")
    stationary_duration_days: float = Field(0.0, description="Cumulative consecutive days spent stationary")
    suspicious_speed: bool = Field(False, description="Heuristic flag: True if speed > 60 km/day (sensor geolocation outlier)")


class IcebergTrackSummary(BaseModel):
    """Summary catalog entry for an individual iceberg track file."""
    iceberg_id: str
    filename: str
    total_observations: int
    direct_observations_count: int
    interpolated_observations_count: int
    start_date: dt_date
    end_date: dt_date
    duration_days: int
    min_latitude: float
    max_latitude: float
    min_longitude: float
    max_longitude: float
    total_trajectory_distance_km: float
    max_observed_speed_km_day: float
    mean_observed_speed_km_day: float
    stationary_percentage: float
    sensors_present: List[str]
    has_size_measurements: bool
    max_size_major_km: Optional[float] = None
    max_size_minor_km: Optional[float] = None


class WagnerPhysicsInput(BaseModel):
    """Parameters required for computing the Wagner et al. (2017) analytical drift model."""
    latitude: float = Field(..., description="Latitude in decimal degrees (determines Coriolis parameter f)")
    longitude: float = Field(..., description="Longitude in decimal degrees")
    ocean_u: float = Field(..., description="Surface ocean current zonal velocity u_w in m/s (Eastward positive)")
    ocean_v: float = Field(..., description="Surface ocean current meridional velocity v_w in m/s (Northward positive)")
    wind_u: float = Field(..., description="Surface 10m wind zonal velocity u_a in m/s (Eastward positive)")
    wind_v: float = Field(..., description="Surface 10m wind meridional velocity v_a in m/s (Northward positive)")
    length_m: float = Field(..., description="Iceberg length L in meters")
    width_m: float = Field(..., description="Iceberg width W in meters")
    thickness_m: float = Field(250.0, description="Iceberg thickness/draft H in meters (default 250m)")
    sea_surface_temp_c: Optional[float] = Field(None, description="Sea surface temperature T_w in Celsius for decay modeling")


class WagnerPhysicsOutput(BaseModel):
    """Exact outputs from the Wagner et al. (2017) analytical drift model."""
    iceberg_u: float = Field(..., description="Analytical iceberg zonal drift velocity u_i in m/s")
    iceberg_v: float = Field(..., description="Analytical iceberg meridional drift velocity v_i in m/s")
    iceberg_speed_m_s: float = Field(..., description="Scalar iceberg speed in m/s")
    iceberg_speed_knots: float = Field(..., description="Scalar iceberg speed in knots")
    iceberg_bearing_deg: float = Field(..., description="Direction of drift in degrees [0, 360)")
    
    # Internal dimensionless parameters
    gamma: float = Field(..., description="Drag coupling parameter gamma approx 0.01802")
    harmonic_mean_length_s_m: float = Field(..., description="Harmonic mean length S = LW/(L+W) in meters")
    coriolis_f: float = Field(..., description="Coriolis parameter f in s^-1")
    lambda_param: float = Field(..., description="Dimensionless wind-to-size ratio Lambda")
    alpha_param: float = Field(..., description="Dimensionless cross-wind coefficient alpha")
    beta_param: float = Field(..., description="Dimensionless along-wind coefficient beta")
    wind_deflection_angle_deg: float = Field(..., description="Wind driving angle theta = arctan(alpha/beta) in degrees")
    regime_description: str = Field(..., description="Physical regime classification (e.g. 'Ocean-dominated / Tabular Antarctic')")
