"""
HIRS Evaluation Orchestrator
Coordinates:
1. Product & Data Validation
2. Eligibility Engine (PASS/FAIL/UNKNOWN)
3. Performance Engine (Geometric Mean P(i,w))
4. Fair Price & Value Engine (V(i), VI(i), PricePremium)
5. Decision Engine (BUY, NOT BUY, INSUFFICIENT_DATA)
6. TOPSIS Recommendation Ranking
7. ML Prediction & Explanations
"""
from typing import Dict, Any, List, Optional
import json
from pathlib import Path

from app.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    DecisionOutcome,
    EligibilityReport,
    EligibilityCheckDetail,
    BenchmarkRatioDetail,
    FairPriceAssessment,
    MLSupportAssessment,
    EvaluationExplanation,
    EvaluationRecommendRequest,
    EvaluationRecommendResponse,
    RecommendationCandidate,
    EvaluationCompareRequest,
    EvaluationCompareResponse
)
from app.services.evaluation.performance_engine import PerformanceEngine
from app.services.evaluation.eligibility_engine import EligibilityEngine
from app.services.evaluation.fair_price_engine import FairPriceEngine
from app.services.evaluation.decision_engine import DecisionEngine
from app.services.evaluation.topsis_engine import TopsisEngine
from app.services.prediction_service import prediction_service

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"
with open(CONFIG_DIR / "evaluation_config.json", "r", encoding="utf-8") as f:
    EVAL_CONFIG = json.load(f)

