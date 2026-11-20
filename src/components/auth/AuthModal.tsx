import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ShieldCheck, Lock } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CustomerLogin } from './CustomerLogin';
import { AdminLogin } from './AdminLogin';

export const AuthModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authInitialTab,
    setAuthInitialTab,
    currentUser,
    adminUser,
    showAuthNotice,
  } = useStore();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-4xl my-auto transition-all">
        {/* Top Floating Dual Switcher & Close Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
          {/* Dual Mechanism Tab Selector */}
          <div className="flex flex-1 sm:flex-initial items-center gap-1 p-1 bg-white/95 rounded-xl border border-stone-200 shadow-md backdrop-blur-md min-w-0">
            <button
              type="button"
              onClick={() => setAuthInitialTab('customer')}
              className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                authInitialTab === 'customer'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>Customer Login</span>
              {currentUser && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAuthInitialTab('admin')}
              className={`flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                authInitialTab === 'admin'
                  ? 'bg-[#18082e] text-emerald-400 ring-1 ring-emerald-500/50 shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Operations Portal</span>
              {adminUser && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="hidden sm:inline">
                    {adminUser.role === 'Admin' ? 'Admin' : 'Incharge'}
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 rounded-xl bg-white/90 hover:bg-white text-stone-600 hover:text-stone-950 shadow-md transition-colors border border-stone-200 cursor-pointer shrink-0"
            aria-label="Close authentication dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Authenticator Body */}
        <div className="shadow-2xl rounded-2xl overflow-hidden ring-1 ring-purple-950/20">
          <h2 id="auth-modal-title" className="sr-only">
            {authInitialTab === 'customer' ? 'Customer One-Time Password Login' : 'Admin Operations Security Login'}
          </h2>

          {authInitialTab === 'customer' ? (
            <CustomerLogin
              onSwitchToAdmin={() => {
                setIsAuthModalOpen(false);
                navigate('/admin/login');
              }}
              onClose={() => setIsAuthModalOpen(false)}
              onSuccess={() => setIsAuthModalOpen(false)}
            />
          ) : (
            <AdminLogin
              onSwitchToCustomer={() => setAuthInitialTab('customer')}
              onClose={() => setIsAuthModalOpen(false)}
              onSuccess={() => {
                setIsAuthModalOpen(false);
                navigate('/admin/dashboard');
              }}
              onUnauthorizedCustomer={(msg) => {
                setIsAuthModalOpen(false);
                showAuthNotice(msg, 'error');
                navigate('/dashboard');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
