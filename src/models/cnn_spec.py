"""
Advanced CNN Model for Spectrogram Features with GPU Support
Optimized for RTX 3050 (4GB VRAM) with mixed precision training
"""

import os
import yaml
import numpy as np
import pandas as pd
from pathlib import Path
import logging
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.cuda.amp import autocast, GradScaler
import mlflow
import mlflow.pytorch
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score, roc_curve
)
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SpectrogramDataset(Dataset):
    """PyTorch Dataset for spectrogram features"""
    
    def __init__(self, features, labels):
        self.features = torch.FloatTensor(features)
        self.labels = torch.LongTensor(labels)
    
    def __len__(self):
        return len(self.labels)
    
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]


class AdvancedCNN(nn.Module):
    """
    Advanced CNN architecture for audio deepfake detection
    Inspired by state-of-the-art models with residual connections
    """
    
    def __init__(self, input_shape, num_classes=2, dropout=0.5):
        super(AdvancedCNN, self).__init__()
        
        time_dim, freq_dim, channels = input_shape
        
        # Convolutional Block 1
        self.conv1 = nn.Sequential(
            nn.Conv2d(channels, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout2d(0.25)
        )
        
        # Convolutional Block 2
        self.conv2 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout2d(0.25)
        )
        
        # Convolutional Block 3
        self.conv3 = nn.Sequential(
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.Conv2d(256, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Dropout2d(0.25)
        )
        
        # Convolutional Block 4
        self.conv4 = nn.Sequential(
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        
        # Fully Connected Layers
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_classes)
        )
    
    def forward(self, x):
        # Transpose from (batch, time, freq, channels) to (batch, channels, time, freq)
        x = x.permute(0, 3, 1, 2)
        
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.conv4(x)
        x = self.fc(x)
        
        return x


