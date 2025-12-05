# Audio Deepfake Detection AI Module

This module contains the AI models and API for audio deepfake detection using ensemble methods (Random Forest + CNN).

## Setup

### 1. Install Python Dependencies

Make sure you have Python 3.8+ installed, then install the required packages:

```bash
pip install -r requirements.txt
```

Or if you're using conda:

```bash
conda create -n deeptrace python=3.10
conda activate deeptrace
pip install -r requirements.txt
```

### 2. Verify Model Files

Ensure the following model files are present in the `ai` directory:

- `random_forest_model.pkl` - Trained Random Forest model
- `cnn_best_model.pth` - Trained CNN model weights
- `params.yaml` - Model configuration parameters
- `ensemble_model.pkl` - Ensemble model metadata (optional)

### 3. Test the API

You can test the API directly from the command line:

```bash
python api.py path/to/audio.wav
```

For detailed output:

```bash
python api.py path/to/audio.wav --detailed
```

## Usage

### Command Line Interface

```bash
python api.py <audio_file_path> [--detailed]
```

### Node.js Integration

The API is automatically called by the Node.js backend when analyzing audio files. The backend service (`backend/services/aiService.js`) handles the integration.

### Python API Usage

```python
from api import DeepfakeDetectorAPI

# Initialize detector
detector = DeepfakeDetectorAPI()

# Predict on audio file
result = detector.predict('path/to/audio.wav')

print(f"Prediction: {result['prediction']}")  # 'BONAFIDE' or 'SPOOF'
print(f"Confidence: {result['confidence']:.2%}")
print(f"Probabilities: {result['probabilities']}")
```

## Model Architecture

### Ensemble Method
- **Random Forest** (70% weight): Uses MFCC features with statistical aggregations
- **CNN** (30% weight): Uses mel-spectrogram features with deep learning

### Features
- **MFCC Features**: 40 MFCC coefficients with delta and delta-delta features
- **Mel-Spectrogram**: 128 mel bands, 2048 FFT window
- **Audio Processing**: 16kHz sample rate, 4-second chunks with 50% overlap

## Output Format

```json
{
  "prediction": "BONAFIDE" | "SPOOF",
  "confidence": 0.0-1.0,
  "probabilities": {
    "bonafide": 0.0-1.0,
    "spoof": 0.0-1.0
  },
  "duration": 72.69,
  "num_chunks": 36,
  "chunk_predictions": [...]
}
```

## Troubleshooting

### Python Not Found
- Windows: Ensure Python is in your PATH
- Linux/Mac: Use `python3` instead of `python`

### CUDA/GPU Issues
- The model will automatically fall back to CPU if CUDA is not available
- For GPU support, ensure PyTorch with CUDA is installed

### Model Loading Errors
- Verify all model files are in the `ai` directory
- Check that `params.yaml` exists and is valid YAML

### Audio Format Issues
- **Supported formats**: WAV, MP3, FLAC, OGG, M4A, AAC, WMA
- The API uses librosa with soundfile backend, which supports FLAC and many other formats
- FLAC files are fully supported - librosa automatically handles FLAC decoding
- Ensure audio files are not corrupted
- For FLAC files, ensure `soundfile` package is installed (included in requirements.txt)

## Performance

- **Processing Time**: ~1-5 seconds per audio file (depending on length)
- **Memory Usage**: ~2-4 GB RAM (with GPU: ~4-6 GB)
- **GPU Acceleration**: Automatically used if available

## Notes

- The API processes audio in 4-second chunks with 50% overlap
- Results are averaged across all chunks for final prediction
- Confidence scores represent the ensemble model's certainty

