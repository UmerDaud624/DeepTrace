import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { useTheme } from '@/contexts/ThemeContext';
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getCardClasses } from '@/utils/theme';
import { useAuth } from '@/contexts/AuthContext';

export function SignIn() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const result = await login({ email, password });
    if (result && result.success) {
      navigate('/upload');
    } else {
      setLocalError(result?.error || 'Sign in failed');
    }
  };

  return (
    <section className={`flex items-center justify-center min-h-screen p-8 relative overflow-hidden ${getBackgroundClasses(isDark)}`}>
      <button
        onClick={toggleTheme}
        className={`absolute top-4 right-4 z-20 px-4 py-2 rounded-lg text-sm font-medium border transition-colors inline-flex items-center gap-2 ${
          isDark
            ? 'bg-black/60 text-gray-200 border-gray-700 hover:bg-black/80'
            : 'bg-white/70 text-gray-800 border-gray-300 hover:bg-white'
        }`}
        aria-label="Toggle Theme"
      >
        {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        <span>Toggle Theme</span>
      </button>
      {/* Animated background effects - Figma inspired */}
      <div className="absolute inset-0">
        <div className={`absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 1)}`}></div>
        <div className={`absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse ${getGlowOrbClasses(isDark, 2)}`} style={{animationDelay: '1s'}}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse ${
          isDark 
            ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10'
            : 'bg-gradient-to-br from-purple-500/5 to-pink-500/5'
        }`} style={{animationDelay: '2s'}}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className={`backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-500/30 p-10 ${getCardClasses(isDark)}`}>
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center border-4 border-purple-400/30 shadow-xl shadow-purple-500/50">
              <ShieldCheckIcon className="h-11 w-11 text-white" />
            </div>
            <h2 className={`text-5xl font-bold mb-4 bg-clip-text text-transparent ${
              isDark 
                ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600'
            }`}>
              Welcome Back
            </h2>
            <p className={`text-base ${getTextClasses(isDark, 'secondary')}`}>Enter your credentials to access your account</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                <EnvelopeIcon className="h-5 w-5" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mail.com"
                className={`w-full px-5 py-4 text-base border border-purple-500/30 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all ${
                  isDark 
                    ? 'bg-black/50 text-gray-200 placeholder-gray-600'
                    : 'bg-white/50 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            <div>
              <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                <LockClosedIcon className="h-5 w-5" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-5 py-4 text-base border border-purple-500/30 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all ${
                  isDark 
                    ? 'bg-black/50 text-gray-200 placeholder-gray-600'
                    : 'bg-white/50 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-purple-500/30 bg-black/50 text-purple-500 focus:ring-2 focus:ring-purple-500/20"
                id="terms"
              />
              <label htmlFor="terms" className={`text-sm ${getTextClasses(isDark, 'secondary')}`}>
                I agree to the{' '}
                <a href="#" className={`underline decoration-purple-400/50 transition-colors ${
                  isDark 
                    ? 'text-purple-400 hover:text-purple-300'
                    : 'text-purple-600 hover:text-purple-500'
                }`}>
                  Terms and Conditions
                </a>
              </label>
            </div>

            {localError || error ? (
              <div className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {localError || error}
              </div>
            ) : null}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#497cff] to-[#001664] hover:from-[#5a8cff] hover:to-[#0020a0] disabled:opacity-60 text-white py-4 rounded-xl font-semibold shadow-xl shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/70 transition-all duration-300 text-lg"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-purple-500/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-4 ${isDark ? 'bg-gray-900' : 'bg-gray-100'} ${getTextClasses(isDark, 'muted')}`}>Or continue with</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button className={`w-full border border-purple-500/30 hover:border-purple-500/50 py-4 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 justify-center shadow-sm hover:shadow-xl hover:shadow-purple-500/30 ${
              isDark 
                ? 'bg-black/50 hover:bg-black/70 text-gray-200'
                : 'bg-white/50 hover:bg-white/70 text-gray-800'
            }`}>
              <svg width="20" height="20" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_1156_824)">
                  <path d="M16.3442 8.18429C16.3442 7.64047 16.3001 7.09371 16.206 6.55872H8.66016V9.63937H12.9813C12.802 10.6329 12.2258 11.5119 11.3822 12.0704V14.0693H13.9602C15.4741 12.6759 16.3442 10.6182 16.3442 8.18429Z" fill="#4285F4" />
                  <path d="M8.65974 16.0006C10.8174 16.0006 12.637 15.2922 13.9627 14.0693L11.3847 12.0704C10.6675 12.5584 9.7415 12.8347 8.66268 12.8347C6.5756 12.8347 4.80598 11.4266 4.17104 9.53357H1.51074V11.5942C2.86882 14.2956 5.63494 16.0006 8.65974 16.0006Z" fill="#34A853" />
                  <path d="M4.16852 9.53356C3.83341 8.53999 3.83341 7.46411 4.16852 6.47054V4.40991H1.51116C0.376489 6.67043 0.376489 9.33367 1.51116 11.5942L4.16852 9.53356Z" fill="#FBBC04" />
                  <path d="M8.65974 3.16644C9.80029 3.1488 10.9026 3.57798 11.7286 4.36578L14.0127 2.08174C12.5664 0.72367 10.6469 -0.0229773 8.65974 0.000539111C5.63494 0.000539111 2.86882 1.70548 1.51074 4.40987L4.1681 6.4705C4.8001 4.57449 6.57266 3.16644 8.65974 3.16644Z" fill="#EA4335" />
                </g>
                <defs>
                  <clipPath id="clip0_1156_824">
                    <rect width="16" height="16" fill="white" transform="translate(0.5)" />
                  </clipPath>
                </defs>
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Footer Links */}
            <p className={`text-center font-medium mt-8 ${getTextClasses(isDark, 'secondary')}`}>
              Don't have an account?{' '}
              <a href="/sign-up" className={`font-semibold underline decoration-purple-400/50 ${
                isDark 
                  ? 'text-purple-400 hover:text-purple-300'
                  : 'text-purple-600 hover:text-purple-500'
              }`}>
                Create account
              </a>
            </p>

            <div className="mt-6 text-center pt-6 border-t border-purple-500/20">
              <a 
                href="/upload" 
                className={`font-medium transition-colors inline-flex items-center gap-2 ${
                  isDark 
                    ? 'text-purple-400 hover:text-purple-300'
                    : 'text-purple-600 hover:text-purple-500'
                }`}
              >
                <span>Quick Submit</span>
                <span className={getTextClasses(isDark, 'muted')}>•</span>
                <span className={getTextClasses(isDark, 'muted')}>Skip authentication and upload directly</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SignIn;
