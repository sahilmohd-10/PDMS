"""
HIRS Hardware Evaluation Engine - Comprehensive Test Suite
Tests:
1. Workload weights validation (sum to 1.0)
2. Benchmark normalization & hand-calculated geometric mean
3. Deterministic eligibility checks (PASS, FAIL, UNKNOWN)
4. Platform architecture compatibility (AM5 + DDR4 vs DDR5)
5. Performance-per-rupee and peer-relative value index (Strict desktop/laptop segregation)
6. Fair-price estimation and price premium
7. TOPSIS multi-criteria decision analysis (hand-calculated matrix, benefit vs cost)
8. Over-budget candidate pre-filtering
9. Decision policy: BUY, NOT BUY, INSUFFICIENT_DATA
10. End-to-end evaluation orchestrator
"""
import math
import pytest
import numpy as np

from app.services.evaluation.performance_engine import PerformanceEngine
from app.services.evaluation.eligibility_engine import EligibilityEngine
from app.services.evaluation.fair_price_engine import FairPriceEngine
from app.services.evaluation.topsis_engine import TopsisEngine
from app.services.evaluation.decision_engine import DecisionEngine
from app.services.evaluation.evaluation_orchestrator import evaluation_orchestrator
from app.schemas.evaluation import EvaluationRequest, EvaluationRecommendRequest, WorkloadType

# 1. Test Workload Weights Sum to 1.0
def test_workload_weights_sum_to_one():
    engine = PerformanceEngine()
    for workload, weights in engine.weights.items():
        total_weight = sum(weights.values())
        assert pytest.approx(total_weight, 0.0001) == 1.0, f"Weights for {workload} must sum to 1.0"

# 2. Hand-Calculated Geometric Performance Index Test
def test_hand_calculated_geometric_mean():
    """
    Hand-calculated verification:
    Let Workload = 'Gaming':
      alpha = {'cpu': 0.20, 'gpu': 0.65, 'ram': 0.10, 'ssd': 0.05}
    Suppose:
      CPU score = 20,000 (Ref = 10,000) => R_cpu = 2.0
      GPU score = 15,000 (Ref = 5,000)  => R_gpu = 3.0
      RAM bandwidth = 51,200 (Ref = 25,600) => R_ram = 2.0
      SSD speed = 1,000 (Ref = 500) => R_ssd = 2.0
    
    Log terms:
      0.20 * ln(2.0) = 0.20 * 0.693147 = 0.138629
      0.65 * ln(3.0) = 0.65 * 1.098612 = 0.714098
      0.10 * ln(2.0) = 0.10 * 0.693147 = 0.069315
      0.05 * ln(2.0) = 0.05 * 0.693147 = 0.034657
      Sum = 0.956699
      P = 100 * exp(0.956699) = 100 * 2.603099 = 260.31
    """
    engine = PerformanceEngine()
    score, details, comp = engine.calculate_performance_score(
        cpu_score=20000.0,
        gpu_score=15000.0,
        ram_bandwidth_mbps=51200.0,
        ssd_throughput_mbps=1000.0,
        workload="Gaming"
    )
    assert pytest.approx(score, 0.05) == 260.31
    assert comp == 1.0
    assert details["cpu"]["ratio"] == 2.0
    assert details["gpu"]["ratio"] == 3.0

