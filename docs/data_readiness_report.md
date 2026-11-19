# HIRS Dataset Readiness & Hardware Schema Report

**Document Version:** 1.0.0  
**Target Architecture:** Hardware Intelligence & Recommendation System (HIRS) Hybrid Evaluation Engine  
**Dataset Source:** `Dataset.csv` (1,048,575 records, 6 raw columns)  

---

## 1. Executive Summary

This report establishes the audit and data readiness assessment of the raw dataset powering the HIRS platform. In accordance with strict engineering standards:
1. **Zero Fabrication Policy**: Unmeasured, absent, or unverified hardware characteristics are represented explicitly as `NULL` / `None`. The system **never** fabricates benchmark scores, wattage figures, or warranty records.
2. **Deterministic Fallbacks**: Missing evidence triggers the mathematically grounded `INSUFFICIENT_DATA` state rather than forcing a binary `BUY` or `NOT BUY`.
3. **Preservation**: The original 6-column dataset (`Dataset.csv`) remains pristine and unmodified.

---

## 2. Enriched 20-Attribute Hardware Schema Audit

The following table categorizes each attribute of the **Enriched Hardware Schema**, specifying its source, derivation methodology, and whether it is present or missing (`NULL`) from the raw dataset:

| # | Attribute | Schema Type | Extraction / Derivation Status from `Dataset.csv` | Field Status |
|---|---|---|---|---|
| 1 | `product_id` | `UUID / str` | Generated deterministically from hash of core specs (`SHA256(CPU+RAM+SSD+GPU+PRICE)`) | **Available (Derived)** |
| 2 | `device_type` | `str` | Extracted from CPU prefix: `"Desktop"` or `"Laptop"` | **Available (Extracted)** |
| 3 | `brand` | `str` | Extracted from CPU or Component vendor token (e.g., AMD, Intel, Apple, ASUS, MSI) | **Available (Extracted)** |
| 4 | `cpu_model` | `str` | Parsed from CPU string (e.g., `"AMD Ryzen 9 9950X"`, `"Intel Core i5-13500"`) | **Available (Extracted)** |
| 5 | `cpu_benchmark_score` | `float` | Mapped via verified benchmark reference tables (PassMark / Geekbench Multi-Core) | **Available (Mapped)** |
| 6 | `gpu_model` | `str` | Parsed from Graphics string (e.g., `"NVIDIA GeForce RTX 4070"`) | **Available (Extracted)** |
| 7 | `gpu_benchmark_score` | `float` | Mapped via verified benchmark reference tables (3DMark TimeSpy / Compute) | **Available (Mapped)** |
| 8 | `gpu_vram_gb` | `int` | Extracted from Graphics string (e.g., `"VRAM 16 GB"`) | **Available (Extracted)** |
| 9 | `gpu_tgp_watts` | `Optional[int]` | Total Graphics Power (Laptop TGP) is absent from the 6 raw columns | **NULL (Missing Evidence)** |
| 10 | `ram_capacity_gb` | `int` | Extracted from RAM column (e.g., `64 GB`) | **Available (Extracted)** |
| 11 | `ram_generation` | `Optional[str]` | Parsed from RAM column (e.g., `DDR4-3200`, `DDR5-6000`) | **Available (Extracted)** |
| 12 | `ssd_capacity_gb` | `int` | Extracted from SSD column (e.g., `2000 GB SSD`) | **Available (Extracted)** |
| 13 | `ssd_benchmark_mbps`| `Optional[float]`| Mapped from interface standard (NVMe Gen4 vs Gen3 vs SATA) when identifiable | **Available (Mapped)** |
| 14 | `display_details` | `Optional[dict]` | Resolution, refresh rate, panel type are absent from raw components | **NULL (Missing Evidence)** |
| 15 | `price` | `float` | Extracted directly from `PRICE` column | **Available (Raw)** |
| 16 | `currency` | `str` | Defaults to `"INR"` based on dataset training domain | **Available (Domain Fixed)**|
| 17 | `price_source` | `Optional[str]` | Raw dataset does not record source retailer or scraping endpoint | **NULL (Missing Evidence)** |
| 18 | `price_timestamp` | `Optional[str]` | Raw dataset does not record pricing observation timestamps | **NULL (Missing Evidence)** |
| 19 | `product_condition` | `Optional[str]` | Condition (New vs Refurbished vs Used) not specified in raw dataset | **NULL (Missing Evidence)** |
| 20 | `warranty_months` | `Optional[int]` | Warranty coverage duration not present in raw dataset | **NULL (Missing Evidence)** |

---

## 3. Evaluation Engine Impact Analysis

1. **Workload Performance Scoring ($P(i,w)$)**:
   - Successfully computed using normalized benchmark ratios $R(i,j) = \text{Score} / \text{RefScore}$ for CPU, GPU, RAM bandwidth, and SSD throughput.
   - Initial workload weights $\alpha(w,j)$ sum to 1.0 across all 6 predefined profiles (Office, Programming, Gaming, Data Analytics, Deep Learning, Video Editing).

2. **Mandatory Eligibility Requirements**:
   - Budget, minimum RAM, minimum SSD, GPU dedicated flag, and VRAM requirements are **100% deterministically verified**.
   - Socket and RAM generation compatibility (e.g., AM5 with DDR5) is verified via motherboard/socket rules.
   - When laptop TGP, display specs, or PSU wattage cannot be verified due to missing evidence, the system reports **UNKNOWN** for that specific sub-check and adds an explicit warning in the explanation payload.

3. **Performance-Per-Rupee & Fair-Price Estimation**:
   - Performance-per-rupee $V(i) = P(i,w) / \text{Price}(i)$ and Peer Relative Value Index $VI(i) = 100 \times [V(i) / \text{Median}(V_{\text{peers}})]$ are computed strictly within identical device categories (Desktop vs Desktop, Laptop vs Laptop).
   - Method A (Comparable product median) and Method B (LightGBM log-price regressor) provide robust fair price bounds. If peer count $< 3$ and regressor uncertainty is high, price fairness returns `INSUFFICIENT_DATA`.

4. **Recommendation TOPSIS Ranking**:
   - Vector normalization and relative closeness $T(i) = D^- / (D^+ + D^-)$ operate on eligible candidates with budget pre-filtering. Over-budget units are filtered prior to normalization to prevent distortion of ideal/anti-ideal vectors.
