"""Antarctic Sea Ice Dataset Loader & Validator.

Loads, validates, and preprocesses the 48-year Antarctic sea-ice daily observations
from 'antarctic_sea_ice_ml_dataset.csv' (derived from NOAA/NSIDC Climate Data Record).
Provides clean dataframes, historical lag features, and latest observation telemetry.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional, List
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Search candidates for the dataset file
DATASET_CANDIDATE_PATHS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "antarctic_sea_ice_ml_dataset.csv")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "antarctic_sea_ice_ml_dataset.csv")),
    os.path.abspath(os.path.join(os.getcwd(), "antarctic_sea_ice_ml_dataset.csv")),
]

REQUIRED_COLUMNS = [
    "date", "year", "month", "day", "day_of_year",
    "sin_doy", "cos_doy", "current_extent"
]

class SeaIceDataLoader:
    """Robust data loader and validator for Antarctic sea-ice observations."""

    def __init__(self, file_path: Optional[str] = None):
        self.file_path = file_path or self._locate_dataset()
        self._df: Optional[pd.DataFrame] = None
        self._latest_obs: Optional[Dict[str, Any]] = None

    def _locate_dataset(self) -> str:
        for path in DATASET_CANDIDATE_PATHS:
            if os.path.exists(path) and os.path.getsize(path) > 1000:
                return path
        raise FileNotFoundError(
            f"Antarctic sea-ice dataset 'antarctic_sea_ice_ml_dataset.csv' not found. "
            f"Searched paths: {DATASET_CANDIDATE_PATHS}"
        )

    def load_and_validate(self, force_reload: bool = False) -> pd.DataFrame:
        """Loads, cleans, validates and computes multi-horizon lag features on the dataset."""
        if self._df is not None and not force_reload:
            return self._df

        if not os.path.exists(self.file_path):
            raise FileNotFoundError(f"Dataset not found at {self.file_path}")

        logger.info(f"Loading Antarctic Sea Ice dataset from: {self.file_path}")
        df = pd.read_csv(self.file_path)

        # 1. Column presence validation
        missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Corrupt sea-ice dataset: Missing required columns: {missing_cols}")

        # 2. Date parsing & temporal ordering
        df["parsed_date"] = pd.to_datetime(df["date"], errors="coerce")
        invalid_dates = df["parsed_date"].isnull().sum()
        if invalid_dates > 0:
            logger.warning(f"Dropping {invalid_dates} records with unparseable dates.")
            df = df.dropna(subset=["parsed_date"]).copy()

        df = df.sort_values("parsed_date").reset_index(drop=True)

        # 3. Physical range validation for Antarctic Sea Ice Extent (1.0 to 25.0 million km²)
        invalid_extent = (df["current_extent"] < 1.0) | (df["current_extent"] > 25.0)
        if invalid_extent.sum() > 0:
            logger.warning(f"Detected {invalid_extent.sum()} records with out-of-physical-bounds sea-ice extent. Clipping.")
            df["current_extent"] = df["current_extent"].clip(1.0, 25.0)

        # 4. Fill missing lags/rolling features consistently
        if "extent_lag_1d" not in df.columns or df["extent_lag_1d"].isnull().sum() > 0:
            df["extent_lag_1d"] = df["current_extent"].shift(1).bfill()
        if "extent_lag_2d" not in df.columns or df["extent_lag_2d"].isnull().sum() > 0:
            df["extent_lag_2d"] = df["current_extent"].shift(2).bfill()
        if "extent_lag_7d" not in df.columns or df["extent_lag_7d"].isnull().sum() > 0:
            df["extent_lag_7d"] = df["current_extent"].shift(7).bfill()
        if "extent_lag_14d" not in df.columns or df["extent_lag_14d"].isnull().sum() > 0:
            df["extent_lag_14d"] = df["current_extent"].shift(14).bfill()
        if "extent_lag_30d" not in df.columns or df["extent_lag_30d"].isnull().sum() > 0:
            df["extent_lag_30d"] = df["current_extent"].shift(30).bfill()
        if "extent_lag_365d" not in df.columns or df["extent_lag_365d"].isnull().sum() > 0:
            df["extent_lag_365d"] = df["current_extent"].shift(365).bfill()

        # 5. Compute rolling statistics
        df["rolling_mean_7d"] = df["current_extent"].rolling(window=7, min_periods=1).mean()
        df["rolling_std_7d"] = df["current_extent"].rolling(window=7, min_periods=1).std().fillna(0.0)
        df["rolling_mean_30d"] = df["current_extent"].rolling(window=30, min_periods=1).mean()
        df["rolling_std_30d"] = df["current_extent"].rolling(window=30, min_periods=1).std().fillna(0.0)

        # 6. Deltas
        df["delta_1d"] = df["current_extent"] - df["extent_lag_1d"]
        df["delta_7d"] = df["current_extent"] - df["extent_lag_7d"]

        # 7. Day of year harmonic features
        doy = df["parsed_date"].dt.dayofyear
        df["day_of_year"] = doy
        df["sin_doy"] = np.sin(2 * np.pi * doy / 365.25)
        df["cos_doy"] = np.cos(2 * np.pi * doy / 365.25)

        # 8. Define genuine future forecast targets for model training
        df["target_1d"] = df["current_extent"].shift(-1)
        df["target_3d"] = df["current_extent"].shift(-3)
        df["target_7d"] = df["current_extent"].shift(-7)
        df["target_14d"] = df["current_extent"].shift(-14)
        df["target_30d"] = df["current_extent"].shift(-30)

        self._df = df
        logger.info(
            f"Successfully validated Antarctic Sea Ice dataset: {len(df)} records "
            f"spanning {df['parsed_date'].min().strftime('%Y-%m-%d')} to {df['parsed_date'].max().strftime('%Y-%m-%d')}"
        )
        return self._df

    def get_latest_observation(self) -> Dict[str, Any]:
        """Returns the most recent valid Antarctic sea-ice observation from the real dataset."""
        df = self.load_and_validate()
        latest_row = df.iloc[-1]
        obs_dt = latest_row["parsed_date"].to_pydatetime().replace(tzinfo=timezone.utc)

        return {
            "observation_time": obs_dt,
            "observation_date_str": obs_dt.strftime("%Y-%m-%d"),
            "current_extent_million_km2": float(latest_row["current_extent"]),
            "extent_lag_1d": float(latest_row["extent_lag_1d"]),
            "extent_lag_7d": float(latest_row["extent_lag_7d"]),
            "delta_1d": float(latest_row["delta_1d"]),
            "delta_7d": float(latest_row["delta_7d"]),
            "rolling_mean_7d": float(latest_row["rolling_mean_7d"]),
            "rolling_mean_30d": float(latest_row["rolling_mean_30d"]),
            "day_of_year": int(latest_row["day_of_year"]),
            "sin_doy": float(latest_row["sin_doy"]),
            "cos_doy": float(latest_row["cos_doy"]),
            "data_source": "NOAA / NSIDC Climate Data Record (G02202 v4)",
            "row_data": latest_row.to_dict(),
        }

# Global singleton instance
sea_ice_loader = SeaIceDataLoader()
