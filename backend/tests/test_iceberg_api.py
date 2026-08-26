"""Automated unit tests for Iceberg API endpoint handlers."""

import pytest
from fastapi import HTTPException
from app.api.icebergs import (
    list_icebergs,
    get_iceberg,
    get_iceberg_trajectory,
    calculate_drift_physics,
    predict_iceberg_drift,
)
from app.schemas.iceberg import WagnerPhysicsInput


def test_list_icebergs_handler():
    results = list_icebergs(limit=10, min_observations=1, named_only=False)
    assert isinstance(results, list)
    assert len(results) <= 10
    if results:
        item = results[0]
        # Check dict access or attribute access
        berg_id = item["iceberg_id"] if isinstance(item, dict) else item.iceberg_id
        assert berg_id is not None


def test_get_specific_iceberg_metadata():
    data = get_iceberg("B27")
    berg_id = data["iceberg_id"] if isinstance(data, dict) else data.iceberg_id
    total_obs = data["total_observations"] if isinstance(data, dict) else data.total_observations
    assert berg_id == "B27"
    assert total_obs > 2000


def test_get_iceberg_trajectory():
    points = get_iceberg_trajectory("B27", limit=5)
    assert isinstance(points, list)
    assert len(points) <= 5
    if points:
        assert "latitude" in points[0]
        assert "longitude" in points[0]
        assert "speed_km_day" in points[0]


def test_calculate_wagner_drift_physics_endpoint():
    payload = WagnerPhysicsInput(
        latitude=-68.5,
        longitude=-45.0,
        ocean_u=0.20,
        ocean_v=0.05,
        wind_u=8.0,
        wind_v=-4.0,
        length_m=12000.0,
        width_m=6000.0,
        thickness_m=250.0,
    )
    result = calculate_drift_physics(payload)
    assert hasattr(result, "iceberg_u")
    assert hasattr(result, "iceberg_v")
    assert hasattr(result, "iceberg_speed_m_s")
    assert "regime_description" in result.model_dump()
    assert result.gamma > 0.012


from app.api.icebergs import (
    list_icebergs,
    get_iceberg,
    get_iceberg_trajectory,
    calculate_drift_physics,
    predict_iceberg_drift,
    PredictIcebergDriftRequest,
)

def test_predict_endpoint_hybrid_forecasting():
    req = PredictIcebergDriftRequest(
        iceberg_id="A68A",
        current_latitude=-56.2,
        current_longitude=-35.5,
        forecast_hours=72,
    )
    res = predict_iceberg_drift(req)
    assert res.iceberg_id == "A68A"
    assert len(res.waypoints) == 3
    assert hasattr(res, "ai_explanation")


def test_nonexistent_iceberg_raises_404():
    with pytest.raises(HTTPException) as exc_info:
        get_iceberg("NONEXISTENT_BERG_9999")
    assert exc_info.value.status_code == 404
