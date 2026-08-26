"""Automated unit tests for trajectory error metrics and baseline models."""

import pytest
import math
from app.evaluation.metrics import (
    compute_displacement_errors,
    compute_along_cross_track_errors,
    discrete_frechet_distance_km,
)
from app.evaluation.baseline import PersistenceBaseline, WagnerPhysicsBaseline


def test_displacement_metrics_identical():
    coords = [(-65.0, 20.0), (-65.5, 20.5), (-66.0, 21.0)]
    res = compute_displacement_errors(coords, coords)
    assert res["ade_km"] == 0.0
    assert res["fde_km"] == 0.0
    assert res["rmse_km"] == 0.0


def test_along_cross_track_decomposition():
    # Motion due North: (0, 0) -> (10, 0)
    # Prediction: (10, 1) -> 1 deg east error (pure cross-track error)
    obs_start = (0.0, 0.0)
    obs_target = (10.0, 0.0)
    pred_target = (10.0, 1.0)
    
    decomp = compute_along_cross_track_errors(obs_start, obs_target, pred_target)
    assert decomp["total_error_km"] > 0.0
    # Cross track error should dominate
    assert abs(decomp["cross_track_error_km"]) > abs(decomp["along_track_error_km"])


def test_frechet_distance():
    p = [(-60.0, 0.0), (-61.0, 0.0), (-62.0, 0.0)]
    q = [(-60.0, 0.0), (-61.0, 0.0), (-62.0, 0.0)]
    assert discrete_frechet_distance_km(p, q) == 0.0


def test_persistence_baseline():
    traj = PersistenceBaseline.predict_horizon(
        last_lat=-65.0,
        last_lon=0.0,
        speed_km_day=10.0,
        bearing_deg=180.0,  # South
        horizon_days=3,
    )
    assert len(traj) == 3
    # Latitudes should decrease southward
    assert traj[0][0] < -65.0
    assert traj[1][0] < traj[0][0]
    assert traj[2][0] < traj[1][0]
