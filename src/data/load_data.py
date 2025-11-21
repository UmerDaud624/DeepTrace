"""
Data Loading Script for ASVspoof 2019 Dataset
Parses protocol files and organizes data for training
"""

import os
import pandas as pd
import shutil
from pathlib import Path
from tqdm import tqdm
import yaml
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ASVspoofDataLoader:
    """Load and parse ASVspoof 2019 dataset"""
    
    def __init__(self, base_path=r'C:\Users\umerd\source\repos\DeepTrace - audio\data\raw\asvspoof2019\LA'):
        self.base_path = Path(base_path)
        self.protocol_path = self.base_path / 'ASVspoof2019_LA_cm_protocols'
        self.audio_base_path = self.base_path
        
        # Define protocol files
        self.protocol_files = {
            'train': 'ASVspoof2019.LA.cm.train.trn.txt',
            'dev': 'ASVspoof2019.LA.cm.dev.trl.txt',
            'eval': 'ASVspoof2019.LA.cm.eval.trl.txt'
        }
        
        # Define audio directories
        self.audio_dirs = {
            'train': 'ASVspoof2019_LA_train/flac',
            'dev': 'ASVspoof2019_LA_dev/flac',
            'eval': 'ASVspoof2019_LA_eval/flac'
        }
    
    def parse_protocol_file(self, protocol_file):
        """
        Parse ASVspoof protocol file
        
        Format: SPEAKER_ID AUDIO_FILE_NAME - SYSTEM_ID KEY
        Example: LA_0079 LA_T_1138215 - - bonafide
        
        Args:
            protocol_file (str): Path to protocol file
            
        Returns:
            pd.DataFrame: Parsed protocol data
        """
        logger.info(f"Parsing protocol file: {protocol_file}")
        
        data = []
        
        try:
            with open(protocol_file, 'r') as f:
                for line in f:
                    parts = line.strip().split()
                    
                    if len(parts) >= 5:
                        speaker_id = parts[0]
                        audio_file = parts[1]
                        system_id = parts[3] if parts[3] != '-' else 'bonafide'
                        label = parts[4]
                        
                        data.append({
                            'speaker_id': speaker_id,
                            'audio_file': audio_file,
                            'system_id': system_id,
                            'label': label,
                            'binary_label': 1 if label == 'bonafide' else 0
                        })
            
            df = pd.DataFrame(data)
            logger.info(f"Parsed {len(df)} samples")
            logger.info(f"Class distribution:\n{df['label'].value_counts()}")
            
            return df
        
        except FileNotFoundError:
            logger.error(f"Protocol file not found: {protocol_file}")
            raise
        except Exception as e:
            logger.error(f"Error parsing protocol file: {e}")
            raise
    
    def load_all_protocols(self):
        """
        Load all protocol files (train, dev, eval)
        
        Returns:
            dict: Dictionary containing DataFrames for each split
        """
        protocols = {}
        
        for split, filename in self.protocol_files.items():
            protocol_file = self.protocol_path / filename
            
            if protocol_file.exists():
                df = self.parse_protocol_file(protocol_file)
                protocols[split] = df
                
                # Save as CSV for easy access
                output_path = self.base_path / 'protocols' / f'{split}.csv'
                output_path.parent.mkdir(parents=True, exist_ok=True)
                df.to_csv(output_path, index=False)
                logger.info(f"Saved protocol to: {output_path}")
            else:
                logger.warning(f"Protocol file not found: {protocol_file}")
        
        return protocols
    
    def verify_audio_files(self, split='train', sample_size=10):
        """
        Verify that audio files exist and are accessible
        
        Args:
            split (str): Dataset split ('train', 'dev', 'eval')
            sample_size (int): Number of files to check
        """
        logger.info(f"Verifying audio files for {split} split...")
        
        protocol_file = self.base_path / 'protocols' / f'{split}.csv'
        
        if not protocol_file.exists():
            logger.error(f"Protocol file not found: {protocol_file}")
            return False
        
        df = pd.read_csv(protocol_file)
        audio_dir = self.audio_base_path / self.audio_dirs[split]
        
        if not audio_dir.exists():
            logger.error(f"Audio directory not found: {audio_dir}")
            logger.info("Expected directory structure:")
            logger.info(f"  {self.audio_base_path}/")
            logger.info(f"    └── ASVspoof2019_LA_train/flac/")
            logger.info(f"    └── ASVspoof2019_LA_dev/flac/")
            logger.info(f"    └── ASVspoof2019_LA_eval/flac/")
            return False
        
        # Check sample files
        sample_files = df['audio_file'].sample(min(sample_size, len(df))).tolist()
        found = 0
        missing = []
        
        for audio_file in sample_files:
            audio_path = audio_dir / f"{audio_file}.flac"
            if audio_path.exists():
                found += 1
            else:
                missing.append(audio_file)
        
        logger.info(f"Found {found}/{len(sample_files)} sample audio files")
        
        if missing:
            logger.warning(f"Missing files: {missing[:3]}...")
        
        return found == len(sample_files)
    
    def get_dataset_statistics(self, protocols):
        """
        Calculate and display dataset statistics
        
        Args:
            protocols (dict): Dictionary of protocol DataFrames
        """
        logger.info("\n" + "="*70)
        logger.info("Dataset Statistics")
        logger.info("="*70)
        
        for split, df in protocols.items():
            logger.info(f"\n{split.upper()} Split:")
            logger.info(f"  Total samples: {len(df):,}")
            logger.info(f"  Bonafide: {(df['label'] == 'bonafide').sum():,}")
            logger.info(f"  Spoof: {(df['label'] == 'spoof').sum():,}")
            logger.info(f"  Unique speakers: {df['speaker_id'].nunique()}")
            
            if split != 'eval':  # eval doesn't have system_id
                logger.info(f"  Spoofing systems: {df[df['label'] == 'spoof']['system_id'].nunique()}")
                
                # Show distribution of spoofing systems
                if (df['label'] == 'spoof').any():
                    logger.info(f"\n  Spoofing system distribution:")
                    system_dist = df[df['label'] == 'spoof']['system_id'].value_counts().head(5)
                    for system, count in system_dist.items():
                        logger.info(f"    {system}: {count:,}")
        
        logger.info("="*70 + "\n")
    
    # def create_protocol_txt_files(self, protocols):
    #     """
    #     Create simple txt files with audio paths and labels for easy loading
        
    #     Args:
    #         protocols (dict): Dictionary of protocol DataFrames
    #     """
    #     output_dir = self.base_path / 'protocols'
    #     output_dir.mkdir(parents=True, exist_ok=True)
        
    #     for split, df in protocols.items():
    #         output_file = output_dir / f'{split}.txt'
    #         audio_dir = self.audio_dirs[split]
            
    #         with open(output_file, 'w') as f:
    #             for _, row in df.iterrows():
    #                 audio_path = f"{audio_dir}/{row['audio_file']}.flac"
    #                 label = row['binary_label']
    #                 f.write(f"{audio_path}\t{label}\n")
            
    #         logger.info(f"Created protocol text file: {output_file}")


