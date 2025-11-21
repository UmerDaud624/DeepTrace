"""
DeepTrace Audio - Project Setup Script
This script initializes the complete project structure for the audio deepfake detection component
"""

import os
import subprocess
from pathlib import Path

def create_directory_structure():
    """Create the complete project directory structure"""
    
    directories = [
        # Data directories
        'data/raw/asvspoof2019/LA_train',
        'data/raw/asvspoof2019/LA_dev',
        'data/raw/asvspoof2019/LA_eval',
        'data/raw/asvspoof2019/protocols',
        'data/raw/asvspoof2021',
        'data/processed/train',
        'data/processed/dev',
        'data/processed/eval',
        'data/features',
        
        # Source code directories
        'src/data',
        'src/features',
        'src/models',
        'src/evaluation',
        'src/utils',
        
        # Notebooks
        'notebooks',
        
        # Models
        'models',
        
        # Experiments and metrics
        'experiments',
        'metrics',
        
        # Tests
        'tests',
        
        # Configs
        'configs',
        
        # Logs
        'logs',
    ]
    
    print("Creating directory structure...")
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"Created: {directory}")
    
    # Create __init__.py files for Python packages
    init_files = [
        'src/__init__.py',
        'src/data/__init__.py',
        'src/features/__init__.py',
        'src/models/__init__.py',
        'src/evaluation/__init__.py',
        'src/utils/__init__.py',
        'tests/__init__.py',
    ]
    
    for init_file in init_files:
        Path(init_file).touch()
        print(f"Created: {init_file}")

def create_requirements_file():
    """Create requirements.txt with all necessary dependencies"""
    
    requirements = """# Core ML/DL libraries
# Core ML/DL libraries with GPU support
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0

# TensorFlow with GPU support (CUDA 12.x compatible)
tensorflow==2.15.0

# PyTorch with CUDA 12.1 support (compatible with CUDA 12.5)
torch==2.1.0
torchaudio==2.1.0
torchvision==0.16.0
--index-url https://download.pytorch.org/whl/cu121

# RAPIDS for GPU-accelerated feature extraction (optional but powerful)
cupy-cuda11x==12.2.0

# Audio processing
librosa==0.10.1
soundfile==0.12.1
audioread==3.0.0

# MLOps tools
mlflow==2.7.1
dvc==3.27.0
dvc[s3]==3.27.0

# Configuration management
hydra-core==1.3.2
pyyaml==6.0.1
python-dotenv==1.0.0

# Data visualization
matplotlib==3.7.2
seaborn==0.12.2
plotly==5.17.0

# Utilities
tqdm==4.66.1
jupyter==1.0.0
ipykernel==6.25.2

# Testing
pytest==7.4.2
pytest-cov==4.1.0

# Code quality
black==23.9.1
flake8==6.1.0
isort==5.12.0
"""
    
    with open('requirements.txt', 'w') as f:
        f.write(requirements)
    print("Created: requirements.txt")

def create_gitignore():
    """Create .gitignore file"""
    
    gitignore_content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Jupyter Notebook
.ipynb_checkpoints
*.ipynb_checkpoints

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# MLflow
mlruns/
mlartifacts/

