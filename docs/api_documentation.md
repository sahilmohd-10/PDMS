# HIRS REST API Documentation

The HIRS backend is built on FastAPI and serves RESTful endpoints on `http://127.0.0.1:8000`.

## Endpoints

### 1. `POST /api/predict`
Evaluates whether a hardware configuration is worth buying.

**Request Payload:**
```json
{
  "cpu": "AMD Ryzen 7 7800X3D",
  "ram_gb": 32,
  "ssd_gb": 1000,
  "graphics": "NVIDIA GeForce RTX 4070",
  "price_inr": 145000.0,
  "device_type": "Desktop"
}
```

**Response Payload:**
```json
{
  "prediction": "BUY",
  "prediction_code": 1,
  "buy_probability": 0.9942,
  "confidence_level": "High",
  "price_assessment": "Balanced Mid-High Performance Tier (₹145,000.00)",
  "hardware_score": 62.15,
  "value_score": 42.86,
  "feature_contributions": [
    {
      "feature": "CPU Cores (8 Cores)",
      "impact": "Positive",
      "description": "Ample multi-threaded compute capability strongly pushes toward a BUY decision."
    }
  ],
  "is_out_of_distribution": false,
  "explanation": "The configuration presents a strong value proposition with 8 cores...",
  "limitations_notice": "Model predictions are trained on synthetic hardware combinations..."
}
```

### 2. `POST /api/recommend`
Retrieves and ranks top recommendations strictly within the user's budget ceiling.

**Request Payload:**
```json
{
  "budget_inr": 150000.0,
  "device_type": "Desktop",
  "workload": ["Gaming", "Machine Learning"],
  "min_ram_gb": 16,
  "min_ssd_gb": 512,
  "gpu_preference": "Dedicated GPU",
  "cpu_preference": "AMD",
  "limit": 6
}
```

**Guarantee**: `all(item.price <= budget_inr for item in recommendations)` (Budget violation rate: 0.0%).

### 3. `POST /api/compare`
Compares 2 to 4 builds side-by-side and returns category winners.

### 4. `GET /api/model/metrics`
Returns verified evaluation metrics, confusion matrix, and benchmark comparisons.

### 5. `GET /api/model/status`
Returns current model deployment status and training metadata.

### 6. `GET /api/dataset/summary`
Returns dataset summary metrics, missing value audits, and class distribution counts.

### 7. `GET /api/hardware/explore`
Search, filter by price, RAM, GPU, and paginate through the 984,000+ candidate catalogue.
