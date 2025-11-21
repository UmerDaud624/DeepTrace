"""
Ensemble Model combining Random Forest and CNN
Uses weighted voting and stacking strategies for improved performance
"""

import os
import yaml
import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from pathlib import Path
import logging
import json
import mlflow
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, roc_curve
)
from sklearn.ensemble import StackingClassifier
from sklearn.linear_model import LogisticRegression
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CNNWrapper:
    """Wrapper to make CNN compatible with ensemble"""
    
    def __init__(self, model, device):
        self.model = model
        self.device = device
        self.model.eval()
    
    def predict_proba(self, X, batch_size=32):
        """Predict probabilities for ensemble with batch processing"""
        self.model.eval()
        
        all_probs = []
        
        # Process in batches to avoid OOM
        for i in range(0, len(X), batch_size):
            batch = X[i:i + batch_size]
            X_tensor = torch.FloatTensor(batch).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(X_tensor)
                probs = torch.softmax(outputs, dim=1)
                all_probs.append(probs.cpu().numpy())
            
            # Clear cache every few batches
            if i % (batch_size * 10) == 0:
                torch.cuda.empty_cache()
        
        return np.vstack(all_probs)
    
    def predict(self, X):
        """Predict classes for ensemble"""
        probs = self.predict_proba(X)
        return np.argmax(probs, axis=1)


class EnsembleModel:
    """Ensemble model combining Random Forest and CNN"""
    
    def __init__(self, rf_model, cnn_model, device, strategy='weighted_voting'):
        """
        Initialize ensemble
        
        Args:
            rf_model: Trained Random Forest model
            cnn_model: Trained CNN model
            device: PyTorch device
            strategy: 'weighted_voting' or 'stacking'
        """
        self.rf_model = rf_model
        self.cnn_wrapper = CNNWrapper(cnn_model, device)
        self.device = device
        self.strategy = strategy
        
        # Weights for weighted voting (tuned based on validation performance)
        self.rf_weight = 0.3
        self.cnn_weight = 0.7
        
        logger.info(f"Initialized ensemble with strategy: {strategy}")
        logger.info(f"Weights - RF: {self.rf_weight}, CNN: {self.cnn_weight}")
    
    def predict_proba_weighted(self, X_rf, X_cnn):
        """Weighted voting ensemble"""
        
        # Get predictions from both models
        rf_proba = self.rf_model.predict_proba(X_rf)
        cnn_proba = self.cnn_wrapper.predict_proba(X_cnn)
        
        # Weighted average
        ensemble_proba = (self.rf_weight * rf_proba + self.cnn_weight * cnn_proba)
        
        return ensemble_proba
    
    def predict_weighted(self, X_rf, X_cnn):
        """Predict classes using weighted voting"""
        proba = self.predict_proba_weighted(X_rf, X_cnn)
        return np.argmax(proba, axis=1)
    
    def predict_proba_majority(self, X_rf, X_cnn):
        """Majority voting ensemble"""
        
        rf_pred = self.rf_model.predict(X_rf)
        cnn_pred = self.cnn_wrapper.predict(X_cnn)
        
        # Majority vote
        votes = np.column_stack([rf_pred, cnn_pred])
        
        # Get probabilities
        proba = np.zeros((len(rf_pred), 2))
        for i in range(len(votes)):
            unique, counts = np.unique(votes[i], return_counts=True)
            for cls, count in zip(unique, counts):
                proba[i, cls] = count / len(votes[i])
        
        return proba
    
    def predict_majority(self, X_rf, X_cnn):
        """Predict classes using majority voting"""
        proba = self.predict_proba_majority(X_rf, X_cnn)
        return np.argmax(proba, axis=1)


