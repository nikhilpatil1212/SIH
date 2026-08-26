"""Abstract base provider interface for environmental dataset integration."""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from datetime import datetime
from ..schemas import EnvironmentalVariableProvenance, EnvironmentalQuery


class BaseEnvironmentalProvider(ABC):
    """Abstract interface defining the standardized contract for physical forcing providers."""

    @property
    @abstractmethod
    def dataset_name(self) -> str:
        """Name of the underlying dataset product (e.g. 'GLORYS12V1', 'ERA5')."""
        pass

    @property
    @abstractmethod
    def supported_variables(self) -> List[str]:
        """List of standard variable names produced by this provider."""
        pass

    @abstractmethod
    def get_variables(
        self, query: EnvironmentalQuery
    ) -> Dict[str, EnvironmentalVariableProvenance]:
        """Extract and interpolate requested variables at query spatiotemporal coordinate.
        
        Returns:
            Dictionary of EnvironmentalVariableProvenance keyed by variable name.
            If data is unavailable or rejected, value is None and is_missing is True.
        """
        pass

    @abstractmethod
    def is_available_at(self, timestamp: datetime, latitude: float, longitude: float) -> bool:
        """Check if provider covers the requested temporal and spatial bounds."""
        pass
