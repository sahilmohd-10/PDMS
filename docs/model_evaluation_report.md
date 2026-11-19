# HIRS Machine Learning Evaluation & Model Benchmark Report

**Document Version:** 1.0.0  
**Target Architecture:** Hardware Intelligence & Recommendation System (HIRS)  
**Evaluation Scope:** Classification (Purchase Decision Support) & Regression (Fair-Price Estimation)  

---

## 1. Critical Disclosure: Synthetic Rule-Derived Supervision

> [!WARNING]
> **Synthetic Supervision Disclosure**:  
> The binary `BUY` labels in `Dataset.csv` were originally generated through programmatic heuristic rules (e.g., combinations of price ceilings, core counts, and component ratios), rather than empirical customer checkout records or human transactional telemetry.
>
> Consequently:
> 1. The classification models benchmarked below are learning the underlying synthetic rule boundaries rather than authentic consumer sentiment or market psychology.
> 2. Machine learning is strictly deployed in HIRS as a **supporting analytical component** to provide probability estimates and feature importance attribution.
> 3. Mandatory hardware eligibility, deterministic compatibility, normalized benchmark performance, and peer-relative value indices remain the primary decision drivers.

---

## 2. Classifier Benchmark Matrix (Holdout Test Set: 37,500 records)

Three model architectures were benchmarked under identical group-aware stratified splits:

| Architecture | Accuracy | Precision | Recall | F1 Score | ROC-AUC | PR-AUC | Brier Score | Training Time |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Random Forest (Baseline)** | 98.73% | 88.75% | 99.84% | 0.9397 | 0.9998 | 0.9979 | 0.0083 | 4.40s |
| **CatBoost Classifier** | 99.40% | 94.30% | 100.00% | 0.9707 | 1.0000 | 0.9997 | 0.0039 | 9.87s |
| **LightGBM Classifier (Selected)** | **99.85%** | **98.82%** | **99.70%** | **0.9926** | **1.0000** | **0.9999** | **0.0011** | **2.40s** |

### Confusion Matrix (LightGBM Champion)
- **True Negatives (TN):** 33,751
- **False Positives (FP):** 44 (0.13% error)
- **False Negatives (FN):** 11 (0.03% error)
- **True Positives (TP):** 3,694

---

## 3. Fair-Price Regression Model (Method B)

To determine whether a product is overpriced or fairly priced, a dedicated **LightGBM Regressor** was trained on log-transformed prices ($\ln(\text{PRICE})$) across 150,000 hardware configurations:

- **Target:** $\ln(\text{PRICE})$
- **Features:** CPU Cores, RAM (GB), SSD (GB), GPU VRAM (GB), Integrated GPU Flag, Device Type (Desktop/Laptop)
- **Mean Absolute Error (MAE):** ₹31,800.33
- **Root Mean Squared Error (RMSE):** ₹41,732.51
- **Median Absolute Percentage Error (MAPE):** 15.81%
- **Artifact Path:** `backend/artifacts/price_regressor.joblib`

### Price Premium Formula
$$\text{PricePremium} = 100 \times \left( \frac{\text{ActualPrice}}{\text{FairPrice}} - 1 \right)$$

- $\text{PricePremium} \le -10\%$: Exceptional Deal
- $-10\% < \text{PricePremium} \le +18\%$: Fair Market Price
- $\text{PricePremium} > +18\%$: Overpriced

---

## 4. SHAP Feature Attribution & Interpretability

TreeSHAP analysis confirms the primary feature drivers:
1. `price_per_ram_gb`: Dominant driver of negative classification when memory pricing is exorbitant.
2. `hardware_score`: Positive driver of recommendation eligibility.
3. `value_score`: Direct correlate of high performance-per-rupee.
4. `vram_gb`: Critical determinant for gaming and deep learning suitability.
