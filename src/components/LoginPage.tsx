import React, { useState, useEffect } from 'react';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { UserRole, Profile } from '../types';
import { getStoredProfiles } from '../utils/storage';

interface LoginPageProps {
  onSuccessRedirect?: (role: UserRole) => void;
  isOnline?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccessRedirect,
  isOnline = true,
}) => {
  const { login, lang, setLang } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Load saved credentials & profiles
  useEffect(() => {
    const savedProfiles = getStoredProfiles();
    setProfiles(savedProfiles);

    const savedUser = localStorage.getItem('manas_remember_me_v1');
    if (savedUser) {
      setUsernameOrEmail(savedUser);
    }
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = usernameOrEmail.trim();
    if (!trimmedUser) {
      setErrorMessage(
        lang === 'ne'
          ? 'कृपया युजरनेम वा इमेल ठेगाना प्रविष्ट गर्नुहोस्'
          : 'Please enter your username, email, or phone number'
      );
      return;
    }

    if (!password) {
      setErrorMessage(
        lang === 'ne' ? 'कृपया पासवर्ड प्रविष्ट गर्नुहोस्' : 'Please enter your password'
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(trimmedUser, password, rememberMe);

      if (!result.success) {
        setErrorMessage(
          result.error ||
            (lang === 'ne'
              ? 'गलत युजरनेम वा पासवर्ड! कृपया पुन: प्रयास गर्नुहोस्।'
              : 'Invalid credentials. Please verify your login details.')
        );
        setIsLoading(false);
        return;
      }

      if (result.role && onSuccessRedirect) {
        onSuccessRedirect(result.role);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (lang === 'ne'
            ? 'लग-इन गर्दा त्रुटि देखापर्यो'
            : 'An unexpected authentication error occurred')
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo account filler
  const handleFillDemo = (profile: Profile) => {
    setErrorMessage(null);
    if (profile.role === 'admin') {
      setUsernameOrEmail('admin@manassahakari.com');
      setPassword('admin123');
    } else if (profile.email) {
      setUsernameOrEmail(profile.email);
      setPassword('agent123');
    } else {
      setUsernameOrEmail(profile.phone_number || profile.full_name);
      setPassword('agent123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar Header */}
      <header className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold text-xl shadow-lg border border-amber-300">
            <Building2 className="w-5 h-5 text-emerald-900" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm sm:text-base tracking-tight leading-tight">
              मानस कृषि सहकारी संस्था लि.
            </h1>
            <p className="text-[11px] text-emerald-400 font-mono">
              टिकापुर-१, कैलाली | दर्ता नं: ४०३/०६८/०६९
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isOnline
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                : 'bg-amber-950/80 text-amber-300 border-amber-600/60 animate-pulse'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>अनलाइन</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>फिल्ड अफलाइन</span>
              </>
            )}
          </div>

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'ne' ? 'en' : 'ne')}
            className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-slate-900 border border-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            {lang === 'ne' ? 'EN' : 'नेपाली'}
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto px-4 py-4 sm:py-8 z-10 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          {/* Card Top Title & Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {lang === 'ne'
                  ? 'सुरक्षित प्रयोगकर्ता प्रमाणीकरण'
                  : 'Secure Cooperative Authentication'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {lang === 'ne' ? 'लग-इन गर्नुहोस्' : 'Sign In to Portal'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'ne'
                ? 'बजार प्रतिनिधि दैनिक बचत तथा ऋण संकलन प्रणाली'
                : 'Field Agent & Executive Management System'}
            </p>
          </div>

          {/* Offline Notice Banner */}
          {!isOnline && (
            <div className="mb-5 p-3 rounded-2xl bg-amber-950/50 border border-amber-600/40 flex items-start gap-2.5 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-amber-300">
                  {lang === 'ne' ? 'इन्टरनेट बिना अफलाइन लग-इन' : 'Offline Access Active'}
                </strong>
                <span>
                  {lang === 'ne'
                    ? 'तपाईं फिल्डमा अफलाइन मोडमा हुनुहुन्छ। स्थानीय रूपमा सुरक्षित क्रेडेन्सियलबाट लग-इन गर्न सक्नुहुन्छ।'
                    : 'Operating offline. Local encrypted credentials will authenticate your field session.'}
                </span>
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mb-5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-600/50 flex items-start gap-2.5 text-xs text-rose-200 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Email / Username Field */}
            <div>
              <label
                htmlFor="login-username-input"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                {lang === 'ne' ? 'इमेल वा युजरनेम (Email / Phone)' : 'Email or Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-username-input"
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={
                    lang === 'ne'
                      ? 'admin@manassahakari.com / प्रकाश'
                      : 'name@manassahakari.com'
                  }
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder-slate-500 text-sm font-medium outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password-input"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                {lang === 'ne' ? 'पासवर्ड (Password)' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder-slate-500 text-sm font-medium outline-none transition-all"
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Role Indicator */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>{lang === 'ne' ? 'मलाई सम्झिराख्नुहोस्' : 'Remember Me'}</span>
              </label>

              <span className="text-[11px] text-emerald-400 font-mono">
                {lang === 'ne' ? '२५६-बिट इन्क्रिप्टेड' : '256-bit Encrypted'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {lang === 'ne' ? 'प्रमाणीकरण हुँदैछ...' : 'Authenticating...'}
                  </span>
                </>
              ) : (
                <>
                  <span>{lang === 'ne' ? 'प्रणालीमा प्रवेश गर्नुहोस्' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo One-Tap Fill Shortcut Box */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>
                  {lang === 'ne'
                    ? 'द्रुत परीक्षण प्रोफाइल छान्नुहोस्:'
                    : 'Quick Demo Profiles (1-Click Fill):'}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {profiles.slice(0, 3).map((p) => {
                const isAdmin = p.role === 'admin';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleFillDemo(p)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                      isAdmin
                        ? 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-600/30 text-amber-200'
                        : 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-600/30 text-emerald-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isAdmin ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold truncate text-white">
                        {p.full_name}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {p.role === 'admin'
                          ? lang === 'ne'
                            ? 'केन्द्रीय प्रशासक'
                            : 'Admin (Full Access)'
                          : lang === 'ne'
                          ? 'बजार प्रतिनिधि'
                          : 'Field Agent'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-4 text-center text-slate-500 text-xs z-10">
        <p>
          © {new Date().getFullYear()} मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर-१, कैलाली | All Rights Reserved
        </p>
      </footer>
    </div>
  );
};
