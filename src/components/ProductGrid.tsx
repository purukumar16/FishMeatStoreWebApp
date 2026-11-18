import React from 'react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { Product } from '../types';
import { SearchX, Heart, RotateCcw } from 'lucide-react';

export const ProductGrid: React.FC = () => {
  const {
    products,
    selectedCategory,
    selectedSubcategory,
    searchQuery,
    setSearchQuery,
    activeStore,
    currentUser,
    isWishlisted,
    showFavoritesOnly,
    setShowFavoritesOnly,
    quickReorderAllWishlist,
    wishlistProducts,
  } = useStore();

  const trimmedQuery = searchQuery.trim();
  const isSearchActive = trimmedQuery.length > 0;

  const filteredProducts: Product[] = products.filter((product) => {
    // When searching, search across all items irrespective of active filters
    if (isSearchActive) {
      const q = trimmedQuery.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(q);
      const matchesCat = product.category.toLowerCase().includes(q);
      const matchesSub = product.subcategory.toLowerCase().includes(q);
      const matchesTagline = product.tagline.toLowerCase().includes(q);
      const matchesDesc = product.description.toLowerCase().includes(q);
      return matchesName || matchesCat || matchesSub || matchesTagline || matchesDesc;
    }
    // 0. Favorites filter
    if (showFavoritesOnly && currentUser && !isWishlisted(product.id)) {
      return false;
    }
    // 1. Category match
    if (selectedCategory !== 'ALL' && product.category !== selectedCategory) {
      return false;
    }
    // 2. Subcategory match
    if (selectedSubcategory !== 'ALL' && product.subcategory !== selectedSubcategory) {
      return false;
    }
    return true;
  });

  return (
    <section id="fresh-catalog-grid" className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 scroll-mt-64">
      {/* Section Header with Item Count & Live Chiller Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-stone-200">
        <div>
          <div className="text-xs font-semibold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
            {isSearchActive ? (
              <span>Search Results Across All Items</span>
            ) : showFavoritesOnly && currentUser ? (
              <>
                <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                <span className="text-rose-700">Saved Wishlist Favorites</span>
              </>
            ) : (
              <span>{selectedCategory === 'ALL' ? 'Daily Fresh Butchery' : selectedCategory}</span>
            )}
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
            {isSearchActive
              ? `Results for "${trimmedQuery}"`
              : showFavoritesOnly && currentUser
              ? 'Your Favorite Cuts for Quick Re-Order'
              : selectedSubcategory === 'ALL'
              ? selectedCategory === 'ALL'
                ? 'All Available Fresh Cuts'
                : `All ${selectedCategory.toLowerCase()}`
              : `${selectedSubcategory} Cuts`}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {isSearchActive
              ? `Found ${filteredProducts.length} matching cuts across all categories at ${activeStore.neighborhood} (${activeStore.chillerTempC}°C).`
              : `Displaying ${filteredProducts.length} prime cuts currently in cold-chain storage at ${activeStore.neighborhood} (${activeStore.chillerTempC}°C).`}
          </p>
        </div>

        {/* Live Filter / Quick Re-order Controls */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-stone-500 flex-wrap">
          {showFavoritesOnly && currentUser && wishlistProducts.length > 0 && (
            <button
              type="button"
              onClick={quickReorderAllWishlist}
              className="min-h-[40px] sm:min-h-0 px-3.5 py-1.5 rounded-lg bg-purple-900 hover:bg-purple-950 text-white font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-Order All Favorites ({wishlistProducts.length})</span>
            </button>
          )}
          <span className="font-medium text-stone-700">Weights:</span>
          <span className="font-mono text-stone-900 bg-white border border-stone-200 px-2.5 py-1 rounded-md font-medium shadow-2xs">
            250g · 500g · 750g · 1kg
          </span>
        </div>
      </div>

      {/* Grid of Product Cards */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 pt-5 sm:pt-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : showFavoritesOnly && currentUser ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-stone-200 mt-6 px-4">
          <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="font-display text-base font-bold text-stone-800">
            Your Wishlist is empty
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Click the heart icon on your favorite fresh fish, prawns, chicken, mutton, or eggs to save them here for 1-click re-ordering.
          </p>
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(false)}
            className="px-4 min-h-[44px] py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Browse All Fresh Cuts
          </button>
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 bg-white rounded-xl border border-stone-200 mt-6">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
            <SearchX className="w-6 h-6" />
          </div>
          <h3 className="font-display text-base font-bold text-stone-800">
            No cuts found matching &quot;{searchQuery}&quot;
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try searching for terms like &quot;prawns&quot;, &quot;pomfret&quot;, &quot;drumstick&quot;, &quot;boneless&quot;, or &quot;mutton curry cut&quot;.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 min-h-[44px] py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}
    </section>
  );
};
