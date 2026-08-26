"""Dhruv Sarthi Machine Learning & Hybrid Physics-AI Integration Package."""

from .schemas import CanonicalMLFeatureRecord, HybridForecastResult, RouteRiskEvaluation
from .feature_builder import build_canonical_feature_dataset
from .regime_detector import detect_physical_regime, PhysicalRegime
from .residual_model import MLResidualModelTrainer, HybridDriftModel
from .hybrid_forecaster import HybridForecaster
from .uncertainty import UncertaintyEstimator
from .route_risk import RouteRiskEngine
from .ai_explanation import generate_drift_decision_explanation

__all__ = [
    "CanonicalMLFeatureRecord",
    "HybridForecastResult",
    "RouteRiskEvaluation",
    "build_canonical_feature_dataset",
    "detect_physical_regime",
    "PhysicalRegime",
    "MLResidualModelTrainer",
    "HybridDriftModel",
    "HybridForecaster",
    "UncertaintyEstimator",
    "RouteRiskEngine",
    "generate_drift_decision_explanation",
]