def main():
    """Main execution function"""
    logger.info("Starting ASVspoof 2019 data loading...")
    
    # Initialize data loader
    loader = ASVspoofDataLoader()
    
    # Check if protocol directory exists
    if not loader.protocol_path.exists():
        logger.error(f"Protocol directory not found: {loader.protocol_path}")
        logger.info("\nPlease ensure ASVspoof 2019 dataset is placed in:")
        logger.info(f"  {loader.base_path}/")
        logger.info("    ASVspoof2019_LA_cm_protocols/")
        logger.info("    ASVspoof2019_LA_train/flac/")
        logger.info("    ASVspoof2019_LA_dev/flac/")
        logger.info("    ASVspoof2019_LA_eval/flac/")
        return
    
    # Load all protocols
    protocols = loader.load_all_protocols()
    
    if not protocols:
        logger.error("No protocols loaded. Please check dataset location.")
        return
    
    # Display statistics
    loader.get_dataset_statistics(protocols)
    
    # Create simple protocol text files
    #loader.create_protocol_txt_files(protocols)
    
    # Verify audio files for each split
    for split in protocols.keys():
        loader.verify_audio_files(split, sample_size=10)
    
    logger.info("\nData loading completed successfully!")
    logger.info("\nNext steps:")
    logger.info("1. Review the protocol files in data/raw/asvspoof2019/protocols/")
    logger.info("2. Run preprocessing: python src/data/preprocess.py")


if __name__ == "__main__":
    main()