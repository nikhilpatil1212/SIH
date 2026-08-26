"""Base interface for targeted environmental subset downloaders."""

from abc import ABC, abstractmethod
from typing import Dict, Tuple, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DownloadQueryResult(BaseModel):
    """Result and provenance of a targeted environmental data retrieval."""
    success: bool
    dataset_name: str
    dataset_version: str
    retrieval_timestamp: datetime = Field(default_factory=datetime.utcnow)
    requested_bbox: Dict[str, float] = Field(..., description="min_lat, max_lat, min_lon, max_lon")
    requested_start_date: str = Field(..., description="YYYY-MM-DD")
    requested_end_date: str = Field(..., description="YYYY-MM-DD")
    local_file_path: Optional[str] = None
    bytes_downloaded: int = 0
    error_message: Optional[str] = None
    provenance_metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseEnvironmentalDownloader(ABC):
    """Abstract interface for downloading targeted spatiotemporal environmental bounding boxes."""

    @property
    @abstractmethod
    def dataset_name(self) -> str:
        pass

    @property
    @abstractmethod
    def dataset_version(self) -> str:
        pass

    @abstractmethod
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
        """Download or extract a localized spatiotemporal bounding box subset."""
        pass
