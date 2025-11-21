"""
GPU-Accelerated Mel-Spectrogram Feature Extraction for CNN Model
Uses PyTorch with CUDA for faster processing on NVIDIA GPUs
Optimized for RTX 3050 (4GB VRAM)
"""

import os
import yaml
import pandas as pd
import numpy as np
import torch
import torchaudio
import torchaudio.transforms as T
from pathlib import Path
from tqdm import tqdm
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GPUSpectrogramExtractor:
    def __init__(self, params_file='params.yaml'):
        """Initialize GPU-accelerated spectrogram extractor"""
        
        with open(params_file, 'r') as f:
            params = yaml.safe_load(f)
        
        # Spectrogram parameters
        self.n_fft = params['features']['spectrogram']['n_fft']
        self.hop_length = params['features']['spectrogram']['hop_length']
        self.n_mels = params['features']['spectrogram']['n_mels']
        self.fmin = params['features']['spectrogram']['fmin']
        self.fmax = params['features']['spectrogram']['fmax']
        self.sample_rate = params['preprocess']['sample_rate']
        
        # GPU setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        if torch.cuda.is_available():
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        else:
            logger.warning("CUDA not available. Using CPU (will be slower).")
        
        # Initialize mel-spectrogram transform on GPU
        self.mel_spectrogram = T.MelSpectrogram(
            sample_rate=self.sample_rate,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
            n_mels=self.n_mels,
            f_min=self.fmin,
            f_max=self.fmax
        ).to(self.device)
        
        # Amplitude to dB conversion
        self.amplitude_to_db = T.AmplitudeToDB().to(self.device)
        
        # Paths
        self.processed_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\processed')
        self.features_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\features')
        self.features_path.mkdir(parents=True, exist_ok=True)
        
        # Batch processing parameters (optimized for RTX 3050 - 4GB VRAM)
        self.batch_size = 16 if torch.cuda.is_available() else 4
        
        logger.info(f"Initialized GPU Spectrogram extractor with:")
        logger.info(f"  n_fft: {self.n_fft}")
        logger.info(f"  hop_length: {self.hop_length}")
        logger.info(f"  n_mels: {self.n_mels}")
        logger.info(f"  Batch size: {self.batch_size}")
    
    def extract_mel_spectrogram_batch(self, audio_batch):
        """
        Extract mel-spectrograms for a batch of audio files using GPU
        
        Args:
            audio_batch (torch.Tensor): Batch of audio waveforms (batch_size, samples)
            
        Returns:
            torch.Tensor: Batch of mel-spectrograms
        """
        try:
            # Move to GPU
            audio_batch = audio_batch.to(self.device)
            
            # Extract mel-spectrogram
            with torch.no_grad():
                mel_spec = self.mel_spectrogram(audio_batch)
                
                # Convert to dB
                mel_spec_db = self.amplitude_to_db(mel_spec)
            
            return mel_spec_db
        
        except Exception as e:
            logger.error(f"Error extracting mel-spectrogram batch: {e}")
            return None
    
    def normalize_spectrogram_batch(self, spectrogram_batch):
        """
        Normalize batch of spectrograms to [0, 1] range using GPU
        
        Args:
            spectrogram_batch (torch.Tensor): Batch of spectrograms
            
        Returns:
            torch.Tensor: Batch of normalized spectrograms
        """
        try:
            # Normalize each spectrogram individually
            batch_size = spectrogram_batch.shape[0]
            normalized_batch = []
            
            for i in range(batch_size):
                spec = spectrogram_batch[i]
                spec_min = torch.min(spec)
                spec_max = torch.max(spec)
                
                if spec_max - spec_min > 0:
                    normalized = (spec - spec_min) / (spec_max - spec_min)
                else:
                    normalized = spec - spec_min
                
                normalized_batch.append(normalized)
            
            return torch.stack(normalized_batch)
        
        except Exception as e:
            logger.error(f"Error normalizing spectrogram: {e}")
            return None
    
    def pad_or_truncate_batch(self, batch, target_length):
        """
        Pad or truncate a batch of spectrograms to target length
        
        Args:
            batch (torch.Tensor): Batch of spectrograms (batch, freq, time)
            target_length (int): Target time length
            
        Returns:
            torch.Tensor: Fixed-length batch
        """
        batch_size, freq, current_length = batch.shape
        
        if current_length > target_length:
            return batch[:, :, :target_length]
        elif current_length < target_length:
            pad_length = target_length - current_length
            padding = torch.zeros(batch_size, freq, pad_length, device=self.device)
            return torch.cat([batch, padding], dim=2)
        else:
            return batch
    
    def process_split(self, split='train'):
        """
        Extract spectrogram features for entire dataset split using GPU batching
        
        Args:
            split (str): Dataset split ('train', 'dev', 'eval')
        """
        logger.info(f"Extracting spectrogram features for {split} split using GPU...")
        
        # Load metadata
        metadata_file = self.processed_path / split / 'metadata.csv'
        
        if not metadata_file.exists():
            logger.error(f"Metadata file not found: {metadata_file}")
            return
        
        df = pd.read_csv(metadata_file)
        logger.info(f"Loaded {len(df)} samples from metadata")
        
        # Determine target length by sampling
        logger.info("Determining maximum spectrogram length...")
        sample_size = min(100, len(df))
        max_length = 0
        
        for idx in range(sample_size):
            audio_path = Path(df.iloc[idx]['processed_path'])
            if audio_path.exists():
                audio = np.load(audio_path)
                n_frames = int(np.ceil(len(audio) / self.hop_length))
                max_length = max(max_length, n_frames)
        
        target_length = max_length if max_length > 0 else 126
        logger.info(f"Using target length: {target_length} frames")
        
        # Process in batches
        all_features = []
        all_labels = []
        all_audio_files = []
        failed_count = 0
        
        num_batches = int(np.ceil(len(df) / self.batch_size))
        
        for batch_idx in tqdm(range(num_batches), desc=f"Processing batches ({split})"):
            start_idx = batch_idx * self.batch_size
            end_idx = min(start_idx + self.batch_size, len(df))
            batch_df = df.iloc[start_idx:end_idx]
            
            # Load batch of audio files
            audio_batch = []
            valid_indices = []
            batch_labels = []
            batch_files = []
            
            for idx, row in batch_df.iterrows():
                audio_path = Path(row['processed_path'])
                
                if not audio_path.exists():
                    failed_count += 1
                    continue
                
                try:
                    audio = np.load(audio_path)
                    audio_batch.append(torch.from_numpy(audio).float())
                    valid_indices.append(idx)
                    batch_labels.append(row['binary_label'])
                    batch_files.append(row['audio_file'])
                except Exception as e:
                    logger.warning(f"Failed to load {audio_path}: {e}")
                    failed_count += 1
                    continue
            
            if len(audio_batch) == 0:
                continue
            
            # Stack into batch tensor
            audio_batch_tensor = torch.stack(audio_batch)
            
            # Extract spectrograms on GPU
            mel_specs = self.extract_mel_spectrogram_batch(audio_batch_tensor)
            
            if mel_specs is None:
                failed_count += len(audio_batch)
                continue
            
            # Normalize spectrograms
            mel_specs_normalized = self.normalize_spectrogram_batch(mel_specs)
            
            if mel_specs_normalized is None:
                failed_count += len(audio_batch)
                continue
            
            # Pad/truncate to target length
            mel_specs_fixed = self.pad_or_truncate_batch(mel_specs_normalized, target_length)
            
            # Transpose to (batch, time, frequency) and add channel dimension
            mel_specs_final = mel_specs_fixed.permute(0, 2, 1).unsqueeze(-1)  # (batch, time, freq, 1)
            
            # Move to CPU and convert to numpy
            mel_specs_numpy = mel_specs_final.cpu().numpy()
            
            # Store results
            for i in range(len(mel_specs_numpy)):
                all_features.append(mel_specs_numpy[i])
                all_labels.append(batch_labels[i])
                all_audio_files.append(batch_files[i])
            
            # Clear GPU cache periodically
            if batch_idx % 10 == 0 and torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        # Convert to numpy arrays
        features_array = np.array(all_features)
        labels_array = np.array(all_labels)
        
        logger.info(f"Extracted features shape: {features_array.shape}")
        logger.info(f"Labels shape: {labels_array.shape}")
        logger.info(f"Failed to extract: {failed_count} samples")
        
        # Save features
        output_file = self.features_path / f'spectrogram_{split}.npz'
        np.savez_compressed(
            output_file,
            features=features_array,
            labels=labels_array,
            audio_files=all_audio_files
        )
        
        logger.info(f"Saved spectrogram features to: {output_file}")
        
        # Save metadata
        metadata = {
            'n_fft': self.n_fft,
            'hop_length': self.hop_length,
            'n_mels': self.n_mels,
            'sample_rate': self.sample_rate,
            'target_length': target_length,
            'shape': features_array.shape,
            'device': str(self.device)
        }
        
        metadata_file = self.features_path / f'spectrogram_{split}_metadata.txt'
        with open(metadata_file, 'w') as f:
            for key, value in metadata.items():
                f.write(f"{key}: {value}\n")
        
        # Print class distribution
        unique, counts = np.unique(labels_array, return_counts=True)
        logger.info(f"Class distribution:")
        logger.info(f"  Bonafide (1): {counts[1] if len(counts) > 1 else 0}")
        logger.info(f"  Spoof (0): {counts[0]}")
        
        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        return features_array, labels_array


def main():
    """Main execution function"""
    logger.info("Starting GPU-Accelerated Mel-Spectrogram feature extraction...")
    
    # Check CUDA availability
    if not torch.cuda.is_available():
        logger.warning("CUDA not available! Using CPU (will be slower).")
    
    # Initialize extractor
    extractor = GPUSpectrogramExtractor()
    
    # Process all splits
    logger.info("\n" + "="*70)
    logger.info("GPU Mel-Spectrogram Feature Extraction Pipeline")
    logger.info("="*70)
    
    splits = ['train', 'dev']
    
    for split in splits:
        logger.info(f"\n{'='*70}")
        extractor.process_split(split)
        logger.info(f"{'='*70}\n")
    
    logger.info("\n" + "="*70)
    logger.info("[OK] GPU Spectrogram feature extraction completed!")
    logger.info("="*70)


if __name__ == "__main__":
    main()