import React from "react";
import { Typography, Button } from "@material-tailwind/react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses } from "@/utils/theme";

export function Landing() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <div className={`relative min-h-screen overflow-hidden ${getBackgroundClasses(isDark)}`}>
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 z-30 px-4 py-2 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-2 ${
          isDark
            ? 'bg-black/60 text-gray-200 border-gray-700 hover:bg-black/80'
            : 'bg-white/70 text-gray-800 border-gray-300 hover:bg-white'
        }`}
        aria-label="Toggle Theme"
      >
        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        <span>Toggle Theme</span>
      </button>
      {/* 3D Wireframe Wave Background - Exact Figma Style */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="absolute w-full h-full rotate-[15deg] scale-150 -bottom-[20%]">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 2260 1400" 
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {isDark ? (
                  <>
                    <stop offset="0%" style={{ stopColor: '#ff00ff', stopOpacity: 0.8 }} />
                    <stop offset="50%" style={{ stopColor: '#8b5cf6', stopOpacity: 0.8 }} />
                    <stop offset="100%" style={{ stopColor: '#00f5ff', stopOpacity: 0.8 }} />
                  </>
                ) : (
                  <>
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 0.6 }} />
                    <stop offset="50%" style={{ stopColor: '#764ba2', stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: '#4facfe', stopOpacity: 0.6 }} />
                  </>
                )}
              </linearGradient>
            </defs>
            
            {/* Horizontal mesh lines */}
            {[...Array(35)].map((_, i) => {
              const baseY = 600 + i * 22;
              const amplitude = 40 + i * 2;
              const frequency = 0.003;
              return (
                <path
                  key={`h-${i}`}
                  d={`M 0 ${baseY} ${[...Array(80)].map((_, x) => {
                    const xPos = x * 30;
                    const yPos = baseY + Math.sin(xPos * frequency + i * 0.3) * amplitude;
                    return `L ${xPos} ${yPos}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="url(#meshGradient)"
                  strokeWidth="1.5"
                  opacity={0.6 - i * 0.015}
                />
              );
            })}
            
            {/* Vertical mesh lines */}
            {[...Array(80)].map((_, i) => {
              const xPos = i * 30;
              return (
                <path
                  key={`v-${i}`}
                  d={`M ${xPos} 600 ${[...Array(35)].map((_, y) => {
                    const baseY = 600 + y * 22;
                    const amplitude = 40 + y * 2;
                    const frequency = 0.003;
                    const yPos = baseY + Math.sin(xPos * frequency + y * 0.3) * amplitude;
                    return `L ${xPos} ${yPos}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="url(#meshGradient)"
                  strokeWidth="1.5"
                  opacity="0.3"
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-20 container mx-auto px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/">
            <h1 className={`text-2xl font-medium tracking-wide ${getTextClasses(isDark)}`} style={{ fontFamily: "'Chillax', sans-serif" }}>
              DeepTrace
            </h1>
          </Link>

         
          
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-8 pt-20 pb-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Headline */}
          <h2 
            className="text-7xl md:text-8xl font-medium mb-4 tracking-wider"
            style={{ fontFamily: "'Clash Grotesk', sans-serif" }}
          >
            <span 
              className={`bg-clip-text text-transparent ${
                isDark 
                  ? 'bg-gradient-to-r from-[#ff00ff] via-[#8b5cf6] to-[#00f5ff]'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600'
              }`}
              style={{ WebkitTextFillColor: 'transparent' }}
            >
              Deepfake Detection
            </span>
          </h2>

          {/* Description */}
          <p 
            className={`text-xl leading-relaxed max-w-3xl mx-auto mb-16 tracking-wide opacity-90 ${getTextClasses(isDark)}`}
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
           Analyzing media to verify the authenticity of the content
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/sign-in">
              <button 
                className="bg-gradient-to-b from-[#497cff] to-[#001664] hover:from-[#5a8cff] hover:to-[#0020a0] text-white px-12 py-5 rounded-lg text-xl font-normal transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 min-w-[200px]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Login
              </button>
            </Link>
            
            <Link to="/upload">
              <button 
                className="bg-gradient-to-b from-[#d1d3e2] to-[#75629d] hover:from-[#e1e3f2] hover:to-[#8572ad] text-black px-12 py-5 rounded-lg text-xl font-normal transition-all duration-300 shadow-2xl hover:shadow-purple-500/50 min-w-[200px]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Quick Submit
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Landing;

