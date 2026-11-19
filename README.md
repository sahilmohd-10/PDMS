# HIRS — Hardware Intelligence & Recommendation System

> **Production-grade AI hardware intelligence platform** that predicts BUY/NOT BUY decisions and recommends optimal laptop and desktop PC configurations within strict budget ceilings.

---

## 🚀 Key Features

1. **BUY / NOT BUY Prediction Engine**:
   - Evaluates custom processor, RAM, SSD, GPU, and INR pricing.
   - Outputs calibrated BUY probability, confidence levels, and feature-level explanations.
   - Flags out-of-distribution hardware combinations and pricing anomalies.

2. **Intelligent Budget-Based Recommendations**:
   - Searches across 984,000+ indexed configurations.
   - **Strict Budget Ceiling**: 0.0% budget violation rate guaranteed (`price <= user_budget`).
   - Mapped to real workloads: *AI / Deep Learning*, *Gaming*, *Programming*, *Video Editing*, *Data Analytics*, *Office*, *General Purpose*.
   - Categorizes top candidates into **Best Overall**, **Best Value**, and **Best Performance**.

3. **Multi-Build Comparison**:
   - Compares 2 to 4 builds side-by-side with specification matrices and category winners.

4. **Hardware Catalogue Explorer**:
   - Fast, paginated search with price, RAM, and GPU filters.

5. **Model Transparency & Insights**:
   - Real holdout test evaluation metrics (99.82% Accuracy, 99.09% F1, 1.000 ROC-AUC).
   - Algorithm benchmark comparisons: LightGBM vs CatBoost vs Random Forest.
   - Feature attribution percentages and confusion matrix.

6. **Premium UI/UX Design System**:
   - Inspired by Apple, Linear, and Vercel.
   - Responsive layouts, dark/light mode persistence, accessible typography.

---

## 📁 Repository Structure

```
PDMS/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── api/routes.py            # REST API endpoints (/api/*)
│   │   ├── schemas/hardware.py      # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── prediction_service.py
│   │   │   ├── recommendation_service.py
│   │   │   └── dataset_service.py
│   ├── training/
│   │   ├── audit_dataset.py         # Full data quality audit script
│   │   ├── preprocess.py            # Feature engineering & catalogue builder
│   │   ├── train.py                 # Benchmarking & model training
│   │   └── evaluate.py              # Holdout evaluation script
│   ├── artifacts/                   # Serialized model, metadata, Parquet sets
│   ├── tests/
│   │   └── test_api.py              # Automated pytest suite (11/11 tests passing)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/layout/       # Navbar, Sidebar
│   │   ├── pages/                   # Landing, Dashboard, Recommendations,
│   │   │                            # Analyzer, Comparison, Explorer, Insights,
│   │   │                            # Dataset Quality, Settings
│   │   ├── services/api.ts          # Centralized API client
│   │   ├── types/index.ts           # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── index.css                # Tailwind CSS design tokens
│   ├── package.json
│   └── vite.config.ts
├── data/
│   └── README.md                    # Data provenance and schema overview
├── docs/
│   ├── architecture.md              # Technical system architecture
│   ├── model_card.md                # LightGBM model card and ethics
│   ├── dataset_report.md            # Data quality report
│   └── api_documentation.md        # API endpoint documentation
├── scripts/
│   ├── start_backend.bat            # Launches FastAPI server (port 8000)
│   ├── start_frontend.bat           # Launches React frontend (port 5173)
│   └── run_pipeline.bat             # End-to-end training pipeline
├── Dataset.csv                      # Source dataset (1,048,575 rows)
└── README.md
```

---

## ⚡ Quick Start

### 1. Start the Backend API Server
```powershell
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Start the Frontend Application
```powershell
cd frontend
npm install
npm run dev
```
Open your browser at: [http://localhost:5173](http://localhost:5173)

### 3. Run Automated Tests
```powershell
python -m pytest backend/tests/test_api.py -v
```

---

## 📊 Verified Model Benchmark Results

| Model | Val Accuracy | Val F1-Score | ROC-AUC | Training Time | Selection |
|---|---|---|---|---|---|
| **LightGBM** | **99.85%** | **0.9926** | **1.0000** | **2.4s** | ⭐ **Winner** |
| CatBoost | 99.40% | 0.9707 | 1.0000 | 9.87s | Benchmarked |
| Random Forest (Baseline) | 98.73% | 0.9397 | 0.9998 | 4.4s | Baseline |

### Holdout Test Metrics (Unseen 37,500 configs)
- **Accuracy**: 99.82%
- **Precision**: 98.66%
- **Recall**: 99.52%
- **F1 Score**: 99.09%
- **Brier Calibration Score**: 0.0014
- **Budget Violation Rate**: 0.0%

---

## 🌐 Live Deployment Guide

### A. Deploy Frontend to Vercel (1-Click)
1. Import `sahilmohd-10/PDMS` into Vercel.
2. Root Directory: `./` (pre-configured via `vercel.json`) or set to `frontend`.
3. Set Environment Variable:
   - `VITE_API_BASE`: URL of your deployed backend (e.g., `https://hirs-backend.onrender.com`).
4. Click **Deploy**.

### B. Deploy Backend to Render / Railway / Cloud
- **Render**: Connect the repository and select **Web Service**. Build Command: `pip install -r backend/requirements.txt`, Start Command: `python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT` (pre-configured via `render.yaml`).
- **Docker**: Build and run with:
  ```bash
  docker build -t hirs-backend .
  docker run -p 8000:8000 hirs-backend
  ```

### C. GitHub Pages (Automated CI/CD)
The repository includes `.github/workflows/deploy.yml`. When pushed, GitHub Actions builds and publishes the production frontend bundle to GitHub Pages. Enable Pages in **Settings > Pages > Build and deployment > Source: GitHub Actions**.

