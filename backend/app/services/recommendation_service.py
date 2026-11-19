"""
HIRS Intelligent Hardware Recommendation Service
Implements strict budget filtering, workload-driven hardware constraints,
and composite scoring across BUY probability, hardware capability, and value.
"""
import os
import json
import polars as pl
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

WORKLOAD_REQUIREMENTS = {
    "Office / Productivity": {"min_cores": 4, "min_ram": 8, "min_ssd": 256, "min_vram": 0, "dedicated_gpu": False},
    "Programming": {"min_cores": 6, "min_ram": 16, "min_ssd": 512, "min_vram": 0, "dedicated_gpu": False},
    "Data Analytics": {"min_cores": 6, "min_ram": 16, "min_ssd": 512, "min_vram": 0, "dedicated_gpu": False},
    "Machine Learning": {"min_cores": 8, "min_ram": 32, "min_ssd": 512, "min_vram": 8, "dedicated_gpu": True},
    "AI / Deep Learning": {"min_cores": 8, "min_ram": 32, "min_ssd": 1000, "min_vram": 12, "dedicated_gpu": True, "preferred_gpu_brand": "NVIDIA"},
    "Gaming": {"min_cores": 6, "min_ram": 16, "min_ssd": 512, "min_vram": 8, "dedicated_gpu": True},
    "Video Editing": {"min_cores": 8, "min_ram": 32, "min_ssd": 1000, "min_vram": 8, "dedicated_gpu": True},
    "General Purpose": {"min_cores": 4, "min_ram": 8, "min_ssd": 256, "min_vram": 0, "dedicated_gpu": False}
}

