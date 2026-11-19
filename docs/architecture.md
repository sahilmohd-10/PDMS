# HIRS Architecture Specification

## 1. System Overview

HIRS (Hardware Intelligence & Recommendation System) is an end-to-end, AI-powered hardware recommendation and pricing intelligence platform. It provides:
1. **BUY / NOT BUY Prediction**: Evaluates custom laptop or desktop hardware specifications and prices using a trained LightGBM classification engine with calibrated probabilities.
2. **Intelligent Hardware Recommendation**: Performs candidate retrieval across 984,000+ configurations with a strict budget ceiling (0% violation rate) and workload constraint mappings.
3. **Multi-Build Comparison**: Side-by-side spec comparison and category winner classification (Best Value, Peak Performance, Lowest Cost).

```
   ┌────────────────────────────────────────────────────────┐
   │                 React 19 Frontend                      │
   │  (TypeScript, Tailwind CSS, Lucide Icons, Vite, Recharts)│
   └──────────────────────────┬─────────────────────────────┘
                              │ REST / JSON (port 5173 -> 8000)
   ┌──────────────────────────▼─────────────────────────────┐
   │                 FastAPI REST Backend                   │
   │               (Pydantic Validation, CORS)              │
   ├──────────────────────────┬─────────────────────────────┤
   │ Prediction Service       │ Recommendation Service      │
   │ - LightGBM Classifier    │ - Strict Budget Filtering   │
   │ - Feature Extraction     │ - Workload Matrix Mapping   │
   │ - Explainability Engine  │ - Multi-Criteria Ranking    │
   └─────────────┬────────────┴───────────────┬─────────────┘
                 │                            │
   ┌─────────────▼────────────┐ ┌─────────────▼─────────────┐
   │   best_model.joblib      │ │    catalogue.parquet      │
   │  (Trained Model Bundle)  │ │  (984,081 Unique Configs) │
   └──────────────────────────┘ └───────────────────────────┘
```

## 2. Machine Learning Architecture

- **Benchmarked Models**:
  - Random Forest Baseline: 98.73% Accuracy, 0.9397 F1 (4.4s)
  - CatBoost Classifier: 99.40% Accuracy, 0.9707 F1 (9.87s)
  - LightGBM Classifier: 99.85% Accuracy, 0.9926 F1 (2.4s) - **Winner**
- **Test Holdout Metrics (Unseen 37,500 configs)**:
  - Accuracy: 99.82%
  - Precision: 98.66%
  - Recall: 99.52%
  - F1 Score: 99.09%
  - ROC-AUC: 1.0000
  - Brier Score: 0.0014
- **Feature Engineering**:
  - Direct extracted: `cores`, `ram_gb`, `ssd_gb`, `vram_gb`, `PRICE`, `ram_type`
  - Economic ratios: `price_per_core`, `price_per_ram_gb`, `price_per_vram_gb`
  - Composite indices: `hardware_score` (0-100), `value_score`

## 3. Storage & Performance

- **Fast Storage**: Parquet for intermediate storage and fast columnar filtering with Polars.
- **Model In-Memory Cache**: The trained model bundle and encoder are loaded once on backend boot for sub-millisecond inference latency.
- **Catalogue Indexing**: 984,081 configurations are indexed in `catalogue.parquet` with query times under 20ms for budget and constraint filters.
