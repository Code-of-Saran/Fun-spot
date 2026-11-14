#!/usr/bin/env python3
"""
Baseline Facial Expression Matching Evaluator for Fun Spot Face Off.
Evaluates the client-side MediaPipe scoring algorithm against benchmark datasets.
Calculates MAE, Pearson correlation (r), Spearman correlation (rho), and discrimination margins.
"""

import json
import math
import os
import sys
from typing import Dict, Any, Tuple

def mirror_features(blendshapes: Dict[str, float]) -> Dict[str, float]:
    """Mirror left and right facial blendshapes."""
    mirrored = {}
    for k, v in blendshapes.items():
        if k.endswith("Left"):
            other_key = k[:-4] + "Right"
            mirrored[other_key] = v
        elif k.endswith("Right"):
            other_key = k[:-5] + "Left"
            mirrored[other_key] = v
        else:
            mirrored[k] = v
    return mirrored

def mirror_ratios(ratios: Dict[str, float]) -> Dict[str, float]:
    """Mirror geometric ratios (e.g. left vs right brow/eye, corner tilt)."""
    m = dict(ratios)
    if "leftEyeOpenRatio" in m and "rightEyeOpenRatio" in m:
        m["leftEyeOpenRatio"], m["rightEyeOpenRatio"] = m["rightEyeOpenRatio"], m["leftEyeOpenRatio"]
    if "leftBrowRaiseRatio" in m and "rightBrowRaiseRatio" in m:
        m["leftBrowRaiseRatio"], m["rightBrowRaiseRatio"] = m["rightBrowRaiseRatio"], m["leftBrowRaiseRatio"]
    if "mouthCornerTilt" in m:
        m["mouthCornerTilt"] = -m["mouthCornerTilt"]
    return m

def mirror_pose(pose: Dict[str, float]) -> Dict[str, float]:
    """Mirror yaw and roll for visual imitation."""
    m = dict(pose)
    if "yaw" in m:
        m["yaw"] = -m["yaw"]
    if "roll" in m:
        m["roll"] = -m["roll"]
    return m

def evaluate_single_direction(c_blend: Dict[str, float],
                              t_blend: Dict[str, float],
                              target_keys: list,
                              c_ratios: Dict[str, float],
                              t_ratios: Dict[str, float],
                              c_pose: Dict[str, float],
                              t_pose: Dict[str, float]) -> Dict[str, float]:
    """Matches calculateExpressionMatch / evaluateSingleDirection in faceAnalysis.js."""
    # 1. Blendshapes (60%)
    dot_product = 0.0
    norm_t = 0.0
    manhattan_diff = 0.0

    for k in target_keys:
        tv = t_blend.get(k, 0.0)
        cv = c_blend.get(k, 0.0)
        dot_product += tv * cv
        norm_t += tv * tv
        manhattan_diff += abs(tv - cv)

    norm_t = math.sqrt(norm_t)

    norm_c = 0.0
    for v in c_blend.values():
        norm_c += (float(v) or 0.0) ** 2
    norm_c = math.sqrt(norm_c)

    cosine_sim = (dot_product / (norm_t * norm_c)) if (norm_t > 0 and norm_c > 0) else 0.0
    cosine_sim = max(0.0, min(1.0, cosine_sim))

    avg_diff = manhattan_diff / max(1, len(target_keys))
    direct_sim = max(0.0, 1.0 - avg_diff)
    blendshape_sim = max(0.0, 0.50 * direct_sim + 0.50 * cosine_sim)

    # 2. Geometric Ratios (30%)
    ratio_sim = 0.5
    ratio_keys = list(t_ratios.keys())
    if ratio_keys:
        total_ratio_diff = 0.0
        count = 0
        for k in ratio_keys:
            if k in c_ratios:
                tv = float(t_ratios[k])
                cv = float(c_ratios[k])
                diff = min(abs(tv - cv) / 0.25, 1.0)
                total_ratio_diff += diff
                count += 1
        if count > 0:
            ratio_sim = max(0.0, 1.0 - total_ratio_diff / count)

    # 3. Head Pose (10%)
    target_yaw = float(t_pose.get("yaw", 0.0))
    target_pitch = float(t_pose.get("pitch", 0.0))
    cand_yaw = float(c_pose.get("yaw", 0.0))
    cand_pitch = float(c_pose.get("pitch", 0.0))

    yaw_diff = min(abs(cand_yaw - target_yaw) / 0.35, 1.0)
    pitch_diff = min(abs(cand_pitch - target_pitch) / 0.35, 1.0)
    pose_sim = max(0.0, 1.0 - (yaw_diff * 0.6 + pitch_diff * 0.4))

    composite = 0.60 * blendshape_sim + 0.30 * ratio_sim + 0.10 * pose_sim
    return {
        "composite": composite,
        "blendshapeSim": blendshape_sim,
        "ratioSim": ratio_sim,
        "poseSim": pose_sim
    }