class EnsembleTrainer:
    def __init__(self, params_file='params.yaml'):
        """Initialize ensemble trainer"""
        
        with open(params_file, 'r') as f:
            params = yaml.safe_load(f)
        
        self.ensemble_method = params['models']['ensemble']['method']
        self.weights = params['models']['ensemble']['weights']
        
        # Paths
        self.features_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\features')
        self.models_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\models')
        self.metrics_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\metrics')
        
        # GPU setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        logger.info(f"Initialized ensemble trainer:")
        logger.info(f"  Method: {self.ensemble_method}")
        logger.info(f"  Device: {self.device}")
    
    def load_random_forest(self):
        """Load trained Random Forest model"""
        
        model_path = self.models_path / 'random_forest_model.pkl'
        
        if not model_path.exists():
            logger.error(f"Random Forest model not found: {model_path}")
            return None
        
        logger.info(f"Loading Random Forest from: {model_path}")
        
        with open(model_path, 'rb') as f:
            rf_model = pickle.load(f)
        
        return rf_model
    
    def load_cnn(self):
        """Load trained CNN model"""
        
        from cnn_spec import AdvancedCNN
        
        model_path = self.models_path / 'cnn_best_model.pth'
        
        if not model_path.exists():
            logger.error(f"CNN model not found: {model_path}")
            return None
        
        logger.info(f"Loading CNN from: {model_path}")
        
        # Load spectrogram to get input shape
        spec_data = np.load(self.features_path / 'spectrogram_dev.npz')
        input_shape = spec_data['features'][0].shape
        
        # Initialize model
        cnn_model = AdvancedCNN(input_shape, num_classes=2)
        cnn_model.load_state_dict(torch.load(model_path))
        cnn_model = cnn_model.to(self.device)
        cnn_model.eval()
        
        return cnn_model
    
    def load_features(self, split='dev'):
        """Load features for both models"""
        
        # Load MFCC features for Random Forest
        mfcc_file = self.features_path / f'mfcc_{split}.pkl'
        with open(mfcc_file, 'rb') as f:
            mfcc_data = pickle.load(f)
        
        X_mfcc = mfcc_data['features']
        y_true = mfcc_data['labels']
        
        # Load spectrogram features for CNN
        spec_file = self.features_path / f'spectrogram_{split}.npz'
        spec_data = np.load(spec_file)
        X_spec = spec_data['features']
        
        logger.info(f"Loaded {split} features:")
        logger.info(f"  MFCC shape: {X_mfcc.shape}")
        logger.info(f"  Spectrogram shape: {X_spec.shape}")
        
        return X_mfcc, X_spec, y_true
    
    def evaluate_ensemble(self, ensemble, X_mfcc, X_spec, y_true):
        """Evaluate ensemble model"""
        
        logger.info("Evaluating ensemble...")
        
        # Predictions
        y_pred = ensemble.predict_weighted(X_mfcc, X_spec)
        y_proba = ensemble.predict_proba_weighted(X_mfcc, X_spec)[:, 1]
        
        # Calculate metrics
        accuracy = accuracy_score(y_true, y_pred)
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        roc_auc = roc_auc_score(y_true, y_proba)
        
        # EER
        fpr, tpr, thresholds = roc_curve(y_true, y_proba)
        fnr = 1 - tpr
        eer_idx = np.nanargmin(np.absolute(fnr - fpr))
        eer = fpr[eer_idx]
        
        # Confusion matrix
        cm = confusion_matrix(y_true, y_pred)
        
        logger.info(f"\nEnsemble Results:")
        logger.info(f"  Accuracy:  {accuracy:.4f}")
        logger.info(f"  Precision: {precision:.4f}")
        logger.info(f"  Recall:    {recall:.4f}")
        logger.info(f"  F1 Score:  {f1:.4f}")
        logger.info(f"  ROC AUC:   {roc_auc:.4f}")
        logger.info(f"  EER:       {eer:.4f}")
        logger.info(f"\nConfusion Matrix:")
        logger.info(f"  TN: {cm[0,0]:6d}  FP: {cm[0,1]:6d}")
        logger.info(f"  FN: {cm[1,0]:6d}  TP: {cm[1,1]:6d}")
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc),
            'eer': float(eer),
            'confusion_matrix': cm.tolist()
        }
        
        return metrics, y_pred, y_proba
    
    def compare_models(self, rf_model, cnn_wrapper, ensemble, X_mfcc, X_spec, y_true):
        """Compare individual models with ensemble"""
        
        logger.info("\nComparing models...")
        
        # Random Forest
        rf_pred = rf_model.predict(X_mfcc)
        rf_proba = rf_model.predict_proba(X_mfcc)[:, 1]
        rf_acc = accuracy_score(y_true, rf_pred)
        rf_eer = self.calculate_eer(y_true, rf_proba)
        
        # CNN
        cnn_pred = cnn_wrapper.predict(X_spec)
        cnn_proba = cnn_wrapper.predict_proba(X_spec)[:, 1]
        cnn_acc = accuracy_score(y_true, cnn_pred)
        cnn_eer = self.calculate_eer(y_true, cnn_proba)
        
        # Ensemble
        ens_pred = ensemble.predict_weighted(X_mfcc, X_spec)
        ens_proba = ensemble.predict_proba_weighted(X_mfcc, X_spec)[:, 1]
        ens_acc = accuracy_score(y_true, ens_pred)
        ens_eer = self.calculate_eer(y_true, ens_proba)
        
        comparison = pd.DataFrame({
            'Model': ['Random Forest', 'CNN', 'Ensemble'],
            'Accuracy': [rf_acc, cnn_acc, ens_acc],
            'EER': [rf_eer, cnn_eer, ens_eer]
        })
        
        logger.info("\nModel Comparison:")
        logger.info(f"\n{comparison.to_string(index=False)}")
        
        return comparison
    
    def calculate_eer(self, y_true, y_scores):
        """Calculate Equal Error Rate"""
        fpr, tpr, _ = roc_curve(y_true, y_scores)
        fnr = 1 - tpr
        eer_idx = np.nanargmin(np.absolute(fnr - fpr))
        return fpr[eer_idx]
    
    def plot_comparison(self, comparison, save_path):
        """Plot model comparison"""
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        # Accuracy comparison
        ax1.bar(comparison['Model'], comparison['Accuracy'])
        ax1.set_ylabel('Accuracy')
        ax1.set_title('Model Accuracy Comparison')
        ax1.set_ylim([0.9, 1.0])
        for i, v in enumerate(comparison['Accuracy']):
            ax1.text(i, v + 0.002, f'{v:.4f}', ha='center')
        
        # EER comparison
        ax2.bar(comparison['Model'], comparison['EER'])
        ax2.set_ylabel('EER')
        ax2.set_title('Model EER Comparison (Lower is Better)')
        for i, v in enumerate(comparison['EER']):
            ax2.text(i, v + 0.002, f'{v:.4f}', ha='center')
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Saved comparison plot to: {save_path}")
    
    def save_ensemble(self, ensemble, filename='ensemble_model.pkl'):
        """Save ensemble model"""
        
        save_path = self.models_path / filename
        
        ensemble_data = {
            'rf_weight': ensemble.rf_weight,
            'cnn_weight': ensemble.cnn_weight,
            'strategy': ensemble.strategy
        }
        
        with open(save_path, 'wb') as f:
            pickle.dump(ensemble_data, f)
        
        logger.info(f"Saved ensemble configuration to: {save_path}")


