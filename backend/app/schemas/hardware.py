"""
Pydantic Schemas for HIRS API
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    cpu: str = Field(..., example="AMD Ryzen 7 7800X3D")
    ram_gb: int = Field(..., ge=4, le=512, example=32)
    ssd_gb: int = Field(..., ge=128, le=16000, example=1000)
    graphics: str = Field(..., example="NVIDIA GeForce RTX 4070")
    price_inr: float = Field(..., gt=0, example=145000.0)
    device_type: Optional[str] = Field("Desktop", example="Desktop")

class FeatureContribution(BaseModel):
    feature: str
    impact: str  # "Positive", "Negative", or "Neutral"
    description: str

class PredictResponse(BaseModel):
    prediction: str  # "BUY" or "NOT BUY"
    prediction_code: int  # 1 or 0
    buy_probability: float
    confidence_level: str  # "High", "Moderate", "Uncertain"
    price_assessment: str
    hardware_score: float
    value_score: float
    feature_contributions: List[FeatureContribution]
    is_out_of_distribution: bool
    explanation: str
    limitations_notice: str

class RecommendRequest(BaseModel):
    budget_inr: float = Field(..., gt=0, example=120000.0)
    device_type: Optional[str] = Field("Desktop", example="Desktop")
    workload: Optional[List[str]] = Field(default_factory=lambda: ["General Purpose"])
    min_ram_gb: Optional[int] = Field(None, ge=4, le=256)
    min_ssd_gb: Optional[int] = Field(None, ge=128, le=8000)
    gpu_preference: Optional[str] = Field("Any", example="Dedicated GPU")
    cpu_preference: Optional[str] = Field("Any", example="AMD")
    limit: Optional[int] = Field(6, ge=1, le=20)

class HardwareItem(BaseModel):
    rank: int
    id: str
    name: str
    device_type: str
    cpu: str
    cores: int
    ram_gb: int
    ram_type: str
    ssd_gb: int
    graphics: str
    vram_gb: int
    price: float
    buy_probability: float
    hardware_score: float
    value_score: float
    tag: str  # "Best Overall", "Best Value", "Best Performance", "Recommended"
    recommendation_reason: str

class RecommendResponse(BaseModel):
    budget_inr: float
    device_type: str
    workloads: List[str]
    total_candidates_matched: int
    recommendations: List[HardwareItem]
    applied_constraints: Dict[str, Any]
    notice: Optional[str] = None

class CompareRequest(BaseModel):
    items: List[PredictRequest]

class CompareResponse(BaseModel):
    items: List[Dict[str, Any]]
    category_winners: Dict[str, str]
    analysis_summary: str

class HardwareExploreFilter(BaseModel):
    query: Optional[str] = None
    device_type: Optional[str] = "All"
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_ram: Optional[int] = None
    min_vram: Optional[int] = None
    sort_by: Optional[str] = "price_asc"
    page: int = Field(1, ge=1)
    page_size: int = Field(12, ge=1, le=100)

class DatasetValidateRequest(BaseModel):
    sample_records: Optional[List[Dict[str, Any]]] = None
