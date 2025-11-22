/**
 * Utility functions for theme-aware styling
 */

export const getThemeClasses = (isDark, lightClasses, darkClasses) => {
  return isDark ? darkClasses : lightClasses;
};

export const getBackgroundClasses = (isDark) => {
  return getThemeClasses(
    isDark,
    'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    'bg-black'
  );
};

export const getTextClasses = (isDark, variant = 'primary') => {
  const variants = {
    primary: getThemeClasses(isDark, 'text-gray-900', 'text-white'),
    secondary: getThemeClasses(isDark, 'text-gray-600', 'text-gray-300'),
    muted: getThemeClasses(isDark, 'text-gray-500', 'text-gray-400'),
  };
  return variants[variant] || variants.primary;
};

export const getCardClasses = (isDark) => {
  return getThemeClasses(
    isDark,
    'bg-white/90 border border-purple-200/50 shadow-lg shadow-purple-500/10',
    'bg-black/80 border border-purple-500/30 shadow-lg shadow-purple-500/20'
  );
};

export const getGlowOrbClasses = (isDark, position = 1) => {
  if (position === 1) {
    return getThemeClasses(
      isDark,
      'bg-gradient-to-br from-purple-500/15 to-indigo-600/15',
      'bg-gradient-to-br from-pink-500/20 to-purple-600/20'
    );
  }
  return getThemeClasses(
    isDark,
    'bg-gradient-to-br from-blue-500/15 to-cyan-600/15',
    'bg-gradient-to-br from-cyan-500/20 to-blue-600/20'
  );
};

export const getGradientTextClasses = (isDark) => {
  return getThemeClasses(
    isDark,
    'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent',
    'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent'
  );
};
