import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Typography, Card, CardBody, Progress, Chip } from "@material-tailwind/react";
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  InformationCircleIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ClockIcon,
  CalendarIcon
} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getCardClasses } from "@/utils/theme";
import { analysisAPI, guestAPI } from "@/services/api";

const DUMMY_REPORTS = {
  sampleFile: {
    id: "sampleFile",
    title: "sampleFile.mp4",
    resultPercentage: 78,
    analysisResult: "High risk detected",
    mediaUrl: "/media/sampleFile.mp4",
    mediaType: "video",
    uploadDate: new Date().toISOString().split('T')[0], // Today's date
    processingTime: "2.7 seconds"
  },
  a1: {
    id: "a1",
    title: "VideoFile1",
    resultPercentage: 96,
    analysisResult: "Most Likely deepfake",
    mediaUrl: "/media/a1.mp4",
    mediaType: "video",
    uploadDate: "2024-01-15",
    processingTime: "2.3 seconds"
  },
  b2: {
    id: "b2",
    title: "AudioRecording1",
    resultPercentage: 64,
    analysisResult: "Moderate risk",
    mediaUrl: "/media/b2.mp3",
    mediaType: "audio",
    uploadDate: "2024-01-14",
    processingTime: "1.8 seconds"
  },
  c3: {
    id: "c3",
    title: "VideoFile2",
    resultPercentage: 88,
    analysisResult: "High risk",
    mediaUrl: "/media/c3.mp4",
    mediaType: "video",
    uploadDate: "2024-01-13",
    processingTime: "3.1 seconds"
  },
};

