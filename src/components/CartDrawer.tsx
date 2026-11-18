import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Clock,
  ShieldCheck,
  ThermometerSnowflake,
  Edit2,
  Check,
  ArrowRight,
  AlertCircle,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DELIVERY_SLOTS } from '../data/slots';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    updateCartItemNotes,
    removeFromCart,
    cartSubtotal,
    activeStore,
    selectedSlot,
    setSelectedSlot,
    setIsCheckoutOpen,
  } = useStore();

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = 499;
  const deliveryFee = cartSubtotal >= freeDeliveryThreshold ? 0 : (selectedSlot.fee ?? 0);
  const total = cartSubtotal + deliveryFee;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);

  const startEditNotes = (itemId: string, currentNotes = '') => {
    setEditingItemId(itemId);
    setTempNotes(currentNotes);
  };

  const saveNotes = (itemId: string) => {
    updateCartItemNotes(itemId, tempNotes);
    setEditingItemId(null);
  };

  const handleProceedCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-stone-200">
          {/* Cart Header */}
          <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-white bg-white-texture gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold font-display text-stone-900">
                  Your Fresh Cart ({cart.length})
                </h2>
                <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-2 py-0.5 rounded">
                  {activeStore.chillerTempC}°C Cold-Chain
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                Fulfilling live from <strong className="text-stone-900">{activeStore.neighborhood}</strong>
              </p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer shrink-0"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free delivery progress prompt */}
          {cart.length > 0 && (
            <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 text-xs">
              {deliveryFee === 0 ? (
                <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>FREE Chilled Delivery — No extra charge!</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-stone-700">
                  <span>Add <strong>₹{amountNeededForFreeDelivery}</strong> more for <strong className="text-emerald-700">FREE Delivery</strong></span>
                  <span className="font-mono text-stone-600">₹{cartSubtotal}/₹{freeDeliveryThreshold}</span>
                </div>
              )}
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
                  <ThermometerSnowflake className="w-8 h-8" />
                </div>
                <h3 className="font-display text-lg font-bold text-stone-800">
                  Your basket is empty
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Browse our fresh river catch, sea prawns, country chicken, and tender goat cuts.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-4 py-2 bg-purple-900 text-white text-xs font-semibold rounded-lg hover:bg-purple-950 transition-colors cursor-pointer shadow-xs"
                >
                  Browse Fresh Menu
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-lg object-cover bg-stone-50 border border-stone-200 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {item.product.name}
                      </h4>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-stone-900 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                          {item.selectedWeight}
                        </span>
                        <span>₹{item.unitPrice} each</span>
                        {item.isSubscription && (
                          <span className="line-through text-stone-400">
                            ₹{item.product.variants[item.selectedWeight]?.price}
                          </span>
                        )}
                      </div>

                      {item.isSubscription && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5 text-emerald-700" />
                            <span>Subscribe & Save · {item.subscriptionFrequency} on {item.subscriptionDay}s</span>
                          </span>
                          <span className="text-[10px] font-semibold text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            10% OFF
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-stone-900 tabular-nums">
                        ₹{item.unitPrice * item.quantity}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-200 rounded-md mt-1 bg-stone-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 sm:p-1 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono font-semibold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 sm:p-1 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Custom Cutting & Cleaning Notes */}
                  <div className="bg-stone-50 rounded-lg p-2.5 text-[11px] border border-stone-200">
                    {editingItemId === item.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="e.g. 'Make pieces small', 'Send extra soup bones', 'Clean skinless'"
                          className="w-full min-h-[40px] sm:min-h-0 px-2.5 py-1.5 bg-white border border-purple-300 rounded text-xs focus:outline-hidden focus:ring-1 focus:ring-purple-900"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="px-3 min-h-[36px] sm:min-h-0 py-1 text-stone-500 hover:text-stone-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveNotes(item.id)}
                            className="px-3 min-h-[36px] sm:min-h-0 py-1 bg-purple-900 text-white rounded font-medium cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-stone-600">
                          <strong className="text-purple-950">Butchery Note:</strong>{' '}
                          {item.customNotes || item.cuttingPreference || 'Standard medium curry cut, cleaned'}
                        </span>
                        <button
                          onClick={() => startEditNotes(item.id, item.customNotes)}
                          className="text-purple-900 hover:text-purple-950 shrink-0 font-medium cursor-pointer px-2 py-1"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Delivery Slot Picker & Financial Summary */}
          {cart.length > 0 && (
            <div className="border-t border-stone-200 bg-white p-4 space-y-3.5">
              {/* Delivery Slot Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-900">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Select Delivery Slot:</span>
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Within 4km of {activeStore.neighborhood}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DELIVERY_SLOTS.map((slot) => {
                    const isSelected = selectedSlot.id === slot.id;
                    const isExpress = slot.type === 'express';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`${isExpress ? 'sm:col-span-2 ' : ''}p-2.5 sm:p-2 min-h-[44px] rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-900 bg-white ring-1 ring-purple-900 shadow-2xs'
                            : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700'
                        }`}
                      >
                        <div className="font-semibold text-xs text-stone-900 flex items-center justify-between gap-2">
                          <span>{slot.title}</span>
                          {isExpress && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-purple-900 font-medium">
                          {isExpress ? slot.dateLabel : `${slot.timeWindow} (${slot.dateLabel})`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bill Details */}
              <div className="space-y-1 text-xs text-stone-600 border-t border-stone-200 pt-2.5">
                <div className="flex justify-between">
                  <span>Item Subtotal:</span>
                  <span className="font-mono text-stone-800 tabular-nums">₹{cartSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Partner Fee:</span>
                  <span className="font-mono text-stone-800 tabular-nums">
                    {deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 border-t border-stone-200 pt-1.5">
                  <span>Total Amount:</span>
                  <span className="font-mono tabular-nums text-purple-950">₹{total}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedCheckout}
                className="w-full min-h-[44px] py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Fresh Delivery</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>100% Satisfaction or instant fresh replacement</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
