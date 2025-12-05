# AI Integration Setup Guide

This guide will help you set up the AI audio deepfake detection module for the DeepTrace application.

## Prerequisites

1. **Python 3.8+** installed on your system
2. **Node.js 18+** (already installed for the backend)
3. **Model files** in the `ai/` directory:
   - `random_forest_model.pkl`
   - `cnn_best_model.pth`
   - `params.yaml`
   - `ensemble_model.pkl` (optional)

## Installation Steps

### 1. Install Python Dependencies

Navigate to the project root and install Python packages:

```bash
cd ai
pip install -r requirements.txt
```

**Note for Windows users:**
- If `pip` is not found, try `python -m pip install -r requirements.txt`
- If you have both Python 2 and 3, use `python3` instead of `python`

**Note for Linux/Mac users:**
- Use `pip3` or `python3 -m pip` to ensure Python 3 is used

### 2. Verify Python Installation

Test that Python can be accessed from the command line:

```bash
# Windows
python --version

# Linux/Mac
python3 --version
```

### 3. Test the AI API

Test the API with a sample audio file:

```bash
# From the ai directory
python api.py path/to/test_audio.wav
```

You should see JSON output with prediction results.

### 4. Verify Backend Integration

Start the backend server:

```bash
npm run backend:dev
```

The backend will automatically detect if Python is available and use it for audio analysis.

## How It Works

1. **User uploads audio file** → File is saved to `backend/uploads/`
2. **User requests analysis** → Backend calls `/api/analysis/analyze`
3. **Backend checks file type** → If audio, calls Python AI service
4. **Python processes audio** → Uses ensemble model (RF + CNN)
5. **Results returned** → Formatted and saved to database

## File Structure

```
DeepTrace/
├── ai/
│   ├── api.py                    # Python API for audio analysis
│   ├── requirements.txt         # Python dependencies
│   ├── README.md                 # AI module documentation
│   ├── params.yaml              # Model configuration
│   ├── random_forest_model.pkl  # RF model
│   └── cnn_best_model.pth       # CNN model weights
├── backend/
│   ├── services/
│   │   └── aiService.js          # Node.js wrapper for Python API
│   └── routes/
│       └── analysis.js           # Analysis route (updated)
```

## Troubleshooting

### Issue: "Python not found"

**Solution:**
- Ensure Python is installed and in your system PATH
- Windows: Add Python to PATH during installation
- Linux/Mac: Install Python via package manager

### Issue: "Module not found" errors

**Solution:**
```bash
pip install numpy torch torchaudio librosa scikit-learn PyYAML scipy soundfile
```

### Issue: "Model file not found"

**Solution:**
- Verify all model files are in the `ai/` directory
- Check file names match exactly (case-sensitive on Linux/Mac)

### Issue: "CUDA out of memory"

**Solution:**
- The model will automatically use CPU if GPU is unavailable
- For CPU-only: Ensure PyTorch CPU version is installed

### Issue: Backend falls back to mock analysis

**Solution:**
- Check backend logs for Python errors
- Verify Python script path is correct
- Test Python API directly: `python ai/api.py test.wav`

## Testing

### Test Python API Directly

```bash
cd ai
python api.py ../backend/uploads/test_audio.wav --detailed
```

### Test via Backend API

1. Start backend: `npm run backend:dev`
2. Upload audio file via `/api/upload`
3. Analyze via `/api/analysis/analyze` with `uploadId`
4. Check response for real AI results (not mock)

## Performance Notes

- **Processing Time**: 1-5 seconds per audio file
- **Memory**: 2-4 GB RAM required
- **GPU**: Optional but recommended for faster processing
- **Audio Length**: No limit, files are processed in chunks

## Next Steps

- [x] Test with various audio formats (WAV, MP3, FLAC, OGG)
- FLAC support is enabled via librosa/soundfile backend
- [ ] Monitor processing times and optimize if needed
- [ ] Consider adding batch processing for multiple files
- [ ] Add caching for frequently analyzed files

## Support

For issues or questions:
1. Check `ai/README.md` for detailed API documentation
2. Review backend logs for error messages
3. Test Python API directly to isolate issues

