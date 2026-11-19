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

