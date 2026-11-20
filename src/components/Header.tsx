import React, { useRef, useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  ShoppingBag,
  User,
  ShieldCheck,
  Fish,
  Drumstick,
  Beef,
  Egg,
  Menu,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ROLE_PERMISSIONS } from '../config/rbac';
import { MainCategory } from '../types';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const {
    userLocation,
    activeStore,
    cartCount,
    setIsCartOpen,
    setIsLocationModalOpen,
    selectedCategory,
    setSelectedCategory,
    setSelectedSubcategory,
    currentUser,
    adminUser,
    userRole,
    logoutAdmin,
    setIsAuthModalOpen,
    setAuthInitialTab,
    setIsCustomerProfileOpen,
    searchQuery,
    setSearchQuery,
    products,
  } = useStore();

  const canAccessControlRoom = Boolean(
    adminUser && ROLE_PERMISSIONS[userRole].canAccessAdminPortal
  );

  const headerRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty(
          '--header-height',
          `${headerRef.current.offsetHeight}px`
        );
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    let observer: ResizeObserver | null = null;
    if (headerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      if (observer) observer.disconnect();
    };
  }, [isMobileMenuOpen]);

  const handleNavCategory = (cat: MainCategory | 'ALL') => {
    setSelectedCategory(cat);
    setSelectedSubcategory('ALL');
    setIsMobileMenuOpen(false);
    const catalogEl = document.getElementById('fresh-catalog-grid');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openCustomerLogin = () => {
    setIsMobileMenuOpen(false);
    setIsAuthModalOpen(false);
    setAuthInitialTab('customer');
    navigate('/login');
  };

  const handleControlRoomClick = () => {
    setIsMobileMenuOpen(false);
    if (canAccessControlRoom) {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  const mainCategories: { id: MainCategory; label: string; icon: React.ReactNode }[] = [
    {
      id: 'FISHES & SEAFOOD',
      label: 'Fishes & Seafood',
      icon: <Fish className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'CHICKEN',
      label: 'Chicken',
      icon: <Drumstick className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'MUTTON',
      label: 'Mutton',
      icon: <Beef className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'EGGS',
      label: 'Eggs',
      icon: <Egg className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <header ref={headerRef} className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
      {/* Cold-chain trust banner */}
      <div className="bg-[#21093b] text-purple-200 text-xs px-3 sm:px-4 py-1.5 flex items-center justify-between border-b border-purple-900/50">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">0°C - 4°C Freshness Guarantee</span>
            </span>
            <span aria-hidden="true" className="text-purple-700 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-purple-200 truncate">Direct from {activeStore.name} ({activeStore.chillerTempC}°C chilled)</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-purple-300 font-medium hidden md:inline">Strict 4km Hyperlocal Radius</span>
            {canAccessControlRoom && adminUser && (
              <>
                <span aria-hidden="true" className="text-purple-700 hidden md:inline">·</span>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                  <button
                    type="button"
                    onClick={handleControlRoomClick}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    title={`Open Control Room as ${adminUser.role}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[140px] sm:max-w-none">
                      {userRole === 'admin' ? 'Admin' : 'Incharge'}: {adminUser.name.split(' ')[0]}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={logoutAdmin}
                    className="text-purple-300 hover:text-white underline text-[11px] ml-0.5 cursor-pointer"
                    title="Sign out of staff session (keeps customer login active)"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main 3-Zone Navigation Header */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-5 xl:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
        {/* Zone 1: Brand wordmark + Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-purple-950 transition-colors cursor-pointer shrink-0"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => handleNavCategory('ALL')}
            className="text-left cursor-pointer group flex flex-col shrink-0"
          >
            <span className="font-display text-[15px] sm:text-lg xl:text-xl 2xl:text-2xl font-bold tracking-tight text-purple-950 group-hover:text-purple-800 transition-colors whitespace-nowrap leading-tight">
              Fish Meat Store
            </span>
            <span className="text-[9.5px] sm:text-[10.5px] xl:text-[11px] font-semibold text-emerald-700 tracking-wide block whitespace-nowrap mt-0.5">
              A Franchise of FreshToHome
            </span>
          </button>
        </div>

        {/* Zone 2: Highlighted Main Menu Category Switcher (Desktop 1024px+) */}
        <nav
          aria-label="Primary Categories"
          className="hidden lg:flex flex-1 justify-center items-center min-w-0 px-1"
        >
          <div className="flex items-center gap-1 p-1 bg-stone-100/90 border border-stone-200 rounded-xl shadow-2xs max-w-full overflow-x-auto">
            {mainCategories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleNavCategory(isActive ? 'ALL' : cat.id)}
                  aria-pressed={isActive}
                  className={`relative flex items-center gap-1.5 px-2 xl:px-2.5 2xl:px-3 py-1.5 rounded-lg text-[11px] xl:text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-purple-950 text-white shadow-sm ring-2 ring-emerald-400/80'
                      : 'text-stone-700 hover:text-purple-950 hover:bg-white/90'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-400' : 'text-purple-800'}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Zone 3: Primary Actions (Control Room + Location + Customer Auth + Cart drawer) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Control Room Button (Visible ONLY for Admin & Store Incharge login) */}
          {canAccessControlRoom && adminUser && (
            <button
              type="button"
              onClick={handleControlRoomClick}
              className="hidden lg:inline-flex items-center justify-center gap-1.5 h-[38px] px-2.5 xl:px-3 rounded-lg bg-[#18082e] hover:bg-purple-950 text-emerald-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer text-[11px] xl:text-xs font-semibold shadow-xs border border-purple-700/80"
              title={`Open Control Room (${adminUser.role})`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Control Room</span>
              <span className="hidden xl:inline-block text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-600/50 font-mono">
                {userRole === 'admin' ? 'Admin' : 'Incharge'}
              </span>
            </button>
          )}

          {/* Location icon-only button */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] lg:min-w-[38px] lg:w-[38px] lg:min-h-[38px] lg:h-[38px] p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-900 transition-colors cursor-pointer shadow-2xs shrink-0"
            title={`Delivery location: ${userLocation.neighborhood || 'Select Area'} — click to change`}
            aria-label={`Change delivery location (${userLocation.neighborhood || 'Select Area'})`}
          >
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
          </button>

          {/* User Account or Sign In Button */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => setIsCustomerProfileOpen(true)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-[44px] min-h-[44px] lg:min-h-[38px] lg:h-[38px] px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-900 text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
              title={
                currentUser.customerType && currentUser.customerType !== 'Customer'
                  ? `Signed in as ${currentUser.customerType} (Customer Mode) — view Wallet, Wishlist & Orders`
                  : 'Click to view Fresh Wallet, Wishlist & account details'
              }
            >
              <div className="w-5 h-5 rounded-full bg-purple-900 text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <span className="hidden sm:inline truncate max-w-[90px] xl:max-w-[130px]">
                {currentUser.name.split(' ')[0]}
                {currentUser.customerType && currentUser.customerType !== 'Customer' && (
                  <span className="hidden xl:inline ml-1 text-[10px] font-medium text-purple-700">
                    (
                    {currentUser.customerType === 'Admin'
                      ? 'Admin'
                      : currentUser.customerType === 'Store Admin'
                      ? 'Store Admin'
                      : 'Incharge'}
                    )
                  </span>
                )}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openCustomerLogin}
              className="flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] lg:min-h-[38px] lg:h-[38px] px-2 sm:px-2.5 xl:px-3 py-1.5 rounded-lg border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 text-stone-900 text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
              aria-label="Customer Sign In"
            >
              <User className="w-4 h-4 text-purple-900 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Sign In</span>
            </button>
          )}

          {/* Cart Drawer button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center justify-center gap-1.5 sm:gap-2 min-w-[44px] min-h-[44px] lg:min-h-[38px] lg:h-[38px] px-2.5 sm:px-3 xl:px-3.5 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm ring-1 ring-purple-800"
            aria-label={`Open Fresh Cart (${cartCount} items)`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">Fresh Cart</span>
            <span className="hidden lg:inline xl:hidden">Cart</span>
            {cartCount > 0 && (
              <span className="bg-emerald-500 text-stone-950 text-[11px] font-bold px-1.5 py-0.2 rounded font-mono">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Mobile & Tablet Navigation Drawer (< 1024px) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-3 sm:px-6 py-3 space-y-3 shadow-md max-h-[calc(100vh-140px)] overflow-y-auto">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              Browse Categories
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavCategory('ALL')}
                className={`flex items-center justify-between px-3.5 min-h-[44px] rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-purple-950 text-white border-purple-950 ring-2 ring-emerald-400/70'
                    : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>All Fresh Items ({products.length})</span>
                {selectedCategory === 'ALL' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
              {mainCategories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleNavCategory(isActive ? 'ALL' : cat.id)}
                    aria-pressed={isActive}
                    className={`flex items-center justify-between px-3.5 min-h-[44px] rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-purple-950 text-white border-purple-950 ring-2 ring-emerald-400/70'
                        : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={isActive ? 'text-emerald-400' : 'text-purple-800'}>
                        {cat.icon}
                      </span>
                      <span>{cat.label}</span>
                    </span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLocationModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3.5 min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Stores & Coverage ({activeStore.name})</span>
            </button>
            {canAccessControlRoom && adminUser && (
              <button
                type="button"
                onClick={handleControlRoomClick}
                className="flex-1 flex items-center justify-center gap-2 px-3.5 min-h-[44px] rounded-xl bg-[#18082e] hover:bg-purple-950 text-emerald-300 text-xs font-bold border border-purple-700/80 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Control Room (Store)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-600/50 font-mono">
                  {userRole === 'admin' ? 'Admin' : 'Incharge'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Search Bar Row - Clean White Texture Row */}
      <div className="border-t border-stone-200 bg-white bg-white-texture px-3 sm:px-6 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="relative flex-1 max-w-3xl mx-auto">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const nextVal = e.target.value;
                const wasEmpty = searchQuery.length === 0;
                setSearchQuery(nextVal);
                if (wasEmpty && nextVal.length > 0 && window.scrollY > 0) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              placeholder={`Search ${products.length} fresh cuts & eggs: Rohu, Seer Fish, Pomfret, Eggs, Chicken...`}
              className="w-full min-h-[44px] sm:min-h-[40px] pl-10 pr-20 sm:pr-24 py-2 bg-white hover:bg-white focus:bg-white border border-stone-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 rounded-full text-sm text-stone-900 placeholder:text-stone-400 shadow-2xs transition-all outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 px-3 min-h-[34px] rounded-full transition-colors cursor-pointer"
              >
                Clear
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full pointer-events-none tabular-nums">
                {products.length} Items Live
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
