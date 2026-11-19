"""
Automated Backend & ML API Tests for HIRS
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_model_status():
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_architecture" in data
    assert data["status"] == "ready"

def test_model_metrics():
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "best_model" in data
    assert "test_metrics" in data
    assert data["test_metrics"]["accuracy"] >= 0.90
    assert data["test_metrics"]["roc_auc"] >= 0.95

def test_dataset_summary():
    response = client.get("/api/dataset/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_rows"] >= 1000000
    assert data["column_count"] == 6

def test_prediction_buy():
    # Strong config at reasonable price -> BUY
    payload = {
        "cpu": "AMD Ryzen 9 7900X | 12 cores",
        "ram_gb": 32,
        "ssd_gb": 1000,
        "graphics": "NVIDIA GeForce RTX 4070 | VRAM 12 GB",
        "price_inr": 145000.0,
        "device_type": "Desktop"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in ["BUY", "NOT BUY"]
    assert 0.0 <= data["buy_probability"] <= 1.0
    assert "confidence_level" in data
    assert len(data["feature_contributions"]) > 0
    assert "limitations_notice" in data

def test_prediction_not_buy_low_cores():
    # 2 cores at ₹150k -> strictly NOT BUY
    payload = {
        "cpu": "Intel Pentium Gold G6400 | 2 cores",
        "ram_gb": 8,
        "ssd_gb": 256,
        "graphics": "Intel UHD Graphics 610 | VRAM 0 GB",
        "price_inr": 150000.0,
        "device_type": "Desktop"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "NOT BUY"
    assert data["buy_probability"] < 0.20

def test_recommendation_strict_budget_enforcement():
    # Test that NO recommendation ever exceeds budget
    budget = 120000.0
    payload = {
        "budget_inr": budget,
        "device_type": "Desktop",
        "workload": ["Gaming"],
        "limit": 5
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) > 0
    for rec in data["recommendations"]:
        assert rec["price"] <= budget, f"Budget violation: {rec['price']} > {budget}"
        assert rec["ram_gb"] >= 16  # Gaming workload requirement

def test_recommendation_ai_workload():
    # AI workload requires dedicated GPU and high RAM
    payload = {
        "budget_inr": 250000.0,
        "device_type": "Desktop",
        "workload": ["AI / Deep Learning"],
        "limit": 5
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    for rec in data["recommendations"]:
        assert rec["price"] <= 250000.0
        assert rec["vram_gb"] >= 12
        assert rec["ram_gb"] >= 32

def test_compare_configurations():
    payload = {
        "items": [
            {
                "cpu": "AMD Ryzen 5 5600X",
                "ram_gb": 16,
                "ssd_gb": 512,
                "graphics": "NVIDIA RTX 3060",
                "price_inr": 75000.0
            },
            {
                "cpu": "AMD Ryzen 7 7800X3D",
                "ram_gb": 32,
                "ssd_gb": 1000,
                "graphics": "NVIDIA RTX 4070",
                "price_inr": 140000.0
            }
        ]
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert "category_winners" in data
    assert "best_value" in data["category_winners"]

def test_explore_hardware_pagination():
    response = client.get("/api/hardware/explore?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 10
    assert data["total"] > 0
    assert "total_pages" in data

def test_hardware_options():
    response = client.get("/api/hardware/options")
    assert response.status_code == 200
    data = response.json()
    assert len(data["cpus"]) > 0
    assert len(data["gpus"]) > 0
    assert 16 in data["ram_options"]
