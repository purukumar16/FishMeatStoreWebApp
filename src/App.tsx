/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryBar } from './components/CategoryBar';
import { ProductGrid } from './components/ProductGrid';
import { QualityStorySection } from './components/QualityStorySection';
import { Footer } from './components/Footer';
import { LocationModal } from './components/LocationModal';
import { OutOfAreaModal } from './components/OutOfAreaModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { AuthModal } from './components/auth/AuthModal';
import { CustomerLogin } from './components/auth/CustomerLogin';
import { AdminLogin } from './components/auth/AdminLogin';
import { CustomerProfileModal } from './components/auth/CustomerProfileModal';
import { ControlRoomDashboard } from './components/admin/ControlRoomDashboard';
import { NewOrderAlertManager } from './components/admin/NewOrderAlertManager';
import { FloatingOrderBar } from './components/FloatingOrderBar';
import {
  ROLE_PERMISSIONS,
  canAccessAdminRoute,
  getPathForAdminSection,
} from './config/rbac';
import { Heart, X, ShieldAlert, Info, ArrowLeft } from 'lucide-react';

const WishlistToast: React.FC = () => {
  const { wishlistNotice, dismissWishlistNotice, setIsWishlistDrawerOpen, currentUser } = useStore();
  if (!wishlistNotice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-40 bg-white border border-stone-200 rounded-xl shadow-lg px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-stone-900"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Heart
          className={`w-4 h-4 shrink-0 ${
            wishlistNotice.type === 'removed'
              ? 'text-stone-400'
              : 'text-rose-600 fill-rose-600'
          }`}
        />
        <span className="font-medium truncate">{wishlistNotice.message}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {currentUser && wishlistNotice.type === 'added' && (
          <button
            type="button"
            onClick={() => {
              dismissWishlistNotice();
              setIsWishlistDrawerOpen(true);
            }}
            className="text-purple-900 hover:text-purple-950 font-semibold underline cursor-pointer whitespace-nowrap"
          >
            View
          </button>
        )}
        <button
          type="button"
          onClick={dismissWishlistNotice}
          className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const AuthNoticeBanner: React.FC = () => {
  const { authNotice, dismissAuthNotice } = useStore();
  if (!authNotice) return null;

  const isError = authNotice.type === 'error';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-lg z-70 animate-fade-in"
    >
      <div
        className={`rounded-xl shadow-xl border px-4 py-3 flex items-start justify-between gap-3 text-xs ${
          isError
            ? 'bg-rose-950 text-rose-100 border-rose-600'
            : 'bg-purple-950 text-purple-100 border-purple-700'
        }`}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          {isError ? (
            <ShieldAlert className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{authNotice.message}</span>
        </div>
        <button
          type="button"
          onClick={dismissAuthNotice}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const RedirectWithNotice: React.FC<{
  to: string;
  message: string;
  type?: 'error' | 'info';
}> = ({ to, message, type = 'error' }) => {
  const { showAuthNotice } = useStore();

  useEffect(() => {
    showAuthNotice(message, type);
  }, [message, type, showAuthNotice]);

  return <Navigate to={to} replace />;
};

const CustomerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthReady, currentUser } = useStore();

  const searchParams = new URLSearchParams(location.search);
  const allowSwitch = searchParams.get('switch') === '1';

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-stone-700">
          <span className="w-5 h-5 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading Storefront Session...</span>
        </div>
      </div>
    );
  }

  if (currentUser && !allowSwitch) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col items-center justify-center p-3 sm:p-6">
      <AuthNoticeBanner />
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-purple-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Storefront (/dashboard)</span>
          </button>
          <span className="text-[11px] font-mono text-stone-500">Customer Portal · /login</span>
        </div>

        <CustomerLogin
          onSwitchToAdmin={() => navigate('/admin/login')}
          onClose={() => navigate('/dashboard')}
          onSuccess={() => navigate('/dashboard', { replace: true })}
        />
      </div>
    </div>
  );
};