class CNNTrainer:
    def __init__(self, params_file='params.yaml'):
        """Initialize CNN trainer with parameters"""
        
        with open(params_file, 'r') as f:
            params = yaml.safe_load(f)
        
        # Model parameters
        self.epochs = params['models']['cnn']['epochs']
        self.batch_size = params['models']['cnn']['batch_size']
        self.learning_rate = params['models']['cnn']['learning_rate']
        self.dropout = params['models']['cnn']['dropout']
        self.early_stopping_patience = params['models']['cnn']['early_stopping_patience']
        self.reduce_lr_patience = params['models']['cnn']['reduce_lr_patience']
        
        # Training parameters
        self.random_seed = params['training']['random_seed']
        
        # Set random seeds
        torch.manual_seed(self.random_seed)
        np.random.seed(self.random_seed)
        
        # GPU setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        if torch.cuda.is_available():
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        
        # Mixed precision training
        self.use_amp = torch.cuda.is_available()
        self.scaler = GradScaler() if self.use_amp else None
        
        # Paths
        self.features_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\features')
        self.models_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\models')
        self.metrics_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\metrics')
        
        self.models_path.mkdir(parents=True, exist_ok=True)
        self.metrics_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initialized CNN trainer with:")
        logger.info(f"  Epochs: {self.epochs}")
        logger.info(f"  Batch size: {self.batch_size}")
        logger.info(f"  Learning rate: {self.learning_rate}")
        logger.info(f"  Dropout: {self.dropout}")
        logger.info(f"  Mixed precision: {self.use_amp}")
    
    def load_features(self, split='train'):
        """Load spectrogram features from npz file"""
        
        feature_file = self.features_path / f'spectrogram_{split}.npz'
        
        if not feature_file.exists():
            logger.error(f"Feature file not found: {feature_file}")
            return None, None
        
        logger.info(f"Loading features from: {feature_file}")
        
        data = np.load(feature_file, allow_pickle=True)
        features = data['features']
        labels = data['labels']
        
        logger.info(f"Loaded {split} features shape: {features.shape}")
        logger.info(f"Loaded {split} labels shape: {labels.shape}")
        
        return features, labels
    
    def create_dataloaders(self, X_train, y_train, X_dev, y_dev):
        """Create PyTorch DataLoaders"""
        
        # Handle class imbalance with weighted sampling
        class_counts = np.bincount(y_train)
        class_weights = 1.0 / class_counts
        sample_weights = class_weights[y_train]
        
        from torch.utils.data import WeightedRandomSampler
        sampler = WeightedRandomSampler(
            weights=sample_weights,
            num_samples=len(sample_weights),
            replacement=True
        )
        
        train_dataset = SpectrogramDataset(X_train, y_train)
        dev_dataset = SpectrogramDataset(X_dev, y_dev)
        
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.batch_size,
            sampler=sampler,
            num_workers=0,
            pin_memory=True if torch.cuda.is_available() else False
        )
        
        dev_loader = DataLoader(
            dev_dataset,
            batch_size=self.batch_size,
            shuffle=False,
            num_workers=0,
            pin_memory=True if torch.cuda.is_available() else False
        )
        
        logger.info(f"Created DataLoaders:")
        logger.info(f"  Train batches: {len(train_loader)}")
        logger.info(f"  Dev batches: {len(dev_loader)}")
        
        return train_loader, dev_loader
    
    def train_epoch(self, model, train_loader, criterion, optimizer, epoch):
        """Train for one epoch"""
        
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        pbar = tqdm(train_loader, desc=f'Epoch {epoch+1}/{self.epochs}')
        
        for inputs, labels in pbar:
            inputs, labels = inputs.to(self.device), labels.to(self.device)
            
            optimizer.zero_grad()
            
            # Mixed precision training
            if self.use_amp:
                with autocast():
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                
                self.scaler.scale(loss).backward()
                self.scaler.step(optimizer)
                self.scaler.update()
            else:
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
            
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
            pbar.set_postfix({
                'loss': f'{running_loss/total:.4f}',
                'acc': f'{100*correct/total:.2f}%'
            })
        
        epoch_loss = running_loss / len(train_loader)
        epoch_acc = 100 * correct / total
        
        return epoch_loss, epoch_acc
    
    def evaluate(self, model, data_loader):
        """Evaluate model"""
        
        model.eval()
        running_loss = 0.0
        all_labels = []
        all_predictions = []
        all_probs = []
        
        criterion = nn.CrossEntropyLoss()
        
        with torch.no_grad():
            for inputs, labels in data_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
                running_loss += loss.item()
                
                probs = torch.softmax(outputs, dim=1)
                _, predicted = torch.max(outputs.data, 1)
                
                all_labels.extend(labels.cpu().numpy())
                all_predictions.extend(predicted.cpu().numpy())
                all_probs.extend(probs[:, 1].cpu().numpy())
        
        avg_loss = running_loss / len(data_loader)
        
        return avg_loss, np.array(all_labels), np.array(all_predictions), np.array(all_probs)
    
    def calculate_metrics(self, y_true, y_pred, y_probs):
        """Calculate evaluation metrics"""
        
        accuracy = accuracy_score(y_true, y_pred)
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        
        try:
            roc_auc = roc_auc_score(y_true, y_probs)
        except:
            roc_auc = 0.0
        
        eer = self.calculate_eer(y_true, y_probs)
        cm = confusion_matrix(y_true, y_pred)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'roc_auc': float(roc_auc),
            'eer': float(eer),
            'confusion_matrix': cm.tolist()
        }
        
        return metrics
    
    def calculate_eer(self, y_true, y_scores):
        """Calculate Equal Error Rate"""
        
        fpr, tpr, thresholds = roc_curve(y_true, y_scores, pos_label=1)
        fnr = 1 - tpr
        eer_threshold_idx = np.nanargmin(np.absolute(fnr - fpr))
        eer = fpr[eer_threshold_idx]
        
        return eer
    
    def train_model(self, model, train_loader, dev_loader):
        """Complete training loop with early stopping"""
        
        # Loss function with class weights
        y_train = []
        for _, labels in train_loader:
            y_train.extend(labels.numpy())
        
        class_counts = np.bincount(y_train)
        class_weights = torch.FloatTensor(1.0 / class_counts).to(self.device)
        criterion = nn.CrossEntropyLoss(weight=class_weights)
        
        # Optimizer
        optimizer = optim.Adam(model.parameters(), lr=self.learning_rate)
        
        # Learning rate scheduler
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode='min', factor=0.5, 
            patience=self.reduce_lr_patience, verbose=True
        )
        
        # Training history
        history = {
            'train_loss': [],
            'train_acc': [],
            'dev_loss': [],
            'dev_acc': []
        }
        
        best_dev_loss = float('inf')
        patience_counter = 0
        
        logger.info("\nStarting training...")
        
        for epoch in range(self.epochs):
            # Train
            train_loss, train_acc = self.train_epoch(
                model, train_loader, criterion, optimizer, epoch
            )
            
            # Evaluate
            dev_loss, y_true, y_pred, y_probs = self.evaluate(model, dev_loader)
            dev_metrics = self.calculate_metrics(y_true, y_pred, y_probs)
            
            # Update history
            history['train_loss'].append(train_loss)
            history['train_acc'].append(train_acc)
            history['dev_loss'].append(dev_loss)
            history['dev_acc'].append(dev_metrics['accuracy'] * 100)
            
            # Log to MLflow
            mlflow.log_metric('train_loss', train_loss, step=epoch)
            mlflow.log_metric('train_acc', train_acc, step=epoch)
            mlflow.log_metric('dev_loss', dev_loss, step=epoch)
            mlflow.log_metric('dev_acc', dev_metrics['accuracy'], step=epoch)
            
            logger.info(f"\nEpoch {epoch+1}/{self.epochs}:")
            logger.info(f"  Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
            logger.info(f"  Dev Loss: {dev_loss:.4f}, Dev Acc: {dev_metrics['accuracy']*100:.2f}%")
            logger.info(f"  Dev EER: {dev_metrics['eer']:.4f}")
            
            # Learning rate scheduling
            scheduler.step(dev_loss)
            
            # Early stopping
            if dev_loss < best_dev_loss:
                best_dev_loss = dev_loss
                patience_counter = 0
                # Save best model
                torch.save(model.state_dict(), self.models_path / 'cnn_best_model.pth')
                logger.info("  [BEST] Model saved!")
            else:
                patience_counter += 1
                logger.info(f"  Early stopping counter: {patience_counter}/{self.early_stopping_patience}")
            
            if patience_counter >= self.early_stopping_patience:
                logger.info(f"\nEarly stopping triggered at epoch {epoch+1}")
                break
            
            # Clear GPU cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        # Load best model
        model.load_state_dict(torch.load(self.models_path / 'cnn_best_model.pth'))
        
        return model, history
    
    def plot_training_history(self, history, save_path):
        """Plot training history"""
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
        
        # Loss
        ax1.plot(history['train_loss'], label='Train Loss')
        ax1.plot(history['dev_loss'], label='Dev Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.set_title('Training and Validation Loss')
        ax1.legend()
        ax1.grid(alpha=0.3)
        
        # Accuracy
        ax2.plot(history['train_acc'], label='Train Accuracy')
        ax2.plot(history['dev_acc'], label='Dev Accuracy')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Accuracy (%)')
        ax2.set_title('Training and Validation Accuracy')
        ax2.legend()
        ax2.grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Saved training history to: {save_path}")
    
    def plot_confusion_matrix(self, cm, save_path):
        """Plot confusion matrix"""
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=['Spoof', 'Bonafide'],
                    yticklabels=['Spoof', 'Bonafide'])
        plt.title('Confusion Matrix - CNN')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Saved confusion matrix to: {save_path}")
    
    def save_metrics(self, metrics, filename='cnn_metrics.json'):
        """Save metrics to JSON file"""
        
        metrics_path = self.metrics_path / filename
        
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        logger.info(f"Saved metrics to: {metrics_path}")


def main():
    """Main execution function"""
    logger.info("Starting CNN training pipeline...")
    
    # Initialize trainer
    trainer = CNNTrainer()
    
    # Start MLflow experiment
    mlflow.set_experiment("DeepTrace-CNN")
    
    with mlflow.start_run(run_name="CNN_Spectrogram"):
        
        # Load features
        logger.info("\n" + "="*70)
        logger.info("Loading Features")
        logger.info("="*70)
        
        X_train, y_train = trainer.load_features('train')
        X_dev, y_dev = trainer.load_features('dev')
        
        if X_train is None or X_dev is None:
            logger.error("Failed to load features. Exiting.")
            return
        
        # Create dataloaders
        train_loader, dev_loader = trainer.create_dataloaders(X_train, y_train, X_dev, y_dev)
        
        # Initialize model
        logger.info("\n" + "="*70)
        logger.info("Initializing Model")
        logger.info("="*70)
        
        input_shape = X_train.shape[1:]
        model = AdvancedCNN(input_shape, num_classes=2, dropout=trainer.dropout)
        model = model.to(trainer.device)
        
        # Count parameters
        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        
        logger.info(f"Model initialized:")
        logger.info(f"  Total parameters: {total_params:,}")
        logger.info(f"  Trainable parameters: {trainable_params:,}")
        
        # Log parameters
        mlflow.log_param("total_params", total_params)
        mlflow.log_param("batch_size", trainer.batch_size)
        mlflow.log_param("learning_rate", trainer.learning_rate)
        mlflow.log_param("dropout", trainer.dropout)
        
        # Train model
        logger.info("\n" + "="*70)
        logger.info("Training Model")
        logger.info("="*70)
        
        model, history = trainer.train_model(model, train_loader, dev_loader)
        
        # Final evaluation
        logger.info("\n" + "="*70)
        logger.info("Final Evaluation")
        logger.info("="*70)
        
        dev_loss, y_true, y_pred, y_probs = trainer.evaluate(model, dev_loader)
        dev_metrics = trainer.calculate_metrics(y_true, y_pred, y_probs)
        
        logger.info(f"\nFinal Dev Results:")
        logger.info(f"  Accuracy:  {dev_metrics['accuracy']:.4f}")
        logger.info(f"  Precision: {dev_metrics['precision']:.4f}")
        logger.info(f"  Recall:    {dev_metrics['recall']:.4f}")
        logger.info(f"  F1 Score:  {dev_metrics['f1_score']:.4f}")
        logger.info(f"  ROC AUC:   {dev_metrics['roc_auc']:.4f}")
        logger.info(f"  EER:       {dev_metrics['eer']:.4f}")
        
        # Log final metrics
        for key, value in dev_metrics.items():
            if isinstance(value, (int, float)):
                mlflow.log_metric(f"final_{key}", value)
        
        # Save visualizations
        logger.info("\n" + "="*70)
        logger.info("Saving Visualizations")
        logger.info("="*70)
        
        history_path = trainer.metrics_path / 'cnn_training_history.png'
        trainer.plot_training_history(history, history_path)
        mlflow.log_artifact(str(history_path))
        
        cm_path = trainer.metrics_path / 'cnn_confusion_matrix.png'
        trainer.plot_confusion_matrix(dev_metrics['confusion_matrix'], cm_path)
        mlflow.log_artifact(str(cm_path))
        
        # Save metrics
        trainer.save_metrics(dev_metrics)
        
        # Save model
        model_path = trainer.models_path / 'cnn_model.pth'
        torch.save(model.state_dict(), model_path)
        mlflow.pytorch.log_model(model, "cnn_model")
        
        logger.info("\n" + "="*70)
        logger.info("[OK] CNN training completed!")
        logger.info("="*70)
        logger.info(f"\nModel saved to: {model_path}")
        logger.info(f"Metrics saved to: {trainer.metrics_path}")



if __name__ == "__main__":
    main()