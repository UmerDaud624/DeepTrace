"""
Advanced Random Forest Classifier for MFCC Features
Includes class balancing, hyperparameter optimization, and comprehensive evaluation
"""

import os
import yaml
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import logging
import json
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report, roc_auc_score, roc_curve
)
from sklearn.model_selection import cross_val_score
from imblearn.over_sampling import SMOTE
from imblearn.combine import SMOTETomek
import matplotlib.pyplot as plt
import seaborn as sns

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RandomForestTrainer:
    def __init__(self, params_file='params.yaml'):
        """Initialize Random Forest trainer with parameters"""
        
        with open(params_file, 'r') as f:
            params = yaml.safe_load(f)
        
        # Model parameters
        self.n_estimators = params['models']['random_forest']['n_estimators']
        self.max_depth = params['models']['random_forest']['max_depth']
        self.min_samples_split = params['models']['random_forest']['min_samples_split']
        self.min_samples_leaf = params['models']['random_forest']['min_samples_leaf']
        self.max_features = params['models']['random_forest']['max_features']
        self.random_state = params['models']['random_forest']['random_state']
        self.n_jobs = params['models']['random_forest']['n_jobs']
        
        # Training parameters
        self.use_class_weights = params['training']['use_class_weights']
        
        # Paths
        self.features_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\features')
        self.models_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\models')
        self.metrics_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\metrics')
        
        self.models_path.mkdir(parents=True, exist_ok=True)
        self.metrics_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initialized Random Forest trainer with:")
        logger.info(f"  n_estimators: {self.n_estimators}")
        logger.info(f"  max_depth: {self.max_depth}")
        logger.info(f"  max_features: {self.max_features}")
        logger.info(f"  Use class weights: {self.use_class_weights}")
    
    def load_features(self, split='train'):
        """Load MFCC features from pickle file"""
        
        feature_file = self.features_path / f'mfcc_{split}.pkl'
        
        if not feature_file.exists():
            logger.error(f"Feature file not found: {feature_file}")
            return None, None
        
        logger.info(f"Loading features from: {feature_file}")
        
        with open(feature_file, 'rb') as f:
            data = pickle.load(f)
        
        features = data['features']
        labels = data['labels']
        
        logger.info(f"Loaded {split} features shape: {features.shape}")
        logger.info(f"Loaded {split} labels shape: {labels.shape}")
        
        return features, labels
    
    def apply_smote(self, X_train, y_train):
        """Apply SMOTE for handling class imbalance"""
        
        logger.info("Applying SMOTE for class balancing...")
        logger.info(f"Before SMOTE - Class distribution: {np.bincount(y_train)}")
        
        # Use SMOTETomek (SMOTE + Tomek links) for better results
        smote_tomek = SMOTETomek(random_state=self.random_state)
        X_resampled, y_resampled = smote_tomek.fit_resample(X_train, y_train)
        
        logger.info(f"After SMOTE - Class distribution: {np.bincount(y_resampled)}")
        logger.info(f"New training size: {X_resampled.shape[0]}")
        
        return X_resampled, y_resampled
    
    def calculate_class_weights(self, y_train):
        """Calculate class weights for imbalanced dataset"""
        
        from sklearn.utils.class_weight import compute_class_weight
        
        classes = np.unique(y_train)
        weights = compute_class_weight('balanced', classes=classes, y=y_train)
        class_weight_dict = dict(zip(classes, weights))
        
        logger.info(f"Calculated class weights: {class_weight_dict}")
        
        return class_weight_dict
    
    def train_model(self, X_train, y_train, use_smote=True):
        """Train Random Forest model"""
        
        logger.info("Training Random Forest model...")
        
        # Apply SMOTE if enabled
        if use_smote:
            X_train, y_train = self.apply_smote(X_train, y_train)
        
        # Calculate class weights
        class_weights = None
        if self.use_class_weights and not use_smote:
            class_weights = self.calculate_class_weights(y_train)
        
        # Initialize model
        model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            min_samples_split=self.min_samples_split,
            min_samples_leaf=self.min_samples_leaf,
            max_features=self.max_features,
            random_state=self.random_state,
            n_jobs=self.n_jobs,
            class_weight=class_weights,
            verbose=1
        )
        
        # Train model
        model.fit(X_train, y_train)
        
        logger.info("Model training completed!")
        
        return model
    
    def evaluate_model(self, model, X_test, y_test, split_name='dev'):
        """Comprehensive model evaluation"""
        
        logger.info(f"Evaluating model on {split_name} set...")
        
        # Predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # ROC AUC
        try:
            roc_auc = roc_auc_score(y_test, y_pred_proba)
        except:
            roc_auc = 0.0
        
        # Equal Error Rate (EER)
        eer = self.calculate_eer(y_test, y_pred_proba)
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Log metrics
        logger.info(f"\n{split_name.upper()} Set Results:")
        logger.info(f"  Accuracy:  {accuracy:.4f}")
        logger.info(f"  Precision: {precision:.4f}")
        logger.info(f"  Recall:    {recall:.4f}")
        logger.info(f"  F1 Score:  {f1:.4f}")
        logger.info(f"  ROC AUC:   {roc_auc:.4f}")
        logger.info(f"  EER:       {eer:.4f}")
        logger.info(f"\nConfusion Matrix:")
        logger.info(f"  TN: {cm[0,0]:6d}  FP: {cm[0,1]:6d}")
        logger.info(f"  FN: {cm[1,0]:6d}  TP: {cm[1,1]:6d}")
        
        # Store metrics
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc),
            'eer': float(eer),
            'confusion_matrix': cm.tolist(),
            'classification_report': classification_report(y_test, y_pred, output_dict=True)
        }
        
        return metrics, y_pred, y_pred_proba
    
    def calculate_eer(self, y_true, y_scores):
        """Calculate Equal Error Rate"""
        
        fpr, tpr, thresholds = roc_curve(y_true, y_scores, pos_label=1)
        fnr = 1 - tpr
        
        # Find EER point
        eer_threshold_idx = np.nanargmin(np.absolute(fnr - fpr))
        eer = fpr[eer_threshold_idx]
        
        return eer
    
    def plot_confusion_matrix(self, cm, save_path):
        """Plot confusion matrix"""
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=['Spoof', 'Bonafide'],
                    yticklabels=['Spoof', 'Bonafide'])
        plt.title('Confusion Matrix - Random Forest')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Saved confusion matrix to: {save_path}")
    
    def plot_roc_curve(self, y_true, y_scores, save_path):
        """Plot ROC curve"""
        
        fpr, tpr, thresholds = roc_curve(y_true, y_scores)
        roc_auc = roc_auc_score(y_true, y_scores)
        
        plt.figure(figsize=(8, 6))
        plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.3f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('ROC Curve - Random Forest')
        plt.legend(loc="lower right")
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Saved ROC curve to: {save_path}")
    
    def plot_feature_importance(self, model, save_path, top_n=20):
        """Plot feature importance"""
        
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1][:top_n]
        
        plt.figure(figsize=(10, 8))
        plt.title(f'Top {top_n} Feature Importances - Random Forest')
        plt.barh(range(top_n), importances[indices])
        plt.yticks(range(top_n), [f'Feature {i}' for i in indices])
        plt.xlabel('Importance')
        plt.gca().invert_yaxis()
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Saved feature importance to: {save_path}")
    
    def save_model(self, model, filename='random_forest_model.pkl'):
        """Save trained model"""
        
        model_path = self.models_path / filename
        
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        logger.info(f"Saved model to: {model_path}")
        
        return model_path
    
    def save_metrics(self, metrics, filename='rf_metrics.json'):
        """Save metrics to JSON file"""
        
        metrics_path = self.metrics_path / filename
        
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"Saved metrics to: {metrics_path}")


