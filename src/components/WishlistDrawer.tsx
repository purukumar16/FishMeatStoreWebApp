import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  Plus,
  Check,
  ShoppingBag,
  Trash2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { WeightVariant } from '../types';

export const WishlistDrawer: React.FC = () => {
  const {
    currentUser,
    isWishlistDrawerOpen,
    setIsWishlistDrawerOpen,
    wishlistProducts,
    wishlistPreferences,
    toggleWishlist,
    updateWishlistItemPreference,
    quickReorderWishlistItem,
    quickReorderAllWishlist,
    setSelectedProductForDetail,
    setIsCartOpen,
    setIsAuthModalOpen,
    setAuthInitialTab,
    activeStore,
  } = useStore();

  const [reorderedMap, setReorderedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWishlistDrawerOpen) {
        setIsWishlistDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWishlistDrawerOpen, setIsWishlistDrawerOpen]);

  if (!isWishlistDrawerOpen) return null;

  const handleQuickReorder = (productId: string, weight: WeightVariant) => {
    const added = quickReorderWishlistItem(productId, weight);
    if (added) {
      setReorderedMap((prev) => ({ ...prev, [productId]: true }));
      setTimeout(() => {
        setReorderedMap((prev) => ({ ...prev, [productId]: false }));
      }, 1500);
    }
  };

  const weightOptions: WeightVariant[] = ['250g', '500g', '750g', '1kg'];

  const inStockCount = wishlistProducts.filter((product) => {
    const savedPref = wishlistPreferences[product.id];
    const fallbackWeight: WeightVariant =
      product.availableWeights && !product.availableWeights.includes('500g')
        ? product.availableWeights[0]
        : '500g';
    const selectedWeight = savedPref?.weight || fallbackWeight;
    const storeStock = activeStore.inventory[product.id]?.[selectedWeight];
    return storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;
  }).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Wishlist and Quick Re-order"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <div
        onClick={() => setIsWishlistDrawerOpen(false)}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-stone-200">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-white gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600 fill-rose-600 shrink-0" />
                <h2 className="text-base font-bold font-display text-stone-900 truncate">
                  Saved Wishlist ({wishlistProducts.length})
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                {currentUser
                  ? `${currentUser.name.split(' ')[0]}'s quick re-order favorites · ${activeStore.neighborhood}`
                  : 'Sign in to sync your saved fish and meat favorites'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsWishlistDrawerOpen(false)}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
              aria-label="Close wishlist drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
            {!currentUser ? (
              <div className="text-center py-14 px-4 bg-white rounded-xl border border-stone-200 space-y-3">
                <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="font-display text-lg font-bold text-stone-900">
                  Sign in for Wishlist Quick Re-Ordering
                </h3>
                <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                  Heart your go-to fish steaks, prawns, chicken cuts, or mutton on any card to build a 1-tap re-order list.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsWishlistDrawerOpen(false);
                    setAuthInitialTab('customer');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-5 min-h-[44px] py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Sign In to View Wishlist
                </button>
              </div>
            ) : wishlistProducts.length === 0 ? (
              <div className="text-center py-14 px-4 bg-white rounded-xl border border-stone-200 space-y-3">
                <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
                  <Heart className="w-7 h-7" />
                </div>
                <h3 className="font-display text-lg font-bold text-stone-900">
                  No favorites saved yet
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                  Tap the heart icon on any fresh fish, seafood, chicken, mutton, or egg cut to save it here for instant re-ordering.
                </p>
                <button
                  type="button"
                  onClick={() => setIsWishlistDrawerOpen(false)}
                  className="px-5 min-h-[44px] py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Browse Fresh Catalog
                </button>
              </div>
            ) : (
              wishlistProducts.map((product) => {
                const savedPref = wishlistPreferences[product.id];
                const fallbackWeight: WeightVariant =
                  product.availableWeights && !product.availableWeights.includes('500g')
                    ? product.availableWeights[0]
                    : '500g';
                const selectedWeight: WeightVariant =
                  savedPref?.weight &&
                  (!product.availableWeights ||
                    product.availableWeights.length === 0 ||
                    product.availableWeights.includes(savedPref.weight))
                    ? savedPref.weight
                    : fallbackWeight;
                const variant = product.variants[selectedWeight];
                const storeStock = activeStore.inventory[product.id]?.[selectedWeight];
                const isAvailable = storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;
                const isReordered = Boolean(reorderedMap[product.id]);

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-stone-200 p-3.5 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductForDetail(product);
                          setIsWishlistDrawerOpen(false);
                        }}
                        className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0 cursor-pointer"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForDetail(product);
                              setIsWishlistDrawerOpen(false);
                            }}
                            className="text-left text-sm font-bold text-stone-900 hover:text-purple-900 transition-colors cursor-pointer line-clamp-1"
                          >
                            {product.name}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleWishlist(product.id)}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            aria-label={`Remove ${product.name} from wishlist`}
                            title="Remove from Wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                          <span>{product.subcategory}</span>
                          <span aria-hidden="true">·</span>
                          <span>{product.coldChainTemp}</span>
                          <span aria-hidden="true">·</span>
                          <span className={isAvailable ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                            {isAvailable ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>

                        {savedPref?.cuttingStyle && (
                          <p className="text-[11px] text-stone-600 mt-1 line-clamp-1">
                            Cut: {savedPref.cuttingStyle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Weight Selector Row */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-stone-50 border border-stone-200 rounded-lg">
                      {weightOptions.map((weight) => {
                        const disabled =
                          product.availableWeights && product.availableWeights.length > 0
                            ? !product.availableWeights.includes(weight)
                            : false;
                        const isSelected = selectedWeight === weight;
                        const label =
                          product.category === 'EGGS'
                            ? product.variants[weight].pieces.replace(' Eggs', ' pcs')
                            : weight;
                        return (
                          <button
                            key={weight}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              !disabled && updateWishlistItemPreference(product.id, { weight })
                            }
                            className={`min-h-[36px] sm:min-h-0 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                              disabled
                                ? 'opacity-35 text-stone-400 line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-purple-900 text-white cursor-pointer'
                                : 'text-stone-700 hover:bg-stone-200/70 cursor-pointer'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Price + Quick Re-order CTA */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div>
                        <span className="text-base font-bold font-mono text-purple-950 tabular-nums">
                          ₹{variant.price}
                        </span>
                        <span className="text-[11px] text-stone-500 ml-1.5">
                          for {product.category === 'EGGS' ? variant.pieces : selectedWeight}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleQuickReorder(product.id, selectedWeight)}
                        className={`min-h-[40px] sm:min-h-0 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                          !isAvailable
                            ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                            : isReordered
                            ? 'bg-emerald-800 text-white cursor-pointer'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                        }`}
                      >
                        {isReordered ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added!</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Quick Re-Order</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {currentUser && wishlistProducts.length > 0 && (
            <div className="p-4 border-t border-stone-200 bg-white space-y-2.5">
              <button
                type="button"
                disabled={inStockCount === 0}
                onClick={quickReorderAllWishlist}
                className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  inStockCount === 0
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    : 'bg-purple-900 hover:bg-purple-950 text-white cursor-pointer shadow-sm'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {inStockCount === 0
                    ? 'Saved Items Currently Out of Stock'
                    : `Re-Order All Available (${inStockCount})`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWishlistDrawerOpen(false);
                  setIsCartOpen(true);
                }}
                className="w-full min-h-[40px] py-2 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-purple-900" />
                <span>Open Fresh Cart</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
