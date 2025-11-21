"""
Extract Representative 10K Sample Subset from ASVspoof 2021 DF
Works with trial_metadata.txt format (17K samples total)
"""

import os
import pandas as pd
import shutil
from pathlib import Path
import logging
from tqdm import tqdm
import random
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DFSubsetExtractor:
    def __init__(self, base_path=r'C:\Users\umerd\source\repos\DeepTrace - audio\data\raw\asvspoof2021\ASVspoof2021_DF_eval'):
        self.base_path = Path(base_path)
        self.protocol_file = self.base_path / 'trial_metadata.txt'
        self.audio_dir = self.base_path / 'flac'
        self.subset_dir = self.base_path.parent / 'ASVspoof2021_DF_eval_subset_10k'
        
        logger.info(f"Base path: {self.base_path}")
        logger.info(f"Protocol file: {self.protocol_file}")
        logger.info(f"Audio directory: {self.audio_dir}")
    
    def parse_protocol(self):
        """
        Parse trial_metadata.txt file
        
        Format (space-separated):
        speaker_id audio_file codec source_dataset system_id label trim_status partition 
        vocoder_category task team gender_source gender_target
        
        Example:
        TMM1 DF_E_2664614 high_ogg vcc2020 Task2-team11 spoof notrim eval 
        neural_vocoder_autoregressive Task2 team11 FM M
        """
        
        logger.info("Parsing protocol file...")
        
        if not self.protocol_file.exists():
            logger.error(f"Protocol file not found: {self.protocol_file}")
            return None
        
        data = []
        
        with open(self.protocol_file, 'r') as f:
            for line in f:
                parts = line.strip().split()
                
                if len(parts) >= 7:  # Minimum required fields
                    try:
                        speaker_id = parts[0]
                        audio_file = parts[1]
                        codec = parts[2] if len(parts) > 2 else 'unknown'
                        source = parts[3] if len(parts) > 3 else 'unknown'
                        system_id = parts[4] if len(parts) > 4 else 'unknown'
                        label = parts[5] if len(parts) > 5 else 'unknown'
                        vocoder = parts[8] if len(parts) > 8 else 'unknown'
                        
                        data.append({
                            'speaker_id': speaker_id,
                            'audio_file': audio_file,
                            'codec': codec,
                            'source': source,
                            'system_id': system_id,
                            'label': label,
                            'binary_label': 1 if label == 'bonafide' else 0,
                            'vocoder': vocoder
                        })
                    except Exception as e:
                        logger.warning(f"Error parsing line: {line.strip()}, Error: {e}")
                        continue
        
        df = pd.DataFrame(data)
        
        logger.info(f"Total samples in dataset: {len(df):,}")
        logger.info(f"\nClass distribution:")
        logger.info(f"  Bonafide: {(df['label'] == 'bonafide').sum():,}")
        logger.info(f"  Spoof: {(df['label'] == 'spoof').sum():,}")
        
        if (df['label'] == 'spoof').any():
            logger.info(f"\nVocoder types:")
            vocoder_dist = df[df['label'] == 'spoof']['vocoder'].value_counts().head(10)
            for vocoder, count in vocoder_dist.items():
                logger.info(f"  {vocoder}: {count:,}")
        
        return df
    
    def create_stratified_subset(self, df, n_samples=10000, random_seed=42):
        """
        Create stratified subset maintaining class and vocoder distribution
        
        Args:
            df: Full dataset dataframe
            n_samples: Number of samples to extract
            random_seed: Random seed for reproducibility
        """
        
        logger.info(f"\nCreating stratified subset of {n_samples:,} samples...")
        
        # If dataset has less than requested samples, use maximum available
        if len(df) < n_samples:
            n_samples = len(df)
            logger.warning(f"Dataset only has {len(df):,} samples. Using all available samples.")
        
        random.seed(random_seed)
        
        # Calculate samples per class to maintain distribution
        total_samples = len(df)
        bonafide_ratio = (df['label'] == 'bonafide').sum() / total_samples
        spoof_ratio = (df['label'] == 'spoof').sum() / total_samples
        
        n_bonafide = int(n_samples * bonafide_ratio)
        n_spoof = n_samples - n_bonafide
        
        logger.info(f"Target distribution:")
        logger.info(f"  Bonafide: {n_bonafide:,} ({bonafide_ratio*100:.1f}%)")
        logger.info(f"  Spoof: {n_spoof:,} ({spoof_ratio*100:.1f}%)")
        
        # Sample from each class
        bonafide_df = df[df['label'] == 'bonafide']
        spoof_df = df[df['label'] == 'spoof']
        
        # Sample bonafide
        if len(bonafide_df) >= n_bonafide:
            bonafide_samples = bonafide_df.sample(n=n_bonafide, random_state=random_seed)
        else:
            bonafide_samples = bonafide_df
            logger.warning(f"Only {len(bonafide_df)} bonafide samples available")
        
        # Sample spoof with vocoder stratification
        if len(spoof_df) >= n_spoof:
            # Try to maintain vocoder distribution
            vocoder_counts = spoof_df['vocoder'].value_counts()
            spoof_samples_list = []
            
            for vocoder in vocoder_counts.index:
                vocoder_df = spoof_df[spoof_df['vocoder'] == vocoder]
                vocoder_ratio = len(vocoder_df) / len(spoof_df)
                n_vocoder = int(n_spoof * vocoder_ratio)
                
                if n_vocoder > 0 and len(vocoder_df) >= n_vocoder:
                    samples = vocoder_df.sample(n=n_vocoder, random_state=random_seed)
                    spoof_samples_list.append(samples)
            
            spoof_samples = pd.concat(spoof_samples_list)
            
            # If we didn't get enough, fill randomly
            if len(spoof_samples) < n_spoof:
                remaining = n_spoof - len(spoof_samples)
                remaining_df = spoof_df[~spoof_df.index.isin(spoof_samples.index)]
                if len(remaining_df) > 0:
                    additional = remaining_df.sample(n=min(remaining, len(remaining_df)), random_state=random_seed)
                    spoof_samples = pd.concat([spoof_samples, additional])
        else:
            spoof_samples = spoof_df
            logger.warning(f"Only {len(spoof_df)} spoof samples available")
        
        logger.info(f"\nVocoder distribution in subset:")
        sampled_vocoders = spoof_samples['vocoder'].value_counts()
        for vocoder in sampled_vocoders.head(10).index:
            count = sampled_vocoders.get(vocoder, 0)
            logger.info(f"  {vocoder}: {count}")
        
        # Combine and shuffle
        subset_df = pd.concat([bonafide_samples, spoof_samples])
        subset_df = subset_df.sample(frac=1, random_state=random_seed).reset_index(drop=True)
        
        logger.info(f"\nSubset created: {len(subset_df):,} samples")
        
        return subset_df
    
    def verify_audio_files(self, subset_df):
        """Verify that audio files exist"""
        
        logger.info("\nVerifying audio files...")
        
        missing = []
        sample_size = min(100, len(subset_df))
        
        for audio_file in tqdm(subset_df['audio_file'].head(sample_size), desc="Checking files"):
            audio_path = self.audio_dir / f"{audio_file}.flac"
            if not audio_path.exists():
                missing.append(audio_file)
        
        if len(missing) > 0:
            logger.warning(f"Missing {len(missing)}/{sample_size} files in sample check")
            logger.warning(f"Missing files: {missing[:5]}")
        else:
            logger.info(f"All {sample_size} sampled files verified successfully")
        
        return len(missing) == 0
    
    def save_subset(self, subset_df):
        """Save subset protocol"""
        
        # Create subset directory
        self.subset_dir.mkdir(parents=True, exist_ok=True)
        
        # Save protocol CSV
        protocol_csv = self.subset_dir / 'subset_protocol.csv'
        subset_df.to_csv(protocol_csv, index=False)
        logger.info(f"\nSaved protocol CSV: {protocol_csv}")
        
        # Save in original format
        protocol_txt = self.subset_dir / 'trial_metadata_subset.txt'
        with open(protocol_txt, 'w') as f:
            for _, row in subset_df.iterrows():
                # Simplified format for evaluation
                f.write(f"{row['speaker_id']} {row['audio_file']} {row['codec']} "
                       f"{row['source']} {row['system_id']} {row['label']} "
                       f"notrim eval {row['vocoder']} - - - -\n")
        
        logger.info(f"Saved protocol TXT: {protocol_txt}")
        
        # Save metadata
        metadata = {
            'total_samples': len(subset_df),
            'bonafide_count': int((subset_df['label'] == 'bonafide').sum()),
            'spoof_count': int((subset_df['label'] == 'spoof').sum()),
            'random_seed': 42,
            'source_dataset': 'ASVspoof2021_DF_eval',
            'original_total': 17000,
            'vocoder_types': subset_df['vocoder'].value_counts().to_dict()
        }
        
        metadata_file = self.subset_dir / 'subset_metadata.json'
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Saved metadata: {metadata_file}")
        
        return self.subset_dir


