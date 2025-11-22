import React from 'react';
import { IconButton } from '@material-tailwind/react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <IconButton
      variant="text"
      size="sm"
      onClick={toggleTheme}
      className={`
        relative overflow-hidden transition-all duration-300 transform hover:scale-110
        ${isDark 
          ? 'text-yellow-300 hover:text-yellow-200 hover:bg-gradient-to-r hover:from-yellow-500/20 hover:to-orange-500/20 focus:bg-yellow-500/20 active:bg-yellow-500/30 border-2 border-yellow-500/40 hover:border-yellow-400/60 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50' 
          : 'text-purple-600 hover:text-purple-700 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-indigo-500/20 focus:bg-purple-500/20 active:bg-purple-500/30 border-2 border-purple-500/40 hover:border-purple-400/60 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
        } 
        rounded-xl ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative z-10 transition-transform duration-300">
        {isDark ? (
          <SunIcon className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
        ) : (
          <MoonIcon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
        )}
      </div>
      
      {/* Glow effect */}
      <div className={`
        absolute inset-0 rounded-xl blur-lg opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10
        ${isDark 
          ? 'bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-yellow-400/20' 
          : 'bg-gradient-to-r from-purple-400/20 via-indigo-400/20 to-purple-400/20'
        }
      `}></div>
    </IconButton>
  );
}

ThemeToggle.displayName = "/src/widgets/layout/theme-toggle.jsx";

export default ThemeToggle;
