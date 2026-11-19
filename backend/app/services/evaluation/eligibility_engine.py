"""
HIRS Hardware Eligibility and Compatibility Engine
Performs deterministic, rule-based validation of requirements.
A high CPU score never compensates for a failed mandatory requirement.
Outcomes: PASS, FAIL, UNKNOWN.
"""
from typing import Dict, Any, List, Optional, Tuple
import json
from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

with open(CONFIG_DIR / "evaluation_config.json", "r", encoding="utf-8") as f:
    EVAL_CONFIG = json.load(f)

with open(DATA_DIR / "benchmark_references.json", "r", encoding="utf-8") as f:
    BENCHMARKS_DB = json.load(f)

class EligibilityEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or EVAL_CONFIG
        self.requirements = self.config["workload_requirements"]
        self.benchmarks = BENCHMARKS_DB

    def check_eligibility(
        self,
        cpu_name: str,
        cpu_score: Optional[float],
        ram_gb: int,
        ram_generation: Optional[str],
        ssd_gb: int,
        gpu_name: str,
        gpu_score: Optional[float],
        vram_gb: int,
        is_dedicated_gpu: bool,
        price_inr: float,
        user_budget_inr: Optional[float],
        workload: str = "Gaming",
        device_type: str = "Desktop",
        gpu_tgp_watts: Optional[int] = None,
        psu_watts: Optional[int] = None,
        product_condition: Optional[str] = "New",
        warranty_months: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Evaluate all mandatory hardware and workload requirements.
        Returns structured report with overall_status: PASS, FAIL, or UNKNOWN.
        """
        checks: List[Dict[str, Any]] = []
        mandatory_passed = True
        has_unknown = False
        workload_reqs = self.requirements.get(workload, self.requirements["Gaming"])

        # 1. Budget Check
        if user_budget_inr is not None and user_budget_inr > 0:
            if price_inr <= user_budget_inr:
                checks.append({
                    "name": "Budget Constraint",
                    "status": "PASS",
                    "message": f"Hardware price (₹{price_inr:,.0f}) is within user budget (₹{user_budget_inr:,.0f}).",
                    "required_value": user_budget_inr,
                    "actual_value": price_inr
                })
            else:
                mandatory_passed = False
                checks.append({
                    "name": "Budget Constraint",
                    "status": "FAIL",
                    "message": f"Hardware price (₹{price_inr:,.0f}) exceeds user budget (₹{user_budget_inr:,.0f}) by ₹{price_inr - user_budget_inr:,.0f}.",
                    "required_value": user_budget_inr,
                    "actual_value": price_inr
                })
        else:
            checks.append({
                "name": "Budget Constraint",
                "status": "PASS",
                "message": "No ceiling budget specified; price considered nominal.",
                "required_value": None,
                "actual_value": price_inr
            })

        # 2. RAM Capacity Requirement
        min_ram = workload_reqs["min_ram_gb"]
        if ram_gb >= min_ram:
            checks.append({
                "name": "Workload Minimum RAM",
                "status": "PASS",
                "message": f"{ram_gb} GB RAM meets the minimum {min_ram} GB required for {workload}.",
                "required_value": min_ram,
                "actual_value": ram_gb
            })
        else:
            mandatory_passed = False
            checks.append({
                "name": "Workload Minimum RAM",
                "status": "FAIL",
                "message": f"{ram_gb} GB RAM is insufficient for {workload}. Minimum {min_ram} GB is mandatory.",
                "required_value": min_ram,
                "actual_value": ram_gb
            })

        # 3. Storage (SSD) Minimum Requirement
        min_ssd = workload_reqs["min_ssd_gb"]
        if ssd_gb >= min_ssd:
            checks.append({
                "name": "Workload Minimum SSD",
                "status": "PASS",
                "message": f"{ssd_gb} GB SSD meets the minimum {min_ssd} GB required for {workload}.",
                "required_value": min_ssd,
                "actual_value": ssd_gb
            })
        else:
            mandatory_passed = False
            checks.append({
                "name": "Workload Minimum SSD",
                "status": "FAIL",
                "message": f"{ssd_gb} GB SSD is below the minimum {min_ssd} GB recommended for {workload}.",
                "required_value": min_ssd,
                "actual_value": ssd_gb
            })

        # 4. Dedicated GPU Requirement
        req_dedicated = workload_reqs["dedicated_gpu_required"]
        if req_dedicated:
            if is_dedicated_gpu:
                checks.append({
                    "name": "Dedicated GPU Requirement",
                    "status": "PASS",
                    "message": f"Discrete GPU present ({gpu_name}), satisfying {workload} graphics pipeline requirement.",
                    "required_value": True,
                    "actual_value": True
                })
            else:
                mandatory_passed = False
                checks.append({
                    "name": "Dedicated GPU Requirement",
                    "status": "FAIL",
                    "message": f"Workload '{workload}' strictly requires a dedicated GPU. Integrated graphics will suffer severe bottlenecks.",
                    "required_value": True,
                    "actual_value": False
                })
        else:
            checks.append({
                "name": "Dedicated GPU Requirement",
                "status": "PASS",
                "message": f"Workload '{workload}' does not mandate a dedicated discrete GPU.",
                "required_value": False,
                "actual_value": is_dedicated_gpu
            })

        # 5. GPU VRAM Requirement
        min_vram = workload_reqs["min_vram_gb"]
        if min_vram > 0:
            if vram_gb >= min_vram:
                checks.append({
                    "name": "GPU VRAM Buffer",
                    "status": "PASS",
                    "message": f"{vram_gb} GB VRAM satisfies the minimum {min_vram} GB buffer required for {workload}.",
                    "required_value": min_vram,
                    "actual_value": vram_gb
                })
            else:
                mandatory_passed = False
                checks.append({
                    "name": "GPU VRAM Buffer",
                    "status": "FAIL",
                    "message": f"{vram_gb} GB VRAM is below the {min_vram} GB minimum needed for textures/model weights in {workload}.",
                    "required_value": min_vram,
                    "actual_value": vram_gb
                })

        # 6. CPU Capability Score
        min_cpu = workload_reqs["min_cpu_score"]
        if cpu_score is not None:
            if cpu_score >= min_cpu:
                checks.append({
                    "name": "CPU Workload Capability",
                    "status": "PASS",
                    "message": f"CPU score ({cpu_score:,.0f}) clears the {min_cpu:,.0f} baseline for {workload}.",
                    "required_value": min_cpu,
                    "actual_value": cpu_score
                })
            else:
                mandatory_passed = False
                checks.append({
                    "name": "CPU Workload Capability",
                    "status": "FAIL",
                    "message": f"CPU score ({cpu_score:,.0f}) is below the {min_cpu:,.0f} capability threshold for {workload}.",
                    "required_value": min_cpu,
                    "actual_value": cpu_score
                })
        else:
            has_unknown = True
            checks.append({
                "name": "CPU Workload Capability",
                "status": "UNKNOWN",
                "message": f"Verified CPU benchmark score unavailable for '{cpu_name}'. Cannot confirm workload threshold.",
                "required_value": min_cpu,
                "actual_value": None
            })

        # 7. Hardware Architecture Compatibility (Motherboard / RAM Gen / Socket)
        compat_status, compat_msg = self._check_socket_ram_compatibility(cpu_name, ram_generation)
        if compat_status == "FAIL":
            mandatory_passed = False
        elif compat_status == "UNKNOWN":
            has_unknown = True
        checks.append({
            "name": "Platform Architecture Compatibility",
            "status": compat_status,
            "message": compat_msg,
            "required_value": None,
            "actual_value": ram_generation
        })

        # 8. Laptop TGP Check (where available)
        if device_type.lower() == "laptop":
            if gpu_tgp_watts is not None and gpu_tgp_watts > 0:
                if gpu_tgp_watts >= 80:
                    checks.append({
                        "name": "Laptop GPU Power Limit (TGP)",
                        "status": "PASS",
                        "message": f"GPU TGP is {gpu_tgp_watts}W, allowing healthy thermal headroom and performance.",
                        "required_value": 80,
                        "actual_value": gpu_tgp_watts
                    })
                else:
                    checks.append({
                        "name": "Laptop GPU Power Limit (TGP)",
                        "status": "UNKNOWN",
                        "message": f"Low TGP ({gpu_tgp_watts}W) may throttle high clock states under continuous workload.",
                        "required_value": 80,
                        "actual_value": gpu_tgp_watts
                    })
            else:
                has_unknown = True
                checks.append({
                    "name": "Laptop GPU Power Limit (TGP)",
                    "status": "UNKNOWN",
                    "message": "Manufacturer TGP wattage not disclosed in product specifications.",
                    "required_value": None,
                    "actual_value": None
                })

        # 9. Power Supply & Thermal Headroom (Desktop)
        if device_type.lower() == "desktop":
            if psu_watts is not None and psu_watts > 0:
                # Estimate total peak draw
                est_cpu_tdp = 120.0
                est_gpu_tdp = 200.0 if is_dedicated_gpu else 20.0
                total_est = est_cpu_tdp + est_gpu_tdp + 80.0  # Motherboard/peripherals
                rec_psu = total_est * 1.25  # 25% safety overhead
                if psu_watts >= rec_psu:
                    checks.append({
                        "name": "PSU Power Overhead",
                        "status": "PASS",
                        "message": f"{psu_watts}W PSU exceeds the recommended {rec_psu:.0f}W system peak overhead.",
                        "required_value": round(rec_psu),
                        "actual_value": psu_watts
                    })
                else:
                    mandatory_passed = False
                    checks.append({
                        "name": "PSU Power Overhead",
                        "status": "FAIL",
                        "message": f"{psu_watts}W PSU is deficient for system draw ({total_est:.0f}W peak requires min {rec_psu:.0f}W PSU).",
                        "required_value": round(rec_psu),
                        "actual_value": psu_watts
                    })
            else:
                has_unknown = True
                checks.append({
                    "name": "PSU Power Overhead",
                    "status": "UNKNOWN",
                    "message": "Specific PSU wattage unrecorded in listing evidence.",
                    "required_value": None,
                    "actual_value": None
                })

        # Determine overall eligibility
        if not mandatory_passed:
            overall_status = "FAIL"
        elif has_unknown:
            # Deterministic: UNKNOWN must not silently become PASS
            overall_status = "UNKNOWN"
        else:
            overall_status = "PASS"

        return {
            "overall_status": overall_status,
            "mandatory_passed": mandatory_passed,
            "checks": checks
        }

    def _check_socket_ram_compatibility(self, cpu_name: str, ram_gen: Optional[str]) -> Tuple[str, str]:
        cpu_clean = cpu_name.lower()
        gen = (ram_gen or "").upper().strip()

        # AM5 (Ryzen 7000/8000/9000) only supports DDR5
        if any(tok in cpu_clean for tok in ["ryzen 9 9", "ryzen 7 9", "ryzen 5 9", "ryzen 9 7", "ryzen 7 7", "ryzen 5 7", "7800x3d", "am5"]):
            if gen == "DDR4":
                return "FAIL", "AMD AM5 platform strictly requires DDR5 memory; DDR4 is physically and electronically incompatible."
            elif gen == "DDR5":
                return "PASS", "AMD AM5 socket paired with compliant DDR5 memory standard."
            else:
                return "UNKNOWN", "Memory generation unconfirmed for modern AM5 platform."

        # AM4 (Ryzen 1000-5000) only supports DDR4
        if any(tok in cpu_clean for tok in ["5600", "5800", "5900", "5950", "3600", "3700", "am4"]):
            if gen == "DDR5":
                return "FAIL", "AMD AM4 platform only supports DDR4 memory; DDR5 cannot fit in DDR4 DIMM sockets."
            elif gen == "DDR4":
                return "PASS", "AMD AM4 socket correctly paired with standard DDR4 memory."
            else:
                return "UNKNOWN", "Memory generation unconfirmed for AM4 architecture."

        # Intel Core 12th/13th/14th gen supports both DDR4 and DDR5 depending on motherboard
        if any(tok in cpu_clean for tok in ["12400", "13400", "13500", "13600", "13700", "14700", "14900"]):
            if gen in ["DDR4", "DDR5"]:
                return "PASS", f"Intel LGA1700 platform supports {gen} with matching motherboard."
            else:
                return "UNKNOWN", "Memory generation unconfirmed for LGA1700 platform."

        # Older Intel (Nehalem, Sandy Bridge, etc.) e.g. i7-870 only supports DDR3
        if "870" in cpu_clean or "core i7-9" in cpu_clean or "lga1156" in cpu_clean:
            if gen in ["DDR4", "DDR5"]:
                return "FAIL", f"Legacy Intel LGA1156 architecture cannot support modern {gen} memory."
            elif gen == "DDR3":
                return "PASS", "Legacy LGA1156 paired with era-appropriate DDR3 memory."

        if gen:
            return "PASS", f"Memory generation {gen} recognized without noted architectural conflicts."
        return "UNKNOWN", "Memory generation details not provided in hardware profile."
