"""
HIRS Final BUY / NOT BUY Decision Policy Engine
Evaluates:
1. Mandatory eligibility checks (PASS / FAIL / UNKNOWN)
2. Workload performance threshold
3. Peer relative value index
4. Fair-price upper bound / price premium
5. Critical evidence completeness
Outcomes: BUY (1), NOT BUY (0), INSUFFICIENT_DATA (-1).
"""
from typing import Dict, Any, List, Optional, Tuple
import json
from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"

with open(CONFIG_DIR / "evaluation_config.json", "r", encoding="utf-8") as f:
    EVAL_CONFIG = json.load(f)

class DecisionEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or EVAL_CONFIG
        self.policy = self.config["decision_policy"]

    def evaluate_decision(
        self,
        eligibility_report: Dict[str, Any],
        performance_score: float,
        relative_value_index: float,
        fair_price_report: Dict[str, Any],
        evidence_completeness: float,
        workload: str = "Gaming"
    ) -> Tuple[str, int, Dict[str, Any]]:
        """
        Synthesizes all quantitative signals into BUY, NOT BUY, or INSUFFICIENT_DATA.
        Returns: (decision_string, decision_code, explanation_dict)
        """
        reasons: List[str] = []
        warnings: List[str] = []
        missing_evidence: List[str] = []

        mandatory_passed = eligibility_report["mandatory_passed"]
        overall_eligibility = eligibility_report["overall_status"]
        checks = eligibility_report["checks"]

        # Audit missing evidence from checks
        for c in checks:
            if c["status"] == "UNKNOWN":
                missing_evidence.append(f"{c['name']}: {c['message']}")
            elif c["status"] == "FAIL":
                reasons.append(f"Disqualification: {c['message']}")

        # 1. Deterministic mandatory check failure -> definitive NOT BUY
        if not mandatory_passed:
            decision = "NOT BUY"
            decision_code = 0
            summary = (
                f"Evaluation: NOT BUY. The hardware fails mandatory requirements for {workload}. "
                "Hardware bottlenecks or incompatibility preclude a purchase recommendation."
            )
            return decision, decision_code, {
                "summary": summary,
                "reasons": reasons,
                "warnings": warnings,
                "missing_evidence": missing_evidence
            }

        # 2. Check for Insufficient Data
        min_evidence = self.policy.get("min_evidence_completeness", 0.60)
        allow_insufficient = self.policy.get("allow_insufficient_data", True)
        is_price_insufficient = fair_price_report.get("status") == "INSUFFICIENT_DATA"

        if allow_insufficient and (evidence_completeness < min_evidence or is_price_insufficient):
            decision = "INSUFFICIENT_DATA"
            decision_code = -1
            summary = (
                "Evaluation: INSUFFICIENT_DATA. There is insufficient verified market evidence or "
                "benchmark telemetry to formulate a dependable purchase verdict without guessing."
            )
            reasons.append("Evidence completeness is below minimum evaluation confidence threshold.")
            if is_price_insufficient:
                reasons.append("Comparable market pricing data could not be verified.")
            return decision, decision_code, {
                "summary": summary,
                "reasons": reasons,
                "warnings": warnings,
                "missing_evidence": missing_evidence
            }

        # 3. Policy thresholds
        min_perf = self.policy.get("min_performance_score", 35.0)
        min_vi = self.policy.get("min_value_index", 90.0)
        max_premium = self.policy.get("max_price_premium_pct", 18.0)
        premium_pct = fair_price_report.get("price_premium_pct")

        passes_perf = performance_score >= min_perf
        passes_value = relative_value_index >= min_vi
        passes_price = (premium_pct is None) or (premium_pct <= max_premium)

        # Build verified positive reasons
        if passes_perf:
            reasons.append(f"Workload performance index ({performance_score:.1f}) satisfies the {min_perf:.1f} baseline.")
        else:
            reasons.append(f"Performance score ({performance_score:.1f}) is underpowered for intensive {workload}.")

        if relative_value_index >= 100.0:
            reasons.append(f"Relative value index ({relative_value_index:.1f}) delivers above-median performance per rupee.")
        elif passes_value:
            reasons.append(f"Relative value index ({relative_value_index:.1f}) is acceptable within peer tolerance.")
        else:
            reasons.append(f"Relative value index ({relative_value_index:.1f}) offers poor performance per rupee compared to peers.")

        if premium_pct is not None:
            if premium_pct <= 0:
                reasons.append(f"Priced at or below estimated fair value ({abs(premium_pct):.1f}% savings).")
            elif passes_price:
                reasons.append(f"Price premium (+{premium_pct:.1f}%) is within acceptable fair-value tolerance (+{max_premium:.1f}%).")
            else:
                reasons.append(f"Price premium (+{premium_pct:.1f}%) exceeds fair-market threshold (+{max_premium:.1f}%).")

        # Check warnings
        if premium_pct is not None and premium_pct > 10.0 and passes_price:
            warnings.append(f"Listing carries a mild price premium (+{premium_pct:.1f}%). Consider waiting for promotional discounts.")
        if overall_eligibility == "UNKNOWN":
            warnings.append("Some non-critical specs (e.g., PSU rating or Laptop TGP) could not be verified.")

        # Final decision synthesis
        if passes_perf and passes_value and passes_price:
            decision = "BUY"
            decision_code = 1
            summary = (
                f"Evaluation: BUY. Configuration meets all mandatory eligibility criteria, "
                f"demonstrates solid {workload} performance ({performance_score:.1f}), and offers fair market pricing."
            )
        else:
            decision = "NOT BUY"
            decision_code = 0
            summary = (
                f"Evaluation: NOT BUY. Although basic hardware is compatible, the configuration fails "
                "economic or performance standards (unfavorable value index or excessive price premium)."
            )

        return decision, decision_code, {
            "summary": summary,
            "reasons": reasons,
            "warnings": warnings,
            "missing_evidence": missing_evidence
        }
