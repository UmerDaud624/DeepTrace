import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import { executeQuery } from '../config/database.js';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images, videos, and audio files (including FLAC, WAV, MP3, OGG, etc.)
  const allowedMimeTypes = [
    'image/',
    'video/',
    'audio/',
    'audio/flac',  // Explicit FLAC MIME type
    'audio/x-flac' // Alternative FLAC MIME type
  ];
  
  // Also check file extension as fallback (some browsers may not set correct mimetype)
  const allowedExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  // Check MIME type (including exact matches for FLAC)
  const isValidMimeType = allowedMimeTypes.some(type => 
    file.mimetype.startsWith(type) || file.mimetype === type
  );
  const isValidExtension = allowedExtensions.includes(fileExt);
  
  if (isValidMimeType || isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Only image, video, and audio files are allowed (WAV, MP3, FLAC, OGG, etc.)'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

// @route   POST /api/upload
// @desc    Upload file for analysis
// @access  Private
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const { originalname, filename, mimetype, size, path: filePath } = req.file;

    // Save file info to database
    const result = await executeQuery(
      `INSERT INTO uploads (user_id, original_name, file_name, file_path, file_type, 
       file_size, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [req.userId, originalname, filename, filePath, mimetype, size]
    );

    const uploadId = result.insertId;

    res.json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        uploadId,
        originalName: originalname,
        fileName: filename,
        fileType: mimetype,
        fileSize: size,
        filePath: `/uploads/${filename}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
});

// @route   GET /api/upload/:id
// @desc    Get upload details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const uploadId = req.params.id;

    const uploads = await executeQuery(
      `SELECT id, original_name, file_name, file_path, file_type, file_size, 
       created_at FROM uploads WHERE id = ? AND user_id = ?`,
      [uploadId, req.userId]
    );

    if (uploads.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Upload not found'
      });
    }

    const upload = uploads[0];

    res.json({
      status: 'success',
      data: {
        upload: {
          id: upload.id,
          originalName: upload.original_name,
          fileName: upload.file_name,
          filePath: `/uploads/${upload.file_name}`,
          fileType: upload.file_type,
          fileSize: upload.file_size,
          createdAt: upload.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// @route   DELETE /api/upload/:id
// @desc    Delete uploaded file
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const uploadId = req.params.id;

    // Get file info
    const uploads = await executeQuery(
      'SELECT file_path FROM uploads WHERE id = ? AND user_id = ?',
      [uploadId, req.userId]
    );

    if (uploads.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Upload not found'
      });
    }

    const filePath = uploads[0].file_path;

    // Delete from database
    await executeQuery(
      'DELETE FROM uploads WHERE id = ? AND user_id = ?',
      [uploadId, req.userId]
    );

    // Delete physical file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
    }

    res.json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

export default router;
