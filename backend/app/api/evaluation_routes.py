"""
HIRS Evaluation Engine API Routes
Provides transparent, explainable hardware evaluation and recommendation endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, Optional
import json
from pathlib import Path

from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    EvaluationRecommendRequest,
    EvaluationRecommendResponse,
    EvaluationCompareRequest,
    EvaluationCompareResponse,
    EvaluationConfigResponse
)
from app.services.evaluation.evaluation_orchestrator import evaluation_orchestrator

router = APIRouter(prefix="/api/evaluation", tags=["Hardware Evaluation & Recommendations"])

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "evaluation_config.json"
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "benchmark_references.json"
ARTIFACTS_PATH = Path(__file__).resolve().parent.parent.parent / "artifacts"

@router.post("/evaluate", response_model=EvaluationResponse)
def evaluate_hardware(request: EvaluationRequest):
    """
    Evaluate a hardware configuration:
    1. Deterministic eligibility checks (PASS / FAIL / UNKNOWN).
    2. Workload-specific benchmark performance calculation using weighted geometric mean.
    3. Performance-per-rupee and peer-relative value index.
    4. Fair-price estimation (comparable median + LightGBM log-price regression).
    5. Explainable BUY / NOT BUY / INSUFFICIENT_DATA decision policy.
    """
    try:
        return evaluation_orchestrator.evaluate(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation engine failed: {str(e)}")

@router.post("/recommend", response_model=EvaluationRecommendResponse)
def recommend_hardware(request: EvaluationRecommendRequest):
    """
    Recommend hardware configurations using TOPSIS multi-criteria analysis:
    - Over-budget configurations strictly filtered out before ranking.
    - Vector normalization across Performance, Value Index, Cost, and Memory.
    - Returns Best Performance, Best Value, and Best Balanced Choice.
    """
    try:
        return evaluation_orchestrator.recommend(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine failed: {str(e)}")

@router.post("/compare", response_model=EvaluationCompareResponse)
def compare_hardware(request: EvaluationCompareRequest):
    """
    Compare multiple hardware configurations side-by-side using TOPSIS relative closeness.
    """
    if len(request.candidates) < 2:
        raise HTTPException(status_code=400, detail="Must provide at least 2 configurations to compare.")
    try:
        return evaluation_orchestrator.compare(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.get("/config", response_model=EvaluationConfigResponse)
def get_evaluation_config():
    """Retrieve active configurable workload weights, baselines, and policy thresholds."""
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        return EvaluationConfigResponse(**cfg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load evaluation config: {str(e)}")

@router.get("/benchmarks")
def get_benchmark_references():
    """Retrieve verified benchmark reference database (CPUs, GPUs, RAM, SSD)."""
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            benchmarks = json.load(f)
        return benchmarks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load benchmark references: {str(e)}")

@router.get("/metrics")
def get_evaluation_metrics():
    """Retrieve model performance metrics, price regressor benchmarks, and audit metadata."""
    res = {}
    
    # Model comparison
    comp_file = ARTIFACTS_PATH / "model_comparison.json"
    if comp_file.exists():
        with open(comp_file, "r", encoding="utf-8") as f:
            res["classifier_benchmarks"] = json.load(f)
            
    # Price regressor
    reg_meta = ARTIFACTS_PATH / "price_regressor_metadata.json"
    if reg_meta.exists():
        with open(reg_meta, "r", encoding="utf-8") as f:
            res["price_regressor_metrics"] = json.load(f)
            
    res["supervision_disclosure"] = (
        "Dataset target labels originated from synthetic programmatic rules rather than observed "
        "consumer checkout actions. Machine learning operates as a supporting analytical component."
    )
    return res

@router.get("/status")
def get_evaluation_status():
    """Health and readiness check of the HIRS evaluation engine."""
    return {
        "engine": "HIRS Hybrid Hardware Evaluation & Recommendation System",
        "status": "ready",
        "version": "1.0.0",
        "components": {
            "performance_engine": "active",
            "eligibility_engine": "active",
            "fair_price_engine": "active",
            "decision_engine": "active",
            "topsis_engine": "active",
            "price_regressor": "active" if evaluation_orchestrator.fair_price_engine.regressor is not None else "unavailable"
        }
    }
