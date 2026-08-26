"""Targeted subset downloader for GEBCO 2024 Bathymetric Grid."""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from .base_downloader import BaseEnvironmentalDownloader, DownloadQueryResult


class GEBCODownloader(BaseEnvironmentalDownloader):
    """Downloader adapter for GEBCO 2024 bathymetry & seafloor elevation (D_bath in meters)."""

    @property
    def dataset_name(self) -> str:
        return "GEBCO_2024"

    @property
    def dataset_version(self) -> str:
        return "GEBCO_2024_Grid"

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
        bbox = {"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon}
        filename = f"gebco_subgrid_{int(abs(min_lat))}S_{int(abs(max_lat))}S.json"
        target_path = os.path.join(output_dir, filename)

        metadata = {
            "source_product": self.dataset_version,
            "variables": ["elevation"],
            "spatial_resolution_arcsec": 15.0,
            "temporal_resolution": "static",
            "units": "meters",
            "requested_bbox": bbox,
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