class RecommendationService:
    def __init__(self, artifacts_dir: str = r"d:\Downloads\PDMS\backend\artifacts", prediction_service=None):
        self.artifacts_dir = artifacts_dir
        self.prediction_service = prediction_service
        self.catalogue_path = os.path.join(self.artifacts_dir, "catalogue.parquet")
        self.df_catalogue = None
        self.load_catalogue()

    def load_catalogue(self):
        if os.path.exists(self.catalogue_path):
            self.df_catalogue = pl.read_parquet(self.catalogue_path)
            print(f"[RecommendationService] Loaded {self.df_catalogue.shape[0]:,} catalogue candidates.")
        else:
            print(f"[RecommendationService] Warning: catalogue file not found at {self.catalogue_path}")

    def get_recommendations(
        self,
        budget_inr: float,
        device_type: str = "Desktop",
        workloads: Optional[List[str]] = None,
        min_ram_gb: Optional[int] = None,
        min_ssd_gb: Optional[int] = None,
        gpu_preference: Optional[str] = "Any",
        cpu_preference: Optional[str] = "Any",
        limit: int = 6
    ) -> Dict[str, Any]:
        if self.df_catalogue is None:
            self.load_catalogue()
            if self.df_catalogue is None:
                raise RuntimeError("Hardware catalogue is not loaded.")

        if not workloads:
            workloads = ["General Purpose"]

        # 1. Derive combined workload requirements
        req_cores = 4
        req_ram = 8
        req_ssd = 256
        req_vram = 0
        req_dedicated = False

        for w in workloads:
            spec = WORKLOAD_REQUIREMENTS.get(w, WORKLOAD_REQUIREMENTS["General Purpose"])
            req_cores = max(req_cores, spec["min_cores"])
            req_ram = max(req_ram, spec["min_ram"])
            req_ssd = max(req_ssd, spec["min_ssd"])
            req_vram = max(req_vram, spec["min_vram"])
            if spec.get("dedicated_gpu", False):
                req_dedicated = True

        # Explicit user overrides
        if min_ram_gb is not None:
            req_ram = max(req_ram, min_ram_gb)
        if min_ssd_gb is not None:
            req_ssd = max(req_ssd, min_ssd_gb)

        # 2. Strict Filter Execution
        # ALWAYS ENFORCE: price <= budget_inr (0% violation rate)
        query = (
            pl.col("price") <= budget_inr
        ) & (
            pl.col("cores") >= req_cores
        ) & (
            pl.col("ram_gb") >= req_ram
        ) & (
            pl.col("ssd_gb") >= req_ssd
        ) & (
            pl.col("vram_gb") >= req_vram
        )

        # Device type filter
        if device_type in ["Desktop", "Laptop"]:
            query = query & (pl.col("device_type") == device_type)

        # GPU preference filter
        if gpu_preference and "NVIDIA" in gpu_preference:
            query = query & (pl.col("gpu_brand") == "NVIDIA")
        elif gpu_preference and "AMD" in gpu_preference:
            query = query & (pl.col("gpu_brand") == "AMD")
        elif req_dedicated or (gpu_preference and "Dedicated" in gpu_preference):
            query = query & (pl.col("vram_gb") >= 4)

        # CPU preference filter
        if cpu_preference and "AMD" in cpu_preference:
            query = query & (pl.col("cpu_brand") == "AMD")
        elif cpu_preference and "Intel" in cpu_preference:
            query = query & (pl.col("cpu_brand") == "Intel")

        filtered = self.df_catalogue.filter(query)
        total_matched = filtered.shape[0]

        notice = None
        if device_type == "Laptop" and total_matched == 0:
            notice = (
                "Notice: The underlying dataset has only 99 laptop records. "
                "No laptop configuration met all combined constraints under this budget. "
                "Showing desktop alternatives or consider broadening filters."
            )
            # Fallback to Desktop if requested
            filtered = self.df_catalogue.filter(
                (pl.col("price") <= budget_inr) &
                (pl.col("ram_gb") >= min(req_ram, 16)) &
                (pl.col("ssd_gb") >= min(req_ssd, 512))
            )
            total_matched = filtered.shape[0]

        if total_matched == 0:
            # Relax to just budget and basic ram if budget is very tight
            filtered = self.df_catalogue.filter(
                (pl.col("price") <= budget_inr) &
                (pl.col("ram_gb") >= 8)
            )
            total_matched = filtered.shape[0]
            if total_matched > 0:
                notice = "Strict workload criteria exceeded budget. Showing best affordable entry configurations."

        if total_matched == 0:
            return {
                "budget_inr": budget_inr,
                "device_type": device_type,
                "workloads": workloads,
                "total_candidates_matched": 0,
                "recommendations": [],
                "applied_constraints": {
                    "min_cores": req_cores,
                    "min_ram_gb": req_ram,
                    "min_ssd_gb": req_ssd,
                    "min_vram_gb": req_vram,
                    "budget_ceiling_inr": budget_inr
                },
                "notice": f"No configuration found under ₹{budget_inr:,.0f} INR. Minimum catalogue price is ₹23,990."
            }

        # 3. Take top candidate sample and score with model
        candidate_sample = filtered.sort("value_score", descending=True).head(150).to_pandas()
        
        scored_items = []
        for idx, row in candidate_sample.iterrows():
            cpu_name = row["cpu_clean"]
            gpu_name = row["gpu_clean"]
            price = float(row["price"])
            cores = int(row["cores"])
            ram = int(row["ram_gb"])
            ssd = int(row["ssd_gb"])
            vram = int(row["vram_gb"])
            hw_score = float(row["hardware_score"])
            val_score = float(row["value_score"])

            # Compute actual model prediction
            if self.prediction_service:
                pred_res = self.prediction_service.predict(
                    cpu=f"{row['device_type']} | {cpu_name} | {cores} cores",
                    ram_gb=ram,
                    ssd_gb=ssd,
                    graphics=f"{gpu_name} | VRAM {vram} GB",
                    price_inr=price,
                    device_type=row["device_type"]
                )
                prob = pred_res["buy_probability"]
            else:
                prob = 0.5

            # Composite ranking score:
            # 40% BUY prob + 35% hardware performance + 25% value-for-money
            comp_score = (prob * 40.0) + (hw_score * 0.35) + (min(val_score, 100) * 0.25)

            scored_items.append({
                "id": f"hw-{idx}-{int(price)}",
                "name": f"{cpu_name} + {gpu_name} Build",
                "device_type": row["device_type"],
                "cpu": cpu_name,
                "cores": cores,
                "ram_gb": ram,
                "ram_type": row["ram_type"],
                "ssd_gb": ssd,
                "graphics": gpu_name,
                "vram_gb": vram,
                "price": price,
                "buy_probability": prob,
                "hardware_score": hw_score,
                "value_score": val_score,
                "composite_score": comp_score,
                "tag": "Recommended",
                "recommendation_reason": (
                    f"Balanced build featuring {cores} cores and {vram} GB {gpu_name} "
                    f"at ₹{price:,.0f} (saving ₹{budget_inr - price:,.0f} vs your budget)."
                )
            })

        # Sort by composite score
        scored_items.sort(key=lambda x: x["composite_score"], reverse=True)

        # Assign distinctive badges (Best Overall, Best Value, Best Performance)
        if len(scored_items) > 0:
            scored_items[0]["tag"] = "Best Overall"
            scored_items[0]["recommendation_reason"] = (
                f"Top overall balance of multi-core compute ({scored_items[0]['cores']} cores), "
                f"graphics power, and budget efficiency (₹{scored_items[0]['price']:,.0f})."
            )

        # Find best value (highest value_score)
        val_sorted = sorted(scored_items, key=lambda x: x["value_score"], reverse=True)
        if len(val_sorted) > 1 and val_sorted[0]["id"] != scored_items[0]["id"]:
            val_sorted[0]["tag"] = "Best Value"
            val_sorted[0]["recommendation_reason"] = (
                f"Highest hardware performance per Rupee spent (Value score: {val_sorted[0]['value_score']:.1f})."
            )

        # Find best raw performance (highest hardware_score)
        perf_sorted = sorted(scored_items, key=lambda x: x["hardware_score"], reverse=True)
        if len(perf_sorted) > 0 and perf_sorted[0]["id"] != scored_items[0]["id"]:
            perf_sorted[0]["tag"] = "Best Performance"
            perf_sorted[0]["recommendation_reason"] = (
                f"Maximum computing capability ({perf_sorted[0]['cores']} cores, {perf_sorted[0]['vram_gb']} GB VRAM) "
                f"fitting within your ₹{budget_inr:,.0f} budget."
            )

        # Assign ranks to top results
        top_results = scored_items[:limit]
        for i, item in enumerate(top_results, start=1):
            item["rank"] = i

        return {
            "budget_inr": budget_inr,
            "device_type": device_type,
            "workloads": workloads,
            "total_candidates_matched": total_matched,
            "recommendations": top_results,
            "applied_constraints": {
                "min_cores": req_cores,
                "min_ram_gb": req_ram,
                "min_ssd_gb": req_ssd,
                "min_vram_gb": req_vram,
                "budget_ceiling_inr": budget_inr,
                "dedicated_gpu_required": req_dedicated
            },
            "notice": notice
        }
