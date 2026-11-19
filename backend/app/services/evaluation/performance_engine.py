"""
HIRS Performance Engine: Workload-Specific Benchmark Scoring
Computes the weighted geometric performance index:
P(i,w) = 100 * exp( sum_j ( alpha(w,j) * ln(R(i,j)) ) )
"""
import math
import json
import re
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

# Load benchmark references and configuration
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"

with open(CONFIG_DIR / "evaluation_config.json", "r", encoding="utf-8") as f:
    EVAL_CONFIG = json.load(f)

with open(DATA_DIR / "benchmark_references.json", "r", encoding="utf-8") as f:
    BENCHMARKS_DB = json.load(f)

class PerformanceEngine:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or EVAL_CONFIG
        self.benchmarks = BENCHMARKS_DB
        self.baselines = self.config["benchmark_baselines"]
        self.weights = self.config["workload_weights"]

    def resolve_cpu_score(self, cpu_str: str) -> Tuple[Optional[float], Optional[str]]:
        """Resolve CPU score from database or heuristic parsing."""
        if not cpu_str:
            return None, None
        cpu_clean = cpu_str.lower().strip()
        
        # Check exact and substring matches in verified benchmark DB
        for key, data in self.benchmarks["cpus"].items():
            if key in cpu_clean or cpu_clean in key:
                return data["score"], data["name"]
        
        # Heuristic fallback based on known families if specific variant differs
        if "9950x" in cpu_clean:
            return 67000.0, "AMD Ryzen 9 9950X"
        if "7800x3d" in cpu_clean:
            return 34500.0, "AMD Ryzen 7 7800X3D"
        if "14900" in cpu_clean:
            return 60000.0, "Intel Core i9-14900"
        if "13700" in cpu_clean:
            return 45000.0, "Intel Core i7-13700"
        if "13500" in cpu_clean:
            return 32500.0, "Intel Core i5-13500"
        if "12400" in cpu_clean:
            return 19500.0, "Intel Core i5-12400"
        if "870" in cpu_clean and "core i7" in cpu_clean:
            return 3100.0, "Intel Core i7-870"
            
        # Parse core count if present (e.g. "16 cores") to provide estimate with low confidence
        core_match = re.search(r'(\d+)\s*cores?', cpu_clean)
        if core_match:
            cores = int(core_match.group(1))
            # Conservative baseline estimate per core
            return float(cores * 2200.0), f"Generic {cores}-Core Processor"

        return None, None

    def resolve_gpu_score(self, gpu_str: str, vram_gb: int = 0) -> Tuple[Optional[float], Optional[str], bool]:
        """Resolve GPU score from database or parsing."""
        if not gpu_str:
            return None, None, False
        gpu_clean = gpu_str.lower().strip()
        
        for key, data in self.benchmarks["gpus"].items():
            if key in gpu_clean or gpu_clean in key:
                return data["score"], data["name"], data["is_dedicated"]
        
        # Substring searches
        if "4090" in gpu_clean:
            return 36500.0, "NVIDIA GeForce RTX 4090", True
        if "4080" in gpu_clean:
            return 28000.0, "NVIDIA GeForce RTX 4080", True
        if "4070 ti" in gpu_clean:
            return 23500.0, "NVIDIA GeForce RTX 4070 Ti", True
        if "4070" in gpu_clean:
            return 18000.0, "NVIDIA GeForce RTX 4070", True
        if "4060 ti" in gpu_clean:
            return 13600.0, "NVIDIA GeForce RTX 4060 Ti", True
        if "4060" in gpu_clean:
            return 10500.0, "NVIDIA GeForce RTX 4060", True
        if "3080" in gpu_clean:
            return 17800.0, "NVIDIA GeForce RTX 3080", True
        if "3070" in gpu_clean:
            return 13700.0, "NVIDIA GeForce RTX 3070", True
        if "3060" in gpu_clean:
            return 8800.0, "NVIDIA GeForce RTX 3060", True
        if "7900 xtx" in gpu_clean:
            return 30000.0, "AMD Radeon RX 7900 XTX", True
        if "7800 xt" in gpu_clean:
            return 19200.0, "AMD Radeon RX 7800 XT", True
        if "integrated" in gpu_clean or "uhd" in gpu_clean or "iris" in gpu_clean:
            return 900.0, "Integrated Graphics", False
            
        # If VRAM > 0 and dedicated indicators
        if vram_gb >= 16:
            return 16000.0, f"Dedicated GPU ({vram_gb}GB VRAM)", True
        elif vram_gb >= 8:
            return 9500.0, f"Dedicated GPU ({vram_gb}GB VRAM)", True
        elif vram_gb >= 4:
            return 4500.0, f"Dedicated GPU ({vram_gb}GB VRAM)", True
        elif vram_gb >= 2:
            return 2000.0, f"Entry Dedicated GPU ({vram_gb}GB VRAM)", True

        return None, None, False

    def resolve_ram_bandwidth(self, ram_gen: Optional[str] = "DDR4", ram_str: str = "") -> float:
        """Resolve RAM bandwidth in MB/s."""
        ram_text = (ram_str + " " + (ram_gen or "")).upper()
        if "DDR5" in ram_text:
            return self.benchmarks["ram_generations"]["DDR5"]["bandwidth_mbps"]
        elif "UNIFIED" in ram_text or "LPDDR5" in ram_text:
            return self.benchmarks["ram_generations"]["Unified"]["bandwidth_mbps"]
        elif "DDR3" in ram_text:
            return self.benchmarks["ram_generations"]["DDR3"]["bandwidth_mbps"]
        else:
            return self.benchmarks["ram_generations"]["DDR4"]["bandwidth_mbps"]

    def resolve_ssd_throughput(self, ssd_interface: Optional[str] = None, ssd_str: str = "") -> float:
        """Resolve SSD sequential speed in MB/s."""
        text = (ssd_str + " " + (ssd_interface or "")).upper()
        if "GEN5" in text:
            return self.benchmarks["ssd_interfaces"]["NVMe Gen5"]["speed_mbps"]
        elif "GEN4" in text or "PREDATOR" in text or "980 PRO" in text or "SN850" in text:
            return self.benchmarks["ssd_interfaces"]["NVMe Gen4"]["speed_mbps"]
        elif "GEN3" in text or "NVME" in text:
            return self.benchmarks["ssd_interfaces"]["NVMe Gen3"]["speed_mbps"]
        elif "SATA" in text:
            return self.benchmarks["ssd_interfaces"]["SATA"]["speed_mbps"]
        else:
            # Default modern SSD is at least fast NVMe Gen3
            return 3500.0

    def calculate_performance_score(
        self,
        cpu_score: Optional[float],
        gpu_score: Optional[float],
        ram_bandwidth_mbps: float,
        ssd_throughput_mbps: float,
        workload: str = "Gaming"
    ) -> Tuple[float, Dict[str, Any], float]:
        """
        Calculate weighted geometric performance index:
        P(i,w) = 100 * exp( sum( alpha(w,j) * ln(R(i,j)) ) )
        Returns: (performance_score, ratio_details, evidence_completeness)
        """
        if workload not in self.weights:
            workload = "Gaming"
        alpha = self.weights[workload]
        
        # Reference baselines
        ref_cpu = self.baselines["cpu_score_ref"]
        ref_gpu = self.baselines["gpu_score_ref"]
        ref_ram = self.baselines["ram_bandwidth_ref_mbps"]
        ref_ssd = self.baselines["ssd_speed_ref_mbps"]
        
        evidence_count = 0
        total_evidence_possible = 4

        # Ratios (higher-is-better: R = score / ref)
        # Avoid zero or negative numbers in logarithm: clamp to minimum 0.05
        if cpu_score is not None and cpu_score > 0:
            r_cpu = max(cpu_score / ref_cpu, 0.05)
            evidence_count += 1
        else:
            r_cpu = 0.5  # placeholder default for calculation
            
        if gpu_score is not None and gpu_score > 0:
            r_gpu = max(gpu_score / ref_gpu, 0.05)
            evidence_count += 1
        else:
            r_gpu = 0.2
            
        r_ram = max(ram_bandwidth_mbps / ref_ram, 0.05)
        evidence_count += 1
        
        r_ssd = max(ssd_throughput_mbps / ref_ssd, 0.05)
        evidence_count += 1
        
        # Weighted log sum: sum( alpha_j * ln(R_j) )
        log_term_cpu = alpha["cpu"] * math.log(r_cpu)
        log_term_gpu = alpha["gpu"] * math.log(r_gpu)
        log_term_ram = alpha["ram"] * math.log(r_ram)
        log_term_ssd = alpha["ssd"] * math.log(r_ssd)
        
        total_weighted_log = log_term_cpu + log_term_gpu + log_term_ram + log_term_ssd
        
        # P(i,w) = 100 * exp(total_weighted_log)
        performance_score = round(100.0 * math.exp(total_weighted_log), 2)
        
        ratio_details = {
            "cpu": {
                "component": "CPU",
                "raw_metric": cpu_score if cpu_score is not None else 0.0,
                "reference_metric": ref_cpu,
                "ratio": round(r_cpu, 4),
                "weight": alpha["cpu"],
                "weighted_log": round(log_term_cpu, 4)
            },
            "gpu": {
                "component": "GPU",
                "raw_metric": gpu_score if gpu_score is not None else 0.0,
                "reference_metric": ref_gpu,
                "ratio": round(r_gpu, 4),
                "weight": alpha["gpu"],
                "weighted_log": round(log_term_gpu, 4)
            },
            "ram": {
                "component": "RAM Bandwidth",
                "raw_metric": ram_bandwidth_mbps,
                "reference_metric": ref_ram,
                "ratio": round(r_ram, 4),
                "weight": alpha["ram"],
                "weighted_log": round(log_term_ram, 4)
            },
            "ssd": {
                "component": "SSD Throughput",
                "raw_metric": ssd_throughput_mbps,
                "reference_metric": ref_ssd,
                "ratio": round(r_ssd, 4),
                "weight": alpha["ssd"],
                "weighted_log": round(log_term_ssd, 4)
            }
        }
        
        completeness = evidence_count / total_evidence_possible
        return performance_score, ratio_details, completeness
