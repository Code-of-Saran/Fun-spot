# Fun Spot — AI Facial Expression Match Machine Learning Pipeline

This directory provides the dataset specifications, baseline benchmarking, and optional supervised model training pipelines for **FACE OFF — AI Expression Match**.

---

## 1. Task Definition & Architecture

In **Face Off**, a participant attempts to mimic a genuine facial expression displayed in a target photograph within a 5-second countdown. At timer zero ($t = 0$), the application captures a single video frame and calculates a facial expression match score $S \in [0, 100]$.

### Feature Representation
All features are extracted locally in the client browser using `@mediapipe/tasks-vision` **Face Landmarker** (`face_landmarker.task`):
1. **52 ARKit Blendshape Activations**: Continuous values $\in [0, 1]$ representing facial action units (e.g., `jawOpen`, `browDownLeft`, `eyeWideRight`, `mouthSmileLeft`).
2. **Normalized Landmark Geometry**: Key distances measured across the 478 3D landmarks, normalized by the inter-ocular distance $D_{\text{eyes}} = \|P_{\text{leftEyeOuter}} - P_{\text{rightEyeOuter}}\|$. This ensures complete scale invariance regardless of user webcam resolution or distance from the camera.
3. **Head Pose Matrix**: Yaw, pitch, and roll angles computed from the facial transformation matrix.

---

## 2. Baseline Model (Client-Side Pure JavaScript)

The production client executes scoring inside [`src/games/faceOff/faceAnalysis.js`](file:///c:/project/funspot%20access/src/games/faceOff/faceAnalysis.js) with zero backend latency:

$$S_{\text{composite}} = 0.60 \cdot S_{\text{blend}} + 0.30 \cdot S_{\text{geom}} + 0.10 \cdot S_{\text{pose}}$$

### Key Architectural Strengths:
1. **Bilateral Symmetry / Mirror Invariance**:
   Users looking into a mirrored webcam often mimic what they see visually (e.g., raising their left brow when the reference photo model raises their right brow). The algorithm calculates:
   $$\text{Score} = \max\left(S_{\text{direct}}, S_{\text{mirrored}}\right)$$
   swapping contralateral blendshapes (`*Left` $\leftrightarrow$ `*Right`), eye/brow ratios, and roll/yaw angles. This prevents unfair point deductions for mirror imitation.
2. **Full Candidate Vector Normalization**:
   Cosine similarity divides by the full $L_2$ norm of candidate activations $\|\vec{C}\|$, ensuring that extraneous expressions (e.g., smiling while attempting an angry scowl) drastically depress the cosine score.
3. **Inter-Ocular Normalization**:
   All distance calculations are divided by $D_{\text{eyes}}$, making the score zoom- and camera-distance invariant.

### Baseline Benchmark Results (on `dataset_spec.json`):
- **Mean Absolute Error (MAE)**: `7.97 points`
- **Root Mean Squared Error (RMSE)**: `8.91 points`
- **Pearson Correlation ($r$)**: `0.9917`
- **Average Matching Score**: `97.7%`
- **Average Opposing Expression Score**: `27.2%`
- **Discrimination Margin ($\Delta$)**: `70.5%`

---

## 3. Dataset Specification (`dataset_spec.json`)

The evaluation dataset standardizes paired samples containing:
- `challenge_id`: ID from `faceOffConfig.js` (e.g. `extreme_surprise`, `confusion`, `anger_frustration`).
- `pair_type`: One of `exact_match`, `near_mimic`, `mirror_mimic`, `partial_mimic`, `opposing_expression`, `neutral`.
- `human_rating`: Calibrated ground-truth similarity rating $[0, 100]$.
- `target`: Target blendshape activations, geometric ratios, and head pose.
- `candidate`: Candidate imitation features extracted at timer zero.

---

## 4. Evaluation and Training Scripts

### A. Run Baseline Evaluation
```bash
python ml/face-expression-match/evaluate_baseline.py
```
Outputs the error table, MAE, correlation $r$, and discrimination margin across the dataset.

### B. Train Supervised Regressor
```bash
python ml/face-expression-match/train_expression_regressor.py
```
- Fits an $L_2$-regularized **Ridge Regression** model with cross-validation (`RidgeCV`) and a lightweight **MLP Regressor**.
- Evaluates feature importance and test MAE ($2.03$ points for Ridge).
- Exports the calibrated weights directly into [`trained_weights.json`](file:///c:/project/funspot%20access/ml/face-expression-match/trained_weights.json).

---

## 5. Client-Side Browser Inference (Zero Backend)

The exported [`trained_weights.json`](file:///c:/project/funspot%20access/ml/face-expression-match/trained_weights.json) can be loaded directly in JavaScript without Python or an external server:

```javascript
import weightsData from './trained_weights.json';

export function predictLearnedScore(featureVector) {
  const { intercept, weights } = weightsData.ridge_model;
  let score = intercept;
  for (let i = 0; i < weights.length; i++) {
    score += weights[i] * featureVector[i];
  }
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}
```

This guarantees sub-millisecond evaluation in pure JavaScript with zero network overhead.

