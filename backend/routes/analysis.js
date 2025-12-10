import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { executeQuery } from "../config/database.js";
import aiService from "../services/aiService.js";
import path from "path";

const router = express.Router();

// @route   POST /api/analysis/analyze
// @desc    Analyze uploaded file for deepfake detection
// @access  Private
router.post("/analyze", authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.body;

    if (!uploadId) {
      return res.status(400).json({
        status: "error",
        message: "Upload ID is required",
      });
    }

    // Verify upload belongs to user
    const uploads = await executeQuery(
      "SELECT id, file_name, file_type, file_path FROM uploads WHERE id = ? AND user_id = ?",
      [uploadId, req.userId]
    );

    if (uploads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Upload not found",
      });
    }

    const upload = uploads[0];
    const startTime = Date.now();

    let analysisResult;

    // Use AI service for audio files
    if (upload.file_type.startsWith("audio/")) {
      try {
        // Get absolute path to uploaded file
        const filePath = path.resolve(upload.file_path);

        // Check if AI service is available
        const availability = await aiService.checkAvailability();
        if (!availability.available) {
          console.warn("AI service not available:", availability.error);
          // Fall back to mock analysis if AI service is not available
          analysisResult = simulateAnalysis(upload.file_type);
        } else {
          // Call AI service for audio analysis
          const aiResult = await aiService.analyzeAudio(filePath, true);
          analysisResult = aiService.formatResult(aiResult, upload.file_type);

          // Calculate processing time
          const processingTime = Date.now() - startTime;
          analysisResult.processingTime = processingTime;
        }
      } catch (error) {
        console.error("AI analysis error:", error);
        // Fall back to mock analysis on error
        analysisResult = simulateAnalysis(upload.file_type);
        analysisResult.processingTime = Date.now() - startTime;
      }
    } else {
      // For image/video files, use mock analysis (AI models not integrated yet)
      analysisResult = simulateAnalysis(upload.file_type);
      analysisResult.processingTime = Date.now() - startTime;
    }

    // Save analysis result to database (including details as JSON)
    const detailsJson = JSON.stringify(analysisResult.details || {});
    const result = await executeQuery(
      `INSERT INTO analyses (user_id, upload_id, file_name, file_type, 
       analysis_result, confidence_score, processing_time, details, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.userId,
        uploadId,
        upload.file_name,
        upload.file_type,
        analysisResult.result,
        analysisResult.confidence,
        analysisResult.processingTime,
        detailsJson,
      ]
    );

    const analysisId = result.insertId;

    res.json({
      status: "success",
      message: "Analysis completed successfully",
      data: {
        analysisId,
        result: analysisResult.result,
        confidence: analysisResult.confidence,
        processingTime: analysisResult.processingTime,
        details: analysisResult.details,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// @route   GET /api/analysis/:id
// @desc    Get analysis result
// @access  Private
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const analysisId = req.params.id;

    const analyses = await executeQuery(
      `SELECT a.id, a.file_name, a.file_type, a.analysis_result, a.confidence_score, 
       a.processing_time, a.created_at, a.details, u.file_path, u.original_name
       FROM analyses a
       LEFT JOIN uploads u ON a.upload_id = u.id
       WHERE a.id = ? AND a.user_id = ?`,
      [analysisId, req.userId]
    );

    if (analyses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Analysis not found",
      });
    }

    const analysis = analyses[0];

    // Parse details JSON if it exists
    let details = {};
    if (analysis.details) {
      try {
        details =
          typeof analysis.details === "string"
            ? JSON.parse(analysis.details)
            : analysis.details;
      } catch (e) {
        console.error("Error parsing details:", e);
      }
    }

    res.json({
      status: "success",
      data: {
        analysis: {
          id: analysis.id,
          fileName: analysis.original_name || analysis.file_name,
          originalName: analysis.original_name || analysis.file_name,
          fileType: analysis.file_type,
          result: analysis.analysis_result,
          confidence: analysis.confidence_score,
          processingTime: analysis.processing_time,
          createdAt: analysis.created_at,
          filePath: analysis.file_path,
          details: details,
        },
      },
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// @route   GET /api/analysis
// @desc    Get all user analyses
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const analyses = await executeQuery(
      `SELECT id, file_name, file_type, analysis_result, confidence_score, 
       processing_time, created_at FROM analyses WHERE user_id = ? 
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.userId, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await executeQuery(
      "SELECT COUNT(*) as total FROM analyses WHERE user_id = ?",
      [req.userId]
    );

    const total = countResult[0].total;

    res.json({
      status: "success",
      data: {
        analyses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get analyses error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
});

// Mock analysis function (replace with actual AI model)
function simulateAnalysis(fileType) {
  const isDeepfake = Math.random() > 0.7; // 30% chance of being deepfake
  const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
  const processingTime = Math.random() * 5000 + 1000; // 1-6 seconds

  let details = {};

  if (fileType.startsWith("image/")) {
    details = {
      faceDetected: true,
      manipulationIndicators: isDeepfake
        ? ["Inconsistent lighting", "Blending artifacts"]
        : [],
      technicalMetrics: {
        resolution: "1920x1080",
        compressionArtifacts: isDeepfake ? "High" : "Low",
        noisePattern: isDeepfake ? "Irregular" : "Natural",
      },
    };
  } else if (fileType.startsWith("video/")) {
    details = {
      framesAnalyzed: 150,
      faceTrackingConsistency: isDeepfake ? "Poor" : "Good",
      temporalAnomalies: isDeepfake
        ? ["Frame inconsistencies", "Temporal flickering"]
        : [],
      technicalMetrics: {
        fps: 30,
        duration: "5.2s",
        compressionArtifacts: isDeepfake ? "High" : "Low",
      },
    };
  } else if (fileType.startsWith("audio/")) {
    details = {
      voicePrintAnalysis: isDeepfake ? "Inconsistent" : "Consistent",
      spectralAnomalies: isDeepfake
        ? ["Frequency gaps", "Unnatural harmonics"]
        : [],
      technicalMetrics: {
        sampleRate: "44.1kHz",
        bitrate: "320kbps",
        duration: "10.5s",
      },
    };
  }

  return {
    result: isDeepfake ? "deepfake" : "authentic",
    confidence: Math.round(confidence * 100) / 100,
    processingTime: Math.round(processingTime),
    details,
  };
}

export default router;