def predict_score(sample: Dict[str, Any]) -> Tuple[float, str]:
    """Computes bilateral score: max(direct, mirrored)."""
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

    direct_eval = evaluate_single_direction(c_blend, t_blend, target_keys, c_ratios, t_ratios, c_pose, t_pose)

    mirrored_blend = mirror_features(c_blend)
    mirrored_ratios = mirror_ratios(c_ratios)
    mirrored_pose = mirror_pose(c_pose)
    mirrored_eval = evaluate_single_direction(mirrored_blend, t_blend, target_keys, mirrored_ratios, t_ratios, mirrored_pose, t_pose)

    if mirrored_eval["composite"] > direct_eval["composite"]:
        best = mirrored_eval
        mode = "mirrored"
    else:
        best = direct_eval
        mode = "direct"

    score = round(max(0.0, min(100.0, best["composite"] * 100.0)), 1)
    return score, mode

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, "dataset_spec.json")

    if not os.path.exists(dataset_path):
        print(f"Error: dataset file not found at {dataset_path}")
        sys.exit(1)

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    samples = data.get("samples", [])
    print(f"============================================================")
    print(f" FUN SPOT - FACE OFF BASELINE MODEL EVALUATION")
    print(f" Dataset: {data.get('name')} (v{data.get('version')})")
    print(f" Total Evaluation Pairs: {len(samples)}")
    print(f"============================================================\n")

    y_true = []
    y_pred = []
    matching_scores = []
    opposing_scores = []

    print(f"{'Sample ID':<38} | {'Type':<18} | {'Human':<6} | {'Model':<6} | {'Abs Err':<7} | {'Match Mode'}")
    print("-" * 94)

    for s in samples:
        target_score = s["human_rating"]
        pred, mode = predict_score(s)
        err = abs(target_score - pred)

        y_true.append(target_score)
        y_pred.append(pred)

        pair_type = s["pair_type"]
        if pair_type in ["exact_match", "near_mimic", "mirror_mimic"]:
            matching_scores.append(pred)
        elif pair_type in ["opposing_expression", "neutral"]:
            opposing_scores.append(pred)

        print(f"{s['id']:<38} | {pair_type:<18} | {target_score:<6.1f} | {pred:<6.1f} | {err:<7.1f} | {mode}")

    # Metrics
    n = len(y_true)
    mae = sum(abs(t - p) for t, p in zip(y_true, y_pred)) / n
    mse = sum((t - p) ** 2 for t, p in zip(y_true, y_pred)) / n
    rmse = math.sqrt(mse)

    # Pearson correlation r
    mean_t = sum(y_true) / n
    mean_p = sum(y_pred) / n
    cov = sum((t - mean_t) * (p - mean_p) for t, p in zip(y_true, y_pred))
    var_t = sum((t - mean_t) ** 2 for t in y_true)
    var_p = sum((p - mean_p) ** 2 for p in y_pred)
    r = cov / (math.sqrt(var_t) * math.sqrt(var_p)) if (var_t > 0 and var_p > 0) else 0.0

    # Discrimination Margin
    avg_match = sum(matching_scores) / len(matching_scores) if matching_scores else 0.0
    avg_oppose = sum(opposing_scores) / len(opposing_scores) if opposing_scores else 0.0
    discrimination_margin = avg_match - avg_oppose

    print("\n" + "=" * 54)
    print(" EVALUATION SUMMARY METRICS")
    print("=" * 54)
    print(f" Mean Absolute Error (MAE):         {mae:.2f} points (scale 0-100)")
    print(f" Root Mean Squared Error (RMSE):    {rmse:.2f} points")
    print(f" Pearson Correlation (r):           {r:.4f}")
    print(f" Average Matching Expression Score: {avg_match:.1f}%")
    print(f" Average Opposing/Neutral Score:    {avg_oppose:.1f}%")
    print(f" Expression Discrimination Margin:  {discrimination_margin:.1f}%")
    print("=" * 54)

    # Automated check
    assert mae < 8.0, f"MAE too high: {mae:.2f} > 8.0"
    assert r > 0.95, f"Correlation too low: {r:.4f} < 0.95"
    assert discrimination_margin > 60.0, f"Discrimination too low: {discrimination_margin:.1f} < 60.0"
    print("\n[SUCCESS] Baseline algorithm passes all production quality thresholds.")

if __name__ == "__main__":
    main()
