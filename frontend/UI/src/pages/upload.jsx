import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Typography,
  Button,
  Input,
  Textarea,
  Alert,
  Progress,
} from "@material-tailwind/react";
import {
  CloudArrowUpIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getCardClasses } from "@/utils/theme";
import { uploadAPI, analysisAPI, guestAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

export function Upload() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const fileInputRef = useRef(null);
  const [testFiles, setTestFiles] = useState([]);
  const [selectedTestFile, setSelectedTestFile] = useState("");
  const [loadingTestFiles, setLoadingTestFiles] = useState(false);

  // Supported file types
  const audioTypes = [
    "audio/mpeg", 
    "audio/wav", 
    "audio/mp3", 
    "audio/m4a", 
    "audio/aac",
    "audio/flac",      // FLAC MIME type
    "audio/x-flac",    // Alternative FLAC MIME type
    "audio/ogg",       // OGG audio
    "audio/wma"        // WMA audio
  ];
  const videoTypes = ["video/mp4", "video/avi", "video/mov", "video/wmv", "video/mkv"];
  const supportedTypes = [...audioTypes, ...videoTypes];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    const validFiles = [];
    const invalidFiles = [];

    // Supported file extensions as fallback (for browsers that don't set correct MIME types)
    const audioExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.mkv'];
    const supportedExtensions = [...audioExtensions, ...videoExtensions];

    Array.from(files).forEach((file) => {
      // Get file extension
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      
      // Check both MIME type and file extension
      const isValidMimeType = supportedTypes.includes(file.type);
      const isValidExtension = supportedExtensions.includes(fileExtension);
      
      // Also check if MIME type starts with audio/ or video/ (for generic types)
      const isGenericAudio = file.type.startsWith('audio/');
      const isGenericVideo = file.type.startsWith('video/');
      
      if (isValidMimeType || isValidExtension || isGenericAudio || isGenericVideo) {
        // Determine file type
        let fileType = 'video';
        if (audioTypes.includes(file.type) || audioExtensions.includes(fileExtension) || isGenericAudio) {
          fileType = 'audio';
        } else if (videoTypes.includes(file.type) || videoExtensions.includes(fileExtension) || isGenericVideo) {
          fileType = 'video';
        }
        
        validFiles.push({
          id: Date.now() + Math.random(),
          file,
          type: fileType,
          name: file.name,
          size: file.size,
          status: "ready",
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setMessage(`Invalid file types: ${invalidFiles.join(", ")}`);
      setMessageType("error");
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      setMessage(`${validFiles.length} file(s) ready for upload`);
      setMessageType("success");
    }
  };

  const removeFile = (id) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Load test files on mount
  useEffect(() => {
    const loadTestFiles = async () => {
      try {
        setLoadingTestFiles(true);
        const response = await guestAPI.getTestFiles();
        if (response.status === 'success' && response.data) {
          setTestFiles(response.data);
        }
      } catch (error) {
        console.error('Error loading test files:', error);
      } finally {
        setLoadingTestFiles(false);
      }
    };
    loadTestFiles();
  }, []);

  // Handle test file analysis
  const handleTestFileAnalysis = async () => {
    if (!selectedTestFile) {
      setMessage("Please select a test file");
      setMessageType("error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage("Analyzing test file...");
    setMessageType("info");

    try {
      setUploadProgress(50);
      
      // Analyze the test file directly
      const analysisResponse = await guestAPI.analyzeTestFile(selectedTestFile, 'audio');
      
      if (analysisResponse.status === 'success' && analysisResponse.data?.analysisId) {
        const analysisId = analysisResponse.data.analysisId;
        setUploadProgress(100);
        setMessage("Analysis complete! Redirecting to report...");
        setMessageType("success");
        
        setTimeout(() => {
          navigate(`/report/${analysisId}?guest=true`);
        }, 1000);
      } else {
        throw new Error(analysisResponse.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('Test file analysis error:', error);
      setMessage(`Error analyzing test file: ${error.message}`);
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  };

  const handleRealUpload = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    setMessage(isAuthenticated ? "Uploading files..." : "Quick submit: Uploading files (no account needed)...");
    setMessageType("info");

    try {
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        const file = fileItem.file;
        
        // Update progress
        const uploadProgress = Math.round(((i + 1) / files.length) * 50); // 0-50% for upload
        setUploadProgress(uploadProgress);
        
        // Update file status
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: "uploading", progress: uploadProgress }
              : f
          )
        );

        try {
          let uploadResponse;
          let analysisResponse;
          
          if (isAuthenticated) {
            // Authenticated flow - save to database
            uploadResponse = await uploadAPI.uploadFile(file);
            
            if (uploadResponse.status === 'success' && uploadResponse.data?.uploadId) {
              const uploadId = uploadResponse.data.uploadId;
              
              // Update progress to 50-90% for analysis
              setUploadProgress(50 + (i + 1) * 40 / files.length);
              setMessage(`Analyzing ${file.name}...`);
              
              // Analyze the uploaded file
              analysisResponse = await analysisAPI.analyzeFile(uploadId);
            } else {
              throw new Error(uploadResponse.message || 'Upload failed');
            }
          } else {
            // Guest flow - no database storage
            uploadResponse = await guestAPI.uploadFile(file);
            
            if (uploadResponse.status === 'success' && uploadResponse.data?.tempId) {
              const { tempId, filePath, fileType } = uploadResponse.data;
              
              // Update progress to 50-90% for analysis
              setUploadProgress(50 + (i + 1) * 40 / files.length);
              setMessage(`Analyzing ${file.name}...`);
              
              // Analyze the uploaded file (guest mode)
              analysisResponse = await guestAPI.analyzeFile(tempId, filePath, fileType);
            } else {
              throw new Error(uploadResponse.message || 'Upload failed');
            }
          }
          
          if (analysisResponse.status === 'success' && analysisResponse.data?.analysisId) {
            const analysisId = analysisResponse.data.analysisId;
            const isGuest = analysisResponse.data.isGuest || !isAuthenticated;
            
            // Update file status
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileItem.id
                  ? { 
                      ...f, 
                      status: "uploaded", 
                      progress: 100,
                      analysisId,
                      isGuest
                    }
                  : f
              )
            );
            
            // If this is the last file, redirect to report
            if (i === files.length - 1) {
              setUploadProgress(100);
              setMessage(isGuest 
                ? "Analysis complete! Redirecting to report (results expire in 1 hour)..."
                : "Upload and analysis complete! Redirecting to report...");
              setMessageType("success");
              
              setTimeout(() => {
                navigate(`/report/${analysisId}${isGuest ? '?guest=true' : ''}`);
              }, 1000);
            }
          } else {
            throw new Error(analysisResponse.message || 'Analysis failed');
          }
        } catch (error) {
          console.error('Upload/Analysis error:', error);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileItem.id
                ? { ...f, status: "error", progress: 0 }
                : f
            )
          );
          setMessage(`Error processing ${file.name}: ${error.message}`);
          setMessageType("error");
        }
      }
    } catch (error) {
      console.error('Upload process error:', error);
      setMessage(`Upload failed: ${error.message}`);
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    const filesToUpload = uploadedFiles.filter((f) => f.status === "ready");
    
    if (filesToUpload.length === 0) {
      setMessage("Please select files to upload");
      setMessageType("error");
      return;
    }

    await handleRealUpload(filesToUpload);
  };

  const getFileIcon = (type) => {
    return type === "audio" ? (
      <MusicalNoteIcon className="h-8 w-8 text-blue-500" />
    ) : (
      <VideoCameraIcon className="h-8 w-8 text-red-500" />
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "uploaded":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "uploading":
        return <CloudArrowUpIcon className="h-5 w-5 text-blue-500 animate-pulse" />;
      case "error":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundClasses(isDark)}`}>
          {/* Spacer for navbar */}
          <div className="h-12 w-full" />
      
      {/* Glowing orb effects - Figma inspired */}
      <div className={`fixed top-40 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 1)}`}></div>
      <div className={`fixed bottom-20 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 2)}`} style={{ animationDelay: '1s' }}></div>
      
      <section className="relative min-h-[calc(100vh-3rem)] pb-8">
        <div className="container mx-auto px-4 pt-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
              <Typography variant="h3" className={`mb-3 font-bold text-5xl ${
                isDark 
                  ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent'
              }`}>
                Media Upload
              </Typography>
              {!isAuthenticated && (
                <Alert color="blue" className="mb-4 max-w-2xl mx-auto">
                  <Typography variant="small" className="font-medium">
                    Quick Submit Mode: No account needed! Upload and analyze files instantly. 
                    Results expire in 1 hour. <a href="/sign-up" className="underline font-semibold">Sign up</a> to save your analysis history.
                  </Typography>
                </Alert>
              )}
              <Typography variant="small" className={`max-w-2xl mx-auto text-base ${getTextClasses(isDark, 'secondary')}`}>
                Upload audio/video files for deepfake detection. Formats: MP3, WAV, MP4, AVI, MOV, WMV, MKV
              </Typography>
            </div>

            {/* Test Files Section */}
            {testFiles.length > 0 && (
              <Card className={`shadow-2xl shadow-purple-500/20 backdrop-blur-xl ${getCardClasses(isDark)}`}>
                <CardHeader color="transparent" floated={false} shadow={false} className="p-4 pb-2">
                  <Typography variant="h6" className={`bg-clip-text text-transparent text-xl ${
                    isDark 
                      ? 'bg-gradient-to-r from-pink-400 to-purple-400'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                  }`}>
                    Test Files (Quick Analysis)
                  </Typography>
                  <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                    Select a test file to analyze directly without uploading
                  </Typography>
                </CardHeader>
                <CardBody className="p-4 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className={`block mb-2 text-sm font-medium ${getTextClasses(isDark)}`}>
                        Select Test File
                      </label>
                      <select
                        value={selectedTestFile}
                        onChange={(e) => setSelectedTestFile(e.target.value)}
                        disabled={uploading}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 ${
                          isDark
                            ? 'bg-black/50 border-purple-500/30 text-purple-100 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/50'
                            : 'bg-white/80 border-purple-400/40 text-purple-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <option value="">Choose a test file...</option>
                        {testFiles.map((file) => (
                          <option key={file.name} value={file.name}>
                            {file.name} ({formatFileSize(file.size)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      size="lg"
                      onClick={handleTestFileAnalysis}
                      disabled={!selectedTestFile || uploading}
                      className="px-6 py-3 bg-gradient-to-b from-[#497cff] to-[#001664] hover:from-[#5a8cff] hover:to-[#0020a0] text-white shadow-xl shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/70 transition-all duration-300 rounded-xl font-semibold"
                    >
                      {uploading ? "Analyzing..." : "Analyze Test File"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Divider */}
            {testFiles.length > 0 && (
              <div className="flex items-center gap-4 my-4">
                <div className={`flex-1 h-px ${isDark ? 'bg-purple-500/30' : 'bg-purple-400/40'}`}></div>
                <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                  OR
                </Typography>
                <div className={`flex-1 h-px ${isDark ? 'bg-purple-500/30' : 'bg-purple-400/40'}`}></div>
              </div>
            )}

            {/* Upload Area */}
            <Card className={`shadow-2xl shadow-purple-500/20 backdrop-blur-xl ${getCardClasses(isDark)}`}>
              <CardBody className="p-6">
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                    dragActive
                      ? "border-purple-500 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-cyan-500/10 shadow-xl shadow-purple-500/40"
                      : isDark 
                        ? "border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5"
                        : "border-purple-400/40 hover:border-purple-500/60 hover:bg-purple-500/10"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CloudArrowUpIcon className="mx-auto h-16 w-16 text-purple-400 mb-4" />
                  <Typography variant="h6" className={`mb-2 ${getTextClasses(isDark)}`}>
                    Drag and drop your files here, or{" "}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`bg-clip-text text-transparent font-semibold underline decoration-purple-400/50 ${
                        isDark 
                          ? 'bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-300 hover:to-purple-300'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                      }`}
                    >
                      browse
                    </button>
                  </Typography>
                  <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                    Audio: MP3, WAV, FLAC, OGG, M4A, AAC • Video: MP4, AVI, MOV, WMV, MKV • Max: 50MB
                  </Typography>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={supportedTypes.join(",") + ",.flac,.ogg,.wma"}
                  onChange={handleFileInput}
                  className="hidden"
                />
              </CardBody>
            </Card>

            {/* Message Alert */}
            {message && (
              <Alert
                color={messageType === "error" ? "red" : messageType === "success" ? "green" : "blue"}
                className={`border border-purple-500/30 ${
                  isDark 
                    ? 'bg-gray-900/80 text-purple-100'
                    : 'bg-white/80 text-purple-900'
                }`}
              >
                {message}
              </Alert>
            )}

            {/* Upload Progress */}
            {uploading && (
              <Card className={`shadow-xl shadow-purple-500/20 ${getCardClasses(isDark)}`}>
                <CardBody className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <CloudArrowUpIcon className="h-6 w-6 text-purple-400 animate-pulse" />
                    <Typography variant="h6" className={`bg-clip-text text-transparent ${
                      isDark 
                        ? 'bg-gradient-to-r from-pink-400 to-purple-400'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                    }`}>
                      Uploading files...
                    </Typography>
                  </div>
                  <Progress value={uploadProgress} color="purple" className={`h-3 ${isDark ? 'bg-black/50' : 'bg-gray-200/50'}`} />
                  <Typography variant="small" className={`mt-2 ${getTextClasses(isDark, 'secondary')}`}>
                    {uploadProgress}% complete
                  </Typography>
                </CardBody>
              </Card>
            )}

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <Card className={`backdrop-blur-xl shadow-2xl shadow-purple-500/20 ${getCardClasses(isDark)}`}>
                <CardHeader color="transparent" floated={false} shadow={false} className="p-4 pb-2">
                  <Typography variant="h6" className={`bg-clip-text text-transparent text-xl ${
                    isDark 
                      ? 'bg-gradient-to-r from-pink-400 to-purple-400'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                  }`}>
                    Selected Files ({uploadedFiles.length})
                  </Typography>
                </CardHeader>
                <CardBody className="p-4 pt-2 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-4 border border-purple-500/20 rounded-xl hover:bg-gradient-to-r hover:from-pink-500/5 hover:to-cyan-500/5 hover:border-purple-500/40 transition-all duration-300 ${
                          isDark ? 'bg-black/30' : 'bg-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.type)}
                          <div className="min-w-0 flex-1">
                            <Typography variant="small" className={`font-medium truncate ${getTextClasses(isDark)}`}>
                              {file.name}
                            </Typography>
                            <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                              {formatFileSize(file.size)} • {file.type.toUpperCase()}
                            </Typography>
                            {file.status === "uploading" && file.progress !== undefined && (
                              <Progress value={file.progress} color="purple" size="sm" className={`mt-1 ${isDark ? 'bg-black/50' : 'bg-gray-200/50'}`} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          {file.status === "ready" && (
                            <Button
                              size="sm"
                              variant="text"
                              color="red"
                              onClick={() => removeFile(file.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Upload Button */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleUpload}
                disabled={uploading}
                className="px-10 py-4 bg-gradient-to-b from-[#497cff] to-[#001664] hover:from-[#5a8cff] hover:to-[#0020a0] text-white shadow-2xl shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/70 transition-all duration-300 rounded-xl text-lg font-semibold"
              >
                {uploading ? (
                  <>
                    <CloudArrowUpIcon className="h-6 w-6 mr-2 animate-pulse inline" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-6 w-6 mr-2 inline" />
                    Upload Files
                  </>
                )}
              </Button>
            </div>

            {/* Additional Information */}
            <Card className={`backdrop-blur-xl shadow-2xl shadow-purple-500/20 ${getCardClasses(isDark)}`}>
              <CardBody className="p-6">
                <Typography variant="h6" className={`mb-4 bg-clip-text text-transparent text-xl ${
                  isDark 
                    ? 'bg-gradient-to-r from-pink-400 to-cyan-400'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600'
                }`}>
                  What happens after upload?
                </Typography>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CloudArrowUpIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <Typography variant="small" className={`mb-1 font-semibold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                      1. Upload
                    </Typography>
                    <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                      Secure upload
                    </Typography>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <DocumentIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <Typography variant="small" className={`mb-1 font-semibold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                      2. Analysis
                    </Typography>
                    <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                      AI verification
                    </Typography>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircleIcon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <Typography variant="small" className={`mb-1 font-semibold ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                      3. Report
                    </Typography>
                    <Typography variant="small" className={getTextClasses(isDark, 'muted')}>
                      Detailed results
                    </Typography>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Upload;
