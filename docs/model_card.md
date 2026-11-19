# HIRS Model Card: LightGBM Hardware Classifier

## Model Details
- **Architecture**: Gradient Boosted Decision Trees (LightGBM `LGBMClassifier`)
- **Trained Parameters**: `n_estimators=200`, `learning_rate=0.08`, `num_leaves=31`, `max_depth=8`, `scale_pos_weight=2.0`
- **Model Size**: ~2.5 MB serialized joblib bundle
- **Training Dataset**: 175,000 stratified configurations from `Dataset.csv`
- **Validation Dataset**: 37,500 stratified configurations
- **Test Holdout Dataset**: 37,500 unseen configurations

## Verified Performance Metrics
- **Accuracy**: 99.82%
- **Precision**: 98.66%
- **Recall**: 99.52%
- **F1 Score**: 99.09%
- **ROC-AUC**: 1.0000
- **PR-AUC**: 0.9997
- **Brier Calibration Score**: 0.0014
- **Confusion Matrix on Holdout Test Set**:
  - True Negatives (TN): 33,731
  - False Positives (FP): 50
  - False Negatives (FN): 18
  - True Positives (TP): 3,701

## Feature Importances
1. `cores`: 42.5%
2. `vram_gb`: 24.1%
3. `PRICE`: 15.3%
4. `value_score`: 8.4%
5. `price_per_core`: 4.8%
6. `ram_gb`: 2.6%
7. `hardware_score`: 1.5%
8. `ssd_gb`: 0.8%

## Critical Limitations & Ethical Disclosure
1. **Synthetic Training Data**: Combinatorial mixing in `Dataset.csv` pairs certain legacy parts with DDR5 memory.
2. **Deterministic Label Boundaries**: The BUY label in the training data is derived from deterministic rules (cores < 6 and VRAM < 4 are strictly penalized). The high test accuracy (>99.8%) reflects the algorithm's exact recovery of these underlying label rules.
3. **Real-World Purchase Behavior**: The model output indicates whether a build satisfies the specification-to-price rules encoded in the dataset, not dynamic consumer demand or live retail inventory.
