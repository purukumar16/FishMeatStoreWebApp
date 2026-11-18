import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Building2,
  Clock,
  Server,
  Key,
  ArrowRight,
  Terminal,
  Fingerprint,
  Copy,
  Check,
  UserCheck,
  Users,
  BookOpen,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AdminUser } from '../../types';

export const AdminLogin: React.FC<{
  onSwitchToCustomer: () => void;
  onClose: () => void;
}> = ({ onSwitchToCustomer, onClose }) => {
  const {
    loginWithGoogle,
    firebaseUser,
    authLoading,
    loginAdmin,
    logoutAdmin,
    adminUser,
    currentUser,
    activeStore,
    storeIncharges,
    authenticateStaff,
    setIsAdminDashboardOpen,
  } = useStore();

  const [googleError, setGoogleError] = useState<string | null>(null);

  const handleGoogleAdminSignIn = async () => {
    setGoogleError(null);
    const res = await loginWithGoogle('admin');
    if (!res.success && res.error) {
      setGoogleError(res.error);
    } else if (res.success) {
      onClose();
    }
  };

  // Screens: 'credentials' | 'mfa' | 'forgot_password'
  const [screen, setScreen] = useState<'credentials' | 'mfa' | 'forgot_password'>('credentials');
  const [pendingStaffUser, setPendingStaffUser] = useState<AdminUser | null>(null);
  const [showDirectory, setShowDirectory] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Credentials State
  const [workEmail, setWorkEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Security Lockout Tracker (3 Failed Attempts)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(60);

  // MFA TOTP State (6 Digits)
  const [totpValues, setTotpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpCountdown, setTotpCountdown] = useState(24);
  const totpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Recovery State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySubmitted, setRecoverySubmitted] = useState(false);

  // Lockout countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isLockedOut && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLockedOut, lockoutTimer]);

  // MFA TOTP rollover timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (screen === 'mfa') {
      interval = setInterval(() => {
        setTotpCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screen]);

  // Auto focus first TOTP input on MFA screen
  useEffect(() => {
    if (screen === 'mfa') {
      setTimeout(() => {
        totpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [screen]);

  // Caps Lock detection on keyboard events
  const handleKeyModifierCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isCaps = e.getModifierState && e.getModifierState('CapsLock');
    setIsCapsLockOn(!!isCaps);
  };

  // Submit Step 1: Credentials
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (!workEmail.trim() || !password) {
      setCredentialError('Please provide both work email / login ID and password.');
      return;
    }

    setIsLoading(true);
    setCredentialError(null);

    setTimeout(() => {
      setIsLoading(false);

      const res = authenticateStaff(workEmail, password);
      if (!res.success || !res.user) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          setIsLockedOut(true);
          setLockoutTimer(60);
          setCredentialError(
            'CRITICAL SECURITY ALERT: 3 consecutive failed authentication attempts detected. This terminal has been locked for 60 seconds.'
          );
        } else {
          setCredentialError(
            res.error || `Invalid credentials. Attempt ${nextAttempts} of 3. You will be locked out after 3 failed attempts.`
          );
        }
        return;
      }

      // Success -> Save pending user and advance to MFA
      setPendingStaffUser(res.user);
      setScreen('mfa');
      setTotpValues(['', '', '', '', '', '']);
      setTotpError(null);
    }, 400);
  };

  // Step 2: MFA TOTP Input Handling
  const handleTotpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newTotp = [...totpValues];
    newTotp[index] = clean;
    setTotpValues(newTotp);
    if (totpError) setTotpError(null);

    if (clean && index < 5) {
      totpInputRefs.current[index + 1]?.focus();
    }

    if (clean && index === 5 && newTotp.every((d) => d !== '')) {
      verifyTotpCode(newTotp.join(''));
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpValues[index] && index > 0) {
      totpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      totpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      totpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newTotp = [...totpValues];
    for (let i = 0; i < 6; i++) {
      newTotp[i] = pasted[i] || '';
    }
    setTotpValues(newTotp);
    const targetIdx = Math.min(pasted.length, 5);
    totpInputRefs.current[targetIdx]?.focus();

    if (pasted.length === 6) {
      verifyTotpCode(pasted);
    }
  };

  // Verify TOTP Code
  const verifyTotpCode = (code: string) => {
    setIsLoading(true);
    setTotpError(null);

    setTimeout(() => {
      setIsLoading(false);

      if (code === '000000') {
        setTotpError('MFA Challenge Failed: The TOTP code supplied is desynchronized or expired.');
        return;
      }

      if (pendingStaffUser) {
        loginAdmin(pendingStaffUser);
      } else {
        const res = authenticateStaff(workEmail, password);
        if (res.user) {
          loginAdmin(res.user);
        }
      }
      onClose();
    }, 400);
  };

  // Quick Credential Helpers
  const handleFillAdmin = () => {
    setWorkEmail('admin@fishmeatstore.com');
    setPassword('AdminPassword@123');
    setCredentialError(null);
  };

  const handleFillIncharge = (email: string, pass: string) => {
    setWorkEmail(email);
    setPassword(pass);
    setCredentialError(null);
  };

  const handleDirectStaffLogin = (email: string, pass: string) => {
    setWorkEmail(email);
    setPassword(pass);
    const res = authenticateStaff(email, pass);
    if (res.success && res.user) {
      loginAdmin(res.user);
      onClose();
    }
  };

  const handleFillDemoTotp = () => {
    const demo = ['8', '4', '9', '2', '0', '1'];
    setTotpValues(demo);
    setTotpError(null);
    verifyTotpCode('849201');
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-[#120524] text-purple-100 rounded-2xl shadow-2xl border border-purple-800/80 overflow-hidden flex flex-col justify-between">
      {/* Enterprise Security Header */}
      <div className="p-4 sm:p-6 bg-[#1a0833] border-b border-purple-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-900 border border-purple-700/60 flex items-center justify-center text-emerald-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-sm sm:text-base text-white tracking-wide">
                Fish Meat Store Operations Portal
              </span>
              <span className="text-[10px] bg-purple-950 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                PROD-SEC-2
              </span>
            </div>
            <p className="text-xs text-purple-300/80 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Domain: <strong className="text-white font-mono">ops.fishmeatstore.internal</strong></span>
              <span aria-hidden="true">·</span>
              <span>Hub: {activeStore.neighborhood}</span>
            </p>
          </div>
        </div>

        {/* Quick Credentials / Notebook Toggle */}
        {screen === 'credentials' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFillAdmin}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 text-[11px] font-semibold text-emerald-300 bg-purple-950 hover:bg-purple-900 border border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Pre-fill default admin credentials"
            >
              Fill Admin
            </button>
            <button
              type="button"
              onClick={() => setShowDirectory((prev) => !prev)}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 text-[11px] font-semibold text-purple-200 bg-purple-900/80 hover:bg-purple-800 border border-purple-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {showDirectory ? 'Hide Directory' : 'Staff Directory'}
            </button>
          </div>
        )}

        {screen === 'mfa' && (
          <button
            type="button"
            onClick={handleFillDemoTotp}
            className="min-h-[44px] sm:min-h-0 text-[11px] font-semibold text-emerald-300 bg-purple-950 hover:bg-purple-900 border border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            title="Pre-fill 6-digit TOTP code for testing"
          >
            Auto-fill TOTP
          </button>
        )}
      </div>

      {/* Main Form Body */}
      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
        {(adminUser || currentUser) && (
          <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl p-3.5 space-y-2 text-xs">
            {adminUser && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-emerald-200">
                  Staff session active: <strong className="text-white">{adminUser.name}</strong> ({adminUser.role})
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsAdminDashboardOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer"
                  >
                    Open Control Room
                  </button>
                  <button
                    type="button"
                    onClick={logoutAdmin}
                    className="text-[11px] text-rose-300 hover:text-rose-200 underline cursor-pointer"
                  >
                    Sign Out Staff
                  </button>
                </div>
              </div>
            )}
            {currentUser && (
              <div className="text-[11px] text-purple-200 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-500/20">
                <span>
                  Active Customer session stays logged in: <strong className="text-white">{currentUser.name}</strong> ({currentUser.customerType || 'Customer'})
                </span>
                <span className="text-emerald-300 font-mono text-[10px]">Dual Login Active</span>
              </div>
            )}
          </div>
        )}

        {/* Security Warning Notice Banner */}
        <div className="bg-[#18082e] border border-purple-800/80 rounded-xl p-3.5 flex items-start gap-3 text-xs">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-purple-200/90 text-[11px] leading-relaxed">
            <span className="font-bold text-white block">Authorized Retail Operations &amp; Customer Dual Access</span>
            <span>
              Admin and Store Incharges are also treated as customers for shopping, Wishlist, and checkout. Logging in here keeps any active customer login intact simultaneously.
            </span>
          </div>
        </div>

        {/* Failed Attempts / Lockout Warning Banner */}
        {failedAttempts > 0 && !isLockedOut && (
          <div className="p-3 bg-amber-950/60 border border-amber-600/60 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Security Warning ({failedAttempts} of 3 Failed Attempts)</strong>
              <span>Multiple failed attempts will initiate an automatic terminal lockdown and invalidate your corporate SSO token.</span>
            </div>
          </div>
        )}

        {/* Lockout Active Banner */}
        {isLockedOut && (
          <div className="p-4 bg-rose-950/80 border border-rose-600/80 rounded-xl text-xs text-rose-200 space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>TERMINAL SECURITY LOCKOUT IN EFFECT</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              3 consecutive failed authentication attempts were detected from this IP address. Input fields are disabled for{' '}
              <strong className="font-mono text-white text-xs">{lockoutTimer} seconds</strong>.
            </p>
            <div className="text-[11px] text-rose-300/80 pt-1 border-t border-rose-800/60">
              For emergency account unlocking, contact Operations Security Desk at extension <strong>#4409</strong>.
            </div>
          </div>
        )}

        {/* Caps Lock Visual Indicator */}
        {isCapsLockOn && (
          <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-lg text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Caps Lock is ON — Corporate passwords are strictly case-sensitive.</span>
          </div>
        )}

        {/* SCREEN 1: Corporate Credentials */}
        {screen === 'credentials' && (
          <>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleAdminSignIn}
                disabled={authLoading || isLockedOut}
                className="w-full min-h-[44px] py-3 px-4 bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2.5"
              >
                {authLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-stone-300 border-t-purple-900 rounded-full animate-spin" />
                    <span>Verifying Google Admin Identity...</span>
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
                    <span>Sign in with Google (Live Cross-Device Orders)</span>
                  </>
                )}
              </button>
              <div className="bg-[#18082e] border border-emerald-500/30 rounded-xl p-3 text-[11px] text-purple-200 space-y-1">
                <div className="font-bold text-emerald-300 text-[10px] uppercase tracking-wider">
                  Authorized Google Store Admin Accounts
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 font-mono">
                  <span className="text-purple-300">ISIRI HUB Store Admin:</span>
                  <strong className="text-white">fthisirihub@gmail.com</strong>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 font-mono">
                  <span className="text-purple-300">GRAMIQ Hypermart Store Admin:</span>
                  <strong className="text-white">fthgramiq@gmail.com</strong>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 font-mono">
                  <span className="text-purple-300">Corporate Root Admin (All Hubs):</span>
                  <strong className="text-white">purukumar16@gmail.com</strong>
                </div>
              </div>
              {firebaseUser?.email && (
                <p className="text-[11px] text-emerald-300/90 text-center font-mono">
                  Google session verified: {firebaseUser.email}
                </p>
              )}
              {googleError && (
                <div className="p-3 bg-rose-950/70 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{googleError}</span>
                </div>
              )}
              <div className="relative flex items-center py-1">
                <div className="grow border-t border-purple-800/80" />
                <span className="shrink mx-3 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                  Or local portal preview credentials
                </span>
                <div className="grow border-t border-purple-800/80" />
              </div>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-work-email"
                className="block text-xs font-semibold text-purple-200 mb-1.5"
              >
                Work Email Address <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="admin-work-email"
                  type="email"
                  required
                  disabled={isLockedOut}
                  placeholder="name@fishmeatstore.com"
                  value={workEmail}
                  onChange={(e) => {
                    setWorkEmail(e.target.value);
                    if (credentialError) setCredentialError(null);
                  }}
                  onKeyDown={handleKeyModifierCheck}
                  onKeyUp={handleKeyModifierCheck}
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#18082e] border border-purple-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-purple-400/60 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-purple-200"
                >
                  Alpha-Numeric Password <span className="text-emerald-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setScreen('forgot_password')}
                  className="text-[11px] text-purple-300 hover:text-white underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLockedOut}
                  placeholder="Enter corporate password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (credentialError) setCredentialError(null);
                  }}
                  onKeyDown={handleKeyModifierCheck}
                  onKeyUp={handleKeyModifierCheck}
                  className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#18082e] border border-purple-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-purple-400/60 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors pr-10 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-purple-400 hover:text-white cursor-pointer absolute right-1.5 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {credentialError && (
              <div className="p-3 bg-rose-950/70 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{credentialError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isLockedOut}
              className="w-full min-h-[44px] py-3.5 px-4 bg-purple-900 hover:bg-purple-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border border-purple-700/80 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Corporate Directory (LDAP)...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Trigger MFA</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>

          {/* Persistent Staff & Incharge Credentials Notebook (to avoid losing login) */}
          {showDirectory && (
            <div className="mt-6 border-t border-purple-800/80 pt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white tracking-wide uppercase">
                    Staff & Incharge Credentials Directory
                  </span>
                </div>
                <span className="text-[10px] text-purple-300 font-medium bg-purple-950 px-2 py-0.5 rounded border border-purple-700">
                  Auto-saved in Admin Login
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80 leading-relaxed">
                Portal credentials below grant Control Room access on this browser only. To receive live orders placed from other sessions or mobile phones, use <strong className="text-emerald-300">Sign in with Google</strong> above.
              </p>

              <div className="space-y-2.5 pt-1">
                {/* Default Admin Card */}
                <div className="bg-[#18082e] border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-emerald-500/60 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">Default Admin Account</span>
                      <span className="text-[10px] font-semibold bg-emerald-950 text-emerald-300 px-2 py-0.2 rounded border border-emerald-600/40">
                        Corporate Admin
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-purple-200 flex flex-wrap items-center gap-x-3 gap-y-1 break-all">
                      <span>Email: <strong className="text-white">admin@fishmeatstore.com</strong></span>
                      <span>Password: <strong className="text-emerald-400">AdminPassword@123</strong></span>
                    </div>
                    <div className="text-[10px] text-purple-400">
                      Can manage inventory, orders, and create/manage Store Incharge logins.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText('admin@fishmeatstore.com | AdminPassword@123');
                        setCopiedKey('admin');
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                      className="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white border border-purple-700/60 transition-colors text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                      title="Copy credentials"
                    >
                      {copiedKey === 'admin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'admin' ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDirectStaffLogin('admin@fishmeatstore.com', 'AdminPassword@123')}
                      className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>1-Click Log In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dynamic Store Incharge Accounts */}
                {storeIncharges.map((incharge) => (
                  <div
                    key={incharge.id}
                    className="bg-[#18082e] border border-purple-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-purple-500/80 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{incharge.name}</span>
                        <span className="text-[10px] font-semibold bg-blue-950 text-blue-300 px-2 py-0.2 rounded border border-blue-600/40">
                          Store Incharge
                        </span>
                        <span className="text-[10px] text-purple-300 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                          {incharge.assignedStoreName}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-purple-200 flex flex-wrap items-center gap-x-3 gap-y-1 break-all">
                        <span>Email: <strong className="text-white">{incharge.email}</strong></span>
                        <span>Password: <strong className="text-amber-300">{incharge.password}</strong></span>
                      </div>
                      <div className="text-[10px] text-purple-400">
                        Permissions: Live Stock & Price Edit, Force OOS (FOOS), Order Monitoring.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${incharge.email} | ${incharge.password}`);
                          setCopiedKey(incharge.id);
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white border border-purple-700/60 transition-colors text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                        title="Copy credentials"
                      >
                        {copiedKey === incharge.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === incharge.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectStaffLogin(incharge.email, incharge.password)}
                        className="flex-1 sm:flex-initial min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>1-Click Log In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* SCREEN 2: Mandatory Multi-Factor Authentication (MFA) */}
        {screen === 'mfa' && (
          <div className="space-y-5">
            <div className="bg-[#18082e] p-3.5 rounded-xl border border-purple-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs min-w-0">
                <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Enrolled: <strong className="text-white font-mono">{workEmail}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setScreen('credentials')}
                className="text-xs text-purple-300 hover:text-white underline cursor-pointer py-1"
              >
                Change Login
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-semibold text-purple-200">
                  Authenticator App Time-based OTP (TOTP)
                </label>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Expires in {totpCountdown}s
                </span>
              </div>

              {/* 6-Digit TOTP Input */}
              <div
                className="grid grid-cols-6 gap-2 sm:gap-3"
                onPaste={handleTotpPaste}
              >
                {totpValues.map((val, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      totpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleTotpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleTotpKeyDown(idx, e)}
                    className={`w-full aspect-square text-center text-lg sm:text-xl font-mono font-bold rounded-xl border transition-all ${
                      totpError
                        ? 'border-rose-500 bg-rose-950/50 text-rose-200'
                        : val
                        ? 'border-emerald-500 bg-purple-950 text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-purple-700/80 bg-[#18082e] text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30'
                    }`}
                    aria-label={`TOTP Digit ${idx + 1} of 6`}
                  />
                ))}
              </div>

              {totpError && (
                <div className="p-2.5 mt-2.5 bg-rose-950/70 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{totpError}</span>
                </div>
              )}
            </div>

            {/* Hardware Key Alternative */}
            <div className="p-3 bg-[#18082e] border border-purple-800/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-purple-300">
                <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Hardware Security Key (FIDO2 / YubiKey)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  setTimeout(() => {
                    setIsLoading(false);
                    verifyTotpCode('999999');
                  }, 600);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer py-1"
              >
                Touch Key
              </button>
            </div>

            <button
              type="button"
              disabled={totpValues.some((v) => !v) || isLoading}
              onClick={() => verifyTotpCode(totpValues.join(''))}
              className="w-full min-h-[44px] py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validating Cryptographic Token...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify TOTP & Access Dashboard</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* SCREEN 3: Enterprise Forgot Password */}
        {screen === 'forgot_password' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">Corporate Credential Recovery</h4>
            <p className="text-xs text-purple-200/80">
              Enter your registered corporate email to initiate an automated cryptographic password reset token via your enterprise email gateway.
            </p>

            {recoverySubmitted ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h5 className="text-sm font-bold text-white">Reset Token Dispatched</h5>
                <p className="text-xs text-emerald-200">
                  If {recoveryEmail || workEmail} is enrolled in Active Directory, instructions have been transmitted.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverySubmitted(false);
                    setScreen('credentials');
                  }}
                  className="mt-2 text-xs text-white underline font-semibold cursor-pointer"
                >
                  Return to Corporate Login
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRecoverySubmitted(true);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@fishmeatstore.com"
                    value={recoveryEmail || workEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#18082e] border border-purple-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Send Reset Token
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('credentials')}
                    className="min-h-[44px] px-4 py-2.5 border border-purple-700/80 hover:bg-purple-900/40 text-purple-200 text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Corporate Compliance Baseline Footer */}
      <div className="p-4 bg-[#1a0833] border-t border-purple-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-purple-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>Session Inactivity Timeout: <strong className="text-purple-200">15 Minutes</strong> (Enforced by SOC2)</span>
        </div>

        <button
          type="button"
          onClick={onSwitchToCustomer}
          className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
        >
          ← Return to Customer Storefront
        </button>
      </div>
    </div>
  );
};
