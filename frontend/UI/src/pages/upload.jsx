import React, { useState, useRef } from "react";
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

export function Upload() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const fileInputRef = useRef(null);

  // Supported file types
  const audioTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/m4a", "audio/aac"];
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

    Array.from(files).forEach((file) => {
      if (supportedTypes.includes(file.type)) {
        validFiles.push({
          id: Date.now() + Math.random(),
          file,
          type: audioTypes.includes(file.type) ? "audio" : "video",
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

  const simulateUpload = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    setMessage("Uploading files...");
    setMessageType("info");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setUploadProgress(progress);
        
        // Update file status
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: progress === 100 ? "uploaded" : "uploading", progress }
              : f
          )
        );
      }
    }

    setUploading(false);
    setMessage("Upload complete! Redirecting to report...");
    setMessageType("success");
    
    // Wait a moment to show the success message, then redirect
    setTimeout(() => {
      // Hardcoded sample file name for temporary UI
      const sampleFileName = "sampleFile"; // This will be used as the report ID
      navigate(`/report/${sampleFileName}`);
    }, 1500);
  };

  const handleUpload = async () => {
    const filesToUpload = uploadedFiles.filter((f) => f.status === "ready");
    
    if (filesToUpload.length === 0) {
      setMessage("Please select files to upload");
      setMessageType("error");
      return;
    }

    await simulateUpload(filesToUpload);
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
              <Typography variant="small" className={`max-w-2xl mx-auto text-base ${getTextClasses(isDark, 'secondary')}`}>
                Upload audio/video files for deepfake detection. Formats: MP3, WAV, MP4, AVI, MOV, WMV, MKV
              </Typography>
            </div>

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
                    Audio: MP3, WAV, M4A, AAC • Video: MP4, AVI, MOV, WMV, MKV • Max: 100MB
                  </Typography>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={supportedTypes.join(",")}
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
