"""
HIRS Model Evaluation Module
Provides independent validation, calibration analysis, and recommendation simulation.
"""
import os
import sys
import json
import joblib
import polars as pl
import pandas as pd
import numpy as np

def run_evaluation(artifacts_dir=r"d:\Downloads\PDMS\backend\artifacts"):
    bundle_path = os.path.join(artifacts_dir, "best_model.joblib")
    if not os.path.exists(bundle_path):
        raise FileNotFoundError(f"Model bundle not found at {bundle_path}. Run train.py first.")
        
    bundle = joblib.load(bundle_path)
    model = bundle["model"]
    encoder = bundle["encoder"]
    numeric_cols = bundle["numeric_cols"]
    categorical_cols = bundle["categorical_cols"]
    
    test_pl = pl.read_parquet(os.path.join(artifacts_dir, "test.parquet"))
    test_df = pd.DataFrame(test_pl.to_dict(as_series=False))
    
    X = pd.DataFrame()
    for col in numeric_cols:
        X[col] = test_df[col].astype(float)
    encoded = encoder.transform(test_df[categorical_cols].astype(str))
    for i, col in enumerate(categorical_cols):
        X[col] = encoded[:, i]
        
    y_true = test_df["BUY"].values.astype(int)
    probs = model.predict_proba(X)[:, 1]
    preds = (probs >= 0.5).astype(int)
    
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
    metrics = {
        "model_name": bundle["model_name"],
        "accuracy": round(float(accuracy_score(y_true, preds)), 4),
        "precision": round(float(precision_score(y_true, preds, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, preds, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, probs)), 4),
        "tested_samples": len(test_df)
    }
    print("[+] Independent Evaluation Successful:")
    print(json.dumps(metrics, indent=2))
    return metrics

if __name__ == "__main__":
    run_evaluation()
