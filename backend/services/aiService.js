import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Service for Audio Deepfake Detection
 * Calls Python API to analyze audio files
 */
class AIService {
  constructor() {
    // Path to Python API script (located in ai/audio/api.py)
    this.pythonScript = path.join(__dirname, "../../ai/audio/api.py");
    //this.testScript = path.join(__dirname, "../../ai/audio/test_simple.py");
    this.modelsDir = path.join(__dirname, "../../ai/audio");

    // Hardcoded test audio directory - files will be read from here
    this.testAudioDir = "C:\\VS\\FYP\\DeepTrace\\ai\\audio\\testAudio";

    // Enable test mode (set to false to use uploaded files from backend/uploads/temp)
    this.USE_TEST_MODE = false;
  }

  /**
   * Check if Python API is available
   */
  async checkAvailability() {
    return new Promise((resolve) => {
      // Check if Python script exists
      if (!fs.existsSync(this.pythonScript)) {
        resolve({ available: false, error: "Python API script not found" });
        return;
      }

      // Try to run Python with --version to check if Python is installed
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const checkProcess = spawn(pythonCmd, ["--version"]);

      checkProcess.on("close", (code) => {
        if (code === 0) {
          resolve({ available: true });
        } else {
          resolve({ available: false, error: "Python not found" });
        }
      });

      checkProcess.on("error", () => {
        resolve({ available: false, error: "Python not installed" });
      });
    });
  }

  /**
   * Get list of available test files
   * @returns {Array<string>} List of test audio files
   */
  getTestFiles() {
    try {
      if (!fs.existsSync(this.testAudioDir)) {
        console.error(`Test audio directory not found: ${this.testAudioDir}`);
        return [];
      }

      const files = fs.readdirSync(this.testAudioDir);
      const audioFiles = files.filter(
        (file) =>
          file.endsWith(".flac") ||
          file.endsWith(".wav") ||
          file.endsWith(".mp3")
      );

      console.log(`Found ${audioFiles.length} test audio files:`, audioFiles);
      return audioFiles;
    } catch (error) {
      console.error("Error reading test audio directory:", error);
      return [];
    }
  }

  /**
   * Get a specific test file if it exists
   * @param {string} requestedFile - The requested filename
   * @returns {string|null} The filename if it exists, or null if not found
   */
  getTestFile(requestedFile = null) {
    if (!requestedFile) {
      return null;
    }

    const availableFiles = this.getTestFiles();

    // Only return the file if it specifically exists, no fallbacks
    if (availableFiles.includes(requestedFile)) {
      return requestedFile;
    }

    return null;
  }