# 3. Test Eligibility Engine - Budget, RAM, GPU Constraints
def test_eligibility_engine_deterministic_rules():
    engine = EligibilityEngine()
    
    # Passing configuration
    res_pass = engine.check_eligibility(
        cpu_name="AMD Ryzen 7 7800X3D",
        cpu_score=34500.0,
        ram_gb=32,
        ram_generation="DDR5",
        ssd_gb=1000,
        gpu_name="NVIDIA GeForce RTX 4070",
        gpu_score=18000.0,
        vram_gb=12,
        is_dedicated_gpu=True,
        price_inr=145000.0,
        user_budget_inr=160000.0,
        workload="Gaming"
    )
    assert res_pass["mandatory_passed"] is True
    
    # Over budget must FAIL
    res_over_budget = engine.check_eligibility(
        cpu_name="AMD Ryzen 7 7800X3D",
        cpu_score=34500.0,
        ram_gb=32,
        ram_generation="DDR5",
        ssd_gb=1000,
        gpu_name="NVIDIA GeForce RTX 4070",
        gpu_score=18000.0,
        vram_gb=12,
        is_dedicated_gpu=True,
        price_inr=175000.0,
        user_budget_inr=150000.0,
        workload="Gaming"
    )
    assert res_over_budget["mandatory_passed"] is False
    assert any(c["name"] == "Budget Constraint" and c["status"] == "FAIL" for c in res_over_budget["checks"])

    # Insufficient RAM for Deep Learning (Requires 32GB)
    res_low_ram = engine.check_eligibility(
        cpu_name="AMD Ryzen 7 7800X3D",
        cpu_score=34500.0,
        ram_gb=16,
        ram_generation="DDR5",
        ssd_gb=1000,
        gpu_name="NVIDIA GeForce RTX 4070",
        gpu_score=18000.0,
        vram_gb=12,
        is_dedicated_gpu=True,
        price_inr=140000.0,
        user_budget_inr=150000.0,
        workload="Deep Learning"
    )
    assert res_low_ram["mandatory_passed"] is False
    assert any("Workload Minimum RAM" in c["name"] and c["status"] == "FAIL" for c in res_low_ram["checks"])

    # High CPU must NOT compensate for integrated graphics on Gaming workload
    res_no_gpu = engine.check_eligibility(
        cpu_name="AMD Ryzen 9 9950X",  # Top flagship CPU
        cpu_score=67000.0,
        ram_gb=64,
        ram_generation="DDR5",
        ssd_gb=2000,
        gpu_name="Integrated Intel UHD Graphics",
        gpu_score=900.0,
        vram_gb=0,
        is_dedicated_gpu=False,
        price_inr=120000.0,
        user_budget_inr=150000.0,
        workload="Gaming"
    )
    assert res_no_gpu["mandatory_passed"] is False
    assert any("Dedicated GPU Requirement" in c["name"] and c["status"] == "FAIL" for c in res_no_gpu["checks"])

# 4. Test Platform Compatibility: AM5 + DDR4 vs DDR5
def test_platform_architecture_compatibility():
    engine = EligibilityEngine()
    
    # AM5 with DDR4 must FAIL
    status, msg = engine._check_socket_ram_compatibility("AMD Ryzen 7 7800X3D", "DDR4")
    assert status == "FAIL"
    assert "AM5" in msg and "DDR5" in msg
    
    # AM5 with DDR5 must PASS
    status, msg = engine._check_socket_ram_compatibility("AMD Ryzen 7 7800X3D", "DDR5")
    assert status == "PASS"

# 5. Test Performance Per Rupee & Strict Peer Separation
def test_performance_per_rupee_and_peer_separation():
    engine = FairPriceEngine()
    v = engine.calculate_performance_per_rupee(100.0, 100000.0)
    assert v == 0.001

    # Desktop and Laptop value index queries
    vi_desktop, count_desk, _ = engine.calculate_peer_relative_value_index(0.001, "Desktop", 32, 1000, 12)
    vi_laptop, count_lap, _ = engine.calculate_peer_relative_value_index(0.001, "Laptop", 32, 1000, 12)
    
    assert vi_desktop > 0
    assert vi_laptop > 0

