"""
Script 4 of 4 — Run after run_eda.py.
Engineers features, trains Logistic Regression + Random Forest,
evaluates both, saves the better model + evaluation metrics.
Output: backend/data/model.pkl + backend/data/model_metrics.json
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
import warnings
warnings.filterwarnings("ignore")

import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    roc_auc_score, confusion_matrix,
    precision_score, recall_score, f1_score,
    roc_curve,
)

EVENTS_PATH  = os.path.join(os.path.dirname(__file__), "..", "data", "events.csv")
CACHE_PATH   = os.path.join(os.path.dirname(__file__), "..", "data", "cause_labels.json")
MODEL_PATH   = os.path.join(os.path.dirname(__file__), "..", "data", "model.pkl")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "model_metrics.json")

# ── Load and merge ────────────────────────────────────────────────────────────
df = pd.read_csv(EVENTS_PATH)
with open(CACHE_PATH) as f:
    cache = json.load(f)

df["cause_label"] = df.apply(
    lambda r: cache.get(f"{r['ticker']}_{r['date']}", {}).get("cause_category", "unknown"),
    axis=1
)
df["recovered"] = (df["forward_return_5d"] > 0).astype(int)
df = df.sort_values("date").reset_index(drop=True)

# ── Feature engineering ───────────────────────────────────────────────────────
CAUSE_CATEGORIES = [
    "earnings_miss", "macro_shock", "regulatory",
    "promoter_action", "sector_rotation", "unknown"
]
SECTORS = sorted(df["sector"].unique().tolist())

def engineer_features(data: pd.DataFrame) -> pd.DataFrame:
    X = pd.DataFrame()
    X["drop_magnitude"]       = data["drop_magnitude"].abs()
    X["market_also_dropped"]  = data["market_also_dropped"].astype(int)
    X["volume_ratio"]         = data["volume_ratio"].clip(0, 10)
    X["prior_volatility_20d"] = data["prior_volatility_20d"].fillna(data["prior_volatility_20d"].median())
    X["dist_from_52w_low"]    = data["dist_from_52w_low"].fillna(data["dist_from_52w_low"].median())

    # One-hot encode cause
    for cause in CAUSE_CATEGORIES:
        X[f"cause_{cause}"] = (data["cause_label"] == cause).astype(int)

    # One-hot encode sector
    for sector in SECTORS:
        X[f"sector_{sector}"] = (data["sector"] == sector).astype(int)

    return X

X_all = engineer_features(df)
y_all = df["recovered"]

# ── Chronological split (80% train, 20% test) ────────────────────────────────
split_idx = int(len(df) * 0.8)
X_train, X_test = X_all.iloc[:split_idx], X_all.iloc[split_idx:]
y_train, y_test = y_all.iloc[:split_idx], y_all.iloc[split_idx:]

print(f"Train: {len(X_train)} events | Test: {len(X_test)} events")

# ── Train models ──────────────────────────────────────────────────────────────
lr_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(max_iter=1000, random_state=42)),
])
lr_pipeline.fit(X_train, y_train)

rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=6,
    min_samples_leaf=10,
    random_state=42,
    n_jobs=-1,
)
rf_model.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
def evaluate(model, X_test, y_test, name):
    proba = model.predict_proba(X_test)[:, 1]
    pred  = (proba >= 0.5).astype(int)
    auc   = roc_auc_score(y_test, proba)
    cm    = confusion_matrix(y_test, pred)
    fpr, tpr, _ = roc_curve(y_test, proba)
    print(f"\n{name}")
    print(f"  AUC:       {auc:.4f}")
    print(f"  Precision: {precision_score(y_test, pred):.4f}")
    print(f"  Recall:    {recall_score(y_test, pred):.4f}")
    print(f"  F1:        {f1_score(y_test, pred):.4f}")
    print(f"  Confusion: TN={cm[0,0]} FP={cm[0,1]} FN={cm[1,0]} TP={cm[1,1]}")
    return {
        "auc": round(auc, 4),
        "precision": round(float(precision_score(y_test, pred)), 4),
        "recall": round(float(recall_score(y_test, pred)), 4),
        "f1": round(float(f1_score(y_test, pred)), 4),
        "confusion_matrix": {
            "tn": int(cm[0,0]), "fp": int(cm[0,1]),
            "fn": int(cm[1,0]), "tp": int(cm[1,1]),
        },
        "roc_curve": {
            "fpr": [round(float(v), 4) for v in fpr[::5]],
            "tpr": [round(float(v), 4) for v in tpr[::5]],
        }
    }

lr_metrics = evaluate(lr_pipeline, X_test, y_test, "Logistic Regression")
rf_metrics = evaluate(rf_model, X_test, y_test, "Random Forest")

# ── Feature importance (Random Forest) ───────────────────────────────────────
feature_names = X_all.columns.tolist()
importances = rf_model.feature_importances_
fi_pairs = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)

# Keep top 10, group rest as "other"
top_features = [
    {"name": name.replace("cause_", "cause: ").replace("sector_", "sector: ").replace("_", " "),
     "importance": round(float(imp), 4)}
    for name, imp in fi_pairs[:10]
]

print("\nTop 10 features:")
for f in top_features:
    print(f"  {f['name']}: {f['importance']}")

# ── Save best model (by AUC) ──────────────────────────────────────────────────
if rf_metrics["auc"] >= lr_metrics["auc"]:
    best_model    = rf_model
    best_name     = "Random Forest"
    best_use_pipe = False
else:
    best_model    = lr_pipeline
    best_name     = "Logistic Regression"
    best_use_pipe = True

print(f"\nSaving {best_name} as primary model...")

# Save everything needed for inference
artifact = {
    "model":            best_model,
    "feature_names":    feature_names,
    "cause_categories": CAUSE_CATEGORIES,
    "sectors":          SECTORS,
    "is_pipeline":      best_use_pipe,
}
joblib.dump(artifact, MODEL_PATH)

# ── Save metrics JSON ─────────────────────────────────────────────────────────
metrics = {
    "best_model":        best_name,
    "logistic_regression": lr_metrics,
    "random_forest":       rf_metrics,
    "feature_importance":  top_features,
}
with open(METRICS_PATH, "w") as f:
    json.dump(metrics, f, indent=2)

print(f"Model saved to {MODEL_PATH}")
print(f"Metrics saved to {METRICS_PATH}")