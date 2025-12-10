"""
Real-World Audio Deepfake Detection Script
Test individual audio files or batches with the trained ensemble model
"""

import os
import yaml
import pickle
import argparse
import numpy as np
import torch
import torch.nn as nn
import librosa
import soundfile as sf
import torchaudio.transforms as T
from pathlib import Path
import logging
from datetime import datetime
import shutil
import subprocess
import io

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AudioDeepfakeDetector:
    """Complete inference pipeline for audio deepfake detection"""
    
    def __init__(self, params_file='params.yaml'):
        """Initialize detector with trained models"""
        
        logger.info("Initializing Audio Deepfake Detector...")
        
        # Load parameters
        with open(params_file, 'r') as f:
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
        logger.info(f"Using device: {self.device}")
        
        # Initialize feature extractors
        self.init_feature_extractors()
        
        # Load models
        self.load_models()
        
        logger.info("Detector initialized successfully!")
    
    def init_feature_extractors(self):
        """Initialize GPU-accelerated feature extractors"""
        
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
    
    def _resolve_ffmpeg_bin(self):
        """Find ffmpeg executable using env, repo-local, PATH, or common install paths"""
        # 1) Explicit env override
        ffmpeg_bin = os.environ.get("FFMPEG_BIN")
        if ffmpeg_bin and Path(ffmpeg_bin).exists():
            return ffmpeg_bin
        
        # 2) Repo-local ffmpeg/ffmpeg.exe
        repo_root = Path(__file__).resolve().parents[2]
        candidate = repo_root / "ffmpeg" / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
        if candidate.exists():
            return str(candidate)
        
        # 3) PATH lookup
        which_ffmpeg = shutil.which("ffmpeg")
        if which_ffmpeg:
            return which_ffmpeg
        
        # 4) Common Windows install locations
        if os.name == "nt":
            common_paths = [
                Path("C:/ffmpeg/bin/ffmpeg.exe"),
                Path("C:/Program Files/ffmpeg/bin/ffmpeg.exe"),
                Path("C:/Program Files (x86)/ffmpeg/bin/ffmpeg.exe"),
            ]
            for p in common_paths:
                if p.exists():
                    return str(p)
        
        return None
    
    def load_models(self):
        """Load trained Random Forest and CNN models"""
        
        models_path = Path(r'C:\VS\FYP\DeepTrace\ai\audio')
        
        # Load Random Forest
        logger.info("Loading Random Forest model...")
        rf_path = models_path / 'random_forest_model.pkl'
        
        if not rf_path.exists():
            raise FileNotFoundError(f"Random Forest model not found: {rf_path}")
        
        with open(rf_path, 'rb') as f:
            self.rf_model = pickle.load(f)
        
        logger.info("  Random Forest loaded successfully")
        
        # Load CNN
        logger.info("Loading CNN model...")
        cnn_path = models_path / 'cnn_best_model.pth'
        
        if not cnn_path.exists():
            raise FileNotFoundError(f"CNN model not found: {cnn_path}")
        
        # Import CNN architecture
        import sys
        sys.path.append(str(Path(__file__).parent.parent))
        from api import AdvancedCNN
        
        # Initialize CNN with correct input shape
        input_shape = (126, 128, 1)
        self.cnn_model = AdvancedCNN(input_shape, num_classes=2)
        self.cnn_model.load_state_dict(torch.load(cnn_path, map_location=self.device))
        self.cnn_model = self.cnn_model.to(self.device)
        self.cnn_model.eval()
        
        logger.info("  CNN loaded successfully")
    
    def load_audio(self, audio_path):
        """Load audio file (any length)"""
        
        # Try soundfile first so we capture the actual decode error
        try:
            data, sr = sf.read(audio_path, always_2d=False)
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            audio = data.astype(np.float32)
            
            # Resample if needed
            if sr != self.sample_rate:
                audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)
                sr = self.sample_rate
            
            duration = len(audio) / sr
            logger.info(f"Loaded audio: {len(audio)} samples ({duration:.2f} seconds), {sr} Hz [soundfile]")
            
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
            
            return audio
        
        except (RuntimeError, AttributeError) as e:
            # RuntimeError is what soundfile raises for decode issues in 0.13.x
            logger.warning(f"soundfile load failed: {e}")
        except Exception as e:
            logger.warning(f"soundfile unexpected failure: {e}")
        
        # Fallback to librosa/audioread (uses ffmpeg if available) for mp3/other codecs
        try:
            # Load full audio without length restriction
            audio, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            duration = len(audio) / sr
            logger.info(f"Loaded audio: {len(audio)} samples ({duration:.2f} seconds), {sr} Hz")
            
            # Normalize
            if np.max(np.abs(audio)) > 0:
                audio = audio / np.max(np.abs(audio))
            
            return audio
        
        except Exception as e:
            logger.warning(f"librosa load failed: {e}")
        
        # FFmpeg pipe fallback
        ffmpeg_bin = self._resolve_ffmpeg_bin()
        if ffmpeg_bin:
            try:
                ffmpeg_cmd = [
                    ffmpeg_bin,
                    "-v",
                    "error",
                    "-i",
                    str(audio_path),
                    "-f",
                    "wav",
                    "-ac",
                    "1",
                    "-ar",
                    str(self.sample_rate),
                    "pipe:1",
                ]
                proc = subprocess.run(ffmpeg_cmd, capture_output=True, check=True)
                audio_bytes = proc.stdout
                audio_buf = io.BytesIO(audio_bytes)
                data, sr = sf.read(audio_buf, always_2d=False)
                if data.ndim > 1:
                    data = np.mean(data, axis=1)
                audio = data.astype(np.float32)
                
                duration = len(audio) / sr
                logger.info(f"Loaded audio: {len(audio)} samples ({duration:.2f} seconds), {sr} Hz [ffmpeg pipe]")
                
                if np.max(np.abs(audio)) > 0:
                    audio = audio / np.max(np.abs(audio))
                
                return audio
            except Exception as e:
                logger.error(f"FFmpeg pipe load failed: {e}")
                return None
        else:
            logger.error("Error loading audio: no working backend (soundfile/librosa/ffmpeg)")
            return None
    
    def split_audio_into_chunks(self, audio, chunk_duration=4.0, overlap=0.5):
        """
        Split long audio into overlapping chunks
        
        Args:
            audio: Full audio array
            chunk_duration: Duration of each chunk in seconds (default 4s)
            overlap: Overlap ratio between chunks (default 0.5 = 50% overlap)
            
        Returns:
            List of audio chunks
        """
        
        chunk_samples = int(chunk_duration * self.sample_rate)
        hop_samples = int(chunk_samples * (1 - overlap))
        
        chunks = []
        
        # If audio is shorter than chunk duration, pad it
        if len(audio) <= chunk_samples:
            if len(audio) < chunk_samples:
                pad_length = chunk_samples - len(audio)
                audio_padded = np.pad(audio, (0, pad_length), mode='constant')
            else:
                audio_padded = audio
            chunks.append(audio_padded)
            logger.info(f"Audio <= 4s: Created 1 chunk (padded to {chunk_samples} samples)")
        else:
            # Split into overlapping chunks
            for start in range(0, len(audio) - chunk_samples + 1, hop_samples):
                chunk = audio[start:start + chunk_samples]
                chunks.append(chunk)
            
            # Handle remaining audio at the end
            if len(audio) % hop_samples != 0:
                # Take last chunk_samples from the end
                last_chunk = audio[-chunk_samples:]
                chunks.append(last_chunk)
            
            logger.info(f"Created {len(chunks)} chunks with {overlap*100:.0f}% overlap")
        
        return chunks
    
    def extract_mfcc_features(self, audio):
        """Extract MFCC features for Random Forest"""
        
        audio_tensor = torch.from_numpy(audio).float().unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            # Extract MFCCs
            mfccs = self.mfcc_transform(audio_tensor)
            
            # Compute delta and delta-delta
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
            
            # Concatenate
            features = torch.cat([mfccs, delta1, delta2], dim=1)
            
            # Statistical aggregations
            mean = torch.mean(features, dim=2)
            std = torch.std(features, dim=2)
            max_val, _ = torch.max(features, dim=2)
            min_val, _ = torch.min(features, dim=2)
            median = torch.median(features, dim=2)[0]
            
            stats = torch.cat([mean, std, max_val, min_val, median], dim=1)
        
        return stats.cpu().numpy().squeeze()
    
    def extract_spectrogram_features(self, audio, target_length=126):
        """Extract mel-spectrogram features for CNN"""
        
        audio_tensor = torch.from_numpy(audio).float().unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            # Compute mel-spectrogram
            mel_spec = self.mel_spectrogram(audio_tensor)
            mel_spec_db = self.amplitude_to_db(mel_spec)
            
            # Normalize
            spec_min = torch.min(mel_spec_db)
            spec_max = torch.max(mel_spec_db)
            
            if spec_max - spec_min > 0:
                normalized = (mel_spec_db - spec_min) / (spec_max - spec_min)
            else:
                normalized = mel_spec_db - spec_min
            
            # Transpose and pad/truncate
            features = normalized.permute(0, 2, 1)
            
            current_length = features.shape[1]
            if current_length > target_length:
                features = features[:, :target_length, :]
            elif current_length < target_length:
                pad_length = target_length - current_length
                padding = torch.zeros(1, pad_length, features.shape[2], device=self.device)
                features = torch.cat([features, padding], dim=1)
            
            # Add channel dimension
            features = features.unsqueeze(-1)
        
        return features.squeeze(0).cpu().numpy()
    
    def predict_chunk(self, audio_chunk):
        """Predict on single 4-second audio chunk (internal method)"""
        
        # Ensure chunk is exactly max_length
        if len(audio_chunk) != self.max_length:
            if len(audio_chunk) > self.max_length:
                audio_chunk = audio_chunk[:self.max_length]
            else:
                pad_length = self.max_length - len(audio_chunk)
                audio_chunk = np.pad(audio_chunk, (0, pad_length), mode='constant')
        
        # Extract features
        mfcc_features = self.extract_mfcc_features(audio_chunk)
        spec_features = self.extract_spectrogram_features(audio_chunk)
        
        # Random Forest prediction
        rf_proba = self.rf_model.predict_proba(mfcc_features.reshape(1, -1))[0]
        
        # CNN prediction
        spec_tensor = torch.FloatTensor(spec_features).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            cnn_output = self.cnn_model(spec_tensor)
            cnn_proba = torch.softmax(cnn_output, dim=1).cpu().numpy()[0]
        
        # Ensemble prediction
        ensemble_proba = self.rf_weight * rf_proba + self.cnn_weight * cnn_proba
        
        return {
            'ensemble_proba': ensemble_proba,
            'rf_proba': rf_proba,
            'cnn_proba': cnn_proba
        }
    
    def aggregate_chunk_predictions(self, chunk_predictions, method='average'):
        """
        Aggregate predictions from multiple chunks
        
        Args:
            chunk_predictions: List of prediction dictionaries
            method: 'average' (mean probability), 'majority' (voting), or 'max_confidence'
            
        Returns:
            Aggregated prediction dictionary
        """
        
        if method == 'average':
            # Average probabilities across all chunks
            ensemble_proba = np.mean([p['ensemble_proba'] for p in chunk_predictions], axis=0)
            rf_proba = np.mean([p['rf_proba'] for p in chunk_predictions], axis=0)
            cnn_proba = np.mean([p['cnn_proba'] for p in chunk_predictions], axis=0)
            
        elif method == 'majority':
            # Majority voting
            ensemble_votes = [np.argmax(p['ensemble_proba']) for p in chunk_predictions]
            rf_votes = [np.argmax(p['rf_proba']) for p in chunk_predictions]
            cnn_votes = [np.argmax(p['cnn_proba']) for p in chunk_predictions]
            
            ensemble_pred = max(set(ensemble_votes), key=ensemble_votes.count)
            rf_pred = max(set(rf_votes), key=rf_votes.count)
            cnn_pred = max(set(cnn_votes), key=cnn_votes.count)
            
            # Convert votes to probabilities (vote ratio)
            ensemble_proba = np.array([
                1 - ensemble_votes.count(1) / len(ensemble_votes),
                ensemble_votes.count(1) / len(ensemble_votes)
            ])
            rf_proba = np.array([
                1 - rf_votes.count(1) / len(rf_votes),
                rf_votes.count(1) / len(rf_votes)
            ])
            cnn_proba = np.array([
                1 - cnn_votes.count(1) / len(cnn_votes),
                cnn_votes.count(1) / len(cnn_votes)
            ])
            
        elif method == 'max_confidence':
            # Use prediction from chunk with highest confidence
            max_conf_idx = np.argmax([np.max(p['ensemble_proba']) for p in chunk_predictions])
            ensemble_proba = chunk_predictions[max_conf_idx]['ensemble_proba']
            rf_proba = chunk_predictions[max_conf_idx]['rf_proba']
            cnn_proba = chunk_predictions[max_conf_idx]['cnn_proba']
        
        else:
            raise ValueError(f"Unknown aggregation method: {method}")
        
        return {
            'ensemble_proba': ensemble_proba,
            'rf_proba': rf_proba,
            'cnn_proba': cnn_proba
        }
    
    def predict_single(self, audio_path, verbose=True, aggregation_method='average', overlap=0.5):
        """
        Predict on single audio file (any length)
        
        Args:
            audio_path: Path to audio file
            verbose: Print detailed results
            aggregation_method: How to combine chunk predictions ('average', 'majority', 'max_confidence')
            overlap: Overlap ratio for chunks (0.0 to 0.9)
        """
        
        if verbose:
            logger.info(f"\n{'='*70}")
            logger.info(f"Processing: {audio_path}")
            logger.info(f"{'='*70}")
        
        # Load full audio
        audio = self.load_audio(audio_path)
        
        if audio is None:
            return None
        
        # Split into chunks
        chunks = self.split_audio_into_chunks(audio, chunk_duration=4.0, overlap=overlap)
        
        # Predict on each chunk
        if verbose:
            logger.info(f"Analyzing {len(chunks)} audio chunks...")
        
        chunk_predictions = []
        for i, chunk in enumerate(chunks):
            pred = self.predict_chunk(chunk)
            chunk_predictions.append(pred)
            
            if verbose and len(chunks) > 1:
                chunk_pred = 'BONAFIDE' if np.argmax(pred['ensemble_proba']) == 1 else 'SPOOF'
                chunk_conf = np.max(pred['ensemble_proba']) * 100
                logger.info(f"  Chunk {i+1}/{len(chunks)}: {chunk_pred} ({chunk_conf:.1f}%)")
        
        # Aggregate predictions
        aggregated = self.aggregate_chunk_predictions(chunk_predictions, method=aggregation_method)
        
        ensemble_pred = np.argmax(aggregated['ensemble_proba'])
        rf_pred = np.argmax(aggregated['rf_proba'])
        cnn_pred = np.argmax(aggregated['cnn_proba'])
        
        # Prepare results
        results = {
            'file': str(audio_path),
            'duration_seconds': len(audio) / self.sample_rate,
            'num_chunks': len(chunks),
            'aggregation_method': aggregation_method,
            'prediction': 'BONAFIDE' if ensemble_pred == 1 else 'SPOOF',
            'confidence': float(aggregated['ensemble_proba'][ensemble_pred]),
            'probabilities': {
                'bonafide': float(aggregated['ensemble_proba'][1]),
                'spoof': float(aggregated['ensemble_proba'][0])
            },
            'individual_models': {
                'random_forest': {
                    'prediction': 'BONAFIDE' if rf_pred == 1 else 'SPOOF',
                    'confidence': float(aggregated['rf_proba'][rf_pred]),
                    'probabilities': {
                        'bonafide': float(aggregated['rf_proba'][1]),
                        'spoof': float(aggregated['rf_proba'][0])
                    }
                },
                'cnn': {
                    'prediction': 'BONAFIDE' if cnn_pred == 1 else 'SPOOF',
                    'confidence': float(aggregated['cnn_proba'][cnn_pred]),
                    'probabilities': {
                        'bonafide': float(aggregated['cnn_proba'][1]),
                        'spoof': float(aggregated['cnn_proba'][0])
                    }
                }
            },
            'chunk_analysis': {
                'total_chunks': len(chunks),
                'spoof_chunks': sum(1 for p in chunk_predictions if np.argmax(p['ensemble_proba']) == 0),
                'bonafide_chunks': sum(1 for p in chunk_predictions if np.argmax(p['ensemble_proba']) == 1)
            }
        }
        
        if verbose:
            self.print_results(results)
        
        return results
    
    def print_results(self, results):
        """Print detection results in formatted manner"""
        
        logger.info(f"\n{'='*70}")
        logger.info("DETECTION RESULTS")
        logger.info(f"{'='*70}")
        
        # Audio info
        logger.info(f"\nAudio Duration: {results['duration_seconds']:.2f} seconds")
        logger.info(f"Analysis Method: {results['num_chunks']} chunks, {results['aggregation_method']} aggregation")
        
        # Chunk breakdown
        if results['num_chunks'] > 1:
            chunk_analysis = results['chunk_analysis']
            logger.info(f"\nChunk Breakdown:")
            logger.info(f"  Spoof chunks:    {chunk_analysis['spoof_chunks']}/{chunk_analysis['total_chunks']}")
            logger.info(f"  Bonafide chunks: {chunk_analysis['bonafide_chunks']}/{chunk_analysis['total_chunks']}")
        
        # Ensemble prediction
        pred = results['prediction']
        conf = results['confidence'] * 100
        
        color = '\033[92m' if pred == 'BONAFIDE' else '\033[91m'
        reset = '\033[0m'
        
        logger.info(f"\nEnsemble Prediction: {color}{pred}{reset}")
        logger.info(f"Confidence: {conf:.2f}%")
        
        logger.info(f"\nProbabilities:")
        logger.info(f"  Bonafide: {results['probabilities']['bonafide']*100:.2f}%")
        logger.info(f"  Spoof:    {results['probabilities']['spoof']*100:.2f}%")
        
        # Individual models
        logger.info(f"\n{'Individual Model Predictions:'}")
        logger.info(f"{'-'*70}")
        
        rf = results['individual_models']['random_forest']
        logger.info(f"\nRandom Forest: {rf['prediction']} ({rf['confidence']*100:.2f}%)")
        logger.info(f"  Bonafide: {rf['probabilities']['bonafide']*100:.2f}%")
        logger.info(f"  Spoof:    {rf['probabilities']['spoof']*100:.2f}%")
        
        cnn = results['individual_models']['cnn']
        logger.info(f"\nCNN: {cnn['prediction']} ({cnn['confidence']*100:.2f}%)")
        logger.info(f"  Bonafide: {cnn['probabilities']['bonafide']*100:.2f}%")
        logger.info(f"  Spoof:    {cnn['probabilities']['spoof']*100:.2f}%")
        
        logger.info(f"\n{'='*70}")
        
        # Interpretation
        logger.info("\nInterpretation:")
        
        if results['confidence'] > 0.9:
            logger.info(f"  High confidence detection - Clear {pred.lower()} characteristics")
        elif results['confidence'] > 0.7:
            logger.info(f"  Moderate confidence - Likely {pred.lower()}")
        elif results['confidence'] > 0.5:
            logger.info(f"  Low confidence - Uncertain, slight lean toward {pred.lower()}")
        else:
            logger.info(f"  Very low confidence - Borderline case")
        
        # Model agreement
        rf_pred = results['individual_models']['random_forest']['prediction']
        cnn_pred = results['individual_models']['cnn']['prediction']
        
        if rf_pred == cnn_pred == pred:
            logger.info(f"  Model Agreement: Both models agree ({pred})")
        else:
            logger.info(f"  Model Disagreement: RF={rf_pred}, CNN={cnn_pred}, Ensemble={pred}")
        
        # Temporal consistency for multi-chunk audio
        if results['num_chunks'] > 1:
            chunk_analysis = results['chunk_analysis']
            consistency_ratio = max(chunk_analysis['spoof_chunks'], chunk_analysis['bonafide_chunks']) / chunk_analysis['total_chunks']
            
            logger.info(f"\nTemporal Consistency: {consistency_ratio*100:.1f}%")
            if consistency_ratio > 0.8:
                logger.info(f"  Consistent {pred.lower()} characteristics throughout audio")
            elif consistency_ratio > 0.6:
                logger.info(f"  Mostly {pred.lower()} but some inconsistency detected")
            else:
                logger.info(f"  Mixed characteristics - audio may contain spliced segments")
        
        logger.info(f"{'='*70}\n")
    
    def predict_batch(self, audio_dir, output_file=None, aggregation_method='average', overlap=0.5):
        """Predict on batch of audio files"""
        
        audio_dir = Path(audio_dir)
        
        if not audio_dir.exists():
            logger.error(f"Directory not found: {audio_dir}")
            return None
        
        # Find all audio files
        audio_extensions = ['.wav', '.flac', '.mp3', '.ogg', '.m4a']
        audio_files = []
        
        for ext in audio_extensions:
            audio_files.extend(list(audio_dir.glob(f'*{ext}')))
            audio_files.extend(list(audio_dir.glob(f'**/*{ext}')))
        
        if not audio_files:
            logger.error(f"No audio files found in {audio_dir}")
            return None
        
        logger.info(f"\nFound {len(audio_files)} audio files")
        logger.info(f"Processing batch...\n")
        
        results = []
        
        for audio_file in audio_files:
            result = self.predict_single(
                audio_file, 
                verbose=False, 
                aggregation_method=aggregation_method,
                overlap=overlap
            )
            if result:
                results.append(result)
                
                # Print compact result
                pred = result['prediction']
                conf = result['confidence'] * 100
                duration = result['duration_seconds']
                logger.info(f"{audio_file.name:<50} {duration:>6.1f}s  {pred:<10} {conf:>6.2f}%")
        
        # Save results if requested
        if output_file:
            import json
            output_path = Path(output_file)
            
            with open(output_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"\nResults saved to: {output_path}")
        
        # Print summary
        logger.info(f"\n{'='*70}")
        logger.info("BATCH SUMMARY")
        logger.info(f"{'='*70}")
        
        total = len(results)
        bonafide_count = sum(1 for r in results if r['prediction'] == 'BONAFIDE')
        spoof_count = total - bonafide_count
        
        logger.info(f"\nTotal files: {total}")
        logger.info(f"Bonafide: {bonafide_count} ({bonafide_count/total*100:.1f}%)")
        logger.info(f"Spoof: {spoof_count} ({spoof_count/total*100:.1f}%)")
        
        # Confidence distribution
        confidences = [r['confidence'] for r in results]
        avg_conf = np.mean(confidences)
        
        logger.info(f"\nAverage confidence: {avg_conf*100:.2f}%")
        logger.info(f"Min confidence: {min(confidences)*100:.2f}%")
        logger.info(f"Max confidence: {max(confidences)*100:.2f}%")
        
        # Duration statistics
        durations = [r['duration_seconds'] for r in results]
        logger.info(f"\nDuration Statistics:")
        logger.info(f"  Average: {np.mean(durations):.1f}s")
        logger.info(f"  Min: {min(durations):.1f}s")
        logger.info(f"  Max: {max(durations):.1f}s")
        
        logger.info(f"{'='*70}\n")
        
        return results


