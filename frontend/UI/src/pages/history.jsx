import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Typography, Card, CardBody } from "@material-tailwind/react";
import { ClockIcon, DocumentTextIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { userAPI } from "@/services/api";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getCardClasses } from "@/utils/theme";

export function History() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      // Only fetch if user is authenticated
      if (!isAuthenticated) {
        setLoading(false);
        setEntries([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await userAPI.getAnalysisHistory();
        
        if (response.status === 'success' && response.data?.analyses) {
          // Map backend data to frontend format
          const mappedEntries = response.data.analyses.map((analysis) => {
            // Format the date: convert MySQL datetime to "YYYY-MM-DD HH:mm" format
            const dateObj = new Date(analysis.created_at);
            const formattedDate = dateObj.toISOString().slice(0, 16).replace('T', ' ');
            
            return {
              id: analysis.id.toString(),
              date: formattedDate,
              title: analysis.file_name || 'Unknown File',
              reportUrl: `/report/${analysis.id}`,
            };
          });
          
          setEntries(mappedEntries);
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error('Error fetching history:', err);
        setError(err.message || 'Failed to load analysis history');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated]);

  return (
    <div className={`min-h-screen ${getBackgroundClasses(isDark)}`}>
      {/* Spacer for navbar */}
      <div className="h-12 w-full" />
      
      {/* Glowing orb effects - Figma inspired */}
      <div className={`fixed top-40 right-20 w-96 h-96 rounded-full blur-3xl ${getGlowOrbClasses(isDark, 1)}`}></div>
      <div className={`fixed bottom-20 left-20 w-96 h-96 rounded-full blur-3xl ${getGlowOrbClasses(isDark, 2)}`}></div>
      
      <section className="container mx-auto px-4 py-8 relative">
        <div className="mb-8">
          <Typography variant="h3" className={`mb-3 font-bold text-5xl ${
            isDark 
              ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent'
          }`}>
            Analysis History
          </Typography>
          <Typography className={`text-lg ${getTextClasses(isDark, 'secondary')}`}>
            View your previous media analysis reports
          </Typography>
        </div>
        
        <Card className={`shadow-2xl shadow-purple-500/20 backdrop-blur-xl ${getCardClasses(isDark)}`}>
          <CardBody className="divide-y divide-purple-500/10 p-0">
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
                }`}>Loading history...</Typography>
              </div>
            ) : error ? (
              <div className="p-16 text-center">
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full border flex items-center justify-center ${
                  isDark 
                    ? 'bg-gradient-to-br from-red-500/20 via-pink-500/20 to-purple-500/20 border-red-500/30'
                    : 'bg-gradient-to-br from-red-500/15 via-pink-500/15 to-purple-500/15 border-red-400/40'
                }`}>
                  <DocumentTextIcon className={`h-12 w-12 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <Typography className={`text-xl mb-3 font-semibold ${getTextClasses(isDark)}`}>Error loading history</Typography>
                <Typography className={`text-base mb-4 ${getTextClasses(isDark, 'secondary')}`}>{error}</Typography>
                <button
                  onClick={() => window.location.reload()}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-all duration-300 font-semibold hover:shadow-xl hover:shadow-purple-500/40 ${
                    isDark 
                      ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-purple-500/30 text-purple-300 hover:from-pink-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50'
                      : 'bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-blue-500/15 border-purple-400/40 text-purple-700 hover:from-purple-500/25 hover:via-indigo-500/25 hover:to-blue-500/25 hover:border-purple-500/60'
                  }`}
                >
                  Try Again
                </button>
              </div>
            ) : entries.length > 0 ? (
              entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 p-6 hover:bg-gradient-to-r hover:from-pink-500/5 hover:to-cyan-500/5 transition-all duration-300 group">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${
                      isDark 
                        ? 'bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-purple-500/30'
                        : 'bg-gradient-to-br from-purple-500/15 via-indigo-500/15 to-blue-500/15 border-purple-400/40'
                    }`}>
                      <DocumentTextIcon className={`h-7 w-7 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg font-semibold truncate mb-1 ${getTextClasses(isDark)}`}>{e.title}</p>
                      <div className={`flex items-center gap-2 text-sm ${getTextClasses(isDark, 'muted')}`}>
                        <ClockIcon className="h-4 w-4" />
                        <span>{e.date}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={e.reportUrl}
                    className={`shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-all duration-300 font-semibold hover:shadow-xl hover:shadow-purple-500/40 ${
                      isDark 
                        ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-purple-500/30 text-purple-300 hover:from-pink-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50'
                        : 'bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-blue-500/15 border-purple-400/40 text-purple-700 hover:from-purple-500/25 hover:via-indigo-500/25 hover:to-blue-500/25 hover:border-purple-500/60'
                    }`}
                  >
                    View Report
                    <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-16 text-center">
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full border flex items-center justify-center ${
                  isDark 
                    ? 'bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-purple-500/30'
                    : 'bg-gradient-to-br from-purple-500/15 via-indigo-500/15 to-blue-500/15 border-purple-400/40'
                }`}>
                  <DocumentTextIcon className={`h-12 w-12 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <Typography className={`text-xl mb-3 font-semibold ${getTextClasses(isDark)}`}>No history yet.</Typography>
                <Typography className={`text-base ${getTextClasses(isDark, 'secondary')}`}>
                  {!isAuthenticated 
                    ? 'Please sign in to view your analysis history.'
                    : 'Upload media files to see your analysis history here.'}
                </Typography>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

export default History;


