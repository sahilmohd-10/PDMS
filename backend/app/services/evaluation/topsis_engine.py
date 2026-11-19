"""
HIRS TOPSIS Recommendation Engine
Multi-Criteria Decision Analysis (MCDA) using TOPSIS:
- Vector normalization
- Weighted normalized decision matrix
- Ideal (D+) and Negative-Ideal (D-) Euclidean distances
- Relative closeness T(i) = D- / (D+ + D-)
- Strict pre-filtering of over-budget candidates
- 3 categories: Best Performance, Best Value, Best Balanced Choice
"""
from typing import List, Dict, Any, Optional, Tuple
import math
import numpy as np

class TopsisEngine:
    def __init__(self, config_weights: Optional[Dict[str, Dict[str, float]]] = None):
        # Default weights
        self.weights = config_weights or {
            "balanced": {
                "performance": 0.35,
                "value_index": 0.30,
                "price_cost": 0.15,
                "ram_capacity": 0.10,
                "ssd_capacity": 0.10
            },
            "performance_priority": {
                "performance": 0.60,
                "value_index": 0.15,
                "price_cost": 0.05,
                "ram_capacity": 0.10,
                "ssd_capacity": 0.10
            },
            "value_priority": {
                "performance": 0.20,
                "value_index": 0.50,
                "price_cost": 0.15,
                "ram_capacity": 0.08,
                "ssd_capacity": 0.07
            }
        }

    def rank_candidates(
        self,
        candidates: List[Dict[str, Any]],
        weight_profile: str = "balanced"
    ) -> List[Dict[str, Any]]:
        """
        Executes TOPSIS ranking over eligible candidate configurations.
        Returns candidates ordered by descending relative closeness score T(i).
        """
        if not candidates:
            return []

        w = self.weights.get(weight_profile, self.weights["balanced"])
        criteria_keys = ["performance", "value_index", "price_cost", "ram_capacity", "ssd_capacity"]
        
        # Build raw decision matrix
        # Columns: [perf (benefit), value (benefit), price (cost), ram (benefit), ssd (benefit)]
        n = len(candidates)
        matrix = np.zeros((n, 5), dtype=float)
        
        for i, c in enumerate(candidates):
            matrix[i, 0] = max(c.get("performance_score", 0.0), 0.1)
            matrix[i, 1] = max(c.get("relative_value_index", 0.0), 0.1)
            matrix[i, 2] = max(c.get("price_inr", 0.0), 100.0)
            matrix[i, 3] = max(c.get("ram_gb", 0), 1)
            matrix[i, 4] = max(c.get("ssd_gb", 0), 1)

        # 1. Vector Normalization: r(i,j) = x(i,j) / sqrt(sum_k x(k,j)^2)
        norm_matrix = np.zeros_like(matrix)
        for j in range(5):
            col_norm = math.sqrt(np.sum(matrix[:, j] ** 2))
            norm_matrix[:, j] = matrix[:, j] / (col_norm if col_norm > 0 else 1.0)

        # 2. Weighted Normalized Matrix: v(i,j) = w_j * r(i,j)
        w_vector = np.array([
            w["performance"],
            w["value_index"],
            w["price_cost"],
            w["ram_capacity"],
            w["ssd_capacity"]
        ])
        v_matrix = norm_matrix * w_vector

        # 3. Determine Ideal (A+) and Negative Ideal (A-) solutions
        # Columns 0, 1, 3, 4 are benefit (higher is better)
        # Column 2 is cost (lower is better)
        ideal = np.zeros(5)
        neg_ideal = np.zeros(5)

        for j in range(5):
            if j == 2:  # Price is COST criterion
                ideal[j] = np.min(v_matrix[:, j])
                neg_ideal[j] = np.max(v_matrix[:, j])
            else:  # Benefit criteria
                ideal[j] = np.max(v_matrix[:, j])
                neg_ideal[j] = np.min(v_matrix[:, j])

        # 4. Calculate Euclidean Distances D+ and D-
        d_plus = np.sqrt(np.sum((v_matrix - ideal) ** 2, axis=1))
        d_minus = np.sqrt(np.sum((v_matrix - neg_ideal) ** 2, axis=1))

        # 5. Relative Closeness: T(i) = D- / (D+ + D-)
        closeness = np.zeros(n)
        for i in range(n):
            denom = d_plus[i] + d_minus[i]
            closeness[i] = (d_minus[i] / denom) if denom > 0 else 0.5

        # Attach TOPSIS results to candidates
        ranked_candidates = []
        for i, c in enumerate(candidates):
            c_copy = dict(c)
            c_copy["topsis_score"] = round(float(closeness[i]), 4)
            c_copy["topsis_d_plus"] = round(float(d_plus[i]), 4)
            c_copy["topsis_d_minus"] = round(float(d_minus[i]), 4)
            ranked_candidates.append(c_copy)

        # Sort descending by closeness score
        ranked_candidates.sort(key=lambda x: x["topsis_score"], reverse=True)
        for rank, c in enumerate(ranked_candidates, 1):
            c["topsis_rank"] = rank

        return ranked_candidates

    def select_categorized_recommendations(
        self,
        eligible_candidates: List[Dict[str, Any]]
    ) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]], Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Ranks candidates and partitions them into:
        1. Best Performance
        2. Best Value
        3. Best Balanced Choice
        """
        if not eligible_candidates:
            return None, None, None, []

        # Run Balanced TOPSIS
        balanced_ranked = self.rank_candidates(eligible_candidates, "balanced")
        # Run Performance Priority TOPSIS
        perf_ranked = self.rank_candidates(eligible_candidates, "performance_priority")
        # Run Value Priority TOPSIS
        value_ranked = self.rank_candidates(eligible_candidates, "value_priority")

        best_balanced = dict(balanced_ranked[0])
        best_balanced["category_tag"] = "Best Balanced Choice"
        best_balanced["recommendation_reason"] = (
            f"Achieved the highest multi-criteria TOPSIS closeness score ({best_balanced['topsis_score']:.3f}), "
            "optimally balancing performance, memory capacity, and price efficiency."
        )

        best_perf = dict(perf_ranked[0])
        best_perf["category_tag"] = "Best Performance"
        best_perf["recommendation_reason"] = (
            f"Delivers class-leading benchmark performance ({best_perf.get('performance_score', 0):.1f}) "
            "for intensive compute and render workloads."
        )

        best_val = dict(value_ranked[0])
        best_val["category_tag"] = "Best Value"
        best_val["recommendation_reason"] = (
            f"Maximizes performance-per-rupee with a peer relative value index of {best_val.get('relative_value_index', 0):.1f}."
        )

        # Apply category tags into the main balanced list
        result_list = []
        for c in balanced_ranked:
            c_out = dict(c)
            if c_out["id"] == best_perf["id"]:
                c_out["category_tag"] = "Best Performance"
                c_out["recommendation_reason"] = best_perf["recommendation_reason"]
            elif c_out["id"] == best_val["id"]:
                c_out["category_tag"] = "Best Value"
                c_out["recommendation_reason"] = best_val["recommendation_reason"]
            elif c_out["id"] == best_balanced["id"]:
                c_out["category_tag"] = "Best Balanced Choice"
                c_out["recommendation_reason"] = best_balanced["recommendation_reason"]
            else:
                c_out["category_tag"] = "Eligible Choice"
                c_out["recommendation_reason"] = (
                    f"Eligible option ranked #{c_out.get('topsis_rank', 1)} with TOPSIS relative closeness {c_out.get('topsis_score', 0):.3f}."
                )
            result_list.append(c_out)

        return best_perf, best_val, best_balanced, result_list
