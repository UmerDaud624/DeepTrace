import { useEffect, useState } from "react";
import { Avatar, Typography, Button } from "@material-tailwind/react";
import { UserCircleIcon, EnvelopeIcon, LockClosedIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackgroundClasses, getTextClasses, getGlowOrbClasses, getCardClasses } from "@/utils/theme";
import { userAPI } from "@/services/api";

export function Profile() {
  const { isDark } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      
      if (response.status === 'success' && response.data?.user) {
        const user = response.data.user;
        // Combine firstName and lastName into fullName
        const name = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.lastName || "";
        setFullName(name);
        setEmail(user.email || "");
        // Don't load password from backend for security
        setPassword("");
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setMessage("Failed to load profile. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (!fullName || !email) {
      setMessage("Please provide name and email.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Please provide a valid email address.");
      return;
    }

    setSaving(true);
    
    try {
      // Prepare payload - only include password if it's been changed (not empty)
      const payload = {
        fullName,
        email
      };

      // Only include password if user provided a new one
      if (password && password.trim().length > 0) {
        if (password.length < 6) {
          setMessage("Password must be at least 6 characters long.");
          setSaving(false);
          return;
        }
        payload.password = password;
      }

      const response = await userAPI.updateProfile(payload);
      
      if (response.status === 'success') {
        setMessage("Profile updated successfully.");
        // Clear password field after successful save
        setPassword("");
        
        // Update fullName and email from response if provided
        if (response.data?.user) {
          const user = response.data.user;
          const name = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`.trim()
            : user.firstName || user.lastName || "";
          setFullName(name);
          setEmail(user.email || "");
        }
      } else {
        setMessage(response.message || "Failed to update profile.");
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage(error.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen overflow-hidden ${getBackgroundClasses(isDark)}`}>
          {/* Spacer for navbar */}
          <div className="h-12 w-full" />
      
      {/* Glowing orb effects - Figma inspired */}
      <div className={`fixed top-40 left-20 w-96 h-96 rounded-full blur-3xl ${getGlowOrbClasses(isDark, 1)}`}></div>
      <div className={`fixed bottom-20 right-20 w-96 h-96 rounded-full blur-3xl ${getGlowOrbClasses(isDark, 2)}`}></div>
      
      <section className="relative py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Typography variant="h3" className={`mb-3 font-bold bg-clip-text text-transparent text-5xl ${
              isDark 
                ? 'bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600'
            }`}>
              Profile Settings
            </Typography>
            <Typography className={`text-lg ${getTextClasses(isDark, 'secondary')}`}>
              Manage your account information
            </Typography>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className={`backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-purple-500/20 ${getCardClasses(isDark)}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-28 h-28 mb-6 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center border-4 border-purple-400/30 shadow-xl shadow-purple-500/50">
                    <UserCircleIcon className="h-16 w-16 text-white" />
                  </div>
                  <Typography variant="h5" className={`font-bold mb-2 text-xl ${getTextClasses(isDark)}`}>
                    {loading ? "Loading..." : (fullName || "Your Name")}
                  </Typography>
                  <Typography className={`text-sm mb-6 ${getTextClasses(isDark, 'muted')}`}>
                    {loading ? "Loading..." : (email || "your@email.com")}
                  </Typography>
                  <div className="w-full pt-6 border-t border-purple-500/20">
                    <Typography className={`text-sm font-medium mb-3 ${getTextClasses(isDark, 'secondary')}`}>
                      Account Status
                    </Typography>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Active
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Form */}
            <div className="lg:col-span-2">
              <div className={`backdrop-blur-xl rounded-2xl p-8 shadow-2xl shadow-purple-500/20 ${getCardClasses(isDark)}`}>
                <Typography variant="h5" className={`bg-clip-text text-transparent font-bold mb-8 text-2xl ${
                  isDark 
                    ? 'bg-gradient-to-r from-pink-400 to-cyan-400'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600'
                }`}>
                  Personal Information
                </Typography>
                
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                      <UserCircleIcon className="h-5 w-5" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-5 py-4 text-base border border-purple-500/30 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all ${
                        isDark 
                          ? 'bg-black/50 text-gray-200 placeholder-gray-600'
                          : 'bg-white/50 text-gray-800 placeholder-gray-400'
                      }`}
                    />
                  </div>

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
                      placeholder="Leave blank to keep current password"
                      className={`w-full px-5 py-4 text-base border border-purple-500/30 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all ${
                        isDark 
                          ? 'bg-black/50 text-gray-200 placeholder-gray-600'
                          : 'bg-white/50 text-gray-800 placeholder-gray-400'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${getTextClasses(isDark, 'muted')}`}>
                      Leave blank to keep your current password
                    </p>
                  </div>

                  {message && (
                    <div
                      className={`px-5 py-4 rounded-xl border ${
                        message.includes("successfully")
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400"
                      }`}
                    >
                      <p className="text-sm font-medium">{message}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={saving || loading}
                      className="flex-1 bg-gradient-to-b from-[#497cff] to-[#001664] hover:from-[#5a8cff] hover:to-[#0020a0] text-white py-4 rounded-xl font-semibold shadow-xl shadow-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {loading ? "Loading..." : (saving ? "Saving..." : "Save Changes")}
                    </button>
                    
                    <a
                      href="/history"
                      className={`flex-1 text-center px-4 py-4 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all duration-300 font-semibold text-lg flex items-center justify-center ${
                        isDark 
                          ? 'bg-gray-800/50 text-purple-300 hover:bg-gray-800/70'
                          : 'bg-gray-200/50 text-purple-600 hover:bg-gray-200/70'
                      }`}
                    >
                      View History
                    </a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Profile;