  /**
   * Analyze audio file for deepfake detection
   * @param {string} audioPath - Path to audio file (or filename if USE_TEST_MODE is true)
   * @param {boolean} returnDetailed - Return detailed analysis
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeAudio(audioPath, returnDetailed = false) {
    return new Promise((resolve, reject) => {
      let finalAudioPath = audioPath;

      // Use test mode if enabled
      if (this.USE_TEST_MODE) {
        // Extract just the filename from the path if it's a full path
        const requestedFileName = path.basename(audioPath);

        console.log(
          `[TEST MODE] Using test audio directory: ${this.testAudioDir}`
        );
        console.log(`[TEST MODE] Requested file: ${requestedFileName}`);
        console.log(`[TEST MODE] Original request was for: ${audioPath}`);

        // Get the actual test file to use
        const testFileName = this.getTestFile(requestedFileName);

        if (!testFileName) {
          const availableFiles = this.getTestFiles();
          reject(
            new Error(
              `No test audio files found in ${this.testAudioDir}\n` +
                `File requested: ${requestedFileName}\n` +
                `Available files: ${availableFiles.join(", ")}`
            )
          );
          return;
        }

        finalAudioPath = path.join(this.testAudioDir, testFileName);

        if (testFileName !== requestedFileName) {
          console.log(
            `[TEST MODE] File ${requestedFileName} not found, using ${testFileName} instead`
          );
        }

        console.log(`[TEST MODE] Final path: ${finalAudioPath}`);

        // Final check that the selected test file exists
        if (!fs.existsSync(finalAudioPath)) {
          const availableFiles = this.getTestFiles();
          reject(
            new Error(
              `Test audio file not found: ${finalAudioPath}\n` +
                `File requested: ${requestedFileName}\n` +
                `Available files in ${
                  this.testAudioDir
                }:\n  - ${availableFiles.join("\n  - ")}`
            )
          );
          return;
        }
      } else {
        // Check if uploaded file exists
        if (!fs.existsSync(audioPath)) {
          reject(new Error("Audio file not found"));
          return;
        }
      }

      // Determine Python command based on OS
      const pythonCmd = process.platform === "win32" ? "python" : "python3";

      // Use the main Python script
      const scriptToUse = this.pythonScript;

      // Build command arguments
      const args = [scriptToUse, "--file", finalAudioPath, "--json"];
      if (returnDetailed) {
        // Note: api.py doesn't have --detailed flag, but has other options
        // We can add aggregation method or other parameters here if needed
      }

      console.log(`Using Python script: ${scriptToUse}`);
      console.log(`Command: ${pythonCmd} ${args.join(" ")}`);
      console.log(`Working directory: ${path.dirname(scriptToUse)}`);
      console.log(`Audio file exists: ${fs.existsSync(finalAudioPath)}`);
      console.log(`Audio file path: ${finalAudioPath}`);
      console.log(`Audio file size: ${fs.statSync(finalAudioPath).size} bytes`);

      // Spawn Python process
      const pythonProcess = spawn(pythonCmd, args, {
        cwd: path.dirname(scriptToUse),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          PYTHONWARNINGS: "ignore",
        },
        stdio: ["pipe", "pipe", "pipe"], // Capture stderr for debugging
      });

      let stdout = "";
      let stderr = "";

      // Collect stdout
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      // Collect stderr for debugging
      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      pythonProcess.on("close", (code) => {
        console.log(`Python process exited with code: ${code}`);
        console.log(`Stdout: ${stdout}`);
        console.log(`Stderr: ${stderr}`);

        if (code !== 0) {
          console.error("Python process exited with code:", code);
          console.error("Stderr:", stderr);
          reject(
            new Error(
              `Python process exited with code ${code}. Error: ${
                stderr || "No error details"
              }`
            )
          );
          return;
        }

        try {
          // Clean up stdout - remove any non-JSON content
          const cleanStdout = stdout.trim();

          // Try to find JSON in the output
          let jsonStart = cleanStdout.indexOf("{");
          let jsonEnd = cleanStdout.lastIndexOf("}");

          if (jsonStart === -1 || jsonEnd === -1) {
            console.error("No JSON found in Python output:", cleanStdout);
            reject(
              new Error(
                `No valid JSON output from Python script. Raw output: ${cleanStdout}`
              )
            );
            return;
          }

          const jsonString = cleanStdout.substring(jsonStart, jsonEnd + 1);
          console.log("Extracted JSON:", jsonString);

          // Parse JSON output
          const result = JSON.parse(jsonString);

          // Handle errors from Python script
          if (result.error) {
            console.error(
              "Python script returned error:",
              result.message || result.error
            );
            reject(new Error(result.message || result.error));
            return;
          }

          resolve(result);
        } catch (parseError) {
          console.error("Failed to parse Python output:", stdout);
          console.error("Parse error:", parseError);
          reject(
            new Error(
              `Failed to parse Python output: ${parseError.message}. Raw output: ${stdout}`
            )
          );
        }
      });

      // Handle process errors
      pythonProcess.on("error", (error) => {
        console.error("Failed to start Python process:", error);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Set timeout (5 minutes for audio processing)
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error("Audio analysis timeout (exceeded 5 minutes)"));
      }, 5 * 60 * 1000);

      pythonProcess.on("close", () => {
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
    // Handle error cases from Python script
    if (aiResult.error) {
      return {
        result: "error",
        confidence: 0,
        processingTime: Date.now(),
        details: {
          error: true,
          message: aiResult.message || "Audio processing failed",
          voicePrintAnalysis: "Error",
          spectralAnomalies: [],
          technicalMetrics: {
            sampleRate: "Unknown",
            duration: "Unknown",
            numChunks: 0,
          },
          probabilities: {
            bonafide: 0,
            spoof: 0,
          },
          individualModels: {
            randomForest: null,
            cnn: null,
            ensemble: null,
          },
        },
      };
    }

    // Map AI prediction to API format
    const isDeepfake = aiResult.prediction === "SPOOF";

    // Extract confidence - ensure it's a valid number
    // Handle both number and string types, and ensure we get the actual value
    let confidence = 0;
    if (aiResult.confidence !== undefined && aiResult.confidence !== null) {
      confidence =
        typeof aiResult.confidence === "string"
          ? parseFloat(aiResult.confidence)
          : Number(aiResult.confidence);
      if (isNaN(confidence) || confidence < 0 || confidence > 1) {
        console.warn(
          `Invalid confidence value: ${aiResult.confidence}, prediction: ${aiResult.prediction}`
        );
        confidence = 0;
      }
    }

    // Extract probabilities - ensure they're valid numbers
    let bonafideProb = 0;
    let spoofProb = 0;

    if (aiResult.probabilities) {
      bonafideProb =
        typeof aiResult.probabilities.bonafide === "string"
          ? parseFloat(aiResult.probabilities.bonafide)
          : Number(aiResult.probabilities.bonafide) || 0;
      spoofProb =
        typeof aiResult.probabilities.spoof === "string"
          ? parseFloat(aiResult.probabilities.spoof)
          : Number(aiResult.probabilities.spoof) || 0;

      // Ensure probabilities are valid
      if (isNaN(bonafideProb)) bonafideProb = 0;
      if (isNaN(spoofProb)) spoofProb = 0;
    }

    // Fallback: if confidence is missing but we have probabilities, use the appropriate one
    if (confidence === 0 && (bonafideProb > 0 || spoofProb > 0)) {
      if (isDeepfake) {
        confidence = spoofProb;
      } else {
        confidence = bonafideProb;
      }
    }

    // Fallback: if probabilities are missing but we have confidence, infer them
    if (bonafideProb === 0 && spoofProb === 0 && confidence > 0) {
      if (isDeepfake) {
        spoofProb = confidence;
        bonafideProb = 1 - confidence;
      } else {
        bonafideProb = confidence;
        spoofProb = 1 - confidence;
      }
    }

    // Debug warning if we still have zero values for a valid prediction
    if (
      aiResult.prediction &&
      confidence === 0 &&
      bonafideProb === 0 &&
      spoofProb === 0
    ) {
      console.error(
        `Warning: Zero confidence/probabilities for prediction ${aiResult.prediction}. Raw result:`,
        JSON.stringify(aiResult)
      );
    }

    // Convert confidence to percentage (0-100) then back to 0-1 range for consistency
    const confidencePercent = Math.round(confidence * 100);

    // Extract individual model results
    const individualModels = {
      randomForest: null,
      cnn: null,
      ensemble: {
        prediction: aiResult.prediction,
        confidence: confidence,
        probabilities: {
          bonafide: bonafideProb,
          spoof: spoofProb,
        },
      },
    };

    // Add individual model data if available
    if (aiResult.individual_models) {
      if (aiResult.individual_models.random_forest) {
        const rf = aiResult.individual_models.random_forest;
        individualModels.randomForest = {
          prediction: rf.prediction,
          confidence:
            typeof rf.confidence === "string"
              ? parseFloat(rf.confidence)
              : Number(rf.confidence) || 0,
          probabilities: {
            bonafide:
              typeof rf.probabilities?.bonafide === "string"
                ? parseFloat(rf.probabilities.bonafide)
                : Number(rf.probabilities?.bonafide) || 0,
            spoof:
              typeof rf.probabilities?.spoof === "string"
                ? parseFloat(rf.probabilities.spoof)
                : Number(rf.probabilities?.spoof) || 0,
          },
        };
      }

      if (aiResult.individual_models.cnn) {
        const cnn = aiResult.individual_models.cnn;
        individualModels.cnn = {
          prediction: cnn.prediction,
          confidence:
            typeof cnn.confidence === "string"
              ? parseFloat(cnn.confidence)
              : Number(cnn.confidence) || 0,
          probabilities: {
            bonafide:
              typeof cnn.probabilities?.bonafide === "string"
                ? parseFloat(cnn.probabilities.bonafide)
                : Number(cnn.probabilities?.bonafide) || 0,
            spoof:
              typeof cnn.probabilities?.spoof === "string"
                ? parseFloat(cnn.probabilities.spoof)
                : Number(cnn.probabilities?.spoof) || 0,
          },
        };
      }
    }

    // Build details object
    const details = {
      voicePrintAnalysis: isDeepfake ? "Inconsistent" : "Consistent",
      spectralAnomalies: isDeepfake
        ? ["Frequency gaps", "Unnatural harmonics"]
        : [],
      technicalMetrics: {
        sampleRate: "16kHz",
        duration: aiResult.duration_seconds
          ? `${parseFloat(aiResult.duration_seconds).toFixed(2)}s`
          : "Unknown",
        numChunks: aiResult.num_chunks || 1,
      },
      probabilities: {
        bonafide: Math.round(bonafideProb * 100) / 100,
        spoof: Math.round(spoofProb * 100) / 100,
      },
      individualModels: individualModels,
    };

    // Add chunk predictions if available
    if (aiResult.chunk_predictions) {
      details.chunkPredictions = aiResult.chunk_predictions;
    }

    return {
      result: isDeepfake ? "deepfake" : "authentic",
      confidence: confidencePercent / 100, // Convert to 0-1 range
      processingTime: Date.now(), // Will be calculated properly in route
      details,
    };
  }
}

// Export singleton instance
export default new AIService();