class EvaluationOrchestrator:
    def __init__(self):
        self.config = EVAL_CONFIG
        self.performance_engine = PerformanceEngine(self.config)
        self.eligibility_engine = EligibilityEngine(self.config)
        self.fair_price_engine = FairPriceEngine(self.config)
        self.decision_engine = DecisionEngine(self.config)
        self.topsis_engine = TopsisEngine(self.config.get("topsis_weights"))

    def evaluate(self, req: EvaluationRequest) -> EvaluationResponse:
        """Complete evaluation pipeline for a hardware configuration."""
        workload_str = req.workload.value if hasattr(req.workload, "value") else str(req.workload or "Gaming")
        device_type = req.device_type or "Desktop"
        
        # 1. Resolve Benchmark Scores
        cpu_score, cpu_name = self.performance_engine.resolve_cpu_score(req.cpu)
        gpu_score, gpu_name, is_dedicated = self.performance_engine.resolve_gpu_score(req.graphics)
        vram_gb = 8  # fallback heuristic if not parsed
        if gpu_name and "vram" in gpu_name.lower():
            import re
            m = re.search(r'(\d+)\s*gb', gpu_name.lower())
            if m:
                vram_gb = int(m.group(1))
        elif is_dedicated:
            # Check benchmarks DB for card
            for _, gdata in self.performance_engine.benchmarks["gpus"].items():
                if gdata.get("name") == gpu_name:
                    vram_gb = gdata.get("vram_gb", 8)
                    break
        else:
            vram_gb = 0

        ram_bandwidth = self.performance_engine.resolve_ram_bandwidth(req.ram_generation, "")
        ssd_speed = self.performance_engine.resolve_ssd_throughput(req.ssd_interface, "")

        # 2. Performance Scoring: P(i,w) = 100 * exp( sum( alpha * ln(R) ) )
        perf_score, ratio_details, evidence_completeness = self.performance_engine.calculate_performance_score(
            cpu_score=cpu_score,
            gpu_score=gpu_score,
            ram_bandwidth_mbps=ram_bandwidth,
            ssd_throughput_mbps=ssd_speed,
            workload=workload_str
        )

        # 3. Eligibility Checks
        elig_dict = self.eligibility_engine.check_eligibility(
            cpu_name=req.cpu,
            cpu_score=cpu_score,
            ram_gb=req.ram_gb,
            ram_generation=req.ram_generation,
            ssd_gb=req.ssd_gb,
            gpu_name=req.graphics,
            gpu_score=gpu_score,
            vram_gb=vram_gb,
            is_dedicated_gpu=is_dedicated,
            price_inr=req.price_inr,
            user_budget_inr=req.user_budget_inr,
            workload=workload_str,
            device_type=device_type,
            product_condition=req.product_condition,
            warranty_months=req.warranty_months
        )

        # 4. Performance-per-rupee & Value Index
        v_per_rupee = self.fair_price_engine.calculate_performance_per_rupee(perf_score, req.price_inr)
        vi, peer_count, peer_median_v = self.fair_price_engine.calculate_peer_relative_value_index(
            performance_per_rupee=v_per_rupee,
            device_type=device_type,
            ram_gb=req.ram_gb,
            ssd_gb=req.ssd_gb,
            vram_gb=vram_gb
        )

        # 5. Fair Price Estimation
        cores_est = 8
        if cpu_name:
            for _, cdata in self.performance_engine.benchmarks["cpus"].items():
                if cdata.get("name") == cpu_name:
                    cores_est = cdata.get("cores", 8)
                    break
        fair_price_dict = self.fair_price_engine.estimate_fair_price(
            device_type=device_type,
            cores=cores_est,
            ram_gb=req.ram_gb,
            ssd_gb=req.ssd_gb,
            vram_gb=vram_gb,
            is_dedicated_gpu=is_dedicated,
            actual_price=req.price_inr
        )

        # 6. Final Decision Policy
        decision_str, decision_code, explanation_dict = self.decision_engine.evaluate_decision(
            eligibility_report=elig_dict,
            performance_score=perf_score,
            relative_value_index=vi,
            fair_price_report=fair_price_dict,
            evidence_completeness=evidence_completeness,
            workload=workload_str
        )

        # 7. ML Support Model
        ml_prob = None
        ml_confidence = "Moderate"
        feat_contribs = []
        try:
            # Query existing ML model for supporting prediction
            ml_pred = prediction_service.predict(
                cpu=req.cpu,
                ram_gb=req.ram_gb,
                ssd_gb=req.ssd_gb,
                graphics=req.graphics,
                price_inr=req.price_inr,
                device_type=device_type
            )
            ml_prob = ml_pred.get("buy_probability")
            ml_confidence = ml_pred.get("confidence_level", "Moderate")
            feat_contribs = ml_pred.get("feature_contributions", [])
        except Exception as e:
            print(f"[EvaluationOrchestrator] ML Support call note: {e}")

        # Assemble typed response
        benchmark_ratios_typed = {
            k: BenchmarkRatioDetail(**v) for k, v in ratio_details.items()
        }
        
        eligibility_typed = EligibilityReport(
            overall_status=elig_dict["overall_status"],
            mandatory_passed=elig_dict["mandatory_passed"],
            checks=[EligibilityCheckDetail(**c) for c in elig_dict["checks"]]
        )

        fair_price_typed = FairPriceAssessment(
            method_a_peer_median=fair_price_dict.get("method_a_peer_median"),
            method_b_regressed_price=fair_price_dict.get("method_b_regressed_price"),
            estimated_fair_price=fair_price_dict.get("estimated_fair_price"),
            price_premium_pct=fair_price_dict.get("price_premium_pct"),
            status=fair_price_dict.get("status", "UNKNOWN"),
            confidence=fair_price_dict.get("confidence", "Moderate"),
            details=fair_price_dict.get("details", "")
        )

        ml_support_typed = MLSupportAssessment(
            buy_probability=ml_prob,
            model_confidence=ml_confidence,
            feature_contributions=feat_contribs
        )

        explanation_typed = EvaluationExplanation(
            summary=explanation_dict["summary"],
            reasons=explanation_dict["reasons"],
            warnings=explanation_dict["warnings"],
            missing_evidence=explanation_dict["missing_evidence"]
        )

        detailed_metrics = {
            "resolved_cpu": cpu_name,
            "resolved_gpu": gpu_name,
            "resolved_vram_gb": vram_gb,
            "is_dedicated_gpu": is_dedicated,
            "ram_bandwidth_mbps": ram_bandwidth,
            "ssd_speed_mbps": ssd_speed,
            "comparable_peers_count": peer_count,
            "peer_median_value_ratio": peer_median_v,
            "evidence_completeness_pct": round(evidence_completeness * 100, 1),
            "formula": "P(i,w) = 100 * exp( sum( alpha_j * ln(Score_j / Ref_j) ) )",
            "weights_used": self.config["workload_weights"].get(workload_str)
        }

        return EvaluationResponse(
            decision=DecisionOutcome(decision_str),
            decision_code=decision_code,
            workload=workload_str,
            performance_score=perf_score,
            benchmark_ratios=benchmark_ratios_typed,
            performance_per_rupee=v_per_rupee,
            relative_value_index=vi,
            fair_price_assessment=fair_price_typed,
            eligibility=eligibility_typed,
            ml_support=ml_support_typed,
            explanation=explanation_typed,
            evidence_completeness=evidence_completeness,
            detailed_evaluation_metrics=detailed_metrics
        )

    def recommend(self, req: EvaluationRecommendRequest) -> EvaluationRecommendResponse:
        """TOPSIS multi-criteria recommendations with strict pre-budget filtering."""
        workload_str = req.workload.value if hasattr(req.workload, "value") else str(req.workload or "Gaming")
        device_type = req.device_type or "Desktop"
        limit = req.limit or 6

        # Fetch candidate hardware from dataset catalogue
        df_cat = self.fair_price_engine.df_catalogue
        if df_cat is None or len(df_cat) == 0:
            return EvaluationRecommendResponse(
                budget_inr=req.budget_inr,
                device_type=device_type,
                workload=workload_str,
                total_candidates_evaluated=0,
                eligible_candidates_count=0,
                ranked_candidates=[],
                topsis_weights_used=self.config.get("topsis_weights", {}).get("balanced", {}),
                methodology_note="No catalogue candidates available."
            )

        # 1. STRICT PRE-FILTERING: Budget and Device Type
        mask = (df_cat["price"] <= req.budget_inr)
        if device_type.lower() != "all":
            mask &= (df_cat["device_type"].str.lower() == device_type.lower())

        if req.min_ram_gb:
            mask &= (df_cat["ram_gb"] >= req.min_ram_gb)
        if req.min_ssd_gb:
            mask &= (df_cat["ssd_gb"] >= req.min_ssd_gb)
        if req.min_vram_gb:
            mask &= (df_cat["vram_gb"] >= req.min_vram_gb)

        filtered_df = df_cat[mask]
        total_eval = len(filtered_df)

        if total_eval == 0:
            return EvaluationRecommendResponse(
                budget_inr=req.budget_inr,
                device_type=device_type,
                workload=workload_str,
                total_candidates_evaluated=0,
                eligible_candidates_count=0,
                ranked_candidates=[],
                topsis_weights_used=self.config.get("topsis_weights", {}).get("balanced", {}),
                methodology_note=f"No configurations satisfied all criteria within ₹{req.budget_inr:,.0f} budget."
            )

        # Take up to 50 top candidates for full multi-criteria evaluation
        sample_candidates = filtered_df.sort_values(by="hardware_score", ascending=False).head(50)
        evaluated_candidates = []

        for _, row in sample_candidates.iterrows():
            cpu_display = str(row.get("cpu_clean") or row.get("CPU") or "Processor")
            gpu_display = str(row.get("gpu_clean") or row.get("GRAPHICS") or "Graphics")
            c_perf, _, _ = self.performance_engine.calculate_performance_score(
                cpu_score=row.get("hardware_score", 50.0) * 400.0,
                gpu_score=row.get("vram_gb", 4) * 1800.0,
                ram_bandwidth_mbps=self.performance_engine.resolve_ram_bandwidth(row.get("ram_type", "DDR4")),
                ssd_throughput_mbps=3500.0,
                workload=workload_str
            )
            v_val = self.fair_price_engine.calculate_performance_per_rupee(c_perf, row["price"])
            vi_val, _, _ = self.fair_price_engine.calculate_peer_relative_value_index(
                performance_per_rupee=v_val,
                device_type=row.get("device_type", "Desktop"),
                ram_gb=int(row.get("ram_gb", 16)),
                ssd_gb=int(row.get("ssd_gb", 512)),
                vram_gb=int(row.get("vram_gb", 4))
            )

            evaluated_candidates.append({
                "id": str(row.get("id", f"HW-{len(evaluated_candidates)+1}")),
                "name": f"{cpu_display} | {gpu_display}",
                "device_type": row.get("device_type", "Desktop"),
                "cpu": cpu_display,
                "cores": int(row.get("cores", 8)),
                "ram_gb": int(row.get("ram_gb", 16)),
                "ram_type": row.get("ram_type", "DDR4"),
                "ssd_gb": int(row.get("ssd_gb", 512)),
                "graphics": gpu_display,
                "vram_gb": int(row.get("vram_gb", 4)),
                "price_inr": float(row["price"]),
                "performance_score": c_perf,
                "relative_value_index": vi_val,
                "price_premium_pct": 0.0,
                "eligibility_status": "PASS"
            })

        # 2. Run TOPSIS MCDA engine
        best_perf, best_val, best_bal, ranked = self.topsis_engine.select_categorized_recommendations(evaluated_candidates)

        ranked_output = [RecommendationCandidate(**c) for c in ranked[:limit]]
        best_perf_candidate = RecommendationCandidate(**best_perf) if best_perf else None
        best_val_candidate = RecommendationCandidate(**best_val) if best_val else None
        best_bal_candidate = RecommendationCandidate(**best_bal) if best_bal else None

        return EvaluationRecommendResponse(
            budget_inr=req.budget_inr,
            device_type=device_type,
            workload=workload_str,
            total_candidates_evaluated=total_eval,
            eligible_candidates_count=len(evaluated_candidates),
            best_performance=best_perf_candidate,
            best_value=best_val_candidate,
            best_balanced=best_bal_candidate,
            ranked_candidates=ranked_output,
            topsis_weights_used=self.config.get("topsis_weights", {}).get("balanced", {}),
            methodology_note=(
                "Candidates pre-filtered by budget. Vector-normalized TOPSIS ranked across "
                "performance index, relative value index, price cost, and memory capacities."
            )
        )

    def compare(self, req: EvaluationCompareRequest) -> EvaluationCompareResponse:
        """Compares multiple configurations using workload performance and TOPSIS closeness."""
        workload_str = req.workload.value if hasattr(req.workload, "value") else str(req.workload or "Gaming")
        evaluated_items = [self.evaluate(item) for item in req.candidates]
        
        # Prepare for TOPSIS comparison
        topsis_candidates = []
        for i, item in enumerate(evaluated_items):
            topsis_candidates.append({
                "id": f"Config-{i+1}",
                "performance_score": item.performance_score,
                "relative_value_index": item.relative_value_index,
                "price_inr": req.candidates[i].price_inr,
                "ram_gb": req.candidates[i].ram_gb,
                "ssd_gb": req.candidates[i].ssd_gb
            })

        ranked = self.topsis_engine.rank_candidates(topsis_candidates, "balanced")
        
        # Determine category winners
        best_perf_idx = max(range(len(evaluated_items)), key=lambda i: evaluated_items[i].performance_score)
        best_val_idx = max(range(len(evaluated_items)), key=lambda i: evaluated_items[i].relative_value_index)
        best_price_idx = min(range(len(req.candidates)), key=lambda i: req.candidates[i].price_inr)
        best_overall_idx = int(ranked[0]["id"].split("-")[1]) - 1

        category_winners = {
            "Best Performance": f"Option {best_perf_idx + 1} ({req.candidates[best_perf_idx].cpu})",
            "Best Value": f"Option {best_val_idx + 1} (VI: {evaluated_items[best_val_idx].relative_value_index:.1f})",
            "Lowest Price": f"Option {best_price_idx + 1} (₹{req.candidates[best_price_idx].price_inr:,.0f})",
            "Best Balanced Choice (TOPSIS Winner)": f"Option {best_overall_idx + 1}"
        }

        summary = (
            f"Compared {len(evaluated_items)} configurations for '{workload_str}'. "
            f"Option {best_overall_idx + 1} scored highest in TOPSIS relative closeness ({ranked[0]['topsis_score']:.3f}), "
            "striking the best balance between speed, value, and price efficiency."
        )

        return EvaluationCompareResponse(
            workload=workload_str,
            evaluated_items=evaluated_items,
            topsis_rankings=ranked,
            category_winners=category_winners,
            comparison_summary=summary
        )

evaluation_orchestrator = EvaluationOrchestrator()
