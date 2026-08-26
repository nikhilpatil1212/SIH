"""Targeted environmental data downloaders and query adapters."""

from .base_downloader import BaseEnvironmentalDownloader, DownloadQueryResult
from .glorys_downloader import GLORYSDownloader
from .era5_downloader import ERA5Downloader
from .oisst_downloader import OISSTDownloader
from .sea_ice_downloader import SeaIceDownloader
from .gebco_downloader import GEBCODownloader

__all__ = [
    "BaseEnvironmentalDownloader",
    "DownloadQueryResult",
    "GLORYSDownloader",
    "ERA5Downloader",
    "OISSTDownloader",
    "SeaIceDownloader",
    "GEBCODownloader",
]