def main():
    """Main execution function"""
    logger.info("Starting Random Forest training pipeline...")
    
    # Initialize trainer
    trainer = RandomForestTrainer()
    
    # Start MLflow experiment
    mlflow.set_experiment("DeepTrace-RandomForest")
    
    with mlflow.start_run(run_name="RF_MFCC_SMOTE"):
        
        # Load features
        logger.info("\n" + "="*70)
        logger.info("Loading Features")
        logger.info("="*70)
        
        X_train, y_train = trainer.load_features('train')
        X_dev, y_dev = trainer.load_features('dev')
        
        if X_train is None or X_dev is None:
            logger.error("Failed to load features. Exiting.")
            return
        
        # Log dataset info
        mlflow.log_param("train_samples", len(X_train))
        mlflow.log_param("dev_samples", len(X_dev))
        mlflow.log_param("n_features", X_train.shape[1])
        
        # Train model
        logger.info("\n" + "="*70)
        logger.info("Training Model")
        logger.info("="*70)
        
        model = trainer.train_model(X_train, y_train, use_smote=True)
        
        # Log model parameters
        mlflow.log_param("n_estimators", trainer.n_estimators)
        mlflow.log_param("max_depth", trainer.max_depth)
        mlflow.log_param("max_features", trainer.max_features)
        mlflow.log_param("use_smote", True)
        
        # Evaluate on training set
        logger.info("\n" + "="*70)
        logger.info("Evaluation")
        logger.info("="*70)
        
        train_metrics, _, _ = trainer.evaluate_model(model, X_train, y_train, 'train')
        dev_metrics, y_pred, y_pred_proba = trainer.evaluate_model(model, X_dev, y_dev, 'dev')
        
        # Log metrics to MLflow
        for key, value in dev_metrics.items():
            if isinstance(value, (int, float)):
                mlflow.log_metric(f"dev_{key}", value)
        
        # Save visualizations
        logger.info("\n" + "="*70)
        logger.info("Saving Visualizations")
        logger.info("="*70)
        
        cm_path = trainer.metrics_path / 'rf_confusion_matrix.png'
        trainer.plot_confusion_matrix(dev_metrics['confusion_matrix'], cm_path)
        mlflow.log_artifact(str(cm_path))
        
        roc_path = trainer.metrics_path / 'rf_roc_curve.png'
        trainer.plot_roc_curve(y_dev, y_pred_proba, roc_path)
        mlflow.log_artifact(str(roc_path))
        
        fi_path = trainer.metrics_path / 'rf_feature_importance.png'
        trainer.plot_feature_importance(model, fi_path)
        mlflow.log_artifact(str(fi_path))
        
        # Save model
        model_path = trainer.save_model(model)
        mlflow.sklearn.log_model(model, "random_forest_model")
        
        # Save metrics
        all_metrics = {
            'train': train_metrics,
            'dev': dev_metrics
        }
        trainer.save_metrics(all_metrics)
        
        logger.info("\n" + "="*70)
        logger.info("[OK] Random Forest training completed!")
        logger.info("="*70)
        logger.info(f"\nModel saved to: {model_path}")
        logger.info(f"Metrics saved to: {trainer.metrics_path}")


if __name__ == "__main__":
    main()