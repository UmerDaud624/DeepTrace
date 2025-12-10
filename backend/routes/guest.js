import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { optionalAuth } from "../middleware/auth.js";
import aiService from "../services/aiService.js";
import crypto from "crypto";

const router = express.Router();

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test audio directory path - hardcoded for testing
const testAudioDir = path.resolve("C:/VS/FYP/DeepTrace/ai/audio/testAudio");

// Temporary storage for guest analyses (in-memory, expires after 1 hour)
const guestAnalyses = new Map();

// Clean up expired analyses every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of guestAnalyses.entries()) {
    if (now - data.createdAt > 60 * 60 * 1000) {
      // 1 hour
      // Delete file if it exists
      if (data.filePath && fs.existsSync(data.filePath)) {
        try {
          fs.unlinkSync(data.filePath);
        } catch (e) {
          console.error("Error deleting guest file:", e);
        }
      }
      guestAnalyses.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Create temporary uploads directory (use absolute path)
// Files are being saved to backend/uploads/temp (relative to backend directory)
// So we'll use that location consistently
const backendDir = path.resolve(__dirname, "..");
const tempUploadsDirFinal = path.resolve(backendDir, "uploads", "temp");

if (!fs.existsSync(tempUploadsDirFinal)) {
  fs.mkdirSync(tempUploadsDirFinal, { recursive: true });
  console.log(
    `[Guest Routes] Created upload directory: ${tempUploadsDirFinal}`
  );
} else {
  console.log(`[Guest Routes] Using upload directory: ${tempUploadsDirFinal}`);
}

// Configure multer for guest file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path to ensure files are saved in the correct location
    cb(null, tempUploadsDirFinal);
  },
  filename: (req, file, cb) => {
    // Preserve original filename with timestamp prefix for uniqueness
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    cb(null, `guest-${uniqueSuffix}-${nameWithoutExt}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/",
    "video/",
    "audio/",
    "audio/flac",
    "audio/x-flac",
  ];
  const allowedExtensions = [
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a",
    ".aac",
    ".wma",
  ];
  const fileExt = path.extname(file.originalname).toLowerCase();

  const isValidMimeType = allowedMimeTypes.some(
    (type) => file.mimetype.startsWith(type) || file.mimetype === type
  );
  const isValidExtension = allowedExtensions.includes(fileExt);

  if (isValidMimeType || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error("Only image, video, and audio files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter,
});

// @route   GET /api/guest/test-files
// @desc    List available test audio files
// @access  Public
router.get("/test-files", optionalAuth, async (req, res) => {
  try {
    const files = [];
    if (fs.existsSync(testAudioDir)) {
      const fileList = fs.readdirSync(testAudioDir);
      fileList.forEach((file) => {
        const filePath = path.join(testAudioDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          files.push({
            name: file,
            path: filePath,
            relativePath: `ai/audio/testAudio/${file}`,
            size: stats.size,
          });
        }
      });
    }
    res.json({
      status: "success",
      data: {
        testAudioDir,
        files,
      },
    });
  } catch (error) {
    console.error("Error listing test files:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
});

// @route   POST /api/guest/upload
// @desc    Upload file for guest analysis (no auth required)
// @access  Public
router.post(
  "/upload",
  optionalAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No file uploaded",
        });
      }

      const {
        originalname,
        filename,
        mimetype,
        size,
        path: filePath,
      } = req.file;

      // Generate temporary ID
      const tempId = crypto.randomBytes(16).toString("hex");

      // Multer should give us the absolute path since we're using absolute tempUploadsDir
      // But let's verify and resolve if needed
      let absoluteFilePath;
      if (path.isAbsolute(filePath)) {
        absoluteFilePath = filePath;
      } else {
        // If somehow multer returns relative path, resolve it
        absoluteFilePath = path.resolve(tempUploadsDirFinal, filePath);
      }

      // Verify file actually exists
      if (!fs.existsSync(absoluteFilePath)) {
        console.error(
          `[Guest Upload] ERROR: File not found at: ${absoluteFilePath}`
        );
        console.error(`[Guest Upload] Original path from multer: ${filePath}`);
        console.error(
          `[Guest Upload] Temp uploads dir: ${tempUploadsDirFinal}`
        );
        return res.status(500).json({
          status: "error",
          message: "File was not saved correctly. Please try again.",
        });
      }

      console.log(`[Guest Upload] File uploaded: ${originalname}`);
      console.log(`[Guest Upload] Stored at: ${absoluteFilePath}`);
      console.log(
        `[Guest Upload] File exists: ${fs.existsSync(absoluteFilePath)}`
      );
      console.log(`[Guest Upload] TempId: ${tempId}`);

      // Determine file type
      let detectedFileType = "audio";
      const ext = path.extname(filename).toLowerCase();
      if (
        [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma"].includes(ext)
      ) {
        detectedFileType = "audio";
      } else if ([".mp4", ".avi", ".mov", ".wmv", ".mkv"].includes(ext)) {
        detectedFileType = "video";
      }

      // Store uploaded file info in guestAnalyses Map (for later lookup by tempId)
      // This is just metadata, not analysis results yet
      guestAnalyses.set(tempId, {
        tempId,
        filePath: absoluteFilePath,
        originalName: originalname,
        fileName: filename,
        fileType: detectedFileType,
        mimeType: mimetype,
        fileSize: size,
        createdAt: Date.now(),
        isUpload: true, // Flag to indicate this is an upload, not analysis result
      });

      res.json({
        status: "success",
        message: "File uploaded successfully",
        data: {
          tempId,
          originalName: originalname,
          fileName: filename,
          fileType: mimetype,
          fileSize: size,
          filePath: filePath, // Return relative path for frontend
        },
      });
    } catch (error) {
      console.error("Guest upload error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Internal server error",
      });
    }
  }
);

// @route   POST /api/guest/analyze
// @desc    Analyze uploaded file for guest (no auth required, no DB storage)
// @access  Public
//
// Request body examples:
//   - { "testFileName": "bonafide1.flac" }  // Direct test file name (PREFERRED for testing)
//   - { "filePath": "bonafide1.flac" }  // Just filename - resolves from testAudio directory
//   - { "filePath": "ai/audio/testAudio/bonafide1.flac" }  // Relative path
//   - { "filePath": "/absolute/path/to/file.flac" }  // Absolute path
//   - { "tempId": "abc123..." }  // From previous upload
router.post("/analyze", optionalAuth, async (req, res) => {
  try {
    const { tempId, filePath, fileType, testFileName } = req.body;

    // If testFileName is provided, use it directly (highest priority)
    if (testFileName) {
      const testAudioPath = path.join(testAudioDir, testFileName);
      if (fs.existsSync(testAudioPath)) {
        const actualFilePath = path.resolve(testAudioPath);
        console.log(
          `[Guest Analyze] ✓ Using test file directly: ${testFileName} -> ${actualFilePath}`
        );

        // Detect file type if not provided
        let detectedFileType = fileType || "audio";
        const ext = path.extname(testFileName).toLowerCase();
        if (
          [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma"].includes(
            ext
          )
        ) {
          detectedFileType = "audio";
        } else if ([".mp4", ".avi", ".mov", ".wmv", ".mkv"].includes(ext)) {
          detectedFileType = "video";
        }

        // Analyze the test file
        const startTime = Date.now();
        let analysisResult;

        if (detectedFileType === "audio") {
          console.log(
            `[Guest Analyze] Calling aiService.analyzeAudio with path: ${actualFilePath}`
          );
          console.log(
            `[Guest Analyze] File exists: ${fs.existsSync(actualFilePath)}`
          );
          console.log(
            `[Guest Analyze] File size: ${
              fs.existsSync(actualFilePath)
                ? fs.statSync(actualFilePath).size
                : "N/A"
            } bytes`
          );

          analysisResult = await aiService.analyzeAudio(actualFilePath);
        } else {
          return res.status(400).json({
            status: "error",
            message: "Only audio files are currently supported for test files",
          });
        }

        const processingTime = Date.now() - startTime;

        // Format result
        const formattedResult = aiService.formatResult(
          analysisResult,
          detectedFileType
        );

        // Generate analysis ID
        const analysisId = crypto.randomBytes(16).toString("hex");

        // Store in temporary storage (expires in 1 hour)
        guestAnalyses.set(analysisId, {
          analysisId,
          uploadId: null,
          filePath: actualFilePath,
          fileName: testFileName,
          fileType: detectedFileType,
          result: formattedResult,
          createdAt: Date.now(),
        });

        return res.json({
          status: "success",
          message: "Analysis complete",
          data: {
            analysisId,
            isGuest: true,
            processingTime,
          },
        });
      } else {
        // List available test files
        let availableFiles = [];
        if (fs.existsSync(testAudioDir)) {
          try {
            availableFiles = fs.readdirSync(testAudioDir).filter((f) => {
              try {
                return fs.statSync(path.join(testAudioDir, f)).isFile();
              } catch {
                return false;
              }
            });
          } catch (e) {
            console.error("Error reading test audio dir:", e);
          }
        }

        return res.status(404).json({
          status: "error",
          message: `Test file "${testFileName}" not found`,
          availableFiles: availableFiles,
        });
      }
    }

    if (!tempId && !filePath) {
      return res.status(400).json({
        status: "error",
        message: "Temp ID, file path, or testFileName is required",
        hint: 'For test files, use: { "testFileName": "bonafide1.flac" } or check GET /api/guest/test-files for available files',
      });
    }

    // Get file path
    let actualFilePath = filePath;
    let isUploadedFile = false;

    if (tempId) {
      // Find file by temp ID (if stored from upload)
      const guestData = guestAnalyses.get(tempId);
      if (guestData && guestData.isUpload) {
        // This is an uploaded file
        actualFilePath = guestData.filePath;
        isUploadedFile = true;
        console.log(
          `[Guest Analyze] Found uploaded file via tempId: ${tempId}`
        );
        console.log(`[Guest Analyze] File path: ${actualFilePath}`);

        // Verify file exists
        if (!fs.existsSync(actualFilePath)) {
          console.error(
            `[Guest Analyze] ERROR: File not found at stored path: ${actualFilePath}`
          );
          console.error(
            `[Guest Analyze] Temp uploads dir: ${tempUploadsDirFinal}`
          );
          console.error(
            `[Guest Analyze] Checking if file exists in temp dir...`
          );

          // Try to find the file by filename in temp directory
          const fileName = path.basename(actualFilePath);
          const altPath = path.join(tempUploadsDirFinal, fileName);

          if (fs.existsSync(altPath)) {
            console.log(
              `[Guest Analyze] Found file at alternative path: ${altPath}`
            );
            actualFilePath = altPath;
          } else {
            // Check if aiService is in test mode
            if (aiService.USE_TEST_MODE) {
              console.log(
                `[Guest Analyze] Uploaded file not found, but test mode is enabled. Using test files instead.`
              );
              // Get available test files and use the first one as fallback
              const testFiles = aiService.getTestFiles();
              if (testFiles.length > 0) {
                const fallbackFile = testFiles.includes("bonafide.flac")
                  ? "bonafide.flac"
                  : testFiles[0];
                actualFilePath = path.join(testAudioDir, fallbackFile);
                isUploadedFile = false; // Mark as test file, not uploaded file
                console.log(
                  `[Guest Analyze] Using fallback test file: ${fallbackFile}`
                );
                console.log(
                  `[Guest Analyze] Fallback file path: ${actualFilePath}`
                );
              } else {
                return res.status(404).json({
                  status: "error",
                  message: `No files available for analysis`,
                  details: {
                    storedPath: actualFilePath,
                    tempUploadsDir: tempUploadsDirFinal,
                    fileName: fileName,
                    checkedPath: altPath,
                    testAudioDir: testAudioDir,
                    hint: "No uploaded file found and no test files available",
                  },
                });
              }
            } else {
              return res.status(404).json({
                status: "error",
                message: `Uploaded file not found`,
                details: {
                  storedPath: actualFilePath,
                  tempUploadsDir: tempUploadsDirFinal,
                  fileName: fileName,
                  checkedPath: altPath,
                  hint: "The file may have been deleted or the path is incorrect",
                },
              });
            }
          }
        }

        console.log(
          `[Guest Analyze] File exists: ${fs.existsSync(actualFilePath)}`
        );
      } else {
        console.log(`[Guest Analyze] TempId not found: ${tempId}`);
        console.log(
          `[Guest Analyze] Available tempIds: ${Array.from(guestAnalyses.keys())
            .slice(0, 5)
            .join(", ")}...`
        );

        // Check if aiService is in test mode
        if (aiService.USE_TEST_MODE) {
          console.log(
            `[Guest Analyze] TempId not found, but test mode is enabled. Using test files instead.`
          );
          // Get available test files and use the first one as fallback
          const testFiles = aiService.getTestFiles();
          if (testFiles.length > 0) {
            const fallbackFile = testFiles.includes("bonafide.flac")
              ? "bonafide.flac"
              : testFiles[0];
            actualFilePath = path.join(testAudioDir, fallbackFile);
            isUploadedFile = false; // Mark as test file, not uploaded file
            console.log(
              `[Guest Analyze] Using fallback test file: ${fallbackFile}`
            );
            console.log(
              `[Guest Analyze] Fallback file path: ${actualFilePath}`
            );
          } else {
            return res.status(404).json({
              status: "error",
              message: `No files available for analysis`,
              details: {
                tempId: tempId,
                testAudioDir: testAudioDir,
                hint: "TempId not found and no test files available",
              },
            });
          }
        } else {
          return res.status(404).json({
            status: "error",
            message: `File not found for tempId: ${tempId}`,
            hint: "The tempId may have expired or was not found. Try uploading the file again.",
          });
        }
      }
    }

    // Resolve file path
    if (actualFilePath) {
      // Normalize path separators (handle Windows backslashes)
      const normalizedPath = actualFilePath.replace(/\\/g, "/");

      // If it's an uploaded file, resolve it directly
      if (isUploadedFile) {
        // Already resolved from guestAnalyses
        console.log(`[Guest Analyze] Using uploaded file: ${actualFilePath}`);
      } else if (
        normalizedPath.startsWith("uploads/temp/") ||
        normalizedPath.startsWith("uploads\\temp\\")
      ) {
        // This is a relative path to an uploaded temp file
        // Resolve relative to project root
        const projectRoot = path.resolve(__dirname, "../..");
        actualFilePath = path.resolve(projectRoot, normalizedPath);
        console.log(
          `[Guest Analyze] Resolved uploaded temp file: ${actualFilePath}`
        );
      } else if (path.isAbsolute(normalizedPath)) {
        // Absolute path provided
        actualFilePath = normalizedPath;
        console.log(`[Guest Analyze] Using absolute path: ${actualFilePath}`);
      } else {
        // Relative path or just filename - check testAudio directory first
        const fileName = path.basename(normalizedPath);
        console.log(`[Guest Analyze] Checking testAudio for: ${fileName}`);

        // Check testAudio directory
        let testAudioPath = path.join(testAudioDir, fileName);
        if (fs.existsSync(testAudioPath)) {
          actualFilePath = path.resolve(testAudioPath);
          console.log(
            `[Guest Analyze] ✓ Found in testAudio: ${actualFilePath}`
          );
        } else {
          // Try resolving relative to project root
          const projectRoot = path.resolve(__dirname, "../..");
          const resolvedPath = path.resolve(projectRoot, normalizedPath);
          if (fs.existsSync(resolvedPath)) {
            actualFilePath = resolvedPath;
            console.log(
              `[Guest Analyze] ✓ Resolved relative path: ${actualFilePath}`
            );
          } else {
            // Last resort: try as relative to current working directory
            const cwdPath = path.resolve(process.cwd(), normalizedPath);
            if (fs.existsSync(cwdPath)) {
              actualFilePath = cwdPath;
              console.log(
                `[Guest Analyze] ✓ Resolved from CWD: ${actualFilePath}`
              );
            } else {
              actualFilePath = null;
              console.log(
                `[Guest Analyze] ✗ Could not resolve path: ${normalizedPath}`
              );
            }
          }
        }
      }
    }

    if (!actualFilePath || !fs.existsSync(actualFilePath)) {
      // List available test files for debugging
      let availableFiles = [];
      if (fs.existsSync(testAudioDir)) {
        try {
          availableFiles = fs.readdirSync(testAudioDir).filter((f) => {
            try {
              return fs.statSync(path.join(testAudioDir, f)).isFile();
            } catch {
              return false;
            }
          });
        } catch (e) {
          console.error("Error reading test audio dir:", e);
        }
      }

      return res.status(404).json({
        status: "error",
        message: `File not found: ${filePath || "No path provided"}`,
        details: {
          requestedPath: filePath,
          resolvedPath: actualFilePath,
          testAudioDir: testAudioDir,
          availableTestFiles: availableFiles,
          hint: 'Try using just the filename (e.g., "bonafide1.flac") or relative path from testAudio directory',
        },
      });
    }

    const startTime = Date.now();
    let analysisResult;

    // Get file info
    const fileStats = fs.statSync(actualFilePath);
    const fileName = path.basename(actualFilePath);

    // Detect file type from extension if not provided
    // fileType is already destructured from req.body above
    let detectedFileType = fileType;
    if (!detectedFileType) {
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes = {
        ".flac": "audio/flac",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".m4a": "audio/m4a",
        ".aac": "audio/aac",
        ".wma": "audio/wma",
      };
      detectedFileType = mimeTypes[ext] || "audio/flac"; // Default to flac
    }

    // Use AI service for audio files
    if (detectedFileType.startsWith("audio/")) {
      try {
        // actualFilePath is already resolved to absolute path above
        const absPath = actualFilePath;

        console.log("Analyzing file:", absPath);
        const availability = await aiService.checkAvailability();
        if (!availability.available) {
          return res.status(503).json({
            status: "error",
            message: "AI service not available: " + availability.error,
          });
        }

        // Call AI service for audio analysis
        console.log(
          `[Guest Analyze] Calling aiService.analyzeAudio with path: ${absPath}`
        );
        console.log(`[Guest Analyze] File exists: ${fs.existsSync(absPath)}`);
        console.log(
          `[Guest Analyze] File size: ${
            fs.existsSync(absPath) ? fs.statSync(absPath).size : "N/A"
          } bytes`
        );

        const aiResult = await aiService.analyzeAudio(absPath, true);
        analysisResult = aiService.formatResult(aiResult, detectedFileType);

        const processingTime = Date.now() - startTime;
        analysisResult.processingTime = processingTime;
      } catch (error) {
        console.error("AI analysis error:", error);
        return res.status(500).json({
          status: "error",
          message: "Analysis failed: " + error.message,
        });
      }
    } else {
      return res.status(400).json({
        status: "error",
        message: "Only audio files are supported for guest analysis",
      });
    }

    // Generate guest analysis ID
    const guestAnalysisId = crypto.randomBytes(16).toString("hex");

    // Store in temporary memory (expires in 1 hour)
    guestAnalyses.set(guestAnalysisId, {
      ...analysisResult,
      fileName,
      fileType: detectedFileType,
      filePath: actualFilePath,
      createdAt: Date.now(),
    });

    res.json({
      status: "success",
      message: "Analysis completed successfully",
      data: {
        analysisId: guestAnalysisId,
        result: analysisResult.result,
        confidence: analysisResult.confidence,
        processingTime: analysisResult.processingTime,
        details: analysisResult.details,
        isGuest: true,
      },
    });
  } catch (error) {
    console.error("Guest analysis error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// @route   GET /api/guest/report/:id
// @desc    Get guest analysis result
// @access  Public
router.get("/report/:id", optionalAuth, async (req, res) => {
  try {
    const analysisId = req.params.id;

    const guestData = guestAnalyses.get(analysisId);

    if (!guestData) {
      return res.status(404).json({
        status: "error",
        message: "Analysis not found or expired",
      });
    }

    res.json({
      status: "success",
      data: {
        analysis: {
          id: analysisId,
          fileName: guestData.fileName,
          originalName: guestData.fileName,
          fileType: guestData.fileType,
          result: guestData.result,
          confidence: guestData.confidence,
          processingTime: guestData.processingTime,
          createdAt: new Date(guestData.createdAt).toISOString(),
          filePath: guestData.filePath,
          details: guestData.details || {},
          isGuest: true,
        },
      },
    });
  } catch (error) {
    console.error("Get guest report error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

export default router;
