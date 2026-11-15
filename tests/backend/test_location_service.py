import pytest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))

from app.services.location_service import resolve_location, TRAINING_LANDMARKS, get_all_landmarks


def test_resolve_exact_landmark():
    res = resolve_location("Ferry Building")
    assert res is not None
    assert res["name"] == "Ferry Building"
    assert pytest.approx(res["latitude"], 0.001) == 37.7955
    assert pytest.approx(res["longitude"], 0.001) == -122.3934


def test_resolve_with_filler_phrases():
    res = resolve_location("near the Union Square plaza")
    assert res is not None
    assert res["name"] == "Union Square"
    assert pytest.approx(res["latitude"], 0.001) == 37.7879


def test_resolve_golden_gate_bridge():
    res = resolve_location("Golden Gate Bridge south vista")
    assert res is not None
    assert res["name"] == "Golden Gate Bridge"
    assert pytest.approx(res["latitude"], 0.001) == 37.8199


def test_resolve_oracle_park():
    res = resolve_location("outside Oracle Park stadium")
    assert res is not None
    assert res["name"] == "Oracle Park"
    assert pytest.approx(res["latitude"], 0.001) == 37.7786


def test_resolve_pier_39():
    res = resolve_location("by the sea lions at Pier 39")
    assert res is not None
    assert res["name"] == "Pier 39"
    assert pytest.approx(res["latitude"], 0.001) == 37.8087


def test_unknown_location_returns_none():
    res = resolve_location("random unknown street in another city 12345")
    assert res is None


def test_empty_query_returns_none():
    assert resolve_location("") is None
    assert resolve_location("   ") is None


def test_catalog_landmarks_count():
    all_lm = get_all_landmarks()
    assert len(all_lm) >= 7