# DVC
/data/raw
/data/processed
/data/features
/models/*.pkl
/models/*.h5
/models/*.pt

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local

# Large files
*.flac
*.wav
*.mp3

# Temporary files
tmp/
temp/
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content)
    print("Created: .gitignore")

def create_params_yaml():
    """Create params.yaml for DVC pipeline parameters"""
    
    params = """# Data preprocessing parameters
preprocess:
  sample_rate: 16000
  duration: 4  # seconds
  max_audio_length: 64000  # 4 seconds at 16kHz
  normalize: true

# Feature extraction parameters
features:
  mfcc:
    n_mfcc: 40
    n_fft: 2048
    hop_length: 512
    n_mels: 128
    fmin: 0
    fmax: 8000
    
  spectrogram:
    n_fft: 2048
    hop_length: 512
    n_mels: 128
    fmin: 0
    fmax: 8000
    
  delta:
    order: 2  # Include delta and delta-delta features

# Model parameters
models:
  random_forest:
    n_estimators: 200
    max_depth: 20
    min_samples_split: 5
    min_samples_leaf: 2
    max_features: 'sqrt'
    random_state: 42
    n_jobs: -1
    
  cnn:
    epochs: 50
    batch_size: 32
    learning_rate: 0.001
    dropout: 0.5
    early_stopping_patience: 5
    reduce_lr_patience: 3
    
  ensemble:
    method: 'voting'  # 'voting' or 'stacking'
    weights: [0.5, 0.5]  # [RF, CNN]

# Training parameters
training:
  random_seed: 42
  use_class_weights: true

# Evaluation parameters
evaluation:
  metrics:
    - accuracy
    - precision
    - recall
    - f1_score
    - eer
    - auc_roc
"""
    
    with open('params.yaml', 'w') as f:
        f.write(params)
    print("Created: params.yaml")

def create_dvc_yaml():
    """Create dvc.yaml for pipeline definition"""
    
    dvc_yaml = """stages:
  load_data:
    cmd: python src/data/load_data.py
    deps:
      - src/data/load_data.py
    params:
      - preprocess.sample_rate
    outs:
      - data/raw/asvspoof2019/protocols/train.csv
      - data/raw/asvspoof2019/protocols/dev.csv
      - data/raw/asvspoof2019/protocols/eval.csv
    desc: "Load and organize ASVspoof 2019 dataset"
    
  preprocess:
    cmd: python src/data/preprocess.py
    deps:
      - src/data/preprocess.py
      - data/raw/asvspoof2019/protocols/train.csv
      - data/raw/asvspoof2019/protocols/dev.csv
    params:
      - preprocess
    outs:
      - data/processed/train
      - data/processed/dev
    desc: "Preprocess audio files (resampling, normalization)"
    
  extract_mfcc:
    cmd: python src/features/extract_mfcc.py
    deps:
      - src/features/extract_mfcc.py
      - data/processed/train
      - data/processed/dev
    params:
      - features.mfcc
      - features.delta
    outs:
      - data/features/mfcc_train.pkl
      - data/features/mfcc_dev.pkl
    desc: "Extract MFCC features for Random Forest"
    
  extract_spectrogram:
    cmd: python src/features/extract_spectrogram.py
    deps:
      - src/features/extract_spectrogram.py
      - data/processed/train
      - data/processed/dev
    params:
      - features.spectrogram
    outs:
      - data/features/spectrogram_train.npz
      - data/features/spectrogram_dev.npz
    desc: "Extract mel-spectrogram features for CNN"
    
  train_random_forest:
    cmd: python src/models/train_random_forest.py
    deps:
      - src/models/train_random_forest.py
      - data/features/mfcc_train.pkl
      - data/features/mfcc_dev.pkl
    params:
      - models.random_forest
      - training
    outs:
      - models/random_forest_model.pkl
    metrics:
      - metrics/rf_metrics.json:
          cache: false
    desc: "Train Random Forest classifier on MFCC features"
    
  train_cnn:
    cmd: python src/models/train_cnn.py
    deps:
      - src/models/train_cnn.py
      - data/features/spectrogram_train.npz
      - data/features/spectrogram_dev.npz
    params:
      - models.cnn
      - training
    outs:
      - models/cnn_model.h5
    metrics:
      - metrics/cnn_metrics.json:
          cache: false
    desc: "Train CNN model on spectrogram features"
    
  evaluate_asvspoof2021:
    cmd: python src/evaluation/evaluate.py
    deps:
      - src/evaluation/evaluate.py
      - models/random_forest_model.pkl
      - models/cnn_model.h5
    params:
      - evaluation
    metrics:
      - metrics/evaluation_results.json:
          cache: false
    desc: "Evaluate models on ASVspoof 2021 dataset"
"""
    
    with open('dvc.yaml', 'w') as f:
        f.write(dvc_yaml)
    print("Created: dvc.yaml")

# def create_readme():
#     """Create README.md"""
    
#     readme = """# DeepTrace - Audio Deepfake Detection

#     This is the audio component of the DeepTrace project for detecting deepfake audio using ensemble methods.

#     ## Project Structure

#     ```
#     deeptrace-audio/
#     ├── data/                      # Data directory (managed by DVC)
#     │   ├── raw/                  # Raw ASVspoof datasets
#     │   ├── processed/            # Preprocessed audio files
#     │   └── features/             # Extracted features
#     ├── src/                       # Source code
#     │   ├── data/                 # Data loading and preprocessing
#     │   ├── features/             # Feature extraction
#     │   ├── models/               # Model training scripts
#     │   ├── evaluation/           # Evaluation scripts
#     │   └── utils/                # Utility functions
#     ├── notebooks/                 # Jupyter notebooks for exploration
#     ├── models/                    # Trained models (managed by DVC)
#     ├── metrics/                   # Evaluation metrics
#     ├── configs/                   # Configuration files
#     ├── tests/                     # Unit tests
#     ├── params.yaml               # Pipeline parameters
#     ├── dvc.yaml                  # DVC pipeline definition
#     └── requirements.txt          # Python dependencies
#     ```

#     ## Setup Instructions

#     1. **Clone the repository**
#        ```bash
#        git clone <repository-url>
#        cd deeptrace-audio
#        ```

#     2. **Create virtual environment**
#        ```bash
#        python -m venv venv
#        source venv/bin/activate  # On Windows: venv\\Scripts\\activate
#        ```

#     3. **Install dependencies**
#        ```bash
#        pip install -r requirements.txt
#        ```

#     4. **Initialize DVC**
#        ```bash
#        dvc init
#        ```

#     5. **Download ASVspoof 2019 dataset**
#        - Place the dataset in `data/raw/asvspoof2019/`
#        - Organize according to the directory structure

#     6. **Run the pipeline**
#        ```bash
#        dvc repro
#        ```

#     ## Dataset Structure

#     ### ASVspoof 2019 LA (Logical Access)
#     - **Training**: 25,380 audio files
#     - **Development**: 24,844 audio files
#     - **Evaluation**: 71,237 audio files

#     Protocol format:
#     ```
#     SPEAKER_ID AUDIO_FILE_NAME - SYSTEM_ID KEY
#     LA_0079 LA_T_1138215 - - bonafide
#     LA_0080 LA_T_5343123 - A17 spoof
#     ```

#     ## Models

#     ### 1. Random Forest Classifier
#     - Input: MFCC features (40 coefficients + deltas)
#     - Ensemble of 200 decision trees
#     - Optimized for ASVspoof protocol

#     ### 2. CNN Model
#     - Input: Mel-spectrogram (128 mel bands)
#     - Architecture: 4 convolutional blocks + dense layers
#     - Binary classification (bonafide vs. spoof)

#     ### 3. Ensemble Model
#     - Combines RF and CNN predictions
#     - Voting or stacking strategy

#     ## Running Experiments

#     ### Train individual models
#     ```bash
#     # Random Forest only
#     dvc repro train_random_forest

#     # CNN only
#     dvc repro train_cnn
#     ```

#     ### View experiments in MLflow
#     ```bash
#     mlflow ui
#     ```

#     ### Compare experiments
#     ```bash
#     dvc params diff
#     dvc metrics diff
#     ```

#     ## Evaluation Metrics

#     - **Accuracy**: Overall classification accuracy
#     - **EER (Equal Error Rate)**: Standard metric for ASVspoof
#     - **Precision/Recall/F1**: Per-class performance
#     - **AUC-ROC**: Area under ROC curve

#     ## Team Members

#     - Umer Daud (22L-6570)
#     - Usman Wasif (22L-6555)
#     - Hamza Imran (22L-6719)

#     ## Advisor

#     Dr. Aatira Anum

#     ## License

#     [Add your license here]
#     """
    
#     with open('README.md', 'w') as f:
#         f.write(readme)
#     print("Created: README.md")

def initialize_git():
    """Initialize Git repository"""
    try:
        subprocess.run(['git', 'init'], check=True)
        print("Initialized Git repository")
        
        subprocess.run(['git', 'add', '.gitignore', 'README.md', 'requirements.txt', 'params.yaml', 'dvc.yaml'], check=True)
        subprocess.run(['git', 'commit', '-m', 'Initial commit: Project setup'], check=True)
        print("Created initial Git commit")
    except subprocess.CalledProcessError as e:
        print(f"Git initialization failed: {e}")
        print("Please initialize Git manually")

def initialize_dvc():
    """Initialize DVC"""
    try:
        subprocess.run(['dvc', 'init'], check=True)
        print("Initialized DVC")
        
        subprocess.run(['git', 'add', '.dvc', '.dvcignore'], check=True)
        subprocess.run(['git', 'commit', '-m', 'Initialize DVC'], check=True)
        print("Committed DVC initialization")
    except subprocess.CalledProcessError as e:
        print(f"DVC initialization failed: {e}")
        print("Please run 'dvc init' manually")

def main():
    """Main setup function"""
    print("=" * 70)
    print("DeepTrace Audio - Project Setup")
    print("=" * 70)
    print()
    
    # Create directory structure
    create_directory_structure()
    print()
    
    # Create configuration files
    create_requirements_file()
    create_gitignore()
    create_params_yaml()
    create_dvc_yaml()
    #create_readme()
    print()
    
    # Initialize Git and DVC
    print("Initializing version control...")
    initialize_git()
    initialize_dvc()
    print()
    
    print("=" * 70)
    print("Setup completed successfully!")
    print("=" * 70)
    

if __name__ == "__main__":
    main()