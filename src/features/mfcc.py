"""
GPU-Accelerated MFCC Feature Extraction for Random Forest Classifier
Uses PyTorch with CUDA for faster batch processing when available
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
import pickle

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class GPUMFCCExtractor:
    def __init__(self, params_file='params.yaml'):
        """Initialize GPU-accelerated MFCC extractor with parameters from params.yaml"""
        
        with open(params_file, 'r') as f:
            params = yaml.safe_load(f)
        
        # MFCC parameters
        self.n_mfcc = params['features']['mfcc']['n_mfcc']
        self.n_fft = params['features']['mfcc']['n_fft']
        self.hop_length = params['features']['mfcc']['hop_length']
        self.n_mels = params['features']['mfcc']['n_mels']
        self.fmin = params['features']['mfcc']['fmin']
        self.fmax = params['features']['mfcc']['fmax']
        
        # Delta parameters
        self.delta_order = params['features']['delta']['order']
        
        # Sample rate from preprocessing
        self.sample_rate = params['preprocess']['sample_rate']
        
        # GPU setup
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        if torch.cuda.is_available():
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        else:
            logger.warning("CUDA not available. Using CPU (will be slower).")
        
        # Initialize MFCC transform on GPU
        self.mfcc_transform = T.MFCC(
            sample_rate=self.sample_rate,
            n_mfcc=self.n_mfcc,
            melkwargs={
                'n_fft': self.n_fft,
                'hop_length': self.hop_length,
                'n_mels': self.n_mels,
                'f_min': self.fmin,
                'f_max': self.fmax
            }
        ).to(self.device)
        
        # Paths
        self.processed_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\processed')
        self.features_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\features')
        self.features_path.mkdir(parents=True, exist_ok=True)
        
        # Batch processing parameters (optimized for RTX 3050 - 4GB VRAM)
        self.batch_size = 32 if torch.cuda.is_available() else 8
        
        logger.info(f"Initialized MFCC extractor with:")
        logger.info(f"  n_mfcc: {self.n_mfcc}")
        logger.info(f"  n_fft: {self.n_fft}")
        logger.info(f"  hop_length: {self.hop_length}")
        logger.info(f"  n_mels: {self.n_mels}")
        logger.info(f"  Delta order: {self.delta_order}")
        logger.info(f"  Batch size: {self.batch_size}")
    
    def extract_mfcc_batch(self, audio_batch):
        """
        Extract MFCC features for a batch of audio using GPU
        
        Args:
            audio_batch (torch.Tensor): Batch of audio waveforms (batch_size, samples)
            
        Returns:
            torch.Tensor: Batch of MFCC features
        """
        try:
            # Move to GPU
            audio_batch = audio_batch.to(self.device)
            
            # Extract MFCCs
            with torch.no_grad():
                mfccs = self.mfcc_transform(audio_batch)
            
            return mfccs
        
        except Exception as e:
            logger.error(f"Error extracting MFCC batch: {e}")
            return None
    
    def compute_delta_features(self, mfccs):
        """
        Compute delta and delta-delta features on GPU
        
        Args:
            mfccs (torch.Tensor): MFCC features (batch, n_mfcc, time)
            
        Returns:
            torch.Tensor: Combined MFCC + delta + delta-delta features
        """
        try:
            delta_filter = torch.tensor([-1.0, 0.0, 1.0], device=self.device).view(1, 1, 3)
            
            # Pad for convolution
            mfccs_padded = torch.nn.functional.pad(mfccs, (1, 1), mode='replicate')
            
            delta1 = torch.nn.functional.conv1d(
                mfccs_padded.view(-1, 1, mfccs_padded.shape[-1]),
                delta_filter,
                padding=0
            ).view(mfccs.shape)
            
            if self.delta_order >= 2:
                delta1_padded = torch.nn.functional.pad(delta1, (1, 1), mode='replicate')
                delta2 = torch.nn.functional.conv1d(
                    delta1_padded.view(-1, 1, delta1_padded.shape[-1]),
                    delta_filter,
                    padding=0
                ).view(mfccs.shape)
                
                features = torch.cat([mfccs, delta1, delta2], dim=1)
            else:
                features = torch.cat([mfccs, delta1], dim=1)
            
            return features
        
        except Exception as e:
            logger.error(f"Error computing delta features: {e}")
            return None
    
    def compute_statistics_batch(self, features_batch):
        """
        Compute statistical features from MFCCs for batch on GPU
        
        Args:
            features_batch (torch.Tensor): Batch of features (batch, n_features, time)
            
        Returns:
            torch.Tensor: Batch of statistical feature vectors
        """
        try:
            # Compute statistics across time axis (dim=2)
            mean = torch.mean(features_batch, dim=2)
            std = torch.std(features_batch, dim=2)
            max_val, _ = torch.max(features_batch, dim=2)
            min_val, _ = torch.min(features_batch, dim=2)
            median = torch.median(features_batch, dim=2)[0]
            
            # Concatenate all statistics
            stats = torch.cat([mean, std, max_val, min_val, median], dim=1)
            
            return stats
        
        except Exception as e:
            logger.error(f"Error computing statistics: {e}")
            return None
    
    def process_split(self, split='train'):
        """
        Extract MFCC features for entire dataset split using GPU batching
        
        Args:
            split (str): Dataset split ('train', 'dev', 'eval')
        """
        logger.info(f"Extracting MFCC features for {split} split using GPU...")
        
        # Load metadata
        metadata_file = self.processed_path / split / 'metadata.csv'
        
        if not metadata_file.exists():
            logger.error(f"Metadata file not found: {metadata_file}")
            return
        
        df = pd.read_csv(metadata_file)
        logger.info(f"Loaded {len(df)} samples from metadata")
        
        all_features = []
        all_labels = []
        all_audio_files = []
        failed_count = 0
        
        num_batches = int(np.ceil(len(df) / self.batch_size))
        
        for batch_idx in tqdm(range(num_batches), desc=f"Processing batches ({split})"):
            start_idx = batch_idx * self.batch_size
            end_idx = min(start_idx + self.batch_size, len(df))
            batch_df = df.iloc[start_idx:end_idx]
            
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
            
            audio_batch_tensor = torch.stack(audio_batch)
            mfccs = self.extract_mfcc_batch(audio_batch_tensor)
            
            if mfccs is None:
                failed_count += len(audio_batch)
                continue
            
            if self.delta_order >= 1:
                features = self.compute_delta_features(mfccs)
            else:
                features = mfccs
            
            if features is None:
                failed_count += len(audio_batch)
                continue
            
            feature_vectors = self.compute_statistics_batch(features)
            
            if feature_vectors is None:
                failed_count += len(audio_batch)
                continue
            
            feature_vectors_numpy = feature_vectors.cpu().numpy()
            
            for i in range(len(feature_vectors_numpy)):
                all_features.append(feature_vectors_numpy[i])
                all_labels.append(batch_labels[i])
                all_audio_files.append(batch_files[i])
            
            if batch_idx % 10 == 0 and torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        # Convert to numpy arrays
        features_array = np.array(all_features)
        labels_array = np.array(all_labels)
        
        logger.info(f"Extracted features shape: {features_array.shape}")
        logger.info(f"Labels shape: {labels_array.shape}")
        logger.info(f"Failed to extract: {failed_count} samples")
        
        # Save features
        output_data = {
            'features': features_array,
            'labels': labels_array,
            'audio_files': all_audio_files,
            'feature_params': {
                'n_mfcc': self.n_mfcc,
                'n_fft': self.n_fft,
                'hop_length': self.hop_length,
                'n_mels': self.n_mels,
                'delta_order': self.delta_order,
                'sample_rate': self.sample_rate,
                'device': str(self.device)
            }
        }
        
        output_file = self.features_path / f'mfcc_{split}.pkl'
        with open(output_file, 'wb') as f:
            pickle.dump(output_data, f)
        
        logger.info(f"Saved MFCC features to: {output_file}")
        
        # Print class distribution
        unique, counts = np.unique(labels_array, return_counts=True)
        logger.info(f"Class distribution:")
        logger.info(f"  Bonafide (1): {counts[1] if len(counts) > 1 else 0}")
        logger.info(f"  Spoof (0): {counts[0]}")
        
        # Clear GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        return output_data


def main():
    """Main execution function"""
    logger.info("Starting GPU-Accelerated MFCC feature extraction...")
    
    if not torch.cuda.is_available():
        logger.warning("CUDA not available! Using CPU (will be slower).")
    
    extractor = GPUMFCCExtractor()
    
    logger.info("\n" + "="*70)
    logger.info("GPU MFCC Feature Extraction Pipeline")
    logger.info("="*70)
    
    splits = ['train', 'dev']
    
    for split in splits:
        logger.info(f"\n{'='*70}")
        extractor.process_split(split)
        logger.info(f"{'='*70}\n")
    


if __name__ == "__main__":
    main()