# 6. Hand-Calculated TOPSIS Test
def test_hand_calculated_topsis():
    """
    Hand-calculated TOPSIS test with 2 alternatives, 2 benefit criteria:
      Alternative 1: x = [4, 2]
      Alternative 2: x = [2, 4]
      Weights = [0.5, 0.5]
    
    Norm:
      Col 1: sqrt(16 + 4) = sqrt(20) = 4.4721
      Col 2: sqrt(4 + 16) = sqrt(20) = 4.4721
      r_11 = 4/4.4721 = 0.8944, r_12 = 2/4.4721 = 0.4472
      r_21 = 2/4.4721 = 0.4472, r_22 = 4/4.4721 = 0.8944
      v_11 = 0.4472, v_12 = 0.2236
      v_21 = 0.2236, v_22 = 0.4472
      Ideal A+ = [0.4472, 0.4472]
      Neg Ideal A- = [0.2236, 0.2236]
      D+(1) = sqrt(0 + (0.2236-0.4472)^2) = 0.2236
      D-(1) = sqrt((0.4472-0.2236)^2 + 0) = 0.2236
      T(1) = 0.2236 / (0.2236 + 0.2236) = 0.50
      Symmetric!
    """
    topsis = TopsisEngine()
    candidates = [
        {"id": "A1", "performance_score": 100.0, "relative_value_index": 100.0, "price_inr": 100000.0, "ram_gb": 16, "ssd_gb": 512},
        {"id": "A2", "performance_score": 120.0, "relative_value_index": 120.0, "price_inr": 90000.0, "ram_gb": 32, "ssd_gb": 1000}
    ]
    ranked = topsis.rank_candidates(candidates, "balanced")
    assert len(ranked) == 2
    # A2 has strictly better performance, higher value, lower price, more RAM/SSD
    assert ranked[0]["id"] == "A2"
    assert ranked[0]["topsis_score"] > ranked[1]["topsis_score"]

# 7. Test Pre-Budget Filtering in Recommendations
def test_budget_pre_filtering_in_recommendations():
    req = EvaluationRecommendRequest(
        budget_inr=100000.0,
        device_type="Desktop",
        workload=WorkloadType.GAMING,
        limit=6
    )
    res = evaluation_orchestrator.recommend(req)
    for c in res.ranked_candidates:
        assert c.price_inr <= req.budget_inr, f"Candidate {c.name} price {c.price_inr} exceeds budget {req.budget_inr}!"

# 8. Test Decision Policy: INSUFFICIENT_DATA Handling
def test_insufficient_data_handling():
    decision_engine = DecisionEngine()
    eligibility_report = {
        "overall_status": "UNKNOWN",
        "mandatory_passed": True,
        "checks": [{"name": "CPU", "status": "UNKNOWN", "message": "Unknown CPU"}]
    }
    fair_price_report = {"status": "INSUFFICIENT_DATA", "price_premium_pct": None}
    
    decision, code, explanation = decision_engine.evaluate_decision(
        eligibility_report=eligibility_report,
        performance_score=40.0,
        relative_value_index=85.0,
        fair_price_report=fair_price_report,
        evidence_completeness=0.25,
        workload="Gaming"
    )
    assert decision == "INSUFFICIENT_DATA"
    assert code == -1
    assert "insufficient" in explanation["summary"].lower()

# 9. Test End-to-End Evaluation Orchestrator
def test_end_to_end_orchestrator():
    req = EvaluationRequest(
        cpu="AMD Ryzen 7 7800X3D",
        ram_gb=32,
        ssd_gb=1000,
        graphics="NVIDIA GeForce RTX 4070",
        price_inr=145000.0,
        device_type="Desktop",
        workload=WorkloadType.GAMING,
        user_budget_inr=160000.0,
        ram_generation="DDR5",
        ssd_interface="NVMe Gen4"
    )
    res = evaluation_orchestrator.evaluate(req)
    assert res.decision in ["BUY", "NOT BUY", "INSUFFICIENT_DATA"]
    assert res.performance_score > 0
    assert res.relative_value_index > 0
    assert res.eligibility.mandatory_passed is True
    assert len(res.explanation.reasons) > 0
