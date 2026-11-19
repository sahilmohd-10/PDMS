# HIRS — Hardware Intelligence & Recommendation System

> **Production-grade, scientifically grounded hardware intelligence and purchasing evaluation engine** combining deterministic architectural eligibility, normalized benchmark geometric indexing, peer-relative value scoring, LightGBM fair-price estimation, and TOPSIS multi-criteria recommendation ranking.

---

## 🚀 Core Engine Architecture

HIRS implements a hybrid evaluation pipeline supporting three outcomes:
- `BUY = 1`
- `NOT BUY = 0`
- `INSUFFICIENT_DATA = -1` (no forced binary decisions when evidence is incomplete)

### 1. Workload-Specific Benchmark Scoring
Normalized benchmark ratios:
- Higher-is-better: $R(i,j) = \text{Benchmark Score}_{i,j} / \text{Reference Benchmark Score}_j$
- Lower-is-better: $R(i,j) = \text{Reference Completion Time}_j / \text{Actual Completion Time}_{i,j}$

Weighted geometric performance index:
$$P(i,w) = 100 \times \exp\left( \sum_{j} \alpha(w,j) \cdot \ln(R(i,j)) \right)$$
where $\sum_j \alpha(w,j) = 1.0$.

Configured across 6 workloads in `backend/app/config/evaluation_config.json`:
- **Office**: CPU 35%, GPU 5%, RAM 35%, SSD 25%
- **Programming**: CPU 45%, GPU 5%, RAM 30%, SSD 20%
- **Gaming**: CPU 20%, GPU 65%, RAM 10%, SSD 5%
- **Data Analytics**: CPU 40%, GPU 5%, RAM 35%, SSD 20%
- **Deep Learning**: CPU 20%, GPU 60%, RAM 15%, SSD 5%
- **Video Editing**: CPU 25%, GPU 40%, RAM 20%, SSD 15%

### 2. Deterministic Eligibility & Architectural Compatibility
- **Rules**: Budget constraint, minimum RAM, minimum SSD, discrete GPU requirement, VRAM buffer, CPU workload capability.
- **Architectural Checks**: Socket and memory generation compatibility (e.g. AMD AM5 requires DDR5; pairing AM5 with DDR4 strictly fails).
- **Outcomes**: `PASS`, `FAIL`, `UNKNOWN`. High CPU scores never compensate for a failed mandatory GPU or memory requirement.

### 3. Performance-Per-Rupee & Fair-Price Estimation
- **Performance-per-rupee**: $V(i) = P(i,w) / \text{Price}(i)$
- **Peer-Relative Value Index**:
  $$VI(i) = 100 \times \left[ \frac{V(i)}{\text{Median}(V_{\text{comparable peers}})} \right]$$
  *(Strict category rule: Desktops and Laptops are never combined).*
- **Method A**: Comparable product median price from verified market records.
- **Method B**: Component-value regression model (LightGBM on $\ln(\text{PRICE})$).
- **Price Premium**:
  $$\text{PricePremium} = 100 \times \left( \frac{\text{ActualPrice}}{\text{FairPrice}} - 1 \right)$$

### 4. TOPSIS Multi-Criteria Recommendation Ranking
- **Pre-filtering**: Over-budget candidates are strictly filtered out before ranking.
- **Vector Normalization**: $r(i,j) = x(i,j) / \sqrt{\sum_k x(k,j)^2}$
- **Euclidean Distances**: $D^+$ and $D^-$ accounting for benefit criteria (Performance, Value, RAM, SSD, VRAM) vs cost criteria (Price).
- **Relative Closeness**: $T(i) = D^- / (D^+ + D^-)$
- **Categorization**: *Best Performance*, *Best Value*, and *Best Balanced Choice* (TOPSIS Winner).

---

## 📁 Repository Structure

```
PDMS/
├── backend/
│   ├── app/
│   │   ├── main.py                          # FastAPI application
│   │   ├── api/
│   │   │   ├── routes.py                    # Legacy prediction & exploration endpoints
│   │   │   └── evaluation_routes.py         # /api/evaluation/* endpoints
│   │   ├── config/
│   │   │   └── evaluation_config.json       # Workload weights, baselines & thresholds
│   │   ├── data/
│   │   │   └── benchmark_references.json   # Verified CPU/GPU/RAM/SSD benchmark scores
│   │   ├── schemas/
│   │   │   ├── hardware.py                  # Pydantic hardware schemas
│   │   │   └── evaluation.py                # Evaluation & TOPSIS schemas
│   │   └── services/
│   │       ├── evaluation/
│   │       │   ├── performance_engine.py    # Geometric benchmark scoring
│   │       │   ├── eligibility_engine.py    # Deterministic PASS/FAIL/UNKNOWN
│   │       │   ├── fair_price_engine.py     # Value index & LightGBM fair price
│   │       │   ├── decision_engine.py       # BUY / NOT BUY policy & explanations
│   │       │   ├── topsis_engine.py         # Vector-normalized TOPSIS MCDA
│   │       │   └── evaluation_orchestrator.py
│   │       ├── prediction_service.py        # ML inference & SHAP contributions
│   │       └── recommendation_service.py
│   ├── artifacts/                           # Model bundles, regressor & parquet caches
│   └── tests/
│       ├── test_api.py                      # Core API tests
│       └── test_evaluation_engine.py       # 9 unit & integration tests with hand-calculated math
├── docs/
│   ├── architecture.md                      # System architecture & mathematical formulations
│   ├── data_readiness_report.md             # Enriched 20-attribute schema audit
│   └── model_evaluation_report.md           # Model benchmarking & synthetic supervision disclosure
└── frontend/                                # React 19 + TypeScript + Vite + Tailwind CSS v4
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/evaluation/evaluate` | Evaluates hardware configuration across eligibility, geometric index, value, and fair price |
| `POST` | `/api/evaluation/recommend` | Discovers and ranks configurations using vector-normalized TOPSIS with budget pre-filtering |
| `POST` | `/api/evaluation/compare` | Compares 2 to 4 builds side-by-side with TOPSIS closeness and category winners |
| `GET` | `/api/evaluation/config` | Returns active workload weights $\alpha(w,j)$, baselines, and policy thresholds |
| `GET` | `/api/evaluation/benchmarks`| Returns verified CPU/GPU/RAM/SSD reference benchmark databases |
| `GET` | `/api/evaluation/metrics` | Returns holdout metrics, price regressor benchmarks, and synthetic supervision disclosure |
| `GET` | `/api/evaluation/status` | Real-time health and component status check of the evaluation engine |

---

## 🧪 Testing

Run the full evaluation test suite with known hand-calculated mathematical verifications:

```powershell
$env:PYTHONPATH="backend"
python -m pytest backend/tests/test_evaluation_engine.py -v
```

All 9 test suites verify:
1. Workload weights sum to 1.0.
2. Geometric performance index against exact hand-calculated logarithms.
3. Deterministic mandatory checks (budget, RAM, dedicated GPU).
4. AM5 and LGA architecture compatibility.
5. Strict non-mixed device type segregation in peer value queries.
6. Hand-calculated TOPSIS matrix with Euclidean distance symmetry.
7. Budget pre-filtering (zero over-budget recommendations).
8. Graceful `INSUFFICIENT_DATA` handling when evidence is missing.
9. End-to-end evaluation orchestrator pipeline.
