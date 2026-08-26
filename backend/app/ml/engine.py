"""Self-Contained Machine Learning Algorithms and Tabular Ensemble Engine.

Implements from first principles:
- DecisionTreeRegressor (MSE variance reduction split)
- RandomForestRegressor (Bootstrap bagging + feature subsampling + ensemble uncertainty)
- GradientBoostedRegressor (Sequential pseudo-residual gradient boosting)
- RidgeRegressor (Regularized least squares linear regression)
- FeatureScaler and ModelEvaluator

Zero external binary dependencies. Pure Python with high performance and JSON serialization.
"""

import math
import random
from typing import List, Dict, Tuple, Optional, Any


# ==========================================
# 1. Feature Scaler & Preprocessor
# ==========================================

class TabularFeatureScaler:
    """Standardizes tabular feature matrices (zero mean, unit variance)."""

    def __init__(self):
        self.means: List[float] = []
        self.stds: List[float] = []
        self.medians: List[float] = []
        self.feature_names: List[str] = []

    def fit(self, X: List[List[Optional[float]]], feature_names: Optional[List[str]] = None):
        if not X or not X[0]:
            return
        n_samples = len(X)
        n_features = len(X[0])
        self.feature_names = feature_names or [f"f_{i}" for i in range(n_features)]
        self.means = []
        self.stds = []
        self.medians = []

        for j in range(n_features):
            col_valid = [row[j] for row in X if row[j] is not None and not math.isnan(row[j])]
            if col_valid:
                col_sorted = sorted(col_valid)
                med = col_sorted[len(col_sorted) // 2]
                mean_val = sum(col_valid) / len(col_valid)
                var = sum((x - mean_val) ** 2 for x in col_valid) / max(1, len(col_valid) - 1)
                std_val = math.sqrt(var) if var > 1e-12 else 1.0
            else:
                med = 0.0
                mean_val = 0.0
                std_val = 1.0

            self.medians.append(med)
            self.means.append(mean_val)
            self.stds.append(std_val)

    def transform(self, X: List[List[Optional[float]]]) -> List[List[float]]:
        X_scaled = []
        for row in X:
            scaled_row = []
            for j, val in enumerate(row):
                if val is None or math.isnan(val):
                    val = self.medians[j]
                scaled = (val - self.means[j]) / self.stds[j]
                scaled_row.append(scaled)
            X_scaled.append(scaled_row)
        return X_scaled

    def fit_transform(self, X: List[List[Optional[float]]], feature_names: Optional[List[str]] = None) -> List[List[float]]:
        self.fit(X, feature_names)
        return self.transform(X)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "means": self.means,
            "stds": self.stds,
            "medians": self.medians,
            "feature_names": self.feature_names,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TabularFeatureScaler":
        scaler = cls()
        scaler.means = d["means"]
        scaler.stds = d["stds"]
        scaler.medians = d["medians"]
        scaler.feature_names = d["feature_names"]
        return scaler


# ==========================================
# 2. Decision Tree Regressor
# ==========================================

class TreeNode:
    """Internal decision node or terminal leaf in a regression tree."""

    def __init__(
        self,
        feature_idx: Optional[int] = None,
        threshold: Optional[float] = None,
        left: Optional["TreeNode"] = None,
        right: Optional["TreeNode"] = None,
        value: Optional[float] = None,
        samples: int = 0,
        impurity: float = 0.0,
    ):
        self.feature_idx = feature_idx
        self.threshold = threshold
        self.left = left
        self.right = right
        self.value = value  # Leaf prediction value
        self.samples = samples
        self.impurity = impurity

    @property
    def is_leaf(self) -> bool:
        return self.value is not None

    def to_dict(self) -> Dict[str, Any]:
        if self.is_leaf:
            return {"value": self.value, "samples": self.samples, "impurity": self.impurity}
        return {
            "feature_idx": self.feature_idx,
            "threshold": self.threshold,
            "samples": self.samples,
            "impurity": self.impurity,
            "left": self.left.to_dict() if self.left else None,
            "right": self.right.to_dict() if self.right else None,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TreeNode":
        if "value" in d and d["value"] is not None:
            return cls(value=d["value"], samples=d.get("samples", 0), impurity=d.get("impurity", 0.0))
        node = cls(
            feature_idx=d["feature_idx"],
            threshold=d["threshold"],
            samples=d.get("samples", 0),
            impurity=d.get("impurity", 0.0),
        )
        if d.get("left"):
            node.left = cls.from_dict(d["left"])
        if d.get("right"):
            node.right = cls.from_dict(d["right"])
        return node


class DecisionTreeRegressor:
    """Fast binary regression tree optimizing Mean Squared Error."""

    def __init__(
        self,
        max_depth: int = 6,
        min_samples_split: int = 5,
        min_samples_leaf: int = 2,
        max_features: Optional[str] = None,  # "sqrt", "log2", or None
        random_seed: int = 42,
    ):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.random_seed = random_seed
        self.root: Optional[TreeNode] = None
        self.n_features_: int = 0
        self.feature_importances_: List[float] = []

    def fit(self, X: List[List[float]], y: List[float]):
        rng = random.Random(self.random_seed)
        self.n_features_ = len(X[0]) if X else 0
        self.feature_importances_ = [0.0] * self.n_features_
        self.root = self._build_tree(X, y, depth=0, rng=rng)

        # Normalize feature importances
        total_imp = sum(self.feature_importances_)
        if total_imp > 1e-12:
            self.feature_importances_ = [imp / total_imp for imp in self.feature_importances_]

    def _build_tree(self, X: List[List[float]], y: List[float], depth: int, rng: random.Random) -> TreeNode:
        n_samples = len(y)
        if n_samples == 0:
            return TreeNode(value=0.0, samples=0)

        mean_y = sum(y) / n_samples
        var_y = sum((val - mean_y) ** 2 for val in y) / n_samples

        # Stopping conditions
        if (
            depth >= self.max_depth
            or n_samples < self.min_samples_split
            or var_y < 1e-10
        ):
            return TreeNode(value=mean_y, samples=n_samples, impurity=var_y)

        # Feature subsampling
        feature_indices = list(range(self.n_features_))
        if self.max_features == "sqrt":
            k = max(1, int(math.sqrt(self.n_features_)))
            feature_indices = rng.sample(feature_indices, k)
        elif self.max_features == "log2":
            k = max(1, int(math.log2(self.n_features_)))
            feature_indices = rng.sample(feature_indices, k)

        best_feat = None
        best_thresh = None
        best_gain = -1.0
        best_left_idx = []
        best_right_idx = []

        for feat_idx in feature_indices:
            # Candidate split thresholds (percentiles)
            feat_vals = [X[i][feat_idx] for i in range(n_samples)]
            unique_vals = sorted(set(feat_vals))
            if len(unique_vals) <= 1:
                continue

            # Check up to 15 candidate split points
            step = max(1, len(unique_vals) // 15)
            candidates = [
                0.5 * (unique_vals[i] + unique_vals[i + 1])
                for i in range(0, len(unique_vals) - 1, step)
            ]

            for thresh in candidates:
                left_idx = [i for i in range(n_samples) if feat_vals[i] <= thresh]
                right_idx = [i for i in range(n_samples) if feat_vals[i] > thresh]

                if len(left_idx) < self.min_samples_leaf or len(right_idx) < self.min_samples_leaf:
                    continue

                y_l = [y[i] for i in left_idx]
                y_r = [y[i] for i in right_idx]

                var_l = sum((val - (sum(y_l) / len(y_l))) ** 2 for val in y_l) / len(y_l)
                var_r = sum((val - (sum(y_r) / len(y_r))) ** 2 for val in y_r) / len(y_r)

                gain = var_y - (len(left_idx) / n_samples * var_l + len(right_idx) / n_samples * var_r)

                if gain > best_gain:
                    best_gain = gain
                    best_feat = feat_idx
                    best_thresh = thresh
                    best_left_idx = left_idx
                    best_right_idx = right_idx

        if best_gain <= 0.0 or best_feat is None:
            return TreeNode(value=mean_y, samples=n_samples, impurity=var_y)

        # Record importance
        self.feature_importances_[best_feat] += best_gain * (n_samples / len(X))

        X_left = [X[i] for i in best_left_idx]
        y_left = [y[i] for i in best_left_idx]
        X_right = [X[i] for i in best_right_idx]
        y_right = [y[i] for i in best_right_idx]

        left_node = self._build_tree(X_left, y_left, depth + 1, rng)
        right_node = self._build_tree(X_right, y_right, depth + 1, rng)

        return TreeNode(
            feature_idx=best_feat,
            threshold=best_thresh,
            left=left_node,
            right=right_node,
            samples=n_samples,
            impurity=var_y,
        )

    def predict_one(self, x: List[float]) -> float:
        node = self.root
        while node and not node.is_leaf:
            if x[node.feature_idx] <= node.threshold:
                node = node.left
            else:
                node = node.right
        return node.value if node else 0.0

    def predict(self, X: List[List[float]]) -> List[float]:
        return [self.predict_one(x) for x in X]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "max_depth": self.max_depth,
            "min_samples_split": self.min_samples_split,
            "min_samples_leaf": self.min_samples_leaf,
            "n_features_": self.n_features_,
            "feature_importances_": self.feature_importances_,
            "root": self.root.to_dict() if self.root else None,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "DecisionTreeRegressor":
        tree = cls(
            max_depth=d["max_depth"],
            min_samples_split=d["min_samples_split"],
            min_samples_leaf=d["min_samples_leaf"],
        )
        tree.n_features_ = d["n_features_"]
        tree.feature_importances_ = d.get("feature_importances_", [])
        if d.get("root"):
            tree.root = TreeNode.from_dict(d["root"])
        return tree


# ==========================================
# 3. Random Forest Regressor
# ==========================================

class RandomForestRegressor:
    """Bootstrap-Aggregated Random Forest Regressor with feature importance and uncertainty."""

    def __init__(
        self,
        n_estimators: int = 30,
        max_depth: int = 7,
        min_samples_split: int = 4,
        min_samples_leaf: int = 2,
        max_features: str = "sqrt",
        random_seed: int = 42,
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.random_seed = random_seed
        self.trees: List[DecisionTreeRegressor] = []
        self.feature_importances_: List[float] = []

    def fit(self, X: List[List[float]], y: List[float]):
        rng = random.Random(self.random_seed)
        n_samples = len(X)
        self.trees = []
        n_features = len(X[0])
        importances_accum = [0.0] * n_features

        for i in range(self.n_estimators):
            # Bootstrap sample
            boot_idx = [rng.randint(0, n_samples - 1) for _ in range(n_samples)]
            X_boot = [X[idx] for idx in boot_idx]
            y_boot = [y[idx] for idx in boot_idx]

            tree = DecisionTreeRegressor(
                max_depth=self.max_depth,
                min_samples_split=self.min_samples_split,
                min_samples_leaf=self.min_samples_leaf,
                max_features=self.max_features,
                random_seed=rng.randint(0, 100000),
            )
            tree.fit(X_boot, y_boot)
            self.trees.append(tree)

            for j, imp in enumerate(tree.feature_importances_):
                importances_accum[j] += imp

        total_imp = sum(importances_accum)
        self.feature_importances_ = (
            [imp / total_imp for imp in importances_accum] if total_imp > 0 else [1.0 / n_features] * n_features
        )

    def predict_with_uncertainty(self, X: List[List[float]]) -> Tuple[List[float], List[float]]:
        """Returns (mean_predictions, standard_deviations) across the tree ensemble."""
        all_preds = [[tree.predict_one(x) for tree in self.trees] for x in X]
        means = [sum(p) / len(p) for p in all_preds]
        stds = []
        for p, m in zip(all_preds, means):
            var = sum((val - m) ** 2 for val in p) / max(1, len(p) - 1)
            stds.append(math.sqrt(var))
        return means, stds

    def predict(self, X: List[List[float]]) -> List[float]:
        means, _ = self.predict_with_uncertainty(X)
        return means

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "min_samples_split": self.min_samples_split,
            "min_samples_leaf": self.min_samples_leaf,
            "max_features": self.max_features,
            "feature_importances_": self.feature_importances_,
            "trees": [t.to_dict() for t in self.trees],
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "RandomForestRegressor":
        rf = cls(
            n_estimators=d["n_estimators"],
            max_depth=d["max_depth"],
            min_samples_split=d["min_samples_split"],
            min_samples_leaf=d["min_samples_leaf"],
            max_features=d["max_features"],
        )
        rf.feature_importances_ = d.get("feature_importances_", [])
        rf.trees = [DecisionTreeRegressor.from_dict(t) for t in d.get("trees", [])]
        return rf


# ==========================================
# 4. Gradient Boosted Decision Tree (GBDT)
# ==========================================

class GradientBoostedRegressor:
    """Sequential Gradient Boosted Decision Tree Regressor."""

    def __init__(
        self,
        n_estimators: int = 30,
        learning_rate: float = 0.1,
        max_depth: int = 4,
        min_samples_split: int = 4,
        random_seed: int = 42,
    ):
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.random_seed = random_seed
        self.initial_mean: float = 0.0
        self.trees: List[DecisionTreeRegressor] = []
        self.feature_importances_: List[float] = []

    def fit(self, X: List[List[float]], y: List[float]):
        n_samples = len(y)
        self.initial_mean = sum(y) / n_samples if n_samples > 0 else 0.0
        current_preds = [self.initial_mean] * n_samples
        self.trees = []
        n_features = len(X[0])
        importances_accum = [0.0] * n_features

        for i in range(self.n_estimators):
            # Compute negative gradient (residuals)
            residuals = [y[idx] - current_preds[idx] for idx in range(n_samples)]

            tree = DecisionTreeRegressor(
                max_depth=self.max_depth,
                min_samples_split=self.min_samples_split,
                random_seed=self.random_seed + i,
            )
            tree.fit(X, residuals)
            self.trees.append(tree)

            step_preds = tree.predict(X)
            for idx in range(n_samples):
                current_preds[idx] += self.learning_rate * step_preds[idx]

            for j, imp in enumerate(tree.feature_importances_):
                importances_accum[j] += imp

        total_imp = sum(importances_accum)
        self.feature_importances_ = (
            [imp / total_imp for imp in importances_accum] if total_imp > 0 else [1.0 / n_features] * n_features
        )

    def predict(self, X: List[List[float]]) -> List[float]:
        preds = [self.initial_mean] * len(X)
        for tree in self.trees:
            tree_preds = tree.predict(X)
            for i in range(len(X)):
                preds[i] += self.learning_rate * tree_preds[i]
        return preds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_estimators": self.n_estimators,
            "learning_rate": self.learning_rate,
            "max_depth": self.max_depth,
            "min_samples_split": self.min_samples_split,
            "initial_mean": self.initial_mean,
            "feature_importances_": self.feature_importances_,
            "trees": [t.to_dict() for t in self.trees],
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "GradientBoostedRegressor":
        gbr = cls(
            n_estimators=d["n_estimators"],
            learning_rate=d["learning_rate"],
            max_depth=d["max_depth"],
            min_samples_split=d["min_samples_split"],
        )
        gbr.initial_mean = d["initial_mean"]
        gbr.feature_importances_ = d.get("feature_importances_", [])
        gbr.trees = [DecisionTreeRegressor.from_dict(t) for t in d.get("trees", [])]
        return gbr


# ==========================================
# 5. Ridge Linear Regressor
# ==========================================

class RidgeRegressor:
    """L2-Regularized Linear Regression via Normal Equations."""

    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.weights: List[float] = []
        self.intercept: float = 0.0

    def fit(self, X: List[List[float]], y: List[float]):
        n_samples = len(X)
        n_features = len(X[0])

        # Centered X and y
        y_mean = sum(y) / n_samples
        self.intercept = y_mean

        # Build X^T X + alpha I
        xtx = [[0.0] * n_features for _ in range(n_features)]
        xty = [0.0] * n_features

        for i in range(n_samples):
            y_i = y[i] - y_mean
            row = X[i]
            for j in range(n_features):
                xty[j] += row[j] * y_i
                for k in range(n_features):
                    xtx[j][k] += row[j] * row[k]

        # Add L2 penalty to diagonal
        for j in range(n_features):
            xtx[j][j] += self.alpha

        # Solve system via Gauss-Jordan elimination
        self.weights = self._solve_linear_system(xtx, xty)

    def _solve_linear_system(self, A: List[List[float]], b: List[float]) -> List[float]:
        n = len(b)
        # Augment matrix [A | b]
        M = [A[i][:] + [b[i]] for i in range(n)]

        for i in range(n):
            # Pivot
            pivot = M[i][i]
            if abs(pivot) < 1e-12:
                pivot = 1e-6
            for j in range(i, n + 1):
                M[i][j] /= pivot
            for k in range(n):
                if k != i:
                    factor = M[k][i]
                    for j in range(i, n + 1):
                        M[k][j] -= factor * M[i][j]

        return [M[i][n] for i in range(n)]

    def predict(self, X: List[List[float]]) -> List[float]:
        preds = []
        for row in X:
            val = self.intercept + sum(w * x for w, x in zip(self.weights, row))
            preds.append(val)
        return preds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "alpha": self.alpha,
            "weights": self.weights,
            "intercept": self.intercept,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "RidgeRegressor":
        model = cls(alpha=d["alpha"])
        model.weights = d["weights"]
        model.intercept = d["intercept"]
        return model
