import React, { useState } from 'react';
import { Plus, Check, Info, Repeat, Heart } from 'lucide-react';
import { Product, WeightVariant } from '../types';
import { useStore } from '../context/StoreContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    activeStore,
    addToCart,
    setSelectedProductForDetail,
    currentUser,
    isWishlisted,
    toggleWishlist,
  } = useStore();
  const initialWeight: WeightVariant =
    product.availableWeights && !product.availableWeights.includes('500g')
      ? product.availableWeights[0]
      : '500g';
  const [selectedWeight, setSelectedWeight] = useState<WeightVariant>(initialWeight);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const wishlisted = isWishlisted(product.id);

  const isWeightDisabled = (weight: WeightVariant) => {
    if (product.availableWeights && product.availableWeights.length > 0) {
      return !product.availableWeights.includes(weight);
    }
    return false;
  };

  const currentVariant = product.variants[selectedWeight];
  const weightOptions: WeightVariant[] = ['250g', '500g', '750g', '1kg'];

  // Check inventory against the currently locked store
  const storeStock = activeStore.inventory[product.id]?.[selectedWeight];
  const isAvailable = storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;

  const handleAdd = () => {
    if (!isAvailable) return;
    addToCart(product, selectedWeight);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const handleToggleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id, { weight: selectedWeight });
  };

  return (
    <article className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-stone-300 transition-all group">
      <div>
        {/* Product Image Showcase with Fallback & Wishlist Heart */}
        <div
          onClick={() => setSelectedProductForDetail(product)}
          className="relative aspect-4/3 bg-stone-50 overflow-hidden cursor-pointer"
        >
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Top Left: Subcategory text or Out of Stock status */}
          {isAvailable ? (
            <div className="absolute top-2.5 left-2.5 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded border border-stone-700/50">
              {product.subcategory}
            </div>
          ) : (
            <div className="absolute top-2.5 left-2.5 bg-rose-950/90 backdrop-blur-xs text-rose-200 text-[11px] font-semibold px-2 py-0.5 rounded border border-rose-700/60">
              Out of Stock
            </div>
          )}

          {/* Top Right: Save to Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleToggleHeart}
            aria-pressed={wishlisted}
            aria-label={
              currentUser
                ? wishlisted
                  ? `Remove ${product.name} from wishlist`
                  : `Save ${product.name} to wishlist`
                : `Sign in to save ${product.name} to wishlist`
            }
            title={
              currentUser
                ? wishlisted
                  ? 'Saved in Wishlist — click to remove'
                  : 'Save to Wishlist'
                : 'Sign in to save to Wishlist'
            }
            className={`absolute top-2.5 right-2.5 z-10 w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border shadow-sm backdrop-blur-xs transition-transform duration-150 cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-900 ${
              wishlisted
                ? 'bg-rose-50/95 border-rose-200 text-rose-600'
                : 'bg-white/95 border-stone-200/80 text-stone-700 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform duration-150 ${
                wishlisted ? 'fill-rose-600 text-rose-600 scale-110' : ''
              }`}
            />
          </button>

          {/* Bottom Left: Subscribe & Save availability */}
          <div className="absolute bottom-2.5 left-2.5 bg-[#18082e]/85 backdrop-blur-xs text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 shadow-sm">
            <Repeat className="w-2.5 h-2.5" />
            <span>Subscribe & Save 10%</span>
          </div>

          <div className="absolute bottom-2.5 right-2.5 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium bg-stone-900/80 px-2 py-1 rounded backdrop-blur-xs">
            <Info className="w-3.5 h-3.5" />
            <span>{product.category === 'EGGS' ? 'Pack Details' : 'Cut Details'}</span>
          </div>
        </div>

        {/* Product Content Details */}
        <div className="p-4 space-y-2.5">
          {/* Unboxed Metadata (Zero-pill discipline) */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium flex-wrap">
            <span className="text-emerald-700 font-semibold">
              {product.category === 'EGGS' ? 'Farm Fresh Collected' : 'Cut Fresh on Order'}
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>{product.coldChainTemp}</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>{currentVariant.serves}</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>{currentVariant.pieces}</span>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => setSelectedProductForDetail(product)}
            className="font-bold text-base text-stone-900 group-hover:text-purple-900 transition-colors cursor-pointer line-clamp-1"
          >
            {product.name}
          </h3>

          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Segmented Weight Variant Selector */}
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{product.category === 'EGGS' ? 'Select Pack Size:' : 'Select Weight Variant:'}</span>
              <span className="text-stone-500 font-normal">
                Net: {currentVariant.netWeight} (Gross ~{currentVariant.grossWeight})
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-stone-50 border border-stone-200 rounded-lg">
              {weightOptions.map((weight) => {
                const isSelected = selectedWeight === weight;
                const disabled = isWeightDisabled(weight);
                const buttonLabel =
                  product.category === 'EGGS'
                    ? product.variants[weight].pieces.replace(' Eggs', ' pcs')
                    : weight;
                return (
                  <button
                    key={weight}
                    disabled={disabled}
                    onClick={() => !disabled && setSelectedWeight(weight)}
                    title={disabled ? `Only ${product.availableWeights?.join(', ')} available for this item` : undefined}
                    className={`min-h-[44px] sm:min-h-0 py-1.5 sm:py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                      disabled
                        ? 'opacity-35 bg-stone-100/80 text-stone-400 line-through cursor-not-allowed border border-dashed border-stone-300'
                        : isSelected
                        ? 'bg-purple-900 text-white shadow-xs cursor-pointer'
                        : 'text-stone-800 hover:text-stone-950 hover:bg-stone-200/60 cursor-pointer'
                    }`}
                  >
                    {buttonLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Dynamic Price & Add to Cart */}
      <div className="p-3.5 sm:p-4 pt-2 border-t border-stone-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3">
        <div>
          <div className="text-xs text-stone-500">
            For <strong className="text-purple-950">{product.category === 'EGGS' ? currentVariant.pieces : selectedWeight}</strong>:
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-purple-950 tabular-nums">
              ₹{currentVariant.price}
            </span>
            <span className="text-[11px] text-purple-600/70 font-mono">
              {product.category === 'EGGS' ? `(${currentVariant.serves})` : `(₹${product.basePricePerKg}/kg)`}
            </span>
          </div>
        </div>

        {isAvailable ? (
          <button
            onClick={handleAdd}
            className={`flex items-center justify-center gap-1.5 px-4 min-h-[44px] sm:min-h-0 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-xs ${
              addedAnimation
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cut</span>
              </>
            )}
          </button>
        ) : (
          <div
            className="relative group/stock-tooltip inline-flex shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            title="Out Of Stock"
          >
            <button
              disabled
              aria-disabled="true"
              className="flex items-center justify-center gap-1.5 px-4 min-h-[44px] sm:min-h-0 py-2 rounded-lg text-xs font-semibold bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed select-none transition-all shadow-none"
            >
              <Plus className="w-3.5 h-3.5 opacity-40" />
              <span>Add Cut</span>
            </button>

            {/* Tooltip on mouse over */}
            <div
              role="tooltip"
              className={`pointer-events-none absolute bottom-full right-0 mb-2 z-40 transition-all duration-150 ${
                showTooltip ? 'flex' : 'hidden'
              } flex-col items-center group-hover/stock-tooltip:flex`}
            >
              <div className="bg-[#18082e] text-amber-200 text-xs font-semibold px-2.5 py-1 rounded shadow-xl border border-purple-800/80 whitespace-nowrap flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span>Out Of Stock</span>
              </div>
              <div className="w-2 h-2 bg-[#18082e] rotate-45 -mt-1 border-r border-b border-purple-800/80" />
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
