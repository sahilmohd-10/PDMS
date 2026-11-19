# HIRS Dataset Quality & Integrity Report

## 1. Raw Dataset Properties
- **Source**: `d:\Downloads\PDMS\Dataset.csv`
- **File Size**: 167.23 MB
- **Total Lines**: 1,048,576 (Header + 1,048,575 data rows)
- **Column Schema**: `CPU`, `RAM`, `SSD`, `GRAPHICS`, `PRICE`, `BUY`

## 2. Integrity Findings
- **Missing Values**: 0 nulls across all rows.
- **Empty Strings**: 0 empty strings across all text fields.
- **Exact Duplicates**: 0 exact duplicate rows across all 6 columns.
- **Label Validation**: BUY label values are strictly binary integers (0 or 1).
- **Price Range**: ₹23,990.00 to ₹572,846.25 INR. Zero negative or zero prices detected.

## 3. Disclosed Distribution Characteristics
- **Target Imbalance**: 943,901 NOT BUY (90.02%) vs 104,674 BUY (9.98%).
- **Device Form Factor**: 1,048,476 Desktop configurations (99.99%) vs 99 Laptop records (0.01%).
- **Synthetic Combinations**: Part combination patterns (e.g. DDR5 RAM appearing with legacy Intel Core 2 Quad and Pentium processors) identify the dataset as combinatorial synthetic generation rather than direct consumer build logs.
