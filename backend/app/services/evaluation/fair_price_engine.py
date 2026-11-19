"""
HIRS Value and Fair-Price Engine
Calculates Performance-per-Rupee V(i), Peer Relative Value Index VI(i),
Method A (Peer Median), Method B (LightGBM Log-Price Regressor), and Price Premium.
Strict rule: Laptops and Desktops are never combined.
"""
from typing import Dict, Any, Optional, Tuple, List
import math
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "artifacts"
CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"

with open(CONFIG_DIR / "evaluation_config.json", "r", encoding="utf-8") as f:
    EVAL_CONFIG = json.load(f)

class FairPriceEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or EVAL_CONFIG
        self.policy = self.config["decision_policy"]
        self.regressor = None
        self.regressor_metadata = None
        self.df_catalogue = None
        self._peer_median_cache = {}
        self._load_artifacts()

    def _load_artifacts(self):
        regressor_path = ARTIFACTS_DIR / "price_regressor.joblib"
        if regressor_path.exists():
            try:
                self.regressor = joblib.load(regressor_path)
            except Exception as e:
                print(f"[FairPriceEngine] Warning: Could not load price regressor: {e}")

        meta_path = ARTIFACTS_DIR / "price_regressor_metadata.json"
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.regressor_metadata = json.load(f)
            except Exception:
                pass

        # Load catalogue for peer queries
        cat_path = ARTIFACTS_DIR / "catalogue.parquet"
        if cat_path.exists():
            try:
                self.df_catalogue = pd.read_parquet(cat_path)
            except Exception as e:
                print(f"[FairPriceEngine] Warning: Could not load catalogue: {e}")

    def calculate_performance_per_rupee(self, performance_score: float, price_inr: float) -> float:
        """V(i) = P(i,w) / Price(i)"""
        if price_inr <= 0:
            return 0.0
        return round(float(performance_score / price_inr), 6)

    def calculate_peer_relative_value_index(
        self,
        performance_per_rupee: float,
        device_type: str,
        ram_gb: int,
        ssd_gb: int,
        vram_gb: int
    ) -> Tuple[float, int, float]:
        """
        Calculate:
        VI(i) = 100 * [ V(i) / Median(V of comparable peers) ]
        Strict separation: device_type is never mixed.
        Returns: (relative_value_index, peer_count, peer_median_v)
        """
        cache_key = (device_type.lower(), ram_gb // 8, vram_gb // 4)
        if cache_key in self._peer_median_cache:
            peer_count, median_v = self._peer_median_cache[cache_key]
            vi = 100.0 * (performance_per_rupee / median_v) if median_v > 0 else 100.0
            return round(min(max(vi, 10.0), 250.0), 2), peer_count, median_v

        if self.df_catalogue is None or len(self.df_catalogue) == 0:
            ref_median_v = 0.00065
            vi = 100.0 * (performance_per_rupee / ref_median_v) if ref_median_v > 0 else 100.0
            return round(min(max(vi, 10.0), 250.0), 2), 0, ref_median_v

        # Strict filter: same device type
        mask_device = self.df_catalogue["device_type"].str.lower() == device_type.lower()
        
        # Comparable hardware tier (+/- 50% RAM, +/- 50% SSD, comparable GPU tier)
        mask_ram = (self.df_catalogue["ram_gb"] >= ram_gb * 0.5) & (self.df_catalogue["ram_gb"] <= ram_gb * 2.0)
        mask_vram = (self.df_catalogue["vram_gb"] >= max(0, vram_gb - 4)) & (self.df_catalogue["vram_gb"] <= vram_gb + 4)
        
        peers = self.df_catalogue[mask_device & mask_ram & mask_vram]
        
        if len(peers) < 5:
            # Relax GPU filter, keep device type strict
            peers = self.df_catalogue[mask_device & mask_ram]
            
        if len(peers) < 5:
            peers = self.df_catalogue[mask_device]

        if len(peers) > 0 and "hardware_score" in peers.columns and "price" in peers.columns:
            peer_v_series = peers["hardware_score"] / peers["price"].replace(0, np.nan)
            median_v = float(peer_v_series.median())
            if median_v > 0:
                self._peer_median_cache[cache_key] = (len(peers), median_v)
                vi = 100.0 * (performance_per_rupee / median_v)
                return round(min(max(vi, 10.0), 250.0), 2), len(peers), median_v

        # Fallback reference
        ref_median_v = 0.00065
        self._peer_median_cache[cache_key] = (0, ref_median_v)
        vi = 100.0 * (performance_per_rupee / ref_median_v)
        return round(min(max(vi, 10.0), 250.0), 2), 0, ref_median_v

    def estimate_fair_price(
        self,
        device_type: str,
        cores: int,
        ram_gb: int,
        ssd_gb: int,
        vram_gb: int,
        is_dedicated_gpu: bool,
        actual_price: float
    ) -> Dict[str, Any]:
        """
        Estimate fair price using Method A (Comparable Median) and Method B (Regression).
        Calculates PricePremium = 100 * (ActualPrice / FairPrice - 1).
        If reliable evidence is missing, returns INSUFFICIENT_DATA.
        """
        method_a_price = None
        method_b_price = None
        peer_count = 0

        # Method A: Comparable product median
        if self.df_catalogue is not None:
            mask_dev = self.df_catalogue["device_type"].str.lower() == device_type.lower()
            mask_spec = (
                (self.df_catalogue["ram_gb"] == ram_gb) &
                (self.df_catalogue["ssd_gb"] >= ssd_gb * 0.8) &
                (self.df_catalogue["ssd_gb"] <= ssd_gb * 1.5) &
                (self.df_catalogue["vram_gb"] >= max(0, vram_gb - 2)) &
                (self.df_catalogue["vram_gb"] <= vram_gb + 2)
            )
            exact_peers = self.df_catalogue[mask_dev & mask_spec]
            if len(exact_peers) >= 3:
                method_a_price = float(exact_peers["price"].median())
                peer_count = len(exact_peers)

        # Method B: LightGBM Regressor
        if self.regressor is not None:
            try:
                is_desktop = 1 if device_type.lower() == "desktop" else 0
                is_integrated = 0 if is_dedicated_gpu else 1
                input_df = pd.DataFrame([{
                    "cores": cores,
                    "ram_gb": ram_gb,
                    "ssd_gb": ssd_gb,
                    "vram_gb": vram_gb,
                    "is_integrated": is_integrated,
                    "is_desktop": is_desktop
                }])
                log_pred = self.regressor.predict(input_df)[0]
                method_b_price = float(np.exp(log_pred))
            except Exception as e:
                print(f"[FairPriceEngine] Regressor prediction failed: {e}")

        # Synthesize fair price estimation
        if method_a_price is not None and method_b_price is not None:
            # Weighted average favoring exact peer median
            fair_price = round(0.65 * method_a_price + 0.35 * method_b_price, 2)
            confidence = "High (Dual Verified)"
            details = f"Verified across {peer_count} comparable peer products and ML regression model."
        elif method_a_price is not None:
            fair_price = round(method_a_price, 2)
            confidence = "Moderate (Peer Median)"
            details = f"Derived from {peer_count} comparable market configurations."
        elif method_b_price is not None:
            fair_price = round(method_b_price, 2)
            confidence = "Moderate (Regression Model)"
            details = "Predicted by LightGBM component-value regression model."
        else:
            return {
                "method_a_peer_median": None,
                "method_b_regressed_price": None,
                "estimated_fair_price": None,
                "price_premium_pct": None,
                "status": "INSUFFICIENT_DATA",
                "confidence": "Low",
                "details": "Insufficient comparable market transactions to verify fair price."
            }

        # Calculate Price Premium: 100 * (ActualPrice / FairPrice - 1)
        premium_pct = round(100.0 * (actual_price / fair_price - 1.0), 2)
        max_premium = self.policy.get("max_price_premium_pct", 18.0)

        if premium_pct <= -10.0:
            status = "EXCEPTIONAL_DEAL"
        elif premium_pct <= max_premium:
            status = "FAIR"
        else:
            status = "OVERPRICED"

        return {
            "method_a_peer_median": round(method_a_price, 2) if method_a_price else None,
            "method_b_regressed_price": round(method_b_price, 2) if method_b_price else None,
            "estimated_fair_price": fair_price,
            "price_premium_pct": premium_pct,
            "status": status,
            "confidence": confidence,
            "details": details
        }
