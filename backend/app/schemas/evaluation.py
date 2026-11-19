"""
Pydantic Schemas for HIRS Hardware Evaluation and Recommendation Engine
"""
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class WorkloadType(str, Enum):
    OFFICE = "Office"
    PROGRAMMING = "Programming"
    GAMING = "Gaming"
    DATA_ANALYTICS = "Data Analytics"
    DEEP_LEARNING = "Deep Learning"
    VIDEO_EDITING = "Video Editing"

class EligibilityStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    UNKNOWN = "UNKNOWN"

class DecisionOutcome(str, Enum):
    BUY = "BUY"
    NOT_BUY = "NOT BUY"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"

class EligibilityCheckDetail(BaseModel):
    name: str
    status: EligibilityStatus
    message: str
    required_value: Optional[Any] = None
    actual_value: Optional[Any] = None

class EligibilityReport(BaseModel):
    overall_status: EligibilityStatus
    mandatory_passed: bool
    checks: List[EligibilityCheckDetail]

class BenchmarkRatioDetail(BaseModel):
    component: str
    raw_metric: float
    reference_metric: float
    ratio: float
    weight: float
    weighted_log: float

class FairPriceAssessment(BaseModel):
    method_a_peer_median: Optional[float] = None
    method_b_regressed_price: Optional[float] = None
    estimated_fair_price: Optional[float] = None
    price_premium_pct: Optional[float] = None
    status: str  # "FAIR", "OVERPRICED", "EXCEPTIONAL_DEAL", "INSUFFICIENT_DATA"
    confidence: str
    details: str

class MLSupportAssessment(BaseModel):
    buy_probability: Optional[float] = None
    model_confidence: str
    synthetic_supervision_notice: str = (
        "Note: Historical dataset labels derive from synthetic heuristic rules, "
        "not observed human market transactions. ML output is a supporting indicator."
    )
    feature_contributions: List[Dict[str, Any]] = []

class EvaluationExplanation(BaseModel):
    summary: str
    reasons: List[str]
    warnings: List[str]
    missing_evidence: List[str]

class EnrichedHardwareProfile(BaseModel):
    product_id: str
    device_type: str = "Desktop"
    brand: Optional[str] = None
    cpu_model: str
    cpu_benchmark_score: Optional[float] = None
    gpu_model: str
    gpu_benchmark_score: Optional[float] = None
    gpu_vram_gb: int = 0
    gpu_tgp_watts: Optional[int] = None
    ram_capacity_gb: int
    ram_generation: Optional[str] = "DDR4"
    ssd_capacity_gb: int
    ssd_benchmark_mbps: Optional[float] = None
    display_details: Optional[Dict[str, Any]] = None
    price: float
    currency: str = "INR"
    price_source: Optional[str] = None
    price_timestamp: Optional[str] = None
    product_condition: Optional[str] = None
    warranty_months: Optional[int] = None
    compatibility_status: Optional[str] = None

class EvaluationRequest(BaseModel):
    cpu: str = Field(..., json_schema_extra={"example": "AMD Ryzen 7 7800X3D"})
    ram_gb: int = Field(..., ge=4, le=512, json_schema_extra={"example": 32})
    ssd_gb: int = Field(..., ge=128, le=16000, json_schema_extra={"example": 1000})
    graphics: str = Field(..., json_schema_extra={"example": "NVIDIA GeForce RTX 4070"})
    price_inr: float = Field(..., gt=0, json_schema_extra={"example": 145000.0})
    device_type: Optional[str] = Field("Desktop", json_schema_extra={"example": "Desktop"})
    workload: Optional[WorkloadType] = Field(WorkloadType.GAMING, json_schema_extra={"example": "Gaming"})
    user_budget_inr: Optional[float] = Field(None, gt=0, json_schema_extra={"example": 160000.0})
    ram_generation: Optional[str] = Field("DDR5", json_schema_extra={"example": "DDR5"})
    ssd_interface: Optional[str] = Field("NVMe Gen4", json_schema_extra={"example": "NVMe Gen4"})
    product_condition: Optional[str] = Field("New", json_schema_extra={"example": "New"})
    warranty_months: Optional[int] = Field(36, json_schema_extra={"example": 36})

class EvaluationResponse(BaseModel):
    decision: DecisionOutcome
    decision_code: int  # 1 for BUY, 0 for NOT BUY, -1 for INSUFFICIENT_DATA
    workload: str
    performance_score: float
    benchmark_ratios: Dict[str, BenchmarkRatioDetail]
    performance_per_rupee: float
    relative_value_index: float
    fair_price_assessment: FairPriceAssessment
    eligibility: EligibilityReport
    ml_support: MLSupportAssessment
    explanation: EvaluationExplanation
    evidence_completeness: float
    detailed_evaluation_metrics: Dict[str, Any]

class TopsisScoreDetail(BaseModel):
    closeness_score: float
    distance_ideal: float
    distance_negative_ideal: float
    rank: int

class RecommendationCandidate(BaseModel):
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
    price_inr: float
    performance_score: float
    relative_value_index: float
    price_premium_pct: Optional[float]
    topsis_score: float
    category_tag: str  # "Best Performance", "Best Value", "Best Balanced Choice", "Eligible Choice"
    recommendation_reason: str
    eligibility_status: EligibilityStatus

class EvaluationRecommendRequest(BaseModel):
    budget_inr: float = Field(..., gt=0, json_schema_extra={"example": 150000.0})
    device_type: Optional[str] = Field("Desktop", json_schema_extra={"example": "Desktop"})
    workload: Optional[WorkloadType] = Field(WorkloadType.GAMING, json_schema_extra={"example": "Gaming"})
    min_ram_gb: Optional[int] = Field(None, ge=4, le=256)
    min_ssd_gb: Optional[int] = Field(None, ge=128, le=8000)
    min_vram_gb: Optional[int] = Field(None, ge=0, le=48)
    limit: Optional[int] = Field(6, ge=1, le=20)

class EvaluationRecommendResponse(BaseModel):
    budget_inr: float
    device_type: str
    workload: str
    total_candidates_evaluated: int
    eligible_candidates_count: int
    best_performance: Optional[RecommendationCandidate] = None
    best_value: Optional[RecommendationCandidate] = None
    best_balanced: Optional[RecommendationCandidate] = None
    ranked_candidates: List[RecommendationCandidate]
    topsis_weights_used: Dict[str, float]
    methodology_note: str

class EvaluationCompareRequest(BaseModel):
    candidates: List[EvaluationRequest]
    workload: Optional[WorkloadType] = Field(WorkloadType.GAMING)

class EvaluationCompareResponse(BaseModel):
    workload: str
    evaluated_items: List[EvaluationResponse]
    topsis_rankings: List[Dict[str, Any]]
    category_winners: Dict[str, str]
    comparison_summary: str

class EvaluationConfigResponse(BaseModel):
    workload_weights: Dict[str, Dict[str, float]]
    benchmark_baselines: Dict[str, float]
    workload_requirements: Dict[str, Dict[str, Any]]
    decision_policy: Dict[str, Any]
    topsis_weights: Dict[str, Dict[str, float]]
