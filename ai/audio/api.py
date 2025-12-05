"""
Web-Ready Audio Deepfake Detection API

Lightweight inference module for web integration
"""

import os
import pickle
import numpy as np
import torch
import torch.nn as nn
import librosa
import torchaudio.transforms as T
from pathlib import Path
import yaml
import sys
import json


class AdvancedCNN(nn.Module):
    """CNN architecture for audio deepfake detection"""
    
    def __init__(self, input_shape, num_classes=2, dropout=0.5):
        super(AdvancedCNN, self).__init__()
        
        time_dim, freq_dim, channels = input_shape
        
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
        
        self.conv4 = nn.Sequential(
            nn.Conv2d(256, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.Conv2d(512, 512, kernel_size=3, padding=1),
            nn.BatchNorm2d(512),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )
        
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
        x = x.permute(0, 3, 1, 2)
        x = self.conv1(x)
        x = self.conv2(x)
        x = self.conv3(x)
        x = self.conv4(x)
        x = self.fc(x)
        return x


class DeepfakeDetectorAPI:
    """
    Simplified API for web integration
    
    Usage:
        detector = DeepfakeDetectorAPI()
        result = detector.predict('path/to/audio.wav')
        print(result['prediction'])  # 'BONAFIDE' or 'SPOOF'
        print(result['confidence'])   # 0.0 to 1.0
    """
    
    def __init__(self, models_dir=None, params_file=None):
        """
        Initialize detector
        
        Args:
            models_dir: Directory containing model files (default: same as script)
            params_file: Path to params.yaml (default: same as script)
        """
        # Get directory where this script is located
        script_dir = Path(__file__).parent.absolute()
        
        # Use script directory if not specified
        self.models_dir = Path(models_dir) if models_dir else script_dir
        params_path = Path(params_file) if params_file else (script_dir / 'params.yaml')
        
        # Load parameters
        with open(params_path, 'r') as f:
            params = yaml.safe_load(f)
        
        self.sample_rate = params['preprocess']['sample_rate']
        self.max_length = params['preprocess']['max_audio_length']
        self.n_mfcc = params['features']['mfcc']['n_mfcc']
        self.n_fft = params['features']['mfcc']['n_fft']
        self.hop_length = params['features']['mfcc']['hop_length']
        self.n_mels = params['features']['mfcc']['n_mels']
        
        # Ensemble weights (optimized)
        self.rf_weight = 0.7
        self.cnn_weight = 0.3
        
        # GPU setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Initialize
        self._init_feature_extractors()
        self._load_models()
    
    def _init_feature_extractors(self):
        """Initialize feature extractors"""
        
        self.mfcc_transform = T.MFCC(
            sample_rate=self.sample_rate,
            n_mfcc=self.n_mfcc,
            melkwargs={
                'n_fft': self.n_fft,
                'hop_length': self.hop_length,
                'n_mels': self.n_mels
            }
        ).to(self.device)
        
        self.mel_spectrogram = T.MelSpectrogram(
            sample_rate=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            n_mels=self.n_mels
        ).to(self.device)
        
        self.amplitude_to_db = T.AmplitudeToDB().to(self.device)
    
    def _load_models(self):
        """Load trained models"""
        
        # Load Random Forest
        rf_path = self.models_dir / 'random_forest_model.pkl'
        with open(rf_path, 'rb') as f:
            self.rf_model = pickle.load(f)
        
        # Load CNN
        cnn_path = self.models_dir / 'cnn_best_model.pth'
        input_shape = (126, 128, 1)
        self.cnn_model = AdvancedCNN(input_shape, num_classes=2)
        self.cnn_model.load_state_dict(torch.load(cnn_path, map_location=self.device))
        self.cnn_model = self.cnn_model.to(self.device)
        self.cnn_model.eval()
    
    def _preprocess_audio(self, audio_path):
        """
        Load and preprocess audio
        
        Supports multiple audio formats including:
        - WAV, MP3, FLAC, OGG, M4A, AAC, WMA (via librosa/soundfile)
        """
        
        audio, sr = librosa.load(audio_path, sr=self.sample_rate)
        
        # Normalize
        if np.max(np.abs(audio)) > 0:
            audio = audio / np.max(np.abs(audio))
        
        return audio
    
    def _split_into_chunks(self, audio, overlap=0.5):
        """Split audio into 4-second chunks"""
        
        chunk_samples = self.max_length
        hop_samples = int(chunk_samples * (1 - overlap))
        
        chunks = []
        
        if len(audio) <= chunk_samples:
            if len(audio) < chunk_samples:
                audio = np.pad(audio, (0, chunk_samples - len(audio)), mode='constant')
            chunks.append(audio)
        else:
            for start in range(0, len(audio) - chunk_samples + 1, hop_samples):
                chunks.append(audio[start:start + chunk_samples])
            
            if len(audio) % hop_samples != 0:
                chunks.append(audio[-chunk_samples:])
        
        return chunks
    
    def _extract_mfcc(self, audio):
        """Extract MFCC features"""
        
        audio_tensor = torch.from_numpy(audio).float().unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            mfccs = self.mfcc_transform(audio_tensor)
            
            # Delta and delta-delta
            delta_filter = torch.tensor([-1.0, 0.0, 1.0], device=self.device).view(1, 1, 3)
            mfccs_padded = torch.nn.functional.pad(mfccs, (1, 1), mode='replicate')
            
            delta1 = torch.nn.functional.conv1d(
                mfccs_padded.view(-1, 1, mfccs_padded.shape[-1]),
                delta_filter
            ).view(mfccs.shape)
            
            delta1_padded = torch.nn.functional.pad(delta1, (1, 1), mode='replicate')
            delta2 = torch.nn.functional.conv1d(
                delta1_padded.view(-1, 1, delta1_padded.shape[-1]),
                delta_filter
            ).view(mfccs.shape)
            
            features = torch.cat([mfccs, delta1, delta2], dim=1)
            
            # Statistical aggregations
            mean = torch.mean(features, dim=2)
            std = torch.std(features, dim=2)
            max_val, _ = torch.max(features, dim=2)
            min_val, _ = torch.min(features, dim=2)
            median = torch.median(features, dim=2)[0]
            
            stats = torch.cat([mean, std, max_val, min_val, median], dim=1)
        
        return stats.cpu().numpy().squeeze()
    
    def _extract_spectrogram(self, audio):
        """Extract mel-spectrogram features"""
        
        audio_tensor = torch.from_numpy(audio).float().unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            mel_spec = self.mel_spectrogram(audio_tensor)
            mel_spec_db = self.amplitude_to_db(mel_spec)
            
            spec_min = torch.min(mel_spec_db)
            spec_max = torch.max(mel_spec_db)
            
            if spec_max - spec_min > 0:
                normalized = (mel_spec_db - spec_min) / (spec_max - spec_min)
            else:
                normalized = mel_spec_db - spec_min
            
            features = normalized.permute(0, 2, 1)
            
            target_length = 126
            current_length = features.shape[1]
            
            if current_length > target_length:
                features = features[:, :target_length, :]
            elif current_length < target_length:
                pad_length = target_length - current_length
                padding = torch.zeros(1, pad_length, features.shape[2], device=self.device)
                features = torch.cat([features, padding], dim=1)
            
            features = features.unsqueeze(-1)
        
        return features.squeeze(0).cpu().numpy()
    
    def _predict_chunk(self, chunk):
        """Predict on single chunk"""
        
        # Ensure correct length
        if len(chunk) != self.max_length:
            if len(chunk) > self.max_length:
                chunk = chunk[:self.max_length]
            else:
                chunk = np.pad(chunk, (0, self.max_length - len(chunk)), mode='constant')
        
        # Extract features
        mfcc_features = self._extract_mfcc(chunk)
        spec_features = self._extract_spectrogram(chunk)
        
        # Random Forest prediction
        rf_proba = self.rf_model.predict_proba(mfcc_features.reshape(1, -1))[0]
        
        # CNN prediction
        spec_tensor = torch.FloatTensor(spec_features).unsqueeze(0).to(self.device)
        with torch.no_grad():
            cnn_output = self.cnn_model(spec_tensor)
            cnn_proba = torch.softmax(cnn_output, dim=1).cpu().numpy()[0]
        
        # Ensemble
        ensemble_proba = self.rf_weight * rf_proba + self.cnn_weight * cnn_proba
        
        return ensemble_proba
    
    def predict(self, audio_path, return_detailed=False):
        """
        Main prediction method
        
        Args:
            audio_path: Path to audio file (str or Path)
            return_detailed: If True, return detailed information
            
        Returns:
            dict: {
                'prediction': 'BONAFIDE' or 'SPOOF',
                'confidence': float (0.0 to 1.0),
                'probabilities': {
                    'bonafide': float,
                    'spoof': float
                }
            }
            
            If return_detailed=True, also includes:
                'duration': float (seconds),
                'num_chunks': int,
                'chunk_predictions': list
        """
        
        try:
            # Load and preprocess
            audio = self._preprocess_audio(audio_path)
            duration = len(audio) / self.sample_rate
            
            # Split into chunks
            chunks = self._split_into_chunks(audio)
            
            # Predict on each chunk
            chunk_predictions = []
            for chunk in chunks:
                proba = self._predict_chunk(chunk)
                chunk_predictions.append(proba)
            
            # Average probabilities
            avg_proba = np.mean(chunk_predictions, axis=0)
            prediction = np.argmax(avg_proba)
            
            # Prepare result
            result = {
                'prediction': 'BONAFIDE' if prediction == 1 else 'SPOOF',
                'confidence': float(avg_proba[prediction]),
                'probabilities': {
                    'bonafide': float(avg_proba[1]),
                    'spoof': float(avg_proba[0])
                }
            }
            
            if return_detailed:
                result['duration'] = duration
                result['num_chunks'] = len(chunks)
                result['chunk_predictions'] = [
                    {
                        'prediction': 'BONAFIDE' if np.argmax(p) == 1 else 'SPOOF',
                        'confidence': float(np.max(p))
                    }
                    for p in chunk_predictions
                ]
            
            return result
            
        except Exception as e:
            return {
                'error': str(e),
                'prediction': None,
                'confidence': 0.0
            }
    
    def predict_batch(self, audio_paths):
        """
        Predict on multiple audio files
        
        Args:
            audio_paths: List of audio file paths
            
        Returns:
            list: List of prediction dictionaries
        """
        
        results = []
        for path in audio_paths:
            result = self.predict(path)
            result['file'] = str(path)
            results.append(result)
        
        return results


# Command-line interface for Node.js integration
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'No audio file path provided',
            'prediction': None,
            'confidence': 0.0
        }))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    return_detailed = len(sys.argv) > 2 and sys.argv[2] == '--detailed'
    
    try:
        # Initialize detector
        detector = DeepfakeDetectorAPI()
        
        # Predict
        result = detector.predict(audio_path, return_detailed=return_detailed)
        
        # Output JSON result
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'prediction': None,
            'confidence': 0.0
        }))
        sys.exit(1)