def main():
    """Main execution with argument parsing"""
    
    parser = argparse.ArgumentParser(
        description='Audio Deepfake Detection - Real-World Testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test single audio file
  python test_audio.py --file path/to/audio.wav
  
  # Test all audio files in directory
  python test_audio.py --dir path/to/audio/folder
  
  # Save batch results to JSON
  python test_audio.py --dir path/to/folder --output results.json
        """
    )
    
    parser.add_argument(
        '--file', '-f',
        type=str,
        help='Path to single audio file'
    )
    
    parser.add_argument(
        '--dir', '-d',
        type=str,
        help='Path to directory containing audio files'
    )
    
    parser.add_argument(
        '--output', '-o',
        type=str,
        help='Output JSON file for batch results'
    )
    
    parser.add_argument(
        '--aggregation', '-a',
        type=str,
        default='average',
        choices=['average', 'majority', 'max_confidence'],
        help='Method to aggregate chunk predictions (default: average)'
    )
    
    parser.add_argument(
        '--overlap',
        type=float,
        default=0.5,
        help='Overlap ratio for chunks (0.0-0.9, default: 0.5)'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.file and not args.dir:
        parser.error("Must specify either --file or --dir")
    
    if args.file and args.dir:
        parser.error("Cannot specify both --file and --dir")
    
    # Initialize detector
    logger.info("\n" + "="*70)
    logger.info("DeepTrace - Audio Deepfake Detector")
    logger.info("="*70 + "\n")
    
    detector = AudioDeepfakeDetector()
    
    # Process
    if args.file:
        # Single file
        result = detector.predict_single(
            args.file, 
            aggregation_method=args.aggregation,
            overlap=args.overlap
        )
        
    elif args.dir:
        # Batch processing
        results = detector.predict_batch(
            args.dir, 
            args.output,
            aggregation_method=args.aggregation,
            overlap=args.overlap
        )
    
    logger.info("\n[OK]Detection completed!")  

if __name__ == "__main__":
    main()