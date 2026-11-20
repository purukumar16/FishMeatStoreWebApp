import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  User,
  MapPin,
  Building,
  KeyRound,
  ArrowLeft,
  Heart,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AppRole } from '../../config/rbac';
import { WELCOME_FRESH_WALLET_CREDIT_INR } from '../../utils/loyalty';
import heroImage from '../../assets/images/hero_fresh_meat_store_1794116943066.jpg';

interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  placeholder: string;
  digits: number;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', dial: '+91', flag: '🇮🇳', placeholder: '98765 43210', digits: 10 },
  { code: 'US', dial: '+1', flag: '🇺🇸', placeholder: '(555) 234-5678', digits: 10 },
  { code: 'GB', dial: '+44', flag: '🇬🇧', placeholder: '7911 123456', digits: 10 },
  { code: 'AE', dial: '+971', flag: '🇦🇪', placeholder: '50 123 4567', digits: 9 },
  { code: 'SG', dial: '+65', flag: '🇸🇬', placeholder: '8123 4567', digits: 8 },
];

export const CustomerLogin: React.FC<{
  onSwitchToAdmin: () => void;
  onClose: () => void;
  onSuccess?: (role: AppRole) => void;
}> = ({ onSwitchToAdmin, onClose, onSuccess }) => {
  const {
    loginWithGoogle,
    firebaseUser,
    authLoading,
    loginWithEmailPassword,
    registerCustomer,
    loginCustomerWithOtp,
    activeStore,
    pendingWishlistProduct,
    currentUser,
    adminUser,
    logoutCustomer,
    switchCustomerToStaffProfile,
  } = useStore();

  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    const res = await loginWithGoogle('customer');
    if (!res.success && res.error) {
      setGoogleError(res.error);
    } else if (res.success) {
      if (onSuccess) onSuccess(res.role || 'customer');
      onClose();
    }
  };

  // Active top tab: 'signin' | 'register' | 'otp'
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'otp'>('signin');

  // Sign In State (Email & Password)
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSignInLoading, setIsSignInLoading] = useState(false);

  // Register State (Email, Password, Name, Phone, Address)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regFlat, setRegFlat] = useState('');
  const [regArea, setRegArea] = useState('Budigere Cross, Bommenahalli');
  const [regCity, setRegCity] = useState('Bengaluru');
  const [regPincode, setRegPincode] = useState('560049');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegLoading, setIsRegLoading] = useState(false);

  // OTP State
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code'>('phone');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for OTP screen
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTab === 'otp' && otpStep === 'code' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, otpStep, timerSeconds]);

  // Handle Sign In with Email & Password
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);

    if (!signInEmail.trim() || !signInEmail.includes('@')) {
      setSignInError('Please enter a valid email address.');
      return;
    }
    if (!signInPassword) {
      setSignInError('Please enter your password.');
      return;
    }

    setIsSignInLoading(true);
    setTimeout(() => {
      setIsSignInLoading(false);
      const res = loginWithEmailPassword(signInEmail.trim(), signInPassword);
      if (!res.success) {
        setSignInError(res.error || 'Failed to sign in. Please verify your credentials.');
      } else {
        if (onSuccess) onSuccess(res.role || 'customer');
        onClose();
      }
    }, 450);
  };

  // Quick Demo Login as Rahul
  const handleDemoSignIn = () => {
    setSignInEmail('rahul.sharma@example.com');
    setSignInPassword('Password123!');
    setSignInError(null);
    setIsSignInLoading(true);
    setTimeout(() => {
      setIsSignInLoading(false);
      const res = loginWithEmailPassword('rahul.sharma@example.com', 'Password123!');
      if (res.success) {
        if (onSuccess) onSuccess(res.role || 'customer');
        onClose();
      }
    }, 400);
  };

  // Handle Register New Account
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError('Please provide your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-enter.');
      return;
    }
    if (regPhone.replace(/\D/g, '').length < 10) {
      setRegError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsRegLoading(true);
    setTimeout(() => {
      setIsRegLoading(false);
      const res = registerCustomer({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim(),
        flatBuilding: regFlat.trim(),
        streetArea: regArea.trim(),
        city: regCity.trim(),
        pincode: regPincode.trim(),
      });

      if (!res.success) {
        setRegError(res.error || 'Registration failed. Please try again.');
      } else {
        if (onSuccess) onSuccess(res.role || 'customer');
        onClose();
      }
    }, 550);
  };

  // OTP handlers
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otpPhone.replace(/\D/g, '');
    if (clean.length < selectedCountry.digits) {
      setOtpError(`Please enter a valid ${selectedCountry.digits}-digit phone number.`);
      return;
    }
    setOtpError(null);
    setIsOtpLoading(true);
    setTimeout(() => {
      setIsOtpLoading(false);
      setOtpStep('code');
      setTimerSeconds(30);
      setCanResend(false);
      setOtpValues(['', '', '', '', '', '']);
    }, 400);
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanChar = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = cleanChar;
    setOtpValues(newOtp);
    if (otpError) setOtpError(null);

    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (cleanChar && index === 5 && newOtp.every((d) => d !== '')) {
      void verifyOtp(newOtp.join(''));
    }
  };

  const verifyOtp = async (code: string) => {
    if (code === '000000') {
      setOtpError('Invalid verification code.');
      return;
    }
    setIsOtpLoading(true);
    try {
      const formatted = `${selectedCountry.dial} ${otpPhone}`;
      const res = await loginCustomerWithOtp(formatted);
      if (onSuccess) onSuccess(res.role);
      onClose();
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-0 md:min-h-[640px] bg-white rounded-2xl overflow-hidden">
      {/* LEFT COLUMN: Cold Chain Story & Assurance */}
      <div className="hidden md:flex md:w-5/12 bg-[#18082e] text-white flex-col justify-between p-8 relative overflow-hidden select-none">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Farm fresh seafood and premium butcher cuts on ice"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18082e] via-[#18082e]/85 to-[#18082e]/90" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>0°C - 4°C Freshness Protocol</span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white leading-tight">
            The Absolute Standard in Fresh Meat & Seafood.
          </h2>
          <p className="text-xs text-purple-200/90 leading-relaxed">
            Order bespoke fresh cuts prepared directly at your nearest retail chiller. Never frozen, strictly 4km radius, zero chemical preservatives.
          </p>
        </div>

        {/* Perks & Benefits Card */}
        <div className="relative z-10 space-y-3 pt-6 border-t border-purple-800/60">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-900/80 border border-purple-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">
                ₹{WELCOME_FRESH_WALLET_CREDIT_INR} Fresh Wallet Credit
              </span>
              <span className="text-[11px] text-purple-300">
                New accounts automatically receive ₹{WELCOME_FRESH_WALLET_CREDIT_INR} Fresh Wallet credit for your first order.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-900/80 border border-purple-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Hyperlocal Dispatch</span>
              <span className="text-[11px] text-purple-300">
                Fulfilled by {activeStore.neighborhood} Hub ({activeStore.chillerTempC}°C walk-in chiller).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-900/80 border border-purple-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Saved Multiple Addresses</span>
              <span className="text-[11px] text-purple-300">
                Manage Home, Work, and Secondary addresses with 1-tap checkout.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-[11px] text-purple-400 border-t border-purple-900/40">
          <span>Active Hub: {activeStore.name}</span>
          <span className="font-mono text-emerald-400">4km SLA</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Account Forms */}
      <div className="flex-1 p-4 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white">
        {/* Navigation Tabs */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-200">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase block">
                Customer Account
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-purple-950">
                {activeTab === 'signin' && 'Sign In to Your Account'}
                {activeTab === 'register' && 'Create Your Account'}
                {activeTab === 'otp' && 'Fast Mobile OTP Sign In'}
              </h3>
            </div>

            {/* Quick Demo Assist Button on Sign In tab */}
            {activeTab === 'signin' && (
              <button
                type="button"
                onClick={handleDemoSignIn}
                className="self-start sm:self-auto min-h-[44px] sm:min-h-0 text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors cursor-pointer shadow-2xs"
                title="Log in with pre-seeded test account (rahul.sharma@example.com)"
              >
                1-Click Demo Login
              </button>
            )}
          </div>

          {pendingWishlistProduct && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />
              <span>
                Sign in to save <strong>{pendingWishlistProduct.name}</strong> to your Wishlist for quick re-ordering.
              </span>
            </div>
          )}

          {(currentUser || adminUser) && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 space-y-2">
              {currentUser && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate">
                    Customer session active: <strong>{currentUser.name}</strong>{' '}
                    <span className="text-[11px] font-semibold text-emerald-800">
                      ({currentUser.customerType || 'Customer'})
                    </span>
                    {firebaseUser?.email && (
                      <span className="ml-1.5 text-[10px] font-mono text-emerald-700">
                        · Cloud Synced
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={logoutCustomer}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer shrink-0"
                  >
                    Sign Out Customer
                  </button>
                </div>
              )}
              {adminUser && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-emerald-200/80 text-[11px]">
                  <span className="text-emerald-900">
                    Staff session active simultaneously: <strong>{adminUser.name}</strong> ({adminUser.role})
                  </span>
                  {(!currentUser || currentUser.email.toLowerCase() !== adminUser.workEmail.toLowerCase()) && (
                    <button
                      type="button"
                      onClick={() => {
                        switchCustomerToStaffProfile();
                        onClose();
                      }}
                      className="font-semibold text-purple-900 hover:underline cursor-pointer shrink-0"
                    >
                      Use Staff Profile as Customer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Primary Google Authentication CTA */}
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-stone-50 active:scale-[0.99] text-stone-800 text-xs sm:text-sm font-semibold rounded-xl border border-stone-300 shadow-2xs transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2.5"
            >
              {authLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-300 border-t-purple-900 rounded-full animate-spin" />
                  <span>Connecting Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
            {googleError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{googleError}</span>
              </div>
            )}
            <div className="relative flex items-center py-1">
              <div className="grow border-t border-stone-200" />
              <span className="shrink mx-3 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Or use email &amp; mobile
              </span>
              <div className="grow border-t border-stone-200" />
            </div>
          </div>

          {/* Account Sub-Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-4 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setSignInError(null);
              }}
              className={`flex-1 min-h-[44px] sm:min-h-0 py-2 px-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegError(null);
              }}
              className={`flex-1 min-h-[44px] sm:min-h-0 py-2 px-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('otp');
                setOtpError(null);
              }}
              className={`flex-1 min-h-[44px] sm:min-h-0 py-2 px-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'otp'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mobile OTP
            </button>
          </div>

          {/* ================= TAB 1: SIGN IN (EMAIL & PASSWORD) ================= */}
          {activeTab === 'signin' && (
            <div className="py-5 space-y-4">
              <p className="text-xs text-stone-600">
                Log in with your customer email & password (Admin &amp; Store Incharge credentials also work here) to access your ₹{WELCOME_FRESH_WALLET_CREDIT_INR} Fresh Wallet, Wishlist, and saved addresses alongside any active staff session.
              </p>

              {signInError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{signInError}</span>
                </div>
              )}

              <form onSubmit={handleSignIn} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Email Address <span className="text-purple-900">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      placeholder="Enter your email address"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-700">
                      Password <span className="text-purple-900">*</span>
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="p-2 text-stone-400 hover:text-stone-700 absolute right-1.5 rounded-md cursor-pointer"
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSignInLoading}
                  className="w-full min-h-[44px] py-3.5 px-4 bg-purple-900 hover:bg-purple-950 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 group"
                >
                  {isSignInLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-stone-600">
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError(null);
                  }}
                  className="font-semibold text-purple-950 hover:underline cursor-pointer py-1"
                >
                  Create one now & receive ₹{WELCOME_FRESH_WALLET_CREDIT_INR} Fresh Wallet credit
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: REGISTER (EMAIL, PASSWORD & PROFILE) ================= */}
          {activeTab === 'register' && (
            <div className="py-4 space-y-3.5 md:max-h-[480px] overflow-y-auto pr-1">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Welcome gift: ₹{WELCOME_FRESH_WALLET_CREDIT_INR} Fresh Wallet credit is loaded into your account immediately upon registration!
                </span>
              </div>

              {regError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegister} autoComplete="off" className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Full Name <span className="text-purple-900">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        placeholder="Enter your full name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Mobile Number <span className="text-purple-900">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        autoComplete="off"
                        placeholder="Enter 10-digit mobile number"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address (Login ID) <span className="text-purple-900">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. priya.sharma@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Password (min 6 chars) <span className="text-purple-900">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <KeyRound className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-9 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 absolute right-1.5 rounded-md cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Confirm Password <span className="text-purple-900">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Delivery Address */}
                <div className="pt-2 border-t border-stone-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-purple-900 shrink-0" />
                      <span>Primary Delivery Address (Within 4km)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                      Hyperlocal Store Sync
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Flat / House No. / Building Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 304, Tower 3, Prestige Tranquility"
                      value={regFlat}
                      onChange={(e) => setRegFlat(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Neighborhood
                      </label>
                      <input
                        type="text"
                        value={regArea}
                        onChange={(e) => setRegArea(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        value={regPincode}
                        onChange={(e) => setRegPincode(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegLoading}
                  className="w-full min-h-[44px] py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                >
                  {isRegLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account & Loading ₹{WELCOME_FRESH_WALLET_CREDIT_INR} Wallet...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Claim ₹{WELCOME_FRESH_WALLET_CREDIT_INR}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-stone-600">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setSignInError(null);
                  }}
                  className="font-semibold text-purple-950 hover:underline cursor-pointer"
                >
                  Sign In with Password
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INSTANT MOBILE OTP ================= */}
          {activeTab === 'otp' && (
            <div className="py-5 space-y-4">
              {otpStep === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className="text-xs text-stone-600">
                    Fast phone verification with instant SMS code — enter your checkout mobile number to view your placed guest orders &amp; live status.
                  </p>

                  {otpError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="flex items-center rounded-xl border border-stone-300 focus-within:border-purple-900 focus-within:ring-2 focus-within:ring-purple-100">
                    <div className="relative border-r border-stone-200 shrink-0">
                      <select
                        aria-label="Select Country"
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                          if (found) setSelectedCountry(found);
                        }}
                        className="appearance-none min-h-[44px] pl-3 pr-7 py-3 bg-transparent text-xs font-semibold text-stone-800 cursor-pointer focus:outline-hidden"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.dial}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <div className="flex-1 relative flex items-center">
                      <Phone className="w-4 h-4 text-stone-400 ml-3 shrink-0" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder={selectedCountry.placeholder}
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full min-h-[44px] px-3 py-3 text-sm font-medium text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-hidden"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpLoading}
                    className="w-full min-h-[44px] py-3.5 px-4 bg-purple-900 hover:bg-purple-950 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isOtpLoading ? (
                      <span>Sending Code...</span>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-500 block">Code sent to:</span>
                      <span className="font-bold text-purple-950">
                        {selectedCountry.dial} {otpPhone}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpStep('phone')}
                      className="text-purple-900 font-semibold underline cursor-pointer py-1 px-2"
                    >
                      Change
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className="w-full min-h-[44px] aspect-square text-center text-base sm:text-lg font-bold rounded-xl border border-stone-300 focus:border-purple-900 focus:ring-2 focus:ring-purple-200"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={isOtpLoading}
                    onClick={() => {
                      setOtpValues(['1', '2', '3', '4', '5', '6']);
                      void verifyOtp('123456');
                    }}
                    className="w-full min-h-[44px] py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 cursor-pointer disabled:opacity-60"
                  >
                    {isOtpLoading ? 'Loading Your Orders & Profile...' : 'Auto-Fill Test OTP (123456)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER: Bridge to Admin Operations Portal */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-stone-500">
            Current Hub: <strong className="text-purple-950">{activeStore.name}</strong>
          </span>

          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="text-purple-900 hover:text-purple-950 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Operations Staff or Store Manager? Portal Login →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
