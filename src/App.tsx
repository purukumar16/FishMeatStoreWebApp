/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
import { CustomerProfileModal } from './components/auth/CustomerProfileModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { NewOrderAlertManager } from './components/admin/NewOrderAlertManager';
import { FloatingOrderBar } from './components/FloatingOrderBar';
import { Heart, X } from 'lucide-react';

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

export default function App() {
  return (
    <StoreProvider>
      <div className="min-h-screen w-full overflow-x-clip bg-white bg-white-texture text-stone-900 flex flex-col font-sans selection:bg-purple-200 selection:text-purple-950">
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
        <AdminDashboardModal />
        <NewOrderAlertManager />
        <WishlistToast />

        {/* Floating Quick Call/WhatsApp Order Action */}
        <FloatingOrderBar />
      </div>
    </StoreProvider>
  );
}
