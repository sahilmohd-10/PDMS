# HIRS Data Directory

This directory references the raw and preprocessed data sources used by the Hardware Intelligence & Recommendation System (HIRS).

## Primary Dataset
- **File**: `Dataset.csv`
- **Location**: Project Root (`d:\Downloads\PDMS\Dataset.csv`)
- **Row Count**: 1,048,575 rows (Excel row boundary: 2^20 - 1)
- **Size**: 167.23 MB
- **Columns**: `CPU`, `RAM`, `SSD`, `GRAPHICS`, `PRICE`, `BUY`

## Cleaned Analytical Datasets
Preprocessed Parquet files are generated into `backend/artifacts/`:
1. `hardware_clean.parquet`: Full cleaned dataset with structured extracted features and derived engineering ratios.
2. `catalogue.parquet`: Deduplicated catalogue of 984,081 unique physical component combinations used for ultra-low latency candidate recommendations.
3. `train.parquet`, `val.parquet`, `test.parquet`: Stratified 70% / 15% / 15% train, validation, and holdout test splits.
