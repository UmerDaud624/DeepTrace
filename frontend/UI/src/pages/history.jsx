import { useEffect, useState } from "react";
import { Typography, Card, CardBody } from "@material-tailwind/react";
import { ClockIcon, DocumentTextIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getCardClasses } from "@/utils/theme";

export function History() {
  const [entries, setEntries] = useState([]);
  const { isDark } = useTheme();

  useEffect(() => {
    // dummy entries for now
    setEntries([
      {
        id: "a1",
        date: "2025-10-01 14:32",
        title: "VideoFile",
        reportUrl: "/report/a1",
      },
      {
        id: "b2",
        date: "2025-09-18 09:05",
        title: "AudioFile",
        reportUrl: "/report/b2",
      },
      
    ]);
  }, []);

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
            {entries.map((e) => (
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
                <a
                  href={e.reportUrl}
                  className={`shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-all duration-300 font-semibold hover:shadow-xl hover:shadow-purple-500/40 ${
                    isDark 
                      ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-purple-500/30 text-purple-300 hover:from-pink-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 hover:border-purple-500/50'
                      : 'bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-blue-500/15 border-purple-400/40 text-purple-700 hover:from-purple-500/25 hover:via-indigo-500/25 hover:to-blue-500/25 hover:border-purple-500/60'
                  }`}
                >
                  View Report
                  <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
            ))}
            {entries.length === 0 && (
              <div className="p-16 text-center">
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full border flex items-center justify-center ${
                  isDark 
                    ? 'bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-purple-500/30'
                    : 'bg-gradient-to-br from-purple-500/15 via-indigo-500/15 to-blue-500/15 border-purple-400/40'
                }`}>
                  <DocumentTextIcon className={`h-12 w-12 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <Typography className={`text-xl mb-3 font-semibold ${getTextClasses(isDark)}`}>No history yet.</Typography>
                <Typography className={`text-base ${getTextClasses(isDark, 'secondary')}`}>Upload media files to see your analysis history here.</Typography>
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

export default History;