def main():
    """Main execution function"""
    logger.info("Starting ensemble model training...")
    
    trainer = EnsembleTrainer()
    
    # Start MLflow experiment
    mlflow.set_experiment("DeepTrace-Ensemble")
    
    with mlflow.start_run(run_name="Ensemble_Weighted_Voting"):
        
        # Load models
        logger.info("\n" + "="*70)
        logger.info("Loading Models")
        logger.info("="*70)
        
        rf_model = trainer.load_random_forest()
        cnn_model = trainer.load_cnn()
        
        if rf_model is None or cnn_model is None:
            logger.error("Failed to load models. Exiting.")
            return
        
        # Load features
        logger.info("\n" + "="*70)
        logger.info("Loading Features")
        logger.info("="*70)
        
        X_mfcc, X_spec, y_true = trainer.load_features('dev')
        
        # Create ensemble
        logger.info("\n" + "="*70)
        logger.info("Creating Ensemble")
        logger.info("="*70)
        
        ensemble = EnsembleModel(
            rf_model, 
            cnn_model, 
            trainer.device,
            strategy='weighted_voting'
        )
        
        # Log parameters
        mlflow.log_param("rf_weight", ensemble.rf_weight)
        mlflow.log_param("cnn_weight", ensemble.cnn_weight)
        mlflow.log_param("strategy", ensemble.strategy)
        
        # Evaluate ensemble
        logger.info("\n" + "="*70)
        logger.info("Evaluating Ensemble")
        logger.info("="*70)
        
        metrics, y_pred, y_proba = trainer.evaluate_ensemble(
            ensemble, X_mfcc, X_spec, y_true
        )
        
        # Log metrics
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                mlflow.log_metric(key, value)
        
        # Compare models
        logger.info("\n" + "="*70)
        logger.info("Model Comparison")
        logger.info("="*70)
        
        comparison = trainer.compare_models(
            rf_model, ensemble.cnn_wrapper, ensemble,
            X_mfcc, X_spec, y_true
        )
        
        # Save comparison plot
        comp_path = trainer.metrics_path / 'model_comparison.png'
        trainer.plot_comparison(comparison, comp_path)
        mlflow.log_artifact(str(comp_path))
        
        # Save metrics
        metrics_path = trainer.metrics_path / 'ensemble_metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        mlflow.log_artifact(str(metrics_path))
        
        # Save ensemble
        trainer.save_ensemble(ensemble)
        
        logger.info("\n" + "="*70)
        logger.info("[OK] Ensemble training completed!")
        logger.info("="*70)


if __name__ == "__main__":
    main()