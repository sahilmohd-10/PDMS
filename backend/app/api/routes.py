"""
HIRS FastAPI Endpoints Router
Exposes REST endpoints for prediction, recommendation, comparison,
catalogue exploration, model metrics, and dataset quality validation.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any

from app.schemas.hardware import (
    PredictRequest, PredictResponse,
    RecommendRequest, RecommendResponse,
    CompareRequest, CompareResponse,
    HardwareExploreFilter, DatasetValidateRequest
)
from app.services.prediction_service import PredictionService
from app.services.recommendation_service import RecommendationService
from app.services.dataset_service import DatasetService

router = APIRouter(prefix="/api", tags=["HIRS Intelligence"])

# Global service instances
prediction_service = PredictionService()
recommendation_service = RecommendationService(prediction_service=prediction_service)
dataset_service = DatasetService()

@router.post("/predict", response_model=PredictResponse)
def predict_hardware(payload: PredictRequest):
    """
    Predict whether a given hardware configuration is worth buying (BUY = 1, NOT BUY = 0),
    along with calibrated probability, confidence level, and feature-level explanations.
    """
    try:
        result = prediction_service.predict(
            cpu=payload.cpu,
            ram_gb=payload.ram_gb,
            ssd_gb=payload.ssd_gb,
            graphics=payload.graphics,
            price_inr=payload.price_inr,
            device_type=payload.device_type or "Desktop"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@router.post("/recommend", response_model=RecommendResponse)
def recommend_hardware(payload: RecommendRequest):
    """
    Search candidate hardware configurations within a strict budget ceiling,
    enforcing minimum workload constraints and ranking by composite value and performance.
    """
    try:
        result = recommendation_service.get_recommendations(
            budget_inr=payload.budget_inr,
            device_type=payload.device_type or "Desktop",
            workloads=payload.workload or ["General Purpose"],
            min_ram_gb=payload.min_ram_gb,
            min_ssd_gb=payload.min_ssd_gb,
            gpu_preference=payload.gpu_preference,
            cpu_preference=payload.cpu_preference,
            limit=payload.limit or 6
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")

@router.post("/compare", response_model=CompareResponse)
def compare_hardware(payload: CompareRequest):
    """
    Compare 2 to 4 hardware configurations side-by-side, analyzing specification deltas,
    BUY probabilities, and highlighting category winners.
    """
    if len(payload.items) < 2 or len(payload.items) > 4:
        raise HTTPException(status_code=400, detail="Comparison requires between 2 and 4 hardware items.")

    evaluated_items = []
    for item in payload.items:
        pred = prediction_service.predict(
            cpu=item.cpu,
            ram_gb=item.ram_gb,
            ssd_gb=item.ssd_gb,
            graphics=item.graphics,
            price_inr=item.price_inr,
            device_type=item.device_type or "Desktop"
        )
        evaluated_items.append({
            "cpu": item.cpu,
            "ram_gb": item.ram_gb,
            "ssd_gb": item.ssd_gb,
            "graphics": item.graphics,
            "price_inr": item.price_inr,
            "device_type": item.device_type or "Desktop",
            "prediction": pred["prediction"],
            "buy_probability": pred["buy_probability"],
            "hardware_score": pred["hardware_score"],
            "value_score": pred["value_score"]
        })

    # Determine winners
    best_value = max(evaluated_items, key=lambda x: x["value_score"])
    best_perf = max(evaluated_items, key=lambda x: x["hardware_score"])
    lowest_price = min(evaluated_items, key=lambda x: x["price_inr"])
    highest_prob = max(evaluated_items, key=lambda x: x["buy_probability"])

    winners = {
        "best_value": f"{best_value['cpu']} + {best_value['graphics']} (Score: {best_value['value_score']:.1f})",
        "best_performance": f"{best_perf['cpu']} + {best_perf['graphics']} (Score: {best_perf['hardware_score']:.1f})",
        "lowest_price": f"₹{lowest_price['price_inr']:,.0f} ({lowest_price['cpu']})",
        "highest_buy_probability": f"{highest_prob['buy_probability']*100:.1f}% ({highest_prob['cpu']})"
    }

    summary = (
        f"Compared {len(evaluated_items)} configurations. "
        f"'{best_value['cpu']}' yields the highest value efficiency, while "
        f"'{best_perf['cpu']}' delivers peak computing capability."
    )

    return {
        "items": evaluated_items,
        "category_winners": winners,
        "analysis_summary": summary
    }

@router.get("/model/metrics")
def get_model_metrics():
    """
    Returns verified evaluation metrics from the holdout test set,
    including ROC-AUC, PR-AUC, F1-Score, Brier score, and cross-model benchmarks.
    """
    return dataset_service.get_model_metrics()

@router.get("/model/status")
def get_model_status():
    """
    Returns current model runtime status, architecture, and training metadata.
    """
    return dataset_service.get_model_status()

@router.get("/dataset/summary")
def get_dataset_summary():
    """
    Returns dataset statistics, integrity checks, class distribution, and cardinality.
    """
    return dataset_service.get_summary()

@router.post("/dataset/validate")
def validate_dataset(payload: DatasetValidateRequest):
    """
    Validates hardware records or returns system dataset integrity validation.
    """
    return dataset_service.validate_records(payload.sample_records)

@router.get("/hardware/explore")
def explore_hardware(
    query: Optional[str] = None,
    device_type: Optional[str] = "All",
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_ram: Optional[int] = None,
    min_vram: Optional[int] = None,
    sort_by: Optional[str] = "price_asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100)
):
    """
    Search, filter, and paginate through real hardware configurations from the catalogue.
    """
    return dataset_service.explore_hardware(
        query=query,
        device_type=device_type,
        min_price=min_price,
        max_price=max_price,
        min_ram=min_ram,
        min_vram=min_vram,
        sort_by=sort_by,
        page=page,
        page_size=page_size
    )

@router.get("/hardware/options")
def get_hardware_options():
    """
    Returns selectable hardware components (CPUs, GPUs, RAM, SSD) for form autocomplete.
    """
    return dataset_service.get_hardware_options()
