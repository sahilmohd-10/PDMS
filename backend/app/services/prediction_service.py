"""
HIRS Prediction Service
Performs feature extraction, model inference, out-of-distribution checks,
and generates explainable insights for individual hardware configurations.
"""
import os
import re
import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List

class PredictionService:
    def __init__(self, artifacts_dir: str = r"d:\Downloads\PDMS\backend\artifacts"):
        self.artifacts_dir = artifacts_dir
        self.bundle = None
        self.model = None
        self.encoder = None
        self.numeric_cols = []
        self.categorical_cols = []
        self.feature_cols = []
        self.load_model()
        
    def load_model(self):
        bundle_path = os.path.join(self.artifacts_dir, "best_model.joblib")
        if os.path.exists(bundle_path):
            self.bundle = joblib.load(bundle_path)
            self.model = self.bundle["model"]
            self.encoder = self.bundle["encoder"]
            self.numeric_cols = self.bundle["numeric_cols"]
            self.categorical_cols = self.bundle["categorical_cols"]
            self.feature_cols = self.bundle["feature_cols"]
            print(f"[PredictionService] Loaded model '{self.bundle.get('model_name')}' from {bundle_path}")
        else:
            print(f"[PredictionService] Warning: model bundle not found at {bundle_path}")

    @staticmethod
    def extract_cores_from_text(cpu_str: str) -> int:
        s = str(cpu_str)
        # Search for explicitly stated core count
        m = re.search(r"(\d+)\s*cores?", s, re.IGNORECASE)
        if m:
            return int(m.group(1))
        # Known family heuristics
        if re.search(r"Ryzen\s*9|Core\s*i9", s, re.IGNORECASE):
            return 16
        if re.search(r"Ryzen\s*7|Core\s*i7", s, re.IGNORECASE):
            return 8
        if re.search(r"Ryzen\s*5|Core\s*i5", s, re.IGNORECASE):
            return 6
        if re.search(r"Ryzen\s*3|Core\s*i3", s, re.IGNORECASE):
            return 4
        return 6

    @staticmethod
    def extract_vram_from_text(gpu_str: str) -> int:
        s = str(gpu_str)
        m = re.search(r"(\d+)\s*GB", s, re.IGNORECASE)
        if m:
            return int(m.group(1))
        if re.search(r"4090|3090", s):
            return 24
        if re.search(r"4080", s):
            return 16
        if re.search(r"4070|7800\s*XT", s):
            return 12
        if re.search(r"4060\s*Ti|3070|3060\s*Ti|6700|7600", s):
            return 8
        if re.search(r"4060|3060|7600", s):
            return 8
        if re.search(r"3050|1660|1650|6500", s):
            return 4
        if re.search(r"integrated|uhd|iris|radeon\s*graphics", s, re.IGNORECASE):
            return 0
        return 8

    @staticmethod
    def extract_brands(cpu_str: str, gpu_str: str):
        c = str(cpu_str).upper()
        cpu_brand = "AMD" if "AMD" in c or "RYZEN" in c else ("Intel" if "INTEL" in c or "CORE" in c else "Other")
        
        cpu_family = "Standard"
        for fam in ["Ryzen 9", "Ryzen 7", "Ryzen 5", "Ryzen 3", "Core i9", "Core i7", "Core i5", "Core i3", "Xeon", "Pentium"]:
            if fam.lower() in str(cpu_str).lower():
                cpu_family = fam
                break
                
        g = str(gpu_str).upper()
        gpu_brand = "NVIDIA" if ("NVIDIA" in g or "RTX" in g or "GTX" in g or "GEFORCE" in g) else (
            "AMD" if ("AMD" in g or "RADEON" in g or "RX" in g) else ("Intel" if ("INTEL" in g or "ARC" in g) else "Other")
        )
        return cpu_brand, cpu_family, gpu_brand

    def predict(
        self,
        cpu: str,
        ram_gb: int,
        ssd_gb: int,
        graphics: str,
        price_inr: float,
        device_type: str = "Desktop"
    ) -> Dict[str, Any]:
        if self.model is None:
            self.load_model()
            if self.model is None:
                raise RuntimeError("ML model is not loaded. Train the model first.")

        cores = self.extract_cores_from_text(cpu)
        vram_gb = self.extract_vram_from_text(graphics)
        cpu_brand, cpu_family, gpu_brand = self.extract_brands(cpu, graphics)
        ram_type = "DDR5" if ram_gb >= 32 else "DDR4"

        # Derived metrics
        price_per_core = round(price_inr / max(cores, 1), 2)
        price_per_ram = round(price_inr / max(ram_gb, 1), 2)
        price_per_vram = round(price_inr / max(vram_gb, 1), 2)
        storage_to_ram = round(ssd_gb / max(ram_gb, 1), 2)
        
        hardware_score = round(
            (cores / 24.0) * 30.0 +
            (min(ram_gb, 128) / 128.0) * 25.0 +
            (min(ssd_gb, 4000) / 4000.0) * 15.0 +
            (min(vram_gb, 24) / 24.0) * 30.0,
            2
        )
        value_score = round(hardware_score / (price_inr / 100000.0), 2)

        # Assemble dataframe
        row_dict = {
            "cores": float(cores),
            "ram_gb": float(ram_gb),
            "ssd_gb": float(ssd_gb),
            "vram_gb": float(vram_gb),
            "PRICE": float(price_inr),
            "price_per_core": float(price_per_core),
            "price_per_ram_gb": float(price_per_ram),
            "price_per_vram_gb": float(price_per_vram),
            "storage_to_ram_ratio": float(storage_to_ram),
            "hardware_score": float(hardware_score),
            "value_score": float(value_score)
        }
        X = pd.DataFrame([row_dict])
        
        # Categorical encoding
        cat_df = pd.DataFrame([{
            "device_type": device_type,
            "cpu_brand": cpu_brand,
            "cpu_family": cpu_family,
            "gpu_brand": gpu_brand,
            "ram_type": ram_type
        }])
        encoded_cats = self.encoder.transform(cat_df)
        for i, col in enumerate(self.categorical_cols):
            X[col] = encoded_cats[:, i]

        # Model inference
        prob = float(self.model.predict_proba(X)[0, 1])
        prediction_code = 1 if prob >= 0.5 else 0
        prediction_str = "BUY" if prediction_code == 1 else "NOT BUY"

        # Out-of-distribution detection
        ood_reasons = []
        if price_inr < 20000 or price_inr > 700000:
            ood_reasons.append("Price is outside typical dataset bounds (₹24k to ₹570k).")
        if cores > 32:
            ood_reasons.append(f"Core count ({cores}) is higher than common desktop distribution.")
        if vram_gb > 32:
            ood_reasons.append("VRAM exceeds consumer GPU bounds.")
        if cpu_brand == "Other" and gpu_brand == "Other":
            ood_reasons.append("Unrecognized CPU and GPU architecture.")
        is_ood = len(ood_reasons) > 0

        # Confidence categorization
        dist_from_threshold = abs(prob - 0.5)
        if dist_from_threshold >= 0.35 and not is_ood:
            confidence = "High"
        elif dist_from_threshold >= 0.15:
            confidence = "Moderate"
        else:
            confidence = "Uncertain"

        # Price Assessment
        if price_inr < 100000:
            price_tier = "Budget to Entry-Midrange Tier"
        elif price_inr < 180000:
            price_tier = "Balanced Mid-High Performance Tier"
        elif price_inr < 280000:
            price_tier = "Premium Enthusiast Tier"
        else:
            price_tier = "High-End Flagship / Workstation Tier"

        # Explainability feature contributions
        contributions = []
        if cores >= 8:
            contributions.append({
                "feature": f"CPU Cores ({cores} Cores)",
                "impact": "Positive",
                "description": "Ample multi-threaded compute capability strongly pushes toward a BUY decision."
            })
        elif cores <= 4:
            contributions.append({
                "feature": f"CPU Cores ({cores} Cores)",
                "impact": "Negative",
                "description": "Cores below 6 are strictly penalized by the recommendation model."
            })

        if vram_gb >= 8:
            contributions.append({
                "feature": f"Dedicated VRAM ({vram_gb} GB)",
                "impact": "Positive",
                "description": "High GPU memory bandwidth suitable for modern workloads and gaming."
            })
        elif vram_gb < 6:
            contributions.append({
                "feature": f"VRAM Capacity ({vram_gb} GB)",
                "impact": "Negative",
                "description": "Low or integrated GPU memory restricts advanced workflows."
            })

        if value_score >= 40.0:
            contributions.append({
                "feature": "Value-for-Money Ratio",
                "impact": "Positive",
                "description": f"Excellent hardware score ({hardware_score}/100) relative to ₹{price_inr:,.0f} price."
            })
        elif price_inr > 280000:
            contributions.append({
                "feature": "Price Bracket",
                "impact": "Negative",
                "description": f"Price ₹{price_inr:,.0f} exceeds typical sweet spot, lowering value-for-money."
            })

        # Narrative explanation
        if prediction_code == 1:
            explanation = (
                f"The configuration presents a strong value proposition with {cores} cores, "
                f"{ram_gb} GB RAM, and a {graphics} ({vram_gb} GB VRAM) for ₹{price_inr:,.0f}. "
                f"The model estimates a {prob*100:.1f}% BUY probability with a value score of {value_score}."
            )
        else:
            reasons = []
            if cores < 6:
                reasons.append(f"limited CPU cores ({cores})")
            if vram_gb < 6:
                reasons.append(f"low graphics VRAM ({vram_gb} GB)")
            if price_inr > 240000:
                reasons.append(f"high price point relative to hardware")
            weakness_str = ", ".join(reasons) if reasons else "sub-optimal component balancing"
            explanation = (
                f"The model evaluated this build as NOT BUY ({prob*100:.1f}% probability) "
                f"primarily due to {weakness_str}. Better value alternatives are available within this budget."
            )

        limitations = (
            "Model predictions are trained on synthetic hardware combinations and rule-derived labels. "
            "Evaluate physical compatibility, current street prices, and independent real-world benchmarks before making purchasing decisions."
        )

        return {
            "prediction": prediction_str,
            "prediction_code": prediction_code,
            "buy_probability": round(prob, 4),
            "confidence_level": confidence,
            "price_assessment": f"{price_tier} (₹{price_inr:,.2f})",
            "hardware_score": hardware_score,
            "value_score": value_score,
            "feature_contributions": contributions,
            "is_out_of_distribution": is_ood,
            "explanation": explanation,
            "limitations_notice": limitations
        }
