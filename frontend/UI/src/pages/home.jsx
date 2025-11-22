import React from "react";
import {
  Typography,
  Button,
  Card,
} from "@material-tailwind/react";
import { CloudArrowUpIcon, ShieldCheckIcon, CpuChipIcon, DocumentMagnifyingGlassIcon, SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getGradientTextClasses } from "@/utils/theme";

export function Home() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <>
      <button
        onClick={toggleTheme}
        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-2 ${
          isDark
            ? 'bg-black/60 text-gray-200 border-gray-700 hover:bg-black/80'
            : 'bg-white/70 text-gray-800 border-gray-300 hover:bg-white'
        }`}
        aria-label="Toggle Theme"
      >
        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        <span>Toggle Theme</span>
      </button>
      <div className={`relative flex min-h-screen content-center items-center justify-center overflow-hidden pt-12 ${getBackgroundClasses(isDark)}`}>
        {/* 3D Wireframe wave effect inspired by Figma design */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute bottom-0 left-0 right-0 h-[60%] z-10 ${
            isDark 
              ? 'bg-gradient-to-t from-black via-transparent to-transparent'
              : 'bg-gradient-to-t from-gray-50 via-transparent to-transparent'
          }`}></div>
          <svg className="absolute bottom-0 left-0 w-full h-[600px] opacity-40" viewBox="0 0 1440 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {isDark ? (
                  <>
                    <stop offset="0%" style={{ stopColor: '#ff00ff', stopOpacity: 0.6 }} />
                    <stop offset="50%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#00f5ff', stopOpacity: 0.6 }} />
                  </>
                ) : (
                  <>
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 0.4 }} />
                    <stop offset="50%" style={{ stopColor: '#764ba2', stopOpacity: 0.4 }} />
                    <stop offset="100%" style={{ stopColor: '#4facfe', stopOpacity: 0.4 }} />
                  </>
                )}
              </linearGradient>
            </defs>
            {/* Wireframe mesh pattern */}
            {[...Array(20)].map((_, i) => (
              <path
                key={`h-${i}`}
                d={`M 0 ${300 + i * 15} Q 360 ${280 + i * 15 + Math.sin(i) * 30} 720 ${300 + i * 15} T 1440 ${300 + i * 15}`}
                fill="none"
                stroke="url(#waveGradient)"
                strokeWidth="1"
                opacity={0.3 - i * 0.01}
              />
            ))}
            {[...Array(40)].map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 36}
                y1="250"
                x2={i * 36}
                y2="600"
                stroke="url(#waveGradient)"
                strokeWidth="1"
                opacity="0.15"
              />
            ))}
          </svg>
        </div>
        
        {/* Glowing orbs - matching Figma aesthetic */}
        <div className={`absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 1)}`}></div>
        <div className={`absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 2)}`} style={{ animationDelay: '1s' }}></div>
        
        <div className="max-w-8xl container relative mx-auto px-4 py-20 z-20">
          <div className="flex flex-wrap items-center justify-center">
            <div className="w-full px-4 text-center lg:w-10/12">
              {/* Main Title - Gradient like Figma */}
              <div className="mb-12">
                <Typography
                  variant="h1"
                  className={`mb-6 font-black text-6xl md:text-7xl lg:text-8xl leading-tight ${
                    isDark 
                      ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent'
                      : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent'
                  }`}
                  style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
                >
                  Deepfake Detection
                </Typography>
                <Typography
                  variant="h1"
                  className={`mb-8 font-bold text-5xl md:text-6xl lg:text-7xl ${getTextClasses(isDark)}`}
                  style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
                >
                  Scalable Solutions
                </Typography>
               
              </div>
              
              {/* CTA Buttons - Matching Figma style */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
                <a href="/upload">
                  <Button
                    size="lg"
                    className="bg-gradient-to-b from-[#497cff] to-[#001664] hover:from-[#5a8cff] hover:to-[#0020a0] text-white px-8 py-4 text-xl font-medium shadow-xl shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/70 transition-all duration-300 rounded-lg min-w-[400px]"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Get started
                  </Button>
                </a>
                 </div>

                
             
              {/* Feature Cards - Enhanced theme-aware */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
                <Card className={`backdrop-blur-xl transition-all duration-300 group ${
                  isDark 
                    ? 'bg-gray-900/40 border border-pink-500/20 hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/30'
                    : 'bg-white/60 border border-purple-300/40 hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/20'
                }`}>
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-pink-500/50">
                      <ShieldCheckIcon className="h-12 w-12 text-white" />
                    </div>
                    <Typography variant="h5" className="mb-3 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-bold text-xl">
                      Advanced Detection
                    </Typography>
                  
                  </div>
                </Card>

                <Card className={`backdrop-blur-xl transition-all duration-300 group ${
                  isDark 
                    ? 'bg-gray-900/40 border border-purple-500/20 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/30'
                    : 'bg-white/60 border border-indigo-300/40 hover:border-indigo-500/60 hover:shadow-2xl hover:shadow-indigo-500/20'
                }`}>
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-purple-500/50">
                      <CpuChipIcon className="h-12 w-12 text-white" />
                    </div>
                    <Typography variant="h5" className="mb-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-bold text-xl">
                      Real-time Analysis
                    </Typography>
                    
                  </div>
                </Card>

                <Card className={`backdrop-blur-xl transition-all duration-300 group ${
                  isDark 
                    ? 'bg-gray-900/40 border border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/30'
                    : 'bg-white/60 border border-blue-300/40 hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/20'
                }`}>
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-cyan-500/50">
                      <DocumentMagnifyingGlassIcon className="h-12 w-12 text-white" />
                    </div>
                    <Typography variant="h5" className="mb-3 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-bold text-xl">
                      Detailed Reports
                    </Typography>
                  
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Home;
