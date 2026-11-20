import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  ThermometerSnowflake,
  Scale,
  Utensils,
  Scissors,
  AlertCircle,
  Flame,
  Dna,
  Activity,
  Repeat,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Truck,
  Percent,
  ChevronDown,
  RotateCcw,
  Heart,
} from 'lucide-react';
import { Product, WeightVariant, SubscriptionFrequency, SubscriptionDay, ProductSubscription } from '../types';
import { useStore } from '../context/StoreContext';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProductForDetail: product,
    setSelectedProductForDetail,
    activeStore,
    addToCart,
    addSubscription,
    currentUser,
    userLocation,
    setIsCustomerProfileOpen,
    hasCustomerOrderedProduct,
    activeOrder,
    isWishlisted,
    toggleWishlist,
  } = useStore();

  const [rawSelectedWeight, setSelectedWeight] = useState<WeightVariant>('500g');
  const [customCuttingNotes, setCustomCuttingNotes] = useState('');
  const [cuttingStyle, setCuttingStyle] = useState('Standard Medium Curry Cut');
  const [added, setAdded] = useState(false);
  const [boughtAgain, setBoughtAgain] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const [nutritionBasis, setNutritionBasis] = useState<'per100g' | 'perPack'>('per100g');
  const [isNutritionAccordionOpen, setIsNutritionAccordionOpen] = useState(false);

  useEffect(() => {
    if (product) {
      if (product.availableWeights && !product.availableWeights.includes(rawSelectedWeight)) {
        setSelectedWeight(product.availableWeights[0]);
      }
      setCuttingStyle(
        product.category === 'EGGS' ? 'Cushioned Pulp Carton' : 'Standard Medium Curry Cut'
      );
      setIsNutritionAccordionOpen(false);
    }
  }, [product]);

  const [purchaseMode, setPurchaseMode] = useState<'one-time' | 'subscribe'>('one-time');
  const [subFrequency, setSubFrequency] = useState<SubscriptionFrequency>('weekly');
  const [subDay, setSubDay] = useState<SubscriptionDay>('Sunday');
  const [subSlot, setSubSlot] = useState<string>('Morning Fresh Catch (7:00 AM - 9:00 AM)');
  const [subName, setSubName] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subAddress, setSubAddress] = useState('');
  const [subGuestErrors, setSubGuestErrors] = useState<{ phone?: string; address?: string }>({});
  const [subConfirmed, setSubConfirmed] = useState(false);
  const [createdSub, setCreatedSub] = useState<ProductSubscription | null>(null);

  useEffect(() => {
    setSubGuestErrors({});
    setSubConfirmed(false);
    setCreatedSub(null);
    if (!currentUser) {
      setSubName('');
      setSubPhone('');
      setSubAddress('');
    }
  }, [product, currentUser]);

  if (!product) return null;

  const selectedWeight: WeightVariant =
    product.availableWeights &&
    product.availableWeights.length > 0 &&
    !product.availableWeights.includes(rawSelectedWeight)
      ? product.availableWeights[0]
      : rawSelectedWeight;

  const isWeightDisabled = (weight: WeightVariant) => {
    if (product.availableWeights && product.availableWeights.length > 0) {
      return !product.availableWeights.includes(weight);
    }
    return false;
  };

  const currentVariant = product.variants[selectedWeight];
  const weightOptions: WeightVariant[] = ['250g', '500g', '750g', '1kg'];

  const regularPrice = currentVariant.price;
  const subscriptionPrice = Math.round(regularPrice * 0.9); // 10% OFF
  const savingsPerDelivery = regularPrice - subscriptionPrice;
  const annualSavings =
    savingsPerDelivery *
    (subFrequency === 'twice-weekly' ? 104 : subFrequency === 'weekly' ? 52 : 26);

  const storeStock = activeStore.inventory[product.id]?.[selectedWeight];
  const isAvailable = storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;

  const hasPreviouslyOrdered = Boolean(
    currentUser &&
      (hasCustomerOrderedProduct?.(product.id) ||
        currentUser.pastOrderProductIds?.includes(product.id) ||
        currentUser.pastOrders?.some((o) => o.items.some((item) => item.productId === product.id)) ||
        (activeOrder && activeOrder.items.some((item) => item.productId === product.id)))
  );

  const handleBuyAgain = () => {
    if (!isAvailable) return;
    const notes = customCuttingNotes.trim()
      ? `${cuttingStyle} · Note: ${customCuttingNotes.trim()}`
      : cuttingStyle;

    addToCart(product, selectedWeight, notes, cuttingStyle);
    setBoughtAgain(true);
    setAdded(true);
    setTimeout(() => {
      setBoughtAgain(false);
    }, 2000);
    setTimeout(() => {
      setAdded(false);
    }, 1200);
  };

  const handleAction = () => {
    if (!isAvailable) return;
    const notes = customCuttingNotes.trim()
      ? `${cuttingStyle} · Note: ${customCuttingNotes.trim()}`
      : cuttingStyle;

    if (purchaseMode === 'one-time') {
      addToCart(product, selectedWeight, notes, cuttingStyle);
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        setSelectedProductForDetail(null);
      }, 800);
    } else {
      // Subscribe & Save flow
      let deliveryAddress =
        currentUser?.savedAddresses?.find((a) => a.isDefault)?.formattedAddress ||
        currentUser?.savedAddresses?.[0]?.formattedAddress ||
        '';
      let customerPhone = currentUser?.phone || '';
      const customerName = currentUser?.name || subName.trim() || 'Guest Customer';

      if (!currentUser) {
        const errors: { phone?: string; address?: string } = {};
        const cleanDigits = subPhone.replace(/\D/g, '');
        if (!cleanDigits) {
          errors.phone = 'Mobile number is required to confirm your subscription order.';
        } else if (cleanDigits.length < 10 || cleanDigits.length > 15) {
          errors.phone = 'Please enter a valid 10-digit mobile number.';
        }
        const trimmedAddr = subAddress.trim();
        if (!trimmedAddr) {
          errors.address = 'Delivery address is required to confirm your subscription order.';
        } else if (trimmedAddr.length < 5) {
          errors.address = 'Please enter a complete house, flat, or street address.';
        }
        if (Object.keys(errors).length > 0) {
          setSubGuestErrors(errors);
          return;
        }
        customerPhone = subPhone.trim();
        deliveryAddress = trimmedAddr;
      } else if (!deliveryAddress) {
        deliveryAddress = userLocation.address;
      }

      const nextDeliveryStr = `Next ${subDay}, ${subSlot.includes('7:00 AM') ? '7:00 AM - 9:00 AM' : '5:00 PM - 7:30 PM'}`;

      const newSub = addSubscription({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        category: product.category,
        selectedWeight,
        cuttingStyle,
        customNotes: customCuttingNotes.trim() || undefined,
        frequency: subFrequency,
        deliveryDay: subDay,
        deliverySlot: subSlot,
        discountPercent: 10,
        originalPrice: regularPrice,
        discountedPrice: subscriptionPrice,
        savingsPerDelivery,
        status: 'active',
        nextDeliveryDate: nextDeliveryStr,
        deliveryAddress,
        customerName,
        customerPhone,
      });

      // Also add to cart with subscription metadata
      addToCart(product, selectedWeight, notes, cuttingStyle, {
        frequency: subFrequency,
        deliveryDay: subDay,
        deliverySlot: subSlot,
      });

      setSubGuestErrors({});
      setCreatedSub(newSub);
      setSubConfirmed(true);
    }
  };

  // Nutrition scaling calculation
  const weightGrams = parseInt(selectedWeight.replace('kg', '000').replace('g', '')) || 500;
  const multiplier = nutritionBasis === 'perPack' ? weightGrams / 100 : 1;

  const scaledCalories = Math.round(product.nutrition.calories * multiplier);
  const scaledProtein = +(product.nutrition.protein * multiplier).toFixed(1);
  const scaledFat = +(product.nutrition.fat * multiplier).toFixed(1);
  const scaledCarbs = +(product.nutrition.carbs * multiplier).toFixed(1);

  // Macro calorie energy contribution
  const proteinKcal = scaledProtein * 4;
  const fatKcal = scaledFat * 9;
  const carbsKcal = scaledCarbs * 4;
  const totalMacroKcal = Math.max(1, proteinKcal + fatKcal + carbsKcal);
  const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
  const fatPct = Math.round((fatKcal / totalMacroKcal) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-stone-200">
        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-stone-500 min-w-0 truncate">
            <span className="truncate">{product.category}</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-stone-800 truncate">{product.subcategory}</span>
          </div>
          <button
            onClick={() => setSelectedProductForDetail(null)}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer shrink-0"
            aria-label="Close product details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
          {/* Image & Cold-Chain Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="aspect-4/3 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative">
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-[#18082e]/85 backdrop-blur-xs text-purple-200 text-xs px-2.5 py-1 rounded border border-purple-800/40 font-medium">
                Chilled {product.coldChainTemp}
              </div>

              {/* Fresh Cut on Order Badge */}
              <div className="absolute bottom-3 left-3 bg-[#18082e]/90 backdrop-blur-xs text-emerald-300 text-xs px-2.5 py-1 rounded-md border border-emerald-500/40 font-semibold shadow-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>100% Fresh · Cut on Order</span>
              </div>
            </div>

            {/* Quality Certifications */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Cold-Chain & Cleanliness Audit</span>
              </div>
              <ul className="space-y-1.5 text-stone-600 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Never packed in advance — butchered & custom-packed fresh upon order</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Sourced within 24h & tested for zero formalin</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>Dispatched at {activeStore.chillerTempC}°C in thermal pouch</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Details & Tab Content Column */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-stone-900">
                      {product.name}
                    </h2>
                    <p className="text-xs text-purple-900 font-medium mt-1">
                      {product.tagline}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
                    {hasPreviouslyOrdered && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-200 shadow-2xs">
                        <RotateCcw className="w-3 h-3 text-purple-800" />
                        <span>Ordered Before</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        toggleWishlist(product.id, {
                          weight: selectedWeight,
                          cuttingStyle,
                        })
                      }
                      aria-pressed={isWishlisted(product.id)}
                      className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isWishlisted(product.id)
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-white text-stone-700 border-stone-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/60'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted(product.id) ? 'fill-rose-600 text-rose-600' : ''
                        }`}
                      />
                      <span>{isWishlisted(product.id) ? 'Saved' : 'Save to Wishlist'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {product.description}
              </p>

              {/* Previously Ordered Banner with Buy Again Button */}
              {hasPreviouslyOrdered && (
                <div className="bg-purple-50/90 border border-purple-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <RotateCcw className="w-4 h-4 text-purple-200" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-purple-950">
                          Previously Ordered by You
                        </span>
                        <span className="text-[10px] font-semibold bg-purple-200/90 text-purple-900 px-1.5 py-0.2 rounded-full">
                          Past Favorite
                        </span>
                      </div>
                      <p className="text-[11px] text-purple-800/90 line-clamp-1">
                        Loved this cut? Re-order now for {selectedWeight} at ₹{regularPrice}.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuyAgain}
                    disabled={!isAvailable}
                    aria-label="Buy Again"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                      !isAvailable
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : boughtAgain
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                        : 'bg-purple-900 hover:bg-purple-950 text-white active:scale-95'
                    }`}
                  >
                    {boughtAgain ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Re-ordered!</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Buy Again</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Cut Details & Customization */}
              <div className="space-y-3.5 pt-1">
                  {/* Weight Variant Controls */}
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                      <span>Select Weight Option:</span>
                      <span className="font-mono text-stone-900 text-base">
                        ₹{currentVariant.price}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-stone-200/60 rounded-lg">
                      {weightOptions.map((weight) => {
                        const disabled = isWeightDisabled(weight);
                        const isSelected = selectedWeight === weight;
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
                            className={`min-h-[44px] sm:min-h-0 py-1.5 text-xs font-semibold rounded-md transition-all ${
                              disabled
                                ? 'opacity-35 bg-stone-200/70 text-stone-400 line-through cursor-not-allowed border border-dashed border-stone-300'
                                : isSelected
                                ? 'bg-purple-900 text-white shadow-xs cursor-pointer'
                                : 'text-stone-800 hover:bg-stone-300/60 cursor-pointer'
                            }`}
                          >
                            {buttonLabel}
                          </button>
                        );
                      })}
                    </div>

                    {/* Variant Specs */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200 text-center text-xs">
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Portion</span>
                        <span className="font-semibold text-stone-800">{currentVariant.serves}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Approx Pieces</span>
                        <span className="font-semibold text-stone-800">{currentVariant.pieces}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <span className="text-[11px] text-stone-500 block">Net / Gross</span>
                        <span className="font-semibold text-stone-900 font-mono text-[11px]">
                          {currentVariant.netWeight} / {currentVariant.grossWeight}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Custom Order Notes & Cutting / Handling Preference */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-purple-800 shrink-0" />
                      <span>
                        {product.category === 'EGGS'
                          ? 'Egg Packaging & Handling Preference:'
                          : 'Custom Butchery & Cutting Preference:'}
                      </span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(product.category === 'EGGS'
                        ? [
                            'Cushioned Pulp Carton',
                            'UV Sanitized & Dry-Wiped',
                            'Extra Crack-Guard Wrapping',
                            'Same-Morning Harvest Preferred',
                          ]
                        : [
                            'Standard Medium Curry Cut',
                            'Small Bite-Sized Pieces',
                            'Large Biryani Cut',
                            'Cleaned Bone-In Steaks',
                          ]
                      ).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setCuttingStyle(style)}
                          className={`min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 rounded-lg border text-left transition-all cursor-pointer text-xs ${
                            cuttingStyle === style
                              ? 'border-purple-900 bg-stone-100 text-purple-950 font-semibold shadow-2xs'
                              : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={customCuttingNotes}
                        onChange={(e) => setCustomCuttingNotes(e.target.value)}
                        placeholder={
                          product.category === 'EGGS'
                            ? "Special instructions (e.g. 'Double cushioned box', 'Ring bell softly')..."
                            : "Special instructions (e.g. 'Make pieces small', 'Send extra soup bones')..."
                        }
                        className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Nutrition Facts Accordion (Collapsible, dynamically populating protein & caloric information per 100g) */}
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs transition-all">
                  <button
                    type="button"
                    onClick={() => setIsNutritionAccordionOpen(!isNutritionAccordionOpen)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50/90 hover:bg-stone-100/90 transition-colors cursor-pointer text-left gap-2 sm:gap-3"
                    aria-expanded={isNutritionAccordionOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-emerald-800" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-stone-900 tracking-tight">
                            Nutrition Facts
                          </span>
                          <span className="text-[10px] font-medium text-stone-500">
                            (per 100g standard)
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-1">
                          Protein & caloric profile for clean healthy eating
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                      {/* Dynamic Protein & Calorie per 100g Badges */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                        <Flame className="w-3 h-3 text-amber-600" />
                        <span>{product.nutrition.calories} kcal</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <Dna className="w-3 h-3 text-emerald-600" />
                        <span>{product.nutrition.protein}g Protein</span>
                      </span>
                      <div className="w-6 h-6 rounded-md bg-stone-200/70 flex items-center justify-center text-stone-600 ml-auto sm:ml-0.5">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isNutritionAccordionOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {isNutritionAccordionOpen && (
                    <div className="p-3.5 sm:p-4 space-y-3.5 border-t border-stone-200 bg-white">
                      {/* Basis Switcher (Per 100g vs Per Selected Pack) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-stone-50 border border-stone-200 p-1.5 sm:p-1 rounded-lg text-xs gap-1.5">
                        <span className="text-[11px] text-stone-700 font-medium pl-1 sm:pl-2">
                          Display Basis:
                        </span>
                        <div className="grid grid-cols-2 sm:flex gap-1">
                          <button
                            type="button"
                            onClick={() => setNutritionBasis('per100g')}
                            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-md font-semibold transition-all cursor-pointer text-xs ${
                              nutritionBasis === 'per100g'
                                ? 'bg-purple-900 text-white shadow-xs'
                                : 'text-stone-700 hover:bg-stone-200/70'
                            }`}
                          >
                            Per 100g (Standard)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNutritionBasis('perPack')}
                            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-md font-semibold transition-all cursor-pointer text-xs ${
                              nutritionBasis === 'perPack'
                                ? 'bg-purple-900 text-white shadow-xs'
                                : 'text-stone-700 hover:bg-stone-200/70'
                            }`}
                          >
                            Full Pack ({selectedWeight})
                          </button>
                        </div>
                      </div>

                      {/* 3 Core Nutritional Value Cards (Calories, Protein, Fat) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Calories */}
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-stone-700 uppercase tracking-wide">
                            <Flame className="w-3.5 h-3.5 text-stone-600" />
                            <span>Calories</span>
                          </div>
                          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
                            {scaledCalories}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            kcal {nutritionBasis === 'per100g' ? '/ 100g' : `(${selectedWeight})`}
                          </div>
                        </div>

                        {/* Protein */}
                        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">
                            <Dna className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Protein</span>
                          </div>
                          <div className="text-xl font-bold font-mono text-emerald-950 tabular-nums">
                            {scaledProtein}g
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium">
                            {proteinPct}% energy ratio
                          </div>
                        </div>

                        {/* Fat Content */}
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-stone-700 uppercase tracking-wide">
                            <Scale className="w-3.5 h-3.5 text-stone-600" />
                            <span>Fat Content</span>
                          </div>
                          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
                            {scaledFat}g
                          </div>
                          <div className="text-[10px] text-stone-500 font-medium">
                            {fatPct}% natural fat
                          </div>
                        </div>
                      </div>

                      {/* Macro Ratio Meter Bar */}
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-2">
                        <div className="flex flex-wrap justify-between gap-1 text-xs font-semibold text-stone-700">
                          <span>Macronutrient Ratio ({scaledCalories} kcal)</span>
                          <span className="font-mono text-stone-900 text-[11px]">
                            P: {scaledProtein}g · F: {scaledFat}g · C: {scaledCarbs}g
                          </span>
                        </div>

                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${proteinPct}%` }}
                            className="bg-emerald-600 h-full transition-all"
                            title={`Protein: ${proteinPct}%`}
                          />
                          <div
                            style={{ width: `${fatPct}%` }}
                            className="bg-purple-700 h-full transition-all"
                            title={`Fat: ${fatPct}%`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span className="text-emerald-800 font-medium">Protein ({proteinPct}%)</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-700" />
                            <span className="text-purple-900 font-medium">Natural Fat ({fatPct}%)</span>
                          </span>
                          <span className="text-stone-400">
                            Carbohydrates: {scaledCarbs}g (0%)
                          </span>
                        </div>
                      </div>

                      {/* Micronutrients & Quality Highlights */}
                      <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2 text-xs">
                        <div className="font-semibold text-stone-900 flex flex-wrap items-center justify-between gap-1">
                          <span>Key Nutritional Highlights:</span>
                          <span className="text-[11px] text-purple-900 font-medium">
                            {product.nutrition.keyHighlight}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1">
                          <div className="bg-white p-2 rounded-lg border border-stone-200/70">
                            <span className="text-stone-400 block">Carbohydrates</span>
                            <strong className="text-stone-800 font-mono">{scaledCarbs}g (Zero Sugar)</strong>
                          </div>

                          {product.nutrition.omega3G !== undefined ? (
                            <div className="bg-white p-2 rounded-lg border border-stone-200/70">
                              <span className="text-stone-400 block">Omega-3 Fatty Acids</span>
                              <strong className="text-emerald-800 font-mono">
                                {+(product.nutrition.omega3G * multiplier).toFixed(1)}g per {nutritionBasis === 'per100g' ? '100g' : selectedWeight}
                              </strong>
                            </div>
                          ) : product.nutrition.ironMg !== undefined ? (
                            <div className="bg-white p-2 rounded-lg border border-stone-200/70">
                              <span className="text-stone-400 block">Bioavailable Heme Iron</span>
                              <strong className="text-purple-900 font-mono">
                                {+(product.nutrition.ironMg * multiplier).toFixed(1)}mg per {nutritionBasis === 'per100g' ? '100g' : selectedWeight}
                              </strong>
                            </div>
                          ) : (
                            <div className="bg-white p-2 rounded-lg border border-stone-200/70">
                              <span className="text-stone-400 block">Preservatives / Chemicals</span>
                              <strong className="text-emerald-800">0% (Pure Clean Cut)</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {/* Subscribe Confirmation State */}
            {subConfirmed && createdSub ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-center space-y-3.5 my-2 animate-fade-in shadow-xs">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Weekly Subscription Active · Save 10% On Every Order
                  </span>
                  <h3 className="font-display text-lg font-bold text-stone-900 mt-0.5">
                    Recurring Delivery Scheduled!
                  </h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Freshly cut <strong>{product.name} ({selectedWeight})</strong> will be delivered{' '}
                    <strong className="text-purple-950">Every {createdSub.deliveryDay}</strong> during{' '}
                    <span className="text-stone-800">{createdSub.deliverySlot}</span>.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-emerald-200 max-w-md mx-auto text-left text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Recurring Frequency:</span>
                    <strong className="text-stone-900 capitalize font-medium">{createdSub.frequency} ({createdSub.deliveryDay})</strong>
                  </div>
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Butchery & Cleaning:</span>
                    <strong className="text-stone-900">{createdSub.cuttingStyle || 'Standard'}</strong>
                  </div>
                  <div className="flex justify-between items-center text-stone-600">
                    <span>Subscriber Price:</span>
                    <strong className="text-emerald-800 font-mono text-sm">₹{createdSub.discountedPrice} / delivery</strong>
                  </div>
                  <div className="flex justify-between items-center text-emerald-700 text-[11px] pt-1.5 border-t border-emerald-100">
                    <span>Locked-in Weekly Savings:</span>
                    <span className="font-bold">Save ₹{createdSub.savingsPerDelivery} (10% OFF applied)</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductForDetail(null);
                      setIsCustomerProfileOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>View & Manage in My Subscriptions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubConfirmed(false);
                      setSelectedProductForDetail(null);
                    }}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg border border-stone-200 transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Purchase Option Selector: One-Time vs Subscribe & Save */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Repeat className="w-4 h-4 text-emerald-700" />
                      <span>Purchase Option:</span>
                    </span>
                    {purchaseMode === 'subscribe' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Save 10% Extra</span>
                      </span>
                    )}
                  </div>

                  {/* Dual Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-stone-200/60 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPurchaseMode('one-time')}
                      className={`min-h-[44px] py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        purchaseMode === 'one-time'
                          ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <span>One-Time Purchase</span>
                      <span className="text-[11px] font-mono text-stone-500 mt-0.5">₹{regularPrice}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurchaseMode('subscribe')}
                      className={`py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                        purchaseMode === 'subscribe'
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'text-purple-950 hover:bg-stone-300/60'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>Subscribe & Save</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                            purchaseMode === 'subscribe'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          10% OFF
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-mono mt-0.5 ${
                          purchaseMode === 'subscribe' ? 'text-purple-200' : 'text-stone-600'
                        }`}
                      >
                        <span className="line-through mr-1 opacity-75">₹{regularPrice}</span>
                        <strong>₹{subscriptionPrice}</strong>
                      </span>
                    </button>
                  </div>

                  {/* Subscribe & Save Customization Controls */}
                  {purchaseMode === 'subscribe' && (
                    <div className="pt-2 border-t border-stone-200 space-y-3 animate-fade-in">
                      {/* Highlighted Value Banner */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-950 flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-1 text-emerald-900">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Save ₹{savingsPerDelivery} on every delivery (~₹{annualSavings}/year)</span>
                          </div>
                          <p className="text-[11px] text-emerald-800/90 leading-snug">
                            Butchered fresh upon arrival at {activeStore.neighborhood} Hub. No lock-in — skip next week, pause, or cancel anytime in 1 click.
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded shadow-2xs">
                          Free Cold-Chain Pouch
                        </span>
                      </div>

                      {/* Frequency Selection */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-purple-900" />
                          <span>Delivery Frequency:</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                          {[
                            { id: 'weekly', label: 'Weekly', sub: 'Every 7 days (Recommended)' },
                            { id: 'bi-weekly', label: 'Bi-Weekly', sub: 'Every 14 days' },
                            { id: 'twice-weekly', label: 'Twice a Week', sub: 'Wed & Sun' },
                          ].map((freq) => (
                            <button
                              key={freq.id}
                              type="button"
                              onClick={() => setSubFrequency(freq.id as SubscriptionFrequency)}
                              className={`min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                subFrequency === freq.id
                                  ? 'border-purple-900 bg-white ring-1 ring-purple-900 shadow-2xs'
                                  : 'border-stone-200 bg-white/70 hover:bg-white text-stone-700'
                              }`}
                            >
                              <span className="font-bold text-xs block text-stone-900">{freq.label}</span>
                              <span className="text-[10px] text-stone-500 block leading-tight">{freq.sub}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preferred Delivery Day */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-900" />
                            <span>Preferred Delivery Day:</span>
                          </span>
                          <span className="text-[10px] text-stone-500">From local {activeStore.neighborhood} Hub</span>
                        </label>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                          {(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as SubscriptionDay[]).map(
                            (day) => {
                              const isSelected = subDay === day;
                              const isPopular = day === 'Sunday' || day === 'Wednesday';
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => setSubDay(day)}
                                  className={`py-1.5 px-1 rounded-md text-center text-xs font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-900 text-white shadow-2xs'
                                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                                  }`}
                                >
                                  <span className="block text-[11px]">{day.slice(0, 3)}</span>
                                  {isPopular && (
                                    <span
                                      className={`block text-[8px] font-normal ${
                                        isSelected ? 'text-purple-200' : 'text-emerald-700 font-semibold'
                                      }`}
                                    >
                                      Popular
                                    </span>
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Delivery Time Window */}
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Preferred Time Window:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            {
                              id: 'Morning Fresh Catch (7:00 AM - 9:00 AM)',
                              title: 'Morning Fresh Catch',
                              time: '7:00 AM - 9:00 AM',
                              tag: 'Butchered overnight',
                            },
                            {
                              id: 'Evening Fresh (5:00 PM - 7:30 PM)',
                              title: 'Evening Cooking',
                              time: '5:00 PM - 7:30 PM',
                              tag: 'Ready for dinner',
                            },
                          ].map((slot) => (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setSubSlot(slot.id)}
                              className={`min-h-[44px] sm:min-h-0 p-2.5 sm:p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                subSlot === slot.id
                                  ? 'border-purple-900 bg-white ring-1 ring-purple-900 shadow-2xs'
                                  : 'border-stone-200 bg-white/70 hover:bg-white text-stone-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-stone-900">{slot.title}</span>
                                <span className="text-[10px] text-stone-500">{slot.tag}</span>
                              </div>
                              <span className="text-[11px] text-purple-900 font-mono block mt-0.5">{slot.time}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Guest Contact & Address (required when subscribing without login) */}
                      {!currentUser && (
                        <div className="pt-2 border-t border-stone-200 space-y-2.5">
                          <div className="text-[11px] font-bold text-purple-950 uppercase tracking-wide">
                            Delivery Contact & Address (No Login Required)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label htmlFor="sub-guest-name" className="block text-[11px] font-semibold text-stone-700 mb-1">
                                Recipient Name <span className="text-stone-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                id="sub-guest-name"
                                type="text"
                                autoComplete="off"
                                placeholder="Enter your name"
                                value={subName}
                                onChange={(e) => setSubName(e.target.value)}
                                className="w-full min-h-[40px] px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                              />
                            </div>
                            <div>
                              <label htmlFor="sub-guest-phone" className="block text-[11px] font-semibold text-stone-700 mb-1">
                                Mobile Number <span className="text-rose-600">*</span>
                              </label>
                              <input
                                id="sub-guest-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="off"
                                placeholder="Enter 10-digit mobile number"
                                value={subPhone}
                                onChange={(e) => {
                                  setSubPhone(e.target.value);
                                  if (subGuestErrors.phone) {
                                    setSubGuestErrors((prev) => ({ ...prev, phone: undefined }));
                                  }
                                }}
                                className={`w-full min-h-[40px] px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-2 ${
                                  subGuestErrors.phone
                                    ? 'border-rose-500 focus:ring-rose-500'
                                    : 'border-stone-300 focus:ring-purple-900'
                                }`}
                              />
                              {subGuestErrors.phone && (
                                <p className="mt-1 text-[11px] font-medium text-rose-600">{subGuestErrors.phone}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label htmlFor="sub-guest-address" className="block text-[11px] font-semibold text-stone-700 mb-1">
                              Complete Delivery Address <span className="text-rose-600">*</span>
                            </label>
                            <input
                              id="sub-guest-address"
                              type="text"
                              autoComplete="off"
                              placeholder="House / Flat No., Building, Street, Landmark"
                              value={subAddress}
                              onChange={(e) => {
                                setSubAddress(e.target.value);
                                if (subGuestErrors.address) {
                                  setSubGuestErrors((prev) => ({ ...prev, address: undefined }));
                                }
                              }}
                              className={`w-full min-h-[40px] px-2.5 py-1.5 text-xs bg-white border rounded-lg focus:outline-hidden focus:ring-2 ${
                                subGuestErrors.address
                                  ? 'border-rose-500 focus:ring-rose-500'
                                  : 'border-stone-300 focus:ring-purple-900'
                              }`}
                            />
                            {subGuestErrors.address && (
                              <p className="mt-1 text-[11px] font-medium text-rose-600">{subGuestErrors.address}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Guarantee summary */}
                      <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 space-y-1">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>10% discount automatically applied to all recurring deliveries</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Delivered at 0°C to 4°C with certified gel pack in insulated pouch</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Bottom Add to Cart Strip (Accessible from both tabs) */}
                <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="text-xs text-stone-500">
                    <div>
                      {purchaseMode === 'one-time' ? (
                        <>
                          <span>For <strong className="text-purple-950">{selectedWeight}</strong> ({storeStock && storeStock.stockCount > 0 ? `${storeStock.stockCount} packs in store` : 'Fresh batch'})</span>
                          <span className="block font-mono text-purple-950 font-bold text-sm">
                            ₹{regularPrice}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-purple-950">
                              Subscribe & Save ({selectedWeight})
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              10% OFF
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                            <span className="line-through text-stone-400 font-mono text-xs">₹{regularPrice}</span>
                            <span className="font-mono text-emerald-800 font-bold text-sm">₹{subscriptionPrice}</span>
                            <span className="text-[10px] text-stone-500">/ delivery · {subFrequency} on {subDay}s</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Buy Again button if previously ordered by logged-in customer */}
                    {hasPreviouslyOrdered && purchaseMode === 'one-time' && (
                      <button
                        type="button"
                        onClick={handleBuyAgain}
                        disabled={!isAvailable}
                        aria-disabled={!isAvailable}
                        className={`min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer border ${
                          !isAvailable
                            ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed select-none'
                            : boughtAgain
                            ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-400'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 active:scale-95'
                        }`}
                        title="Quick re-order this previously purchased item"
                      >
                        {boughtAgain ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            <span>Re-ordered!</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4 text-purple-900" />
                            <span>Buy Again</span>
                          </>
                        )}
                      </button>
                    )}

                    <div
                      className="relative group/modal-stock-tooltip inline-flex w-full sm:w-auto"
                      onMouseEnter={() => !isAvailable && setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      title={!isAvailable ? 'Out Of Stock' : undefined}
                    >
                      <button
                        onClick={handleAction}
                        disabled={!isAvailable}
                        aria-disabled={!isAvailable}
                        className={`w-full sm:w-auto min-h-[44px] sm:min-h-0 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                          !isAvailable
                            ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed select-none'
                            : added
                            ? 'bg-emerald-800 text-white'
                            : purchaseMode === 'subscribe'
                            ? 'bg-purple-900 hover:bg-purple-950 text-white'
                            : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {purchaseMode === 'subscribe' ? (
                          <>
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>Activate Subscription (₹{subscriptionPrice}/order)</span>
                          </>
                        ) : added ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Added to Cart!</span>
                          </>
                        ) : (
                          `Add ${selectedWeight} (₹${regularPrice})`
                        )}
                      </button>

                      {!isAvailable && (
                        <div
                          role="tooltip"
                          className={`pointer-events-none absolute bottom-full right-0 mb-2 z-40 transition-all duration-150 ${
                            showTooltip ? 'flex' : 'hidden'
                          } flex-col items-center group-hover/modal-stock-tooltip:flex`}
                        >
                          <div className="bg-[#18082e] text-amber-200 text-xs font-semibold px-3 py-1.5 rounded-md shadow-xl border border-purple-800/80 whitespace-nowrap flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            <span>Out Of Stock</span>
                          </div>
                          <div className="w-2 h-2 bg-[#18082e] rotate-45 -mt-1 border-r border-b border-purple-800/80" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

