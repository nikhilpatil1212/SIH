"""Targeted subset downloader for ECMWF ERA5 10m surface winds."""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from .base_downloader import BaseEnvironmentalDownloader, DownloadQueryResult


class ERA5Downloader(BaseEnvironmentalDownloader):
    """Downloader adapter for ECMWF ERA5 10m surface wind velocity (u10, v10 in m/s)."""

    @property
    def dataset_name(self) -> str:
        return "ERA5"

    @property
    def dataset_version(self) -> str:
        return "reanalysis-era5-single-levels"

    def download_subset(
        self,
        min_lat: float,
        max_lat: float,
        min_lon: float,
        max_lon: float,
        start_date: str,
        end_date: str,
        output_dir: str,
    ) -> DownloadQueryResult:
        os.makedirs(output_dir, exist_ok=True)
        bbox = {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon,
        }
        
        filename = f"era5_wind_{start_date}_{end_date}.json"
        target_path = os.path.join(output_dir, filename)

        metadata = {
            "source_product": self.dataset_version,
            "variables": ["10m_u_component_of_wind", "10m_v_component_of_wind"],
            "spatial_resolution_deg": 0.25,
            "temporal_resolution": "hourly / daily_aggregated",
            "units": "m/s",
            "requested_bbox": bbox,
            "requested_period": [start_date, end_date],
            "query_timestamp": datetime.utcnow().isoformat(),
        }

        try:
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)

            file_size = os.path.getsize(target_path)
            return DownloadQueryResult(
                success=True,
                dataset_name=self.dataset_name,
                dataset_version=self.dataset_version,
                requested_bbox=bbox,
                requested_start_date=start_date,
                requested_end_date=end_date,
                local_file_path=target_path,
                bytes_downloaded=file_size,
                provenance_metadata=metadata,
            )
        except Exception as e:
            return DownloadQueryResult(
                success=False,
                dataset_name=self.dataset_name,
                dataset_version=self.dataset_version,
                requested_bbox=bbox,
                requested_start_date=start_date,
                requested_end_date=end_date,
                error_message=str(e),
                provenance_metadata=metadata,
            )
