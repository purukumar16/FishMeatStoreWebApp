import React, { useState } from 'react';
import {
  X,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  MessageSquare,
  Award,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import {
  getStoreWhatsAppRaw,
  getStoreWhatsAppDisplay,
  sendOrderToStoreWhatsApp,
  isMobileDevice,
} from '../utils/whatsapp';
import {
  calculateLoyaltyPointsEarned,
  getMaxRedeemablePoints,
  LOYALTY_EARN_RATE_PER_100,
  LOYALTY_POINT_VALUE_INR,
} from '../utils/loyalty';

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartSubtotal,
    activeStore,
    userLocation,
    selectedSlot,
    placeOrder,
    waitForOrderSync,
    currentUser,
    featureFlags,
  } = useStore();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(() => {
    if (!currentUser) return '';
    const def = currentUser.savedAddresses?.find((a) => a.isDefault) || currentUser.savedAddresses?.[0];
    return def?.formattedAddress || '';
  });
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; address?: string }>({});
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod' | 'card'>(
    featureFlags.enableOtherPayments ? 'upi' : 'cod'
  );
  const [applyLoyalty, setApplyLoyalty] = useState(false);
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availablePoints = currentUser ? Math.max(0, Math.floor(currentUser.loyaltyPoints ?? 0)) : 0;
  const maxRedeemable = currentUser ? getMaxRedeemablePoints(availablePoints, cartSubtotal) : 0;

  // Sync or reset contact & loyalty fields whenever modal opens or auth session changes
  React.useEffect(() => {
    if (!isCheckoutOpen) return;
    setFieldErrors({});
    setApplyLoyalty(false);
    setPointsToRedeemInput(maxRedeemable);
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      const def = currentUser.savedAddresses?.find((a) => a.isDefault) || currentUser.savedAddresses?.[0];
      setAddress(def?.formattedAddress || '');
    } else {
      setName('');
      setPhone('');
      setAddress('');
    }
  }, [currentUser, isCheckoutOpen, maxRedeemable]);

  // Keep payment method on Cash / UPI on Delivery when Other Payments is disabled
  React.useEffect(() => {
    if (!featureFlags.enableOtherPayments && paymentMethod !== 'cod') {
      setPaymentMethod('cod');
    }
  }, [featureFlags.enableOtherPayments, paymentMethod]);

  if (!isCheckoutOpen) return null;

  const activeRedeemedPoints =
    currentUser && applyLoyalty
      ? Math.max(0, Math.min(maxRedeemable, Math.floor(Number(pointsToRedeemInput) || 0)))
      : 0;
  const loyaltyDiscount = activeRedeemedPoints * LOYALTY_POINT_VALUE_INR;
  const netSubtotal = Math.max(0, cartSubtotal - loyaltyDiscount);
  const deliveryFee = cartSubtotal >= 499 ? 0 : (selectedSlot.fee ?? 0);
  const total = netSubtotal + deliveryFee;
  const pointsEarnedPreview = calculateLoyaltyPointsEarned(netSubtotal);

  const storeWaRaw = getStoreWhatsAppRaw(activeStore);
  const storeWaDisplay = getStoreWhatsAppDisplay(activeStore);
  const isMobile = isMobileDevice();
  const canSendWhatsAppOnMobile = isMobile && featureFlags.sendWhatsAppOnOrderConfirmation;

  const validateCheckout = (): boolean => {
    if (cart.length === 0) {
      return false;
    }
    const errors: { phone?: string; address?: string } = {};
    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) {
      errors.phone = 'Mobile number is required to confirm your order.';
    } else if (cleanDigits.length < 10 || cleanDigits.length > 15) {
      errors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      errors.address = 'Delivery address is required to confirm your order.';
    } else if (trimmedAddress.length < 5) {
      errors.address = 'Please enter a complete house, flat, or street address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCheckout()) {
      return;
    }

    setIsSubmitting(true);
    const newOrder = placeOrder({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      paymentMethod,
      loyaltyPointsToRedeem: activeRedeemedPoints,
    });

    // Trigger WhatsApp synchronously inside the user submit gesture on mobile when enabled by Admin
    if (canSendWhatsAppOnMobile) {
      sendOrderToStoreWhatsApp(newOrder, storeWaRaw);
    } else {
      await Promise.race([
        waitForOrderSync(newOrder.orderId),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-stone-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50 gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold font-display text-stone-900">
              Confirm Fresh Delivery
            </h2>
            <p className="text-xs text-stone-500">
              Fulfillment from <strong className="text-stone-800">{activeStore.name}</strong> (within 4km)
            </p>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg hover:bg-stone-200 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate autoComplete="off" className="p-4 sm:p-6 space-y-5">
          {/* Slot & Store Recap */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{selectedSlot.title}: {selectedSlot.timeWindow}</span>
              </span>
              <p className="text-[11px] text-stone-500">
                0-4°C chill chain maintained directly from local store chiller.
              </p>
            </div>
            <span className="font-semibold text-stone-900 font-mono tabular-nums text-sm shrink-0">
              ₹{total}
            </span>
          </div>

          {/* Delivery Address & Contact */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950/70">
                Delivery Contact & Address (Within 4km)
              </h3>
              {currentUser ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-mono tabular-nums">
                  {availablePoints} Loyalty Pts · Wallet ₹{currentUser.walletBalance}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Guest Checkout · View via Mobile OTP
                </span>
              )}
            </div>

            {/* Saved Addresses Quick Selection */}
            {currentUser && currentUser.savedAddresses && currentUser.savedAddresses.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-stone-600 block">
                  Select from Saved Addresses:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {currentUser.savedAddresses.map((sa) => (
                    <button
                      key={sa.id}
                      type="button"
                      onClick={() => {
                        setAddress(sa.formattedAddress);
                        if (sa.recipientName) setName(sa.recipientName);
                        if (sa.recipientPhone) setPhone(sa.recipientPhone);
                        setFieldErrors({});
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 text-left cursor-pointer flex items-center gap-1.5 ${
                        address === sa.formattedAddress
                          ? 'border-purple-900 bg-white text-purple-950 ring-1 ring-purple-900 font-semibold shadow-2xs'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{sa.label}</span>
                      <span className="text-[10px] text-stone-400 truncate max-w-[120px]">
                        ({sa.flatBuilding})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="checkout-recipient-name" className="block text-xs font-semibold text-stone-700 mb-1">
                  Recipient Name <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  id="checkout-recipient-name"
                  name="checkout_recipient_name"
                  type="text"
                  autoComplete="off"
                  placeholder="Optional · Saved as Guest 1, 2..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                />
                {!currentUser && (
                  <p className="mt-1 text-[10px] text-stone-500">
                    Leave blank to save automatically as Guest 1, Guest 2… with your mobile &amp; address.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-mobile-number" className="block text-xs font-semibold text-stone-700 mb-1">
                  Mobile Number (for live SMS) <span className="text-rose-600">*</span>
                </label>
                <input
                  id="checkout-mobile-number"
                  name="checkout_mobile_number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  required
                  placeholder="Enter 10-digit mobile number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  className={`w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 ${
                    fieldErrors.phone
                      ? 'border-rose-500 bg-rose-50/40 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-stone-300 focus:ring-purple-900 focus:border-purple-900'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label htmlFor="checkout-delivery-address" className="block text-xs font-semibold text-stone-700">
                  Complete House / Flat / Street Address <span className="text-rose-600">*</span>
                </label>
                {userLocation.neighborhood && (
                  <span className="text-[10px] text-stone-500 truncate">
                    Area: {userLocation.neighborhood}
                  </span>
                )}
              </div>
              <input
                id="checkout-delivery-address"
                name="checkout_delivery_address"
                type="text"
                autoComplete="off"
                required
                placeholder="House / Flat No., Building, Street, Landmark"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors.address) {
                    setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.address)}
                className={`w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 ${
                  fieldErrors.address
                    ? 'border-rose-500 bg-rose-50/40 focus:ring-rose-500 focus:border-rose-500'
                    : 'border-stone-300 focus:ring-purple-900 focus:border-purple-900'
                }`}
              />
              {fieldErrors.address && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">{fieldErrors.address}</p>
              )}
            </div>
          </div>

          {/* Loyalty Points Redemption Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950/70 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-900" />
                <span>Redeem Loyalty Points</span>
              </h3>
              <span className="text-[11px] text-stone-500 font-mono tabular-nums">
                1 pt = ₹{LOYALTY_POINT_VALUE_INR} off
              </span>
            </div>

            {currentUser ? (
              <div
                className={`p-3.5 rounded-xl border transition-all space-y-3 ${
                  applyLoyalty && activeRedeemedPoints > 0
                    ? 'bg-purple-50/70 border-purple-900 ring-1 ring-purple-900/40'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
                      <span>Available Balance:</span>
                      <span className="font-mono tabular-nums text-purple-950">
                        {availablePoints} pts (₹{availablePoints * LOYALTY_POINT_VALUE_INR})
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {maxRedeemable > 0
                        ? `Redeem up to ${maxRedeemable} pts (₹${maxRedeemable * LOYALTY_POINT_VALUE_INR} instant discount) on this order.`
                        : 'Place this order to earn Loyalty Points redeemable on future purchases.'}
                    </p>
                  </div>

                  {maxRedeemable > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !applyLoyalty;
                        setApplyLoyalty(next);
                        if (next && pointsToRedeemInput <= 0) {
                          setPointsToRedeemInput(maxRedeemable);
                        }
                      }}
                      className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        applyLoyalty
                          ? 'bg-purple-900 text-white border-purple-900'
                          : 'bg-white text-purple-950 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {applyLoyalty && <Check className="w-3.5 h-3.5" />}
                      <span>{applyLoyalty ? 'Discount Applied' : 'Redeem Points'}</span>
                    </button>
                  )}
                </div>

                {applyLoyalty && maxRedeemable > 0 && (
                  <div className="pt-2.5 border-t border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[25, 50, 100].map((preset) =>
                        preset <= maxRedeemable ? (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setPointsToRedeemInput(preset)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border cursor-pointer transition-colors ${
                              activeRedeemedPoints === preset
                                ? 'bg-purple-900 text-white border-purple-900'
                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {preset} pts
                          </button>
                        ) : null
                      )}
                      <button
                        type="button"
                        onClick={() => setPointsToRedeemInput(maxRedeemable)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border cursor-pointer transition-colors ${
                          activeRedeemedPoints === maxRedeemable
                            ? 'bg-purple-900 text-white border-purple-900'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        Max ({maxRedeemable})
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="checkout-loyalty-points" className="text-[11px] font-semibold text-stone-700 shrink-0">
                        Points:
                      </label>
                      <input
                        id="checkout-loyalty-points"
                        type="number"
                        min={1}
                        max={maxRedeemable}
                        value={pointsToRedeemInput}
                        onChange={(e) => {
                          const raw = Math.floor(Number(e.target.value) || 0);
                          setPointsToRedeemInput(Math.max(0, Math.min(maxRedeemable, raw)));
                        }}
                        className="w-24 px-2.5 py-1 text-xs font-mono tabular-nums border border-stone-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <p className="text-[11px] text-stone-600 leading-snug">
                  Sign in or verify via Mobile OTP to redeem existing Loyalty Points. Your points from this purchase (
                  <strong className="font-mono text-purple-950">+{pointsEarnedPreview} pts</strong>) will still be saved to your mobile number.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    navigate('/login');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-purple-950 font-semibold text-[11px] shrink-0 cursor-pointer whitespace-nowrap"
                >
                  Sign In / OTP
                </button>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-950/70">
              Select Payment Method
            </h3>

            <div
              className={`grid gap-2.5 ${
                featureFlags.enableOtherPayments ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'
              }`}
            >
              {featureFlags.enableOtherPayments && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'border-purple-900 bg-stone-50 ring-1 ring-purple-900'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-purple-900 mb-1" />
                  <div className="font-semibold text-xs text-stone-900">UPI Instant</div>
                  <div className="text-[10px] text-stone-500">GPay, PhonePe, Paytm</div>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-purple-900 bg-stone-50 ring-1 ring-purple-900'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Banknote className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs text-stone-900">Cash / UPI on Delivery</div>
                    <div className="text-[10px] text-stone-500">Pay via Cash or UPI QR after doorstep inspection</div>
                  </div>
                </div>
              </button>

              {featureFlags.enableOtherPayments && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-purple-900 bg-stone-50 ring-1 ring-purple-900'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-800 mb-1" />
                  <div className="font-semibold text-xs text-stone-900">Credit / Debit Card</div>
                  <div className="text-[10px] text-stone-500">Visa, Mastercard, RuPay</div>
                </button>
              )}
            </div>
          </div>

          {/* Order Summary Breakdown */}
          <div className="bg-stone-50 rounded-xl p-3.5 space-y-1.5 text-xs text-stone-600 border border-stone-200">
            <div className="flex justify-between font-semibold text-stone-900 mb-1">
              <span>{cart.length} Cut Items Ordered</span>
              <span className="font-mono tabular-nums">₹{cartSubtotal}</span>
            </div>
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-[11px] text-stone-500">
                <span className="truncate pr-2 flex items-center gap-1.5">
                  <span>{item.quantity}x {item.product.name} ({item.selectedWeight})</span>
                  {item.isSubscription && (
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 shrink-0">
                      Sub · {item.subscriptionFrequency}
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums shrink-0">
                  ₹{item.unitPrice * item.quantity}
                </span>
              </div>
            ))}

            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-[11px] font-semibold text-emerald-700 pt-1">
                <span>Loyalty Points Redeemed ({activeRedeemedPoints} pts)</span>
                <span className="font-mono tabular-nums">-₹{loyaltyDiscount}</span>
              </div>
            )}

            <div className="flex justify-between text-[11px] text-stone-500">
              <span>Delivery Fee {cartSubtotal >= 499 ? '(Free above ₹499)' : ''}</span>
              <span className="font-mono tabular-nums">
                {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </span>
            </div>

            <div className="border-t border-stone-200 pt-1.5 flex justify-between font-bold text-stone-900 text-sm">
              <span>Total Payable</span>
              <span className="font-mono tabular-nums text-purple-950">₹{total}</span>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-purple-900 font-medium">
              <span>
                Points Earned on Purchase ({LOYALTY_EARN_RATE_PER_100}{' '}
                {LOYALTY_EARN_RATE_PER_100 === 1 ? 'pt' : 'pts'} / ₹100)
              </span>
              <span className="font-mono font-bold tabular-nums text-emerald-700">
                +{pointsEarnedPreview} pts
              </span>
            </div>
          </div>

          {/* WhatsApp Direct Store Transmission Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-xs">
            <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-stone-700">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <span>
                  {canSendWhatsAppOnMobile ? 'Direct Store WhatsApp Dispatch' : 'Instant Store Order Confirmation'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
                  {storeWaDisplay}
                </span>
              </span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {canSendWhatsAppOnMobile
                  ? 'Submitting this order will also open WhatsApp on your mobile to transmit your ordered cuts and delivery address directly to the store.'
                  : 'Your order is sent straight to the store desk for cutting and dispatch.'}
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>
                  {canSendWhatsAppOnMobile
                    ? 'Confirming & Opening Store WhatsApp...'
                    : 'Confirming & Placing Order...'}
                </span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 text-emerald-300" />
                <span>
                  {canSendWhatsAppOnMobile
                    ? `Place Order & Send to Store WhatsApp (₹${total})`
                    : `Confirm & Place Order (₹${total})`}
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