def main():
    """Main execution"""
    
    logger.info("="*70)
    logger.info("ASVspoof 2021 DF Subset Extraction (10K from ~17K)")
    logger.info("="*70)
    
    extractor = DFSubsetExtractor()
    
    # Parse full protocol
    logger.info("\n[1/4] Parsing trial_metadata.txt...")
    df = extractor.parse_protocol()
    
    if df is None:
        logger.error("Failed to parse protocol file")
        return
    
    # Determine subset size
    max_available = len(df)
    logger.info(f"\nTotal samples available: {max_available:,}")
    
    if max_available < 10000:
        logger.warning(f"Dataset has only {max_available:,} samples (less than 10K)")
        response = input(f"Use all {max_available:,} samples? (y/n): ").lower()
        if response != 'y':
            n_samples = int(input(f"Enter number of samples (max {max_available}): "))
        else:
            n_samples = max_available
    else:
        n_samples = 10000
    
    # Create stratified subset
    logger.info(f"\n[2/4] Creating stratified subset of {n_samples:,} samples...")
    subset_df = extractor.create_stratified_subset(df, n_samples=n_samples)
    
    # Verify files
    logger.info("\n[3/4] Verifying audio files...")
    extractor.verify_audio_files(subset_df)
    
    # Save subset
    logger.info("\n[4/4] Saving subset...")
    subset_dir = extractor.save_subset(subset_df)
    
    # Summary
    logger.info("\n" + "="*70)
    logger.info("Subset Creation Complete!")
    logger.info("="*70)
    logger.info(f"\nSubset directory: {subset_dir}")
    logger.info(f"Total samples: {len(subset_df):,}")
    logger.info(f"Bonafide: {(subset_df['label'] == 'bonafide').sum():,}")
    logger.info(f"Spoof: {(subset_df['label'] == 'spoof').sum():,}")
    
    logger.info("\nFiles created:")
    logger.info(f"  - subset_protocol.csv (for evaluation)")
    logger.info(f"  - trial_metadata_subset.txt (original format)")
    logger.info(f"  - subset_metadata.json (metadata)")
    
    logger.info("\n" + "="*70)


if __name__ == "__main__":
    main()