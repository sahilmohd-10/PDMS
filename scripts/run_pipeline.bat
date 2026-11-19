@echo off
echo Running Complete HIRS Pipeline: Audit, Preprocess, Train, Evaluate...
cd /d "%~dp0\.."

echo [1/4] Running Dataset Audit...
python backend/training/audit_dataset.py

echo [2/4] Running Preprocessing & Feature Engineering...
python backend/training/preprocess.py

echo [3/4] Running Model Training & Benchmarking...
python backend/training/train.py

echo [4/4] Running Test Suite...
python -m pytest backend/tests/test_api.py -v

echo Pipeline completed successfully!
pause
