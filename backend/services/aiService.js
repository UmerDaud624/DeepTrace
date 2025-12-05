import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Service for Audio Deepfake Detection
 * Calls Python API to analyze audio files
 */
class AIService {
  constructor() {
    // Path to Python API script (located in ai/audio/api.py)
    this.pythonScript = path.join(__dirname, '../../ai/audio/api.py');
    this.modelsDir = path.join(__dirname, '../../ai/audio');
  }

  /**
   * Check if Python API is available
   */
  async checkAvailability() {
    return new Promise((resolve) => {
      // Check if Python script exists
      if (!fs.existsSync(this.pythonScript)) {
        resolve({ available: false, error: 'Python API script not found' });
        return;
      }

      // Try to run Python with --version to check if Python is installed
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const checkProcess = spawn(pythonCmd, ['--version']);

      checkProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true });
        } else {
          resolve({ available: false, error: 'Python not found' });
        }
      });

      checkProcess.on('error', () => {
        resolve({ available: false, error: 'Python not installed' });
      });
    });
  }

  /**
   * Analyze audio file for deepfake detection
   * @param {string} audioPath - Path to audio file
   * @param {boolean} returnDetailed - Return detailed analysis
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeAudio(audioPath, returnDetailed = false) {
    return new Promise((resolve, reject) => {
      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        reject(new Error('Audio file not found'));
        return;
      }

      // Determine Python command based on OS
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      // Build command arguments
      const args = [this.pythonScript, audioPath];
      if (returnDetailed) {
        args.push('--detailed');
      }

      // Spawn Python process
      const pythonProcess = spawn(pythonCmd, args, {
        cwd: path.dirname(this.pythonScript),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python process error:', stderr);
          reject(new Error(`Python process exited with code ${code}: ${stderr || 'Unknown error'}`));
          return;
        }

        try {
          // Parse JSON output
          const result = JSON.parse(stdout.trim());
          
          // Handle errors from Python script
          if (result.error) {
            reject(new Error(result.error));
            return;
          }

          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse Python output:', stdout);
          reject(new Error(`Failed to parse Python output: ${parseError.message}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Set timeout (5 minutes for audio processing)
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Audio analysis timeout (exceeded 5 minutes)'));
      }, 5 * 60 * 1000);

      pythonProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Format analysis result for API response
   * @param {Object} aiResult - Raw AI analysis result
   * @param {string} fileType - File MIME type
   * @returns {Object} Formatted result
   */
  formatResult(aiResult, fileType) {
    // Map AI prediction to API format
    const isDeepfake = aiResult.prediction === 'SPOOF';
    const confidence = aiResult.confidence || 0;
    
    // Convert confidence to percentage (0-100)
    const confidencePercent = Math.round(confidence * 100);
    
    // Build details object
    const details = {
      voicePrintAnalysis: isDeepfake ? 'Inconsistent' : 'Consistent',
      spectralAnomalies: isDeepfake 
        ? ['Frequency gaps', 'Unnatural harmonics'] 
        : [],
      technicalMetrics: {
        sampleRate: '16kHz',
        duration: aiResult.duration ? `${aiResult.duration.toFixed(2)}s` : 'Unknown',
        numChunks: aiResult.num_chunks || 1
      },
      probabilities: {
        bonafide: Math.round((aiResult.probabilities?.bonafide || 0) * 100) / 100,
        spoof: Math.round((aiResult.probabilities?.spoof || 0) * 100) / 100
      }
    };

    // Add chunk predictions if available
    if (aiResult.chunk_predictions) {
      details.chunkPredictions = aiResult.chunk_predictions;
    }

    return {
      result: isDeepfake ? 'deepfake' : 'authentic',
      confidence: confidencePercent / 100, // Convert to 0-1 range
      processingTime: Date.now(), // Will be calculated properly in route
      details
    };
  }
}

// Export singleton instance
export default new AIService();

