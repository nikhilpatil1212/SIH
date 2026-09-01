from datetime import datetime, timezone
import math
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from ..schemas.schemas import EnvironmentSchema, SeaIcePredictionResponse
from ..services.data_store import ENVIRONMENT_DATA
from ..services.sea_ice_service import get_sea_ice_data
from ..services.antarctic_sic_grid_loader import antarctic_sic_grid_loader, ANTARCTIC_SPATIAL_SECTORS
from ..environment.environmental_service import EnvironmentalService

router = APIRouter(prefix="/environment", tags=["Metocean & Environment"])

_env_service = EnvironmentalService()

def build_regional_environment_conditions(target_region: Optional[str] = None) -> List[Dict[str, Any]]:
    """Builds geographically corresponding environmental conditions for Antarctic sectors with full scientific provenance."""
    spatial_sectors = {s["region_name"]: s for s in antarctic_sic_grid_loader.aggregate_sectors_from_spatial_grid()}
    now_utc = datetime.now(timezone.utc)
    
    results = []
    for sector in ANTARCTIC_SPATIAL_SECTORS:
        name = sector["name"]
        if target_region and target_region.lower() != name.lower():
            continue
            
        c_lat = sector["centroid"]["lat"]
        c_lon = sector["centroid"]["lon"]
        
        # Real SIC from AMSR2 spatial grid
        s_data = spatial_sectors.get(name, {})
        obs_time = s_data.get("observation_time", now_utc)
        obs_time_iso = obs_time.isoformat() if hasattr(obs_time, "isoformat") else str(obs_time)
        sic_val = s_data.get("current_sic", None)
        sic_source = s_data.get("data_source", "University of Bremen / JAXA AMSR2 ASI 6.25km")
        
        # Query EnvironmentalService at sector centroid
        env_record = _env_service.get_environment(latitude=c_lat, longitude=c_lon, timestamp=now_utc)
        
        # Calculate wind speed & direction from u, v if present
        wind_u = env_record.wind_u_10m
        wind_v = env_record.wind_v_10m
        wind_speed = round(math.hypot(wind_u, wind_v), 1) if (wind_u is not None and wind_v is not None) else None
        wind_dir = round((math.degrees(math.atan2(-wind_u, -wind_v)) + 360) % 360, 0) if (wind_u is not None and wind_v is not None) else None

        # Calculate ocean current speed & direction from u, v if present
        ocean_u = env_record.ocean_u
        ocean_v = env_record.ocean_v
        ocean_speed = round(math.hypot(ocean_u, ocean_v), 2) if (ocean_u is not None and ocean_v is not None) else None
        ocean_dir = round((math.degrees(math.atan2(-ocean_u, -ocean_v)) + 360) % 360, 0) if (ocean_u is not None and ocean_v is not None) else None

        sst_val = round(env_record.sst, 1) if env_record.sst is not None else None

        results.append({
            "region": name,
            "centroid": {"lat": c_lat, "lon": c_lon},
            "status": "ONLINE" if sic_val is not None else "UNAVAILABLE",
            "last_updated": obs_time_iso,
            "variables": {
                "sea_ice_concentration": {
                    "value": sic_val,
                    "unit": "%",
                    "source_dataset": sic_source,
                    "timestamp": obs_time_iso,
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "VALID" if sic_val is not None else "MISSING"
                },
                "air_temperature": {
                    "value": None,  # Explicitly None unless live met provider active
                    "unit": "°C",
                    "source_dataset": "ECMWF ERA5 Reanalysis / AWS Network",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "MISSING"
                },
                "sea_surface_temperature": {
                    "value": sst_val,
                    "unit": "°C",
                    "source_dataset": env_record.provenance.get("sst", {}).source_dataset if hasattr(env_record.provenance.get("sst"), "source_dataset") else "NOAA OISST v2.1",
                    "timestamp": env_record.provenance.get("sst", {}).source_timestamp.isoformat() if hasattr(env_record.provenance.get("sst"), "source_timestamp") and env_record.provenance.get("sst").source_timestamp else now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "VALID" if sst_val is not None else "MISSING"
                },
                "wind_speed": {
                    "value": wind_speed,
                    "unit": "m/s",
                    "source_dataset": "ECMWF ERA5 Reanalysis",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "VALID" if wind_speed is not None else "MISSING"
                },
                "wind_direction": {
                    "value": wind_dir,
                    "unit": "°",
                    "source_dataset": "ECMWF ERA5 Reanalysis",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "VALID" if wind_dir is not None else "MISSING"
                },
                "ocean_current_speed": {
                    "value": ocean_speed,
                    "unit": "m/s",
                    "source_dataset": "Copernicus GLORYS12V1 Ocean Reanalysis",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "VALID" if ocean_speed is not None else "MISSING"
                },
                "ocean_current_direction": {
                    "value": ocean_dir,
                    "unit": "°",
                    "source_dataset": "Copernicus GLORYS12V1 Ocean Reanalysis",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "VALID" if ocean_dir is not None else "MISSING"
                },
                "salinity": {
                    "value": None,
                    "unit": "PSU",
                    "source_dataset": "Copernicus GLORYS12V1 Ocean Reanalysis",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "MISSING"
                },
                "wave_height": {
                    "value": None,
                    "unit": "m",
                    "source_dataset": "ECMWF Wave Model",
                    "timestamp": now_utc.isoformat(),
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "MISSING"
                },
                "visibility": {
                    "value": None,
                    "unit": "km",
                    "source_dataset": "Antarctic Research Station Feeds",
                    "timestamp": None,
                    "latitude": c_lat,
                    "longitude": c_lon,
                    "quality_flag": "MISSING"
                }
            }
        })
    return results

@router.get("", response_model=EnvironmentSchema)
def get_environment():
    """Get current metocean overview parameters."""
    return ENVIRONMENT_DATA

@router.get("/sea-ice", response_model=SeaIcePredictionResponse)
def get_sea_ice():
    """Get real sea-ice concentration observations and forecasts."""
    return get_sea_ice_data()

@router.get("/regions")
def get_all_regions_environment():
    """Returns geographically corresponding environmental conditions and provenance for all 15 Antarctic sectors."""
    return build_regional_environment_conditions()

@router.get("/regional/{region_name}")
def get_single_region_environment(region_name: str):
    """Returns environmental conditions and provenance for a single Antarctic sector."""
    res = build_regional_environment_conditions(target_region=region_name)
    if not res:
        raise HTTPException(status_code=404, detail=f"Sector '{region_name}' not found")
    return res[0]


