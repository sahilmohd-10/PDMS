# HIRS Dataset Quality & Integrity Report

## Executive Summary
- **Source File**: `d:\Downloads\PDMS\Dataset.csv` (167.23 MB)
- **Total Records**: 1,048,575 rows across 6 columns
- **Class Balance**: 104,674 BUY (9.98%) vs 943,901 NOT BUY
- **Unique Records**: 1,048,575 (0 duplicates)
- **Currency Range**: ₹23,990.00 to ₹572,846.25 INR (Mean: ₹172,711.27)

## Critical Data Observations
1. **Device Type Imbalance**: 1,048,476 Desktop (99.99%) vs 99 Laptop (0.0094%).
2. **Missing Values**: 0 nulls across all core columns. Integrated GPUs have null VRAM (treated as 0 GB shared).
3. **Synthetic Component Combinations**: The dataset contains synthetic combinations of hardware components (e.g., DDR5 with older generation CPUs).
4. **Label Determinism**: BUY rates follow hardware tiering where cores < 6 and VRAM < 4 have near-zero BUY rates, combined with budget-tier pricing.
