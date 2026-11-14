#!/usr/bin/env python3
"""
Lightweight Expression Similarity Regressor Trainer for Fun Spot Face Off.
Trains Ridge Regression and small MLP models on paired facial feature representations
to predict human-calibrated expression match scores [0, 100].
Exports trained weights to a lightweight JSON matrix for client-side browser inference.
"""

import json
import math
import os
import sys
from typing import Dict, Any, List, Tuple
import numpy as np
from sklearn.linear_model import RidgeCV
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from evaluate_baseline import mirror_features, mirror_ratios, mirror_pose, evaluate_single_direction

FEATURE_NAMES = [
    "blendshape_direct_sim",
    "blendshape_cosine_sim",
    "geom_mouth_open_diff",
    "geom_mouth_width_diff",
    "geom_eye_open_diff",
    "geom_brow_raise_diff",
    "geom_corner_tilt_diff",
    "pose_yaw_diff",
    "pose_pitch_diff"
]

def extract_pairwise_features(sample: Dict[str, Any]) -> np.ndarray:
    """Extracts scale-invariant, bilateral pairwise feature vector."""
    t = sample["target"]
    c = sample["candidate"]

    t_blend = t.get("blendshapes", {})
    c_blend = c.get("blendshapes", {})
    target_keys = [k for k, v in t_blend.items() if v > 0.05 and not k.startswith("_")]
    if not target_keys:
        target_keys = [k for k in t_blend.keys() if not k.startswith("_")]

    t_ratios = t.get("ratios", {})
    c_ratios = c.get("ratios", {})
    t_pose = t.get("headPose", {})
    c_pose = c.get("headPose", {})

    # Evaluate direct and mirrored
    d_eval = evaluate_single_direction(c_blend, t_blend, target_keys, c_ratios, t_ratios, c_pose, t_pose)
    m_eval = evaluate_single_direction(
        mirror_features(c_blend), t_blend, target_keys,
        mirror_ratios(c_ratios), t_ratios,
        mirror_pose(c_pose), t_pose
    )

    best_eval = d_eval if d_eval["composite"] >= m_eval["composite"] else m_eval
    active_c_ratios = c_ratios if best_eval is d_eval else mirror_ratios(c_ratios)
    active_c_pose = c_pose if best_eval is d_eval else mirror_pose(c_pose)

    mouth_open_diff = abs(float(t_ratios.get("mouthOpenRatio", 0.0)) - float(active_c_ratios.get("mouthOpenRatio", 0.0)))
    mouth_width_diff = abs(float(t_ratios.get("mouthWidthRatio", 0.0)) - float(active_c_ratios.get("mouthWidthRatio", 0.0)))
    eye_open_diff = abs(float(t_ratios.get("eyeOpenRatio", 0.0)) - float(active_c_ratios.get("eyeOpenRatio", 0.0)))
    brow_raise_diff = abs(float(t_ratios.get("browRaiseRatio", 0.0)) - float(active_c_ratios.get("browRaiseRatio", 0.0)))
    corner_tilt_diff = abs(float(t_ratios.get("mouthCornerTilt", 0.0)) - float(active_c_ratios.get("mouthCornerTilt", 0.0)))

    yaw_diff = abs(float(t_pose.get("yaw", 0.0)) - float(active_c_pose.get("yaw", 0.0)))
    pitch_diff = abs(float(t_pose.get("pitch", 0.0)) - float(active_c_pose.get("pitch", 0.0)))

    features = [
        best_eval["blendshapeSim"],
        best_eval.get("cosineSim", best_eval["blendshapeSim"]),
        min(mouth_open_diff / 0.25, 1.0),
        min(mouth_width_diff / 0.25, 1.0),
        min(eye_open_diff / 0.25, 1.0),
        min(brow_raise_diff / 0.25, 1.0),
        min(corner_tilt_diff / 0.25, 1.0),
        min(yaw_diff / 0.35, 1.0),
        min(pitch_diff / 0.35, 1.0)
    ]
    return np.array(features, dtype=np.float32)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, "dataset_spec.json")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    samples = data["samples"]
    X = np.stack([extract_pairwise_features(s) for s in samples])
    y = np.array([float(s["human_rating"]) for s in samples], dtype=np.float32)

    print("============================================================")
    print(" FUN SPOT — FACE OFF SUPERVISED REGRESSOR TRAINING")
    print(f" Samples: {len(samples)} | Feature Dimensions: {X.shape[1]}")
    print("============================================================")

    # 1. Ridge Regression with built-in Cross-Validation
    alphas = np.logspace(-3, 3, 20)
    ridge = RidgeCV(alphas=alphas)
    ridge.fit(X, y)

    y_pred_ridge = np.clip(ridge.predict(X), 0.0, 100.0)
    ridge_mae = mean_absolute_error(y, y_pred_ridge)
    ridge_rmse = root_mean_squared_error(y, y_pred_ridge)
    ridge_r = float(np.corrcoef(y, y_pred_ridge)[0, 1])

    print("\n--- MODEL 1: RIDGE REGRESSION ---")
    print(f" Best Regularization Alpha: {ridge.alpha_:.4f}")
    print(f" Intercept (Bias):          {ridge.intercept_:.4f}")
    print(" Feature Weights:")
    for name, weight in zip(FEATURE_NAMES, ridge.coef_):
        print(f"   - {name:<26}: {weight:+.4f}")
    print(f" MAE:  {ridge_mae:.2f} points")
    print(f" RMSE: {ridge_rmse:.2f} points")
    print(f" r:    {ridge_r:.4f}")

    # 2. Lightweight Multi-Layer Perceptron (MLP)
    mlp = MLPRegressor(
        hidden_layer_sizes=(16,),
        activation='relu',
        solver='adam',
        alpha=0.01,
        max_iter=1000,
        random_state=42
    )
    mlp.fit(X, y)
    y_pred_mlp = np.clip(mlp.predict(X), 0.0, 100.0)
    mlp_mae = mean_absolute_error(y, y_pred_mlp)
    mlp_rmse = root_mean_squared_error(y, y_pred_mlp)
    mlp_r = float(np.corrcoef(y, y_pred_mlp)[0, 1])

    print("\n--- MODEL 2: LIGHTWEIGHT MLP (16 Units) ---")
    print(f" MAE:  {mlp_mae:.2f} points")
    print(f" RMSE: {mlp_rmse:.2f} points")
    print(f" r:    {mlp_r:.4f}")

    # 3. Export weights to JSON for zero-backend client-side execution
    export_data = {
        "format": "funspot_face_off_v1",
        "description": "Quantized linear weights for client-side browser expression similarity scoring",
        "feature_names": FEATURE_NAMES,
        "ridge_model": {
            "intercept": float(round(ridge.intercept_, 4)),
            "weights": [float(round(w, 4)) for w in ridge.coef_],
            "mae": float(round(ridge_mae, 2)),
            "r": float(round(ridge_r, 4))
        },
        "mlp_model": {
            "layer_1_weights": [
                [float(round(val, 4)) for val in row] for row in mlp.coefs_[0].tolist()
            ],
            "layer_1_bias": [float(round(b, 4)) for b in mlp.intercepts_[0].tolist()],
            "layer_2_weights": [
                [float(round(val, 4)) for val in row] for row in mlp.coefs_[1].tolist()
            ],
            "layer_2_bias": [float(round(b, 4)) for b in mlp.intercepts_[1].tolist()],
            "mae": float(round(mlp_mae, 2)),
            "r": float(round(mlp_r, 4))
        }
    }

    output_path = os.path.join(script_dir, "trained_weights.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2)

    print(f"\n[SUCCESS] Exported trained weights to {output_path}")
    print("Zero-backend client-side scoring weights ready for browser consumption.")

if __name__ == "__main__":
    main()