const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAdminDashboardOpen,
    setIsAdminDashboardOpen,
    requestedControlRoomNav,
    clearRequestedControlRoomNav,
    adminUser,
    userRole,
  } = useStore();

  // If any modal/alert sets isAdminDashboardOpen while on /dashboard, cleanly route to /admin/*
  useEffect(() => {
    if (!isAdminDashboardOpen) return;
    setIsAdminDashboardOpen(false);
    if (adminUser && ROLE_PERMISSIONS[userRole].canAccessAdminPortal) {
      const targetPath = requestedControlRoomNav
        ? getPathForAdminSection(requestedControlRoomNav)
        : '/admin/dashboard';
      clearRequestedControlRoomNav();
      navigate(targetPath);
    } else {
      clearRequestedControlRoomNav();
      navigate('/admin/login');
    }
  }, [
    isAdminDashboardOpen,
    setIsAdminDashboardOpen,
    requestedControlRoomNav,
    clearRequestedControlRoomNav,
    adminUser,
    userRole,
    navigate,
  ]);

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-white bg-white-texture text-stone-900 flex flex-col font-sans selection:bg-purple-200 selection:text-purple-950">
      <AuthNoticeBanner />
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <div id="catalog-section" className="scroll-mt-36">
          <CategoryBar />
          <ProductGrid />
        </div>
        <QualityStorySection />
      </main>
      <Footer />

      {/* Dynamic Modals & Drawers */}
      <LocationModal />
      <OutOfAreaModal />
      <ProductDetailModal />
      <CartDrawer />
      <WishlistDrawer />
      <CheckoutModal />
      <OrderTrackingModal />
      <ArchitectureDocsModal />
      <AuthModal />
      <CustomerProfileModal />
      <NewOrderAlertManager />
      <WishlistToast />

      {/* Floating Quick Call/WhatsApp Order Action */}
      <FloatingOrderBar />
    </div>
  );
};

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthReady, adminUser, userRole, showAuthNotice } = useStore();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0d041a] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-purple-200">
          <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Verifying Operations Clearance...</span>
        </div>
      </div>
    );
  }

  if (adminUser && ROLE_PERMISSIONS[userRole].canAccessAdminPortal) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0d041a] text-purple-100 flex flex-col items-center justify-center p-3 sm:p-6">
      <AuthNoticeBanner />
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Customer Storefront (/dashboard)</span>
          </button>
          <span className="text-[11px] font-mono text-emerald-400">
            Operations Gateway · /admin/login
          </span>
        </div>

        <AdminLogin
          onSwitchToCustomer={() => navigate('/login')}
          onClose={() => {}}
          onSuccess={() => navigate('/admin/dashboard', { replace: true })}
          onUnauthorizedCustomer={(msg) => {
            showAuthNotice(msg, 'error');
            navigate('/dashboard', { replace: true });
          }}
        />
      </div>
    </div>
  );
};

const AdminProtectedRoute: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthReady, adminUser, currentUser, firebaseUser, userRole } = useStore();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm font-medium text-stone-700">
          <span className="w-5 h-5 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
          <span>Verifying Role Access...</span>
        </div>
      </div>
    );
  }

  const hasStaffSession = Boolean(
    adminUser && ROLE_PERMISSIONS[userRole].canAccessAdminPortal
  );

  if (!hasStaffSession) {
    if (currentUser || firebaseUser) {
      return (
        <RedirectWithNotice
          to="/dashboard"
          message="Unauthorized: Admin or Store Incharge role required to access /admin routes."
          type="error"
        />
      );
    }

    return (
      <RedirectWithNotice
        to="/admin/login"
        message="Please sign in with Admin or Store Incharge credentials to access the Operations Portal."
        type="info"
      />
    );
  }

  const routeAccess = canAccessAdminRoute(userRole, location.pathname);
  if (!routeAccess.allowed || !routeAccess.section) {
    return (
      <RedirectWithNotice
        to="/admin/dashboard"
        message={`Unauthorized: ${ROLE_PERMISSIONS[userRole].label} accounts cannot access ${location.pathname}. Redirected to Control Room Dashboard.`}
        type="error"
      />
    );
  }

  return (
    <>
      <ControlRoomDashboard
        fullPage
        activeSection={routeAccess.section}
        onClose={() => navigate('/dashboard')}
      />
      <NewOrderAlertManager />
    </>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<CustomerLoginPage />} />
        <Route path="/dashboard" element={<CustomerDashboardPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={<AdminProtectedRoute />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </StoreProvider>
  );
}
