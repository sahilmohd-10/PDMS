export interface PredictRequest {
  cpu: string;
  ram_gb: number;
  ssd_gb: number;
  graphics: string;
  price_inr: number;
  device_type?: string;
}

export interface FeatureContribution {
  feature: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
  description: string;
}

export interface PredictResponse {
  prediction: 'BUY' | 'NOT BUY';
  prediction_code: number;
  buy_probability: number;
  confidence_level: 'High' | 'Moderate' | 'Uncertain';
  price_assessment: string;
  hardware_score: number;
  value_score: number;
  feature_contributions: FeatureContribution[];
  is_out_of_distribution: boolean;
  explanation: string;
  limitations_notice: string;
}

export interface HardwareItem {
  rank: number;
  id: string;
  name: string;
  device_type: string;
  cpu: string;
  cores: number;
  ram_gb: number;
  ram_type: string;
  ssd_gb: number;
  graphics: string;
  vram_gb: number;
  price: number;
  buy_probability: number;
  hardware_score: number;
  value_score: number;
  tag: 'Best Overall' | 'Best Value' | 'Best Performance' | 'Recommended';
  recommendation_reason: string;
}

export interface RecommendRequest {
  budget_inr: number;
  device_type?: string;
  workload?: string[];
  min_ram_gb?: number;
  min_ssd_gb?: number;
  gpu_preference?: string;
  cpu_preference?: string;
  limit?: number;
}

export interface RecommendResponse {
  budget_inr: number;
  device_type: string;
  workloads: string[];
  total_candidates_matched: number;
  recommendations: HardwareItem[];
  applied_constraints: Record<string, any>;
  notice?: string;
}

export interface CompareRequest {
  items: PredictRequest[];
}

export interface CompareResponse {
  items: {
    cpu: string;
    ram_gb: number;
    ssd_gb: number;
    graphics: string;
    price_inr: number;
    device_type: string;
    prediction: string;
    buy_probability: number;
    hardware_score: number;
    value_score: number;
  }[];
  category_winners: {
    best_value: string;
    best_performance: string;
    lowest_price: string;
    highest_buy_probability: string;
  };
  analysis_summary: string;
}

export interface HardwareOptions {
  cpus: string[];
  gpus: string[];
  ram_options: number[];
  ssd_options: number[];
}

export interface HardwareExploreResponse {
  items: {
    id: string;
    device_type: string;
    cpu: string;
    cores: number;
    ram_gb: number;
    ram_type: string;
    ssd_gb: number;
    graphics: string;
    vram_gb: number;
    price: number;
    hardware_score: number;
    value_score: number;
    has_buy_label: number;
  }[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SavedBuild {
  id: string;
  name: string;
  cpu: string;
  graphics: string;
  ram_gb: number;
  ssd_gb: number;
  price_inr: number;
  device_type?: string;
  tag?: string;
  saved_at: string;
}



// Evaluation Engine Schemas
export type WorkloadType = 'Office' | 'Programming' | 'Gaming' | 'Data Analytics' | 'Deep Learning' | 'Video Editing';

export interface EligibilityCheckDetail {
  name: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  message: string;
  required_value?: any;
  actual_value?: any;
}

export interface EligibilityReport {
  overall_status: 'PASS' | 'FAIL' | 'UNKNOWN';
  mandatory_passed: boolean;
  checks: EligibilityCheckDetail[];
}

export interface BenchmarkRatioDetail {
  component: string;
  raw_metric: number;
  reference_metric: number;
  ratio: number;
  weight: number;
  weighted_log: number;
}

export interface FairPriceAssessment {
  method_a_peer_median?: number | null;
  method_b_regressed_price?: number | null;
  estimated_fair_price?: number | null;
  price_premium_pct?: number | null;
  status: 'FAIR' | 'OVERPRICED' | 'EXCEPTIONAL_DEAL' | 'INSUFFICIENT_DATA';
  confidence: string;
  details: string;
}

export interface EvaluationExplanation {
  summary: string;
  reasons: string[];
  warnings: string[];
  missing_evidence: string[];
}

export interface EvaluationRequest {
  cpu: string;
  ram_gb: number;
  ssd_gb: number;
  graphics: string;
  price_inr: number;
  device_type?: string;
  workload?: WorkloadType;
  user_budget_inr?: number;
  ram_generation?: string;
  ssd_interface?: string;
  product_condition?: string;
  warranty_months?: number;
}

export interface EvaluationResponse {
  decision: 'BUY' | 'NOT BUY' | 'INSUFFICIENT_DATA';
  decision_code: number;
  workload: string;
  performance_score: number;
  benchmark_ratios: Record<string, BenchmarkRatioDetail>;
  performance_per_rupee: number;
  relative_value_index: number;
  fair_price_assessment: FairPriceAssessment;
  eligibility: EligibilityReport;
  ml_support: {
    buy_probability?: number | null;
    model_confidence: string;
    synthetic_supervision_notice: string;
    feature_contributions: any[];
  };
  explanation: EvaluationExplanation;
  evidence_completeness: number;
  detailed_evaluation_metrics: Record<string, any>;
}

export interface RecommendationCandidate {
  id: string;
  name: string;
  device_type: string;
  cpu: string;
  cores: number;
  ram_gb: number;
  ram_type: string;
  ssd_gb: number;
  graphics: string;
  vram_gb: number;
  price_inr: number;
  performance_score: number;
  relative_value_index: number;
  price_premium_pct?: number | null;
  topsis_score: number;
  category_tag: 'Best Performance' | 'Best Value' | 'Best Balanced Choice' | 'Eligible Choice';
  recommendation_reason: string;
  eligibility_status: string;
}

export interface EvaluationRecommendRequest {
  budget_inr: number;
  device_type?: string;
  workload?: WorkloadType;
  min_ram_gb?: number;
  min_ssd_gb?: number;
  min_vram_gb?: number;
  limit?: number;
}

export interface EvaluationRecommendResponse {
  budget_inr: number;
  device_type: string;
  workload: string;
  total_candidates_evaluated: number;
  eligible_candidates_count: number;
  best_performance?: RecommendationCandidate | null;
  best_value?: RecommendationCandidate | null;
  best_balanced?: RecommendationCandidate | null;
  ranked_candidates: RecommendationCandidate[];
  topsis_weights_used: Record<string, number>;
  methodology_note: string;
}

export interface EvaluationCompareRequest {
  candidates: EvaluationRequest[];
  workload?: WorkloadType;
}

export interface EvaluationCompareResponse {
  workload: string;
  evaluated_items: EvaluationResponse[];
  topsis_rankings: any[];
  category_winners: Record<string, string>;
  comparison_summary: string;
}