export function Report() {
  const { id } = useParams();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  
  // Check if this is a guest report
  const searchParams = new URLSearchParams(window.location.search);
  const isGuest = searchParams.get('guest') === 'true';

  // Helper functions for color coding
  const getRiskColor = (percentage) => {
    if (percentage >= 80) return "red";
    if (percentage >= 60) return "orange";
    if (percentage >= 40) return "yellow";
    return "green";
  };

  const getRiskVariant = (percentage) => {
    if (percentage >= 80) return "filled";
    if (percentage >= 60) return "filled";
    return "gradient";
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 80) {
      return <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />;
    } else if (percentage >= 60) {
      return <InformationCircleIcon className="h-8 w-8 text-red-500" />;
    } else {
      return <CheckCircleIcon className="h-8 w-8 text-white" />;
    }
  };

  const getMediaIcon = (type) => {
    return type === "video" ? (
      <VideoCameraIcon className="h-10 w-10 text-red-500" />
    ) : (
      <MusicalNoteIcon className="h-10 w-10 text-white" />
    );
  };

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if it's a dummy report ID first
        if (DUMMY_REPORTS[id]) {
          setReportData(DUMMY_REPORTS[id]);
          setLoading(false);
          return;
        }
        
        // Fetch real data from API (guest or authenticated)
        const response = isGuest 
          ? await guestAPI.getAnalysisResult(id)
          : await analysisAPI.getAnalysisResult(id);
        
        if (response.status === 'success' && response.data?.analysis) {
          const analysis = response.data.analysis;
          
          // Calculate risk percentage (invert confidence for deepfake, use as-is for authentic)
          let resultPercentage;
          if (analysis.result === 'deepfake') {
            // For deepfake, confidence is how confident we are it's fake (0-1)
            resultPercentage = Math.round((analysis.confidence || 0) * 100);
          } else {
            // For authentic, confidence is how confident we are it's real
            // Show as low risk (inverse)
            resultPercentage = Math.round((1 - (analysis.confidence || 0)) * 100);
          }
          
          // Map backend data to frontend format
          const mappedData = {
            id: analysis.id.toString(),
            title: analysis.originalName || analysis.fileName,
            resultPercentage: resultPercentage,
            analysisResult: analysis.result === 'deepfake' 
              ? (resultPercentage >= 80 ? 'High risk detected' : resultPercentage >= 60 ? 'Moderate risk' : 'Low risk')
              : 'Low risk - Authentic',
            mediaUrl: analysis.filePath ? `/uploads/${analysis.filePath.split(/[/\\]/).pop()}` : '#',
            mediaType: analysis.fileType?.startsWith('audio/') ? 'audio' : 'video',
            uploadDate: new Date(analysis.createdAt).toISOString().split('T')[0],
            processingTime: `${(analysis.processingTime / 1000).toFixed(1)} seconds`,
            details: analysis.details || {},
            rawResult: analysis.result,
            rawConfidence: analysis.confidence
          };
          
          setReportData(mappedData);
        } else {
          setError('Report not found');
        }
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [id]);
  
  const data = reportData;

  return (
    <div className={`min-h-screen ${getBackgroundClasses(isDark)}`}>
          <div className="h-12 w-full" />
      
      {/* Glowing orb effects - Figma inspired */}
      <div className={`fixed top-40 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 1)}`}></div>
      <div className={`fixed bottom-20 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 2)}`}></div>
      
      <section className="container mx-auto px-4 py-8 relative">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data && getStatusIcon(data.resultPercentage)}
            <div>
              <Typography variant="h3" className={`font-bold bg-clip-text text-transparent text-5xl ${
                isDark 
                  ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600'
              }`}>
                Analysis Report
              </Typography>
              <Typography className={`text-base mt-2 ${getTextClasses(isDark, 'muted')}`}>
                Detailed deepfake detection results
              </Typography>
            </div>
          </div>
          <Link
            to="/history"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 font-semibold ${
              isDark 
                ? 'bg-gray-900/40 text-purple-300 hover:bg-gray-900/60'
                : 'bg-white/40 text-purple-600 hover:bg-white/60'
            }`}
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to History
          </Link>
        </div>

        <Card className={`shadow-2xl shadow-purple-500/20 backdrop-blur-xl ${getCardClasses(isDark)}`}>
          <CardBody className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-pink-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                </div>
                <Typography variant="h6" className={`ml-4 mt-6 bg-clip-text text-transparent ${
                  isDark 
                    ? 'bg-gradient-to-r from-pink-400 to-purple-400'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                }`}>Loading report...</Typography>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <ExclamationTriangleIcon className="h-20 w-20 text-gray-600 mx-auto mb-6" />
                <Typography variant="h5" className="font-semibold mb-3 text-gray-300">
                  Error Loading Report
                </Typography>
                <Typography variant="paragraph" className="text-gray-400 mb-6">
                  {error}
                </Typography>
                <Link
                  to="/history"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 font-medium"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Go to History
                </Link>
              </div>
            ) : data ? (
              <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-start justify-between flex-wrap gap-6 pb-6 border-b border-purple-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center">
                      {getMediaIcon(data.mediaType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Typography variant="small" className={`font-medium ${getTextClasses(isDark)}`}>
                          ID: {data.id}
                        </Typography>
                        <Chip 
                          value={data.mediaType.toUpperCase()} 
                          size="sm" 
                          className={`${
                            data.mediaType === "video" 
                              ? "bg-red-500 text-white border border-red-500" 
                              : "bg-white text-black border border-white"
                          }`}
                        />
                      </div>
                      <Typography variant="h4" className={`font-bold mb-2 text-2xl ${getTextClasses(isDark)}`}>
                        {data.title}
                      </Typography>
                      <div className={`flex items-center gap-4 text-sm ${getTextClasses(isDark)}`}>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{data.uploadDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          <span>{data.processingTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Risk Score Card */}
                  <Card className={`shadow-xl shadow-purple-500/20 ${
                    isDark 
                      ? 'border border-gray-600/60 bg-gradient-to-br from-gray-800/90 to-gray-700/90'
                      : 'border border-gray-300/60 bg-gradient-to-br from-gray-100/90 to-gray-200/90'
                  }`}>
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <Typography variant="h6" className={`font-semibold flex items-center gap-2 text-xl ${getTextClasses(isDark)}`}>
                          <ShieldCheckIcon className="h-6 w-6 text-red-500" />
                          Risk Assessment
                        </Typography>
                        {getStatusIcon(data.resultPercentage)}
                      </div>
                      <div className="text-center mb-6">
                        <div className="relative inline-flex items-center justify-center mb-4">
                          <svg className="w-40 h-40 transform -rotate-90">
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              className={isDark ? "text-gray-600" : "text-gray-300"}
                            />
                            <circle
                              cx="80"
                              cy="80"
                              r="70"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 70}`}
                              strokeDashoffset={`${2 * Math.PI * 70 * (1 - data.resultPercentage / 100)}`}
                              className={`${
                                data.resultPercentage >= 80 ? 'text-red-500' :
                                data.resultPercentage >= 60 ? 'text-red-500' :
                                'text-white'
                              } transition-all duration-1000`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute">
                            <Typography 
                              variant="h1" 
                              className={`font-bold ${getTextClasses(isDark)}`}
                            >
                              {data.resultPercentage}%
                            </Typography>
                          </div>
                        </div>
                        <Chip 
                          value={data.analysisResult}
                          className={`w-full justify-center py-2 ${
                            data.resultPercentage >= 80 ? 'bg-red-500 text-white border border-red-500' :
                            data.resultPercentage >= 60 ? 'bg-red-500 text-white border border-red-500' :
                            'bg-white text-black border border-white'
                          }`}
                        />
                      </div>
                    </CardBody>
                  </Card>

                  {/* Media Information Card */}
                  <Card className={`shadow-xl shadow-purple-500/20 ${
                    isDark 
                      ? 'border border-gray-600/60 bg-gradient-to-br from-gray-800/90 to-gray-700/90'
                      : 'border border-gray-300/60 bg-gradient-to-br from-gray-100/90 to-gray-200/90'
                  }`}>
                    <CardBody className="p-6">
                      <Typography variant="h6" className={`font-semibold mb-6 text-xl ${getTextClasses(isDark)}`}>
                        Media Information
                      </Typography>
                      <div className="space-y-5">
                        <div className={`flex items-start gap-4 p-5 rounded-xl border ${
                          isDark 
                            ? 'bg-gray-700/60 border-gray-500/50'
                            : 'bg-gray-200/60 border-gray-400/50'
                        }`}>
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isDark 
                              ? 'bg-gradient-to-br from-gray-600/70 via-gray-500/70 to-gray-600/70 border border-gray-400/60'
                              : 'bg-gradient-to-br from-gray-300/70 via-gray-200/70 to-gray-300/70 border border-gray-500/60'
                          }`}>
                            {getMediaIcon(data.mediaType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Typography variant="small" className={`mb-1 ${getTextClasses(isDark)}`}>
                              Media Type
                            </Typography>
                            <Typography variant="h6" className={getTextClasses(isDark)}>
                              {data.mediaType.charAt(0).toUpperCase() + data.mediaType.slice(1)} File
                            </Typography>
                          </div>
                        </div>
                        <div className={`p-5 rounded-xl border ${
                          isDark 
                            ? 'bg-gray-700/60 border-gray-500/50'
                            : 'bg-gray-200/60 border-gray-400/50'
                        }`}>
                          <Typography variant="small" className={`mb-2 ${getTextClasses(isDark)}`}>
                            File Location
                          </Typography>
                          <a
                            href={data.mediaUrl}
                            className={`hover:text-red-500 underline break-all font-medium text-sm transition-colors ${
                              isDark 
                                ? 'text-white decoration-white'
                                : 'text-gray-900 decoration-gray-900'
                            }`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {data.mediaUrl}
                          </a>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>

                {/* Analysis Summary */}
                <Card className={`shadow-xl shadow-purple-500/20 ${
                  isDark 
                    ? 'border border-gray-600/60 bg-gradient-to-br from-gray-800/90 to-gray-700/90'
                    : 'border border-gray-300/60 bg-gradient-to-br from-gray-100/90 to-gray-200/90'
                }`}>
                  <CardBody className="p-6">
                    <Typography variant="h6" className={`font-semibold mb-4 text-xl ${getTextClasses(isDark)}`}>
                      Analysis Summary
                    </Typography>
                    <div className={`p-5 rounded-lg border-l-4 ${
                      data.resultPercentage >= 80 ? 'bg-red-500/60 border-red-500' :
                      data.resultPercentage >= 60 ? 'bg-orange-500/60 border-orange-500' :
                      isDark ? 'bg-green-500/20 border-green-500' : 'bg-green-500/20 border-green-500'
                    }`}>
                      <Typography 
                        variant="paragraph" 
                        className={`font-medium leading-relaxed ${getTextClasses(isDark)}`}
                      >
                        {data.rawResult === 'deepfake' 
                          ? (data.resultPercentage >= 80 
                              ? `⚠️ High Risk: This audio shows strong indicators of being artificially generated or manipulated. The ensemble model (Random Forest + CNN) detected significant anomalies with ${((data.rawConfidence || 0) * 100).toFixed(1)}% confidence.`
                              : data.resultPercentage >= 60 
                              ? `⚡ Moderate Risk: Some suspicious patterns detected in the audio. The ensemble model indicates ${((data.rawConfidence || 0) * 100).toFixed(1)}% confidence of manipulation. Further verification recommended.`
                              : `⚠️ Low-Moderate Risk: The audio shows some indicators of manipulation with ${((data.rawConfidence || 0) * 100).toFixed(1)}% confidence.`)
                          : `✅ Low Risk: This audio appears to be authentic with minimal signs of manipulation. The ensemble model found ${((1 - (data.rawConfidence || 0)) * 100).toFixed(1)}% confidence of authenticity.`
                        }
                      </Typography>
                      {data.details && Object.keys(data.details).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/20">
                          <Typography variant="small" className={`font-semibold mb-2 ${getTextClasses(isDark)}`}>
                            Technical Details:
                          </Typography>
                          {data.details.probabilities && (
                            <div className="space-y-1 text-sm">
                              <div className={getTextClasses(isDark, 'muted')}>
                                Bonafide: {((data.details.probabilities.bonafide || 0) * 100).toFixed(1)}%
                              </div>
                              <div className={getTextClasses(isDark, 'muted')}>
                                Spoof: {((data.details.probabilities.spoof || 0) * 100).toFixed(1)}%
                              </div>
                            </div>
                          )}
                          {data.details.technicalMetrics && (
                            <div className="mt-2 space-y-1 text-sm">
                              {data.details.technicalMetrics.duration && (
                                <div className={getTextClasses(isDark, 'muted')}>
                                  Duration: {data.details.technicalMetrics.duration}
                                </div>
                              )}
                              {data.details.technicalMetrics.numChunks && (
                                <div className={getTextClasses(isDark, 'muted')}>
                                  Chunks Analyzed: {data.details.technicalMetrics.numChunks}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : (
              <div className="text-center py-16">
                <ExclamationTriangleIcon className="h-20 w-20 text-gray-600 mx-auto mb-6" />
                <Typography variant="h5" className="font-semibold mb-3 text-gray-300">
                  Report Not Found
                </Typography>
                <Typography variant="paragraph" className="text-gray-400 mb-6">
                  The requested report could not be found. Please check the link or return to your history.
                </Typography>
                <Link
                  to="/history"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 font-medium"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Go to History
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

export default Report;



