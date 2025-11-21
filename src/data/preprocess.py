"""
Audio Preprocessing Script for ASVspoof 2019
Handles audio loading, resampling, normalization, and length standardization
"""

import os
import yaml
import pandas as pd
import librosa
import soundfile as sf
import numpy as np
from pathlib import Path
from tqdm import tqdm
import logging
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AudioPreprocessor:
    def __init__(self, params_file='params.yaml'):
        """Initialize preprocessor with parameters from params.yaml"""
        
        with open(params_file, 'r') as f:
            params = yaml.safe_load(f)
        
        self.sample_rate = params['preprocess']['sample_rate']
        self.duration = params['preprocess']['duration']
        self.max_length = params['preprocess']['max_audio_length']
        self.normalize = params['preprocess']['normalize']
        
        self.base_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\raw\asvspoof2019\LA')
        self.output_path = Path(r'C:\Users\umerd\source\repos\DeepTrace - audio\data\processed')
        
        logger.info(f"Initialized preprocessor with:")
        logger.info(f"  Sample rate: {self.sample_rate} Hz")
        logger.info(f"  Duration: {self.duration} seconds")
        logger.info(f"  Max length: {self.max_length} samples")
        logger.info(f"  Normalize: {self.normalize}")
    
    def load_audio(self, audio_path):
        """
        Load audio file with librosa
        
        Args:
            audio_path (Path): Path to audio file
            
        Returns:
            np.ndarray: Audio waveform
        """
        try:
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            return y
        except Exception as e:
            logger.error(f"Error loading {audio_path}: {e}")
            return None
    
    def normalize_audio(self, audio):
        """
        Normalize audio to [-1, 1] range
        
        Args:
            audio (np.ndarray): Input audio
            
        Returns:
            np.ndarray: Normalized audio
        """
        if np.max(np.abs(audio)) > 0:
            audio = audio / np.max(np.abs(audio))
        return audio
    
    def fix_length(self, audio):
        """
        Fix audio length by padding or truncating
        
        Args:
            audio (np.ndarray): Input audio
            
        Returns:
            np.ndarray: Fixed-length audio
        """
        if len(audio) > self.max_length:
            # Truncate
            audio = audio[:self.max_length]
        elif len(audio) < self.max_length:
            # Pad with zeros
            pad_length = self.max_length - len(audio)
            audio = np.pad(audio, (0, pad_length), mode='constant')
        
        return audio
    
    def preprocess_audio(self, audio_path):
        """
        Complete preprocessing pipeline
        
        Args:
            audio_path (Path): Path to audio file
            
        Returns:
            np.ndarray: Preprocessed audio
        """
        # Load audio
        audio = self.load_audio(audio_path)
        
        if audio is None:
            return None
        
        # Normalize
        if self.normalize:
            audio = self.normalize_audio(audio)
        
        # Fix length
        audio = self.fix_length(audio)
        
        return audio
    
    def process_split(self, split='train'):
        """
        Process entire dataset split
        
        Args:
            split (str): Dataset split ('train', 'dev', 'eval')
        """
        logger.info(f"Processing {split} split...")
        
        # Load protocol CSV
        protocol_file = self.base_path / 'protocols' / f'{split}.csv'
        
        if not protocol_file.exists():
            logger.error(f"Protocol file not found: {protocol_file}")
            return
        
        df = pd.read_csv(protocol_file)
        logger.info(f"Loaded {len(df)} samples from protocol")
        
        # Determine audio directory based on split
        if split == 'train':
            audio_dir = self.base_path / 'ASVspoof2019_LA_train' / 'flac'
        elif split == 'dev':
            audio_dir = self.base_path / 'ASVspoof2019_LA_dev' / 'flac'
        elif split == 'eval':
            audio_dir = self.base_path / 'ASVspoof2019_LA_eval' / 'flac'
        else:
            logger.error(f"Unknown split: {split}")
            return
        
        if not audio_dir.exists():
            logger.error(f"Audio directory not found: {audio_dir}")
            return
        
        # Create output directory
        output_dir = self.output_path / split
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Process each audio file
        processed_count = 0
        failed_count = 0
        
        processed_metadata = []
        
        for idx, row in tqdm(df.iterrows(), total=len(df), desc=f"Processing {split}"):
            audio_file = row['audio_file']
            audio_path = audio_dir / f"{audio_file}.flac"
            
            if not audio_path.exists():
                logger.warning(f"Audio file not found: {audio_path}")
                failed_count += 1
                continue
            
            # Preprocess audio
            processed_audio = self.preprocess_audio(audio_path)
            
            if processed_audio is None:
                failed_count += 1
                continue
            
            # Save processed audio
            output_file = output_dir / f"{audio_file}.npy"
            np.save(output_file, processed_audio)
            
            # Store metadata
            processed_metadata.append({
                'audio_file': audio_file,
                'label': row['label'],
                'binary_label': row['binary_label'],
                'speaker_id': row['speaker_id'],
                'system_id': row['system_id'],
                'processed_path': str(output_file)
            })
            
            processed_count += 1
        
        # Save metadata
        metadata_df = pd.DataFrame(processed_metadata)
        metadata_file = output_dir / 'metadata.csv'
        metadata_df.to_csv(metadata_file, index=False)
        
        logger.info(f"Processed {processed_count} files successfully")
        logger.info(f"Failed to process {failed_count} files")
        logger.info(f"Saved metadata to {metadata_file}")
        
        # Save statistics
        stats = {
            'split': split,
            'total_samples': len(df),
            'processed_samples': processed_count,
            'failed_samples': failed_count,
            'bonafide_count': int((metadata_df['label'] == 'bonafide').sum()),
            'spoof_count': int((metadata_df['label'] == 'spoof').sum()),
            'sample_rate': self.sample_rate,
            'duration': self.duration,
            'max_length': self.max_length
        }
        
        stats_file = output_dir / 'stats.json'
        with open(stats_file, 'w') as f:
            json.dump(stats, f, indent=2)
        
        logger.info(f"Saved statistics to {stats_file}")
        
        return stats
    
    

def main():
    """Main execution function"""
    logger.info("Starting audio preprocessing...")
    
    # Initialize preprocessor
    preprocessor = AudioPreprocessor()
    
    # Process all splits
    logger.info("\n" + "="*70)
    logger.info("Starting preprocessing pipeline...")
    logger.info("="*70)
    
    splits = ['train', 'dev', 'eval']
    all_stats = {}
    
    for split in splits:
        logger.info(f"\n{'='*70}")
        stats = preprocessor.process_split(split)
        if stats:
            all_stats[split] = stats
        logger.info(f"{'='*70}\n")
    
    # Print summary
    logger.info("\n" + "="*70)
    logger.info("Preprocessing Summary")
    logger.info("="*70)
    
    for split, stats in all_stats.items():
        logger.info(f"\n{split.upper()}:")
        logger.info(f"  Total: {stats['total_samples']}")
        logger.info(f"  Processed: {stats['processed_samples']}")
        logger.info(f"  Failed: {stats['failed_samples']}")
        logger.info(f"  Bonafide: {stats['bonafide_count']}")
        logger.info(f"  Spoof: {stats['spoof_count']}")
    
    logger.info("\n" + "="*70)
    logger.info("[OK] Preprocessing completed successfully!")
    logger.info("="*70)


if __name__ == "__main__":
    main()