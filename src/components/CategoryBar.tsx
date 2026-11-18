import React, { useMemo } from 'react';
import { LayoutGrid, Fish, Drumstick, Beef, Egg, Sparkles, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { MainCategory } from '../types';

const CATEGORY_DEFINITIONS: Record<
  MainCategory,
  { label: string; icon: React.ReactNode; subcategories: string[] }
> = {
  'FISHES & SEAFOOD': {
    label: 'Fishes & Seafood',
    icon: <Fish className="w-4 h-4 shrink-0" />,
    subcategories: ['Freshwater', 'Seawater', 'Prawns', 'Crabs'],
  },
  'CHICKEN': {
    label: 'Chicken',
    icon: <Drumstick className="w-4 h-4 shrink-0" />,
    subcategories: [
      'Curry Cut',
      'Boneless & Mince',
      'Specialty Cuts',
      'Offals',
      'Premium Cuts',
    ],
  },
  'MUTTON': {
    label: 'Mutton',
    icon: <Beef className="w-4 h-4 shrink-0" />,
    subcategories: [
      'Curry Cut',
      'Goat Leg Curry Cut',
      'Goat Shoulder Curry Cut',
      'Goat Boneless',
      'Goat Liver',
      'Mutton Paya',
      'Specialty Cuts',
    ],
  },
  'EGGS': {
    label: 'Eggs',
    icon: <Egg className="w-4 h-4 shrink-0" />,
    subcategories: ['White Eggs', 'Duck Eggs', 'Quail Eggs', 'Country / Nati Eggs'],
  },
};

export const CategoryBar: React.FC = () => {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategory,
    setSelectedSubcategory,
    currentUser,
    wishlistProductIds,
    showFavoritesOnly,
    setShowFavoritesOnly,
    searchQuery,
  } = useStore();

  const isSearching = searchQuery.trim().length > 0;

  const counts = useMemo(() => {
    return {
      all: products.length,
      fish: products.filter((p) => p.category === 'FISHES & SEAFOOD').length,
      chicken: products.filter((p) => p.category === 'CHICKEN').length,
      mutton: products.filter((p) => p.category === 'MUTTON').length,
      eggs: products.filter((p) => p.category === 'EGGS').length,
    };
  }, [products]);

  const subcategoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      if (p.category === selectedCategory) {
        map[p.subcategory] = (map[p.subcategory] || 0) + 1;
      }
    }
    return map;
  }, [products, selectedCategory]);

  const handleMainCatChange = (cat: MainCategory | 'ALL') => {
    setShowFavoritesOnly(false);
    setSelectedCategory(cat);
    setSelectedSubcategory('ALL');
    const catalogEl = document.getElementById('fresh-catalog-grid');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleFavorites = () => {
    const nextVal = !showFavoritesOnly;
    setShowFavoritesOnly(nextVal);
    if (nextVal) {
      setSelectedCategory('ALL');
      setSelectedSubcategory('ALL');
    }
    const catalogEl = document.getElementById('fresh-catalog-grid');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentSubcategories =
    selectedCategory !== 'ALL'
      ? CATEGORY_DEFINITIONS[selectedCategory].subcategories
      : [];

  const navItems: {
    id: MainCategory | 'ALL';
    label: string;
    count: number;
    icon: React.ReactNode;
    accentColor: string;
  }[] = [
    {
      id: 'ALL',
      label: 'All Cuts',
      count: counts.all,
      icon: <LayoutGrid className="w-4 h-4 shrink-0" />,
      accentColor: 'text-purple-700',
    },
    {
      id: 'FISHES & SEAFOOD',
      label: 'Fishes & Seafood',
      count: counts.fish,
      icon: CATEGORY_DEFINITIONS['FISHES & SEAFOOD'].icon,
      accentColor: 'text-cyan-700',
    },
    {
      id: 'CHICKEN',
      label: 'Chicken',
      count: counts.chicken,
      icon: CATEGORY_DEFINITIONS['CHICKEN'].icon,
      accentColor: 'text-amber-700',
    },
    {
      id: 'MUTTON',
      label: 'Mutton',
      count: counts.mutton,
      icon: CATEGORY_DEFINITIONS['MUTTON'].icon,
      accentColor: 'text-rose-700',
    },
    {
      id: 'EGGS',
      label: 'Eggs',
      count: counts.eggs,
      icon: CATEGORY_DEFINITIONS['EGGS'].icon,
      accentColor: 'text-amber-600',
    },
  ];

  return (
    <div
      className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky z-30 shadow-xs transition-[top] duration-150"
      style={{ top: 'var(--header-height, 174px)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Level 1: Highlighted Main Categories Switcher Bar */}
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 scrollbar-none">
          <div
            role="tablist"
            aria-label="Main Menu Categories"
            className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-stone-100 border border-stone-200/90 rounded-xl shrink-0 shadow-2xs"
          >
            {navItems.map((item) => {
              const isActive = isSearching
                ? item.id === 'ALL'
                : !showFavoritesOnly && selectedCategory === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleMainCatChange(item.id)}
                  className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-[44px] sm:min-h-0 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-950 text-white shadow-md ring-2 ring-emerald-400/90 scale-[1.01]'
                      : 'text-stone-700 hover:text-purple-950 hover:bg-white shadow-none'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-400' : item.accentColor}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                      isActive
                        ? 'bg-emerald-500 text-stone-950'
                        : 'bg-stone-200/80 text-stone-700'
                    }`}
                  >
                    {item.count}
                  </span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                    />
                  )}
                </button>
              );
            })}

            {currentUser && (
              <button
                type="button"
                role="tab"
                aria-selected={!isSearching && showFavoritesOnly}
                onClick={handleToggleFavorites}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-[44px] sm:min-h-0 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  !isSearching && showFavoritesOnly
                    ? 'bg-rose-700 text-white shadow-md ring-2 ring-rose-300 scale-[1.01]'
                    : 'text-stone-700 hover:text-rose-700 hover:bg-white shadow-none'
                }`}
              >
                <Heart
                  className={`w-4 h-4 shrink-0 ${
                    showFavoritesOnly
                      ? 'fill-white text-white'
                      : 'fill-rose-600 text-rose-600'
                  }`}
                />
                <span>Favorites</span>
                <span
                  className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md font-bold tabular-nums ${
                    showFavoritesOnly
                      ? 'bg-white text-rose-800'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {wishlistProductIds.length}
                </span>
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-stone-500 whitespace-nowrap bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Weight Options:</span>
            <span className="font-mono text-purple-950 font-semibold">250g · 500g · 750g · 1kg</span>
          </div>
        </div>

        {/* Level 2: Subcategory Navigation (When specific category is active and not searching) */}
        {!isSearching && selectedCategory !== 'ALL' && (
          <div className="pt-2.5 mt-2 border-t border-stone-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
              <span>{CATEGORY_DEFINITIONS[selectedCategory].label} Cuts:</span>
            </span>
            <button
              onClick={() => setSelectedSubcategory('ALL')}
              className={`px-3 min-h-[44px] sm:min-h-0 py-1.5 sm:py-1 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSubcategory === 'ALL'
                  ? 'bg-emerald-700 text-white font-bold shadow-sm ring-1 ring-emerald-500'
                  : 'bg-white text-stone-700 hover:text-purple-950 hover:bg-stone-50 border border-stone-200 font-medium shadow-2xs'
              }`}
            >
              All {CATEGORY_DEFINITIONS[selectedCategory].label} ({
                selectedCategory === 'FISHES & SEAFOOD'
                  ? counts.fish
                  : selectedCategory === 'CHICKEN'
                  ? counts.chicken
                  : selectedCategory === 'MUTTON'
                  ? counts.mutton
                  : counts.eggs
              })
            </button>
            {currentSubcategories.map((sub) => {
              const isSubActive = selectedSubcategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-3 min-h-[44px] sm:min-h-0 py-1.5 sm:py-1 text-xs rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isSubActive
                      ? 'bg-emerald-700 text-white font-bold shadow-sm ring-1 ring-emerald-500'
                      : 'bg-white text-stone-700 hover:text-purple-950 hover:bg-stone-50 border border-stone-200 font-medium shadow-2xs'
                  }`}
                >
                  {sub} {subcategoryCounts[sub] ? `(${subcategoryCounts[sub]})` : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
