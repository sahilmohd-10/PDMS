import type {
  PredictRequest, PredictResponse,
  RecommendRequest, RecommendResponse,
  CompareRequest, CompareResponse,
  HardwareOptions, HardwareExploreResponse
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errData.detail || `Request failed with status ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const hirsApi = {
  // BUY / NOT BUY Prediction
  predictHardware: (payload: PredictRequest) => 
    request<PredictResponse>('/api/predict', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Smart Recommendations
  recommendHardware: (payload: RecommendRequest) =>
    request<RecommendResponse>('/api/recommend', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Hardware Comparison
  compareHardware: (payload: CompareRequest) =>
    request<CompareResponse>('/api/compare', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Model Status & Metrics
  getModelStatus: () => request<any>('/api/model/status'),
  getModelMetrics: () => request<any>('/api/model/metrics'),

  // Dataset Summary & Validation
  getDatasetSummary: () => request<any>('/api/dataset/summary'),
  validateDataset: (sampleRecords?: any[]) =>
    request<any>('/api/dataset/validate', {
      method: 'POST',
      body: JSON.stringify({ sample_records: sampleRecords || null })
    }),

  // Explore Catalogue
  exploreHardware: (params: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    return request<HardwareExploreResponse>(`/api/hardware/explore?${query.toString()}`);
  },

  // Options for Autocomplete
  getHardwareOptions: () => request<HardwareOptions>('/api/hardware/options'),
  
  // Health
  checkHealth: () => request<{ status: string }>('/health')
};
