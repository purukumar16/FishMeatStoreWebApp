import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  ThermometerSnowflake,
  MessageSquare,
  Copy,
  Check,
  XCircle,
  Clock,
  Truck,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { OrderRecord } from '../types';
import {
  getStoreWhatsAppDisplay,
  getStoreWhatsAppLocal10,
  getStoreWhatsAppUrl,
  formatOrderWhatsAppMessage,
  isMobileDevice,
} from '../utils/whatsapp';
import { formatWeightGrams, getEffectiveItemLineTotal } from '../utils/orderWeight';
import {
  getOrderLoyaltyDiscount,
  getOrderLoyaltyEarned,
  getOrderLoyaltyRedeemed,
} from '../utils/loyalty';

const getStepFromOrderStatus = (status: OrderRecord['status']): number => {
  switch (status) {
    case 'confirmed':
      return 0;
    case 'allocated':
      return 1;
    case 'butchered_sealed':
      return 2;
    case 'out_for_delivery':
      return 3;
    case 'delivered':
      return 4;
    case 'cancelled':
    default:
      return -1;
  }
};

export const OrderTrackingModal: React.FC = () => {
  const { activeOrder, allOrders, clearActiveOrder, featureFlags, orderSyncState, retryOrderSync } = useStore();
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const isMobile = isMobileDevice();
  const showWhatsAppAction = isMobile && featureFlags.sendWhatsAppOnOrderConfirmation;

  const liveOrder = activeOrder
    ? allOrders.find((o) => o.orderId === activeOrder.orderId) || activeOrder
    : null;

  if (!liveOrder) return null;

  const syncStatus = orderSyncState[liveOrder.orderId];

  const handleRetrySync = async () => {
    setRetrying(true);
    await retryOrderSync(liveOrder.orderId);
    setRetrying(false);
  };

  const currentStep = getStepFromOrderStatus(liveOrder.status);
  const isCancelled = liveOrder.status === 'cancelled';

  const timelineSteps = [
    {
      title: 'Order Confirmed',
      desc: `Order placed at ${liveOrder.placedAt} · Awaiting store acceptance`,
      done: !isCancelled && currentStep >= 0,
      active: !isCancelled && currentStep === 0,
    },
    {
      title: 'Store Allocated',
      desc:
        currentStep >= 1 && liveOrder.acceptedAt
          ? `Accepted by ${liveOrder.acceptedBy || 'Store Incharge'} at ${liveOrder.acceptedAt}`
          : `Assigned to ${liveOrder.store.name} within 4km radius`,
      done: !isCancelled && currentStep >= 1,
      active: !isCancelled && currentStep === 1,
    },
    {
      title: 'Fresh Cut & Vacuum Sealed',
      desc: `Chilled at ${liveOrder.store.chillerTempC}°C, sanitized stainless cutting`,
      done: !isCancelled && currentStep >= 2,
      active: !isCancelled && currentStep === 2,
    },
    {
      title: 'Out for 4km Hyperlocal Delivery',
      desc: 'Delivery executive en route in insulated chilled carrier bag',
      done: !isCancelled && currentStep >= 3,
      active: !isCancelled && currentStep === 3,
    },
    {
      title: 'Delivered Fresh to Doorstep',
      desc: 'Inspected and handed over cold-chain intact',
      done: !isCancelled && currentStep >= 4,
      active: !isCancelled && currentStep === 4,
    },
  ];

  const getHeaderMeta = (status: OrderRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return {
          badge: 'ORDER CONFIRMED · AWAITING STORE ACCEPTANCE',
          subtitle: (
            <>
              Sent to <strong className="text-white">{liveOrder.store.neighborhood} Store</strong>
            </>
          ),
          icon: <Clock className="w-4 h-4 text-amber-300 shrink-0" />,
          colorClass: 'text-amber-300',
        };
      case 'allocated':
        return {
          badge: 'ACCEPTED BY STORE · PREPARING',
          subtitle: (
            <>
              Preparing at <strong className="text-white">{liveOrder.store.neighborhood} Store</strong>
            </>
          ),
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          colorClass: 'text-emerald-300',
        };
      case 'butchered_sealed':
        return {
          badge: 'CUTTING & VACUUM SEALING',
          subtitle: (
            <>
              Being freshly packed at{' '}
              <strong className="text-white">{liveOrder.store.neighborhood} Store</strong>
            </>
          ),
          icon: <CheckCircle2 className="w-4 h-4 text-purple-300 shrink-0" />,
          colorClass: 'text-purple-200',
        };
      case 'out_for_delivery':
        return {
          badge: 'OUT FOR 45-MIN EXPRESS DELIVERY',
          subtitle: (
            <>
              Dispatched via <strong className="text-white">{liveOrder.store.neighborhood} Store</strong>
            </>
          ),
          icon: <Truck className="w-4 h-4 text-sky-300 shrink-0" />,
          colorClass: 'text-sky-300',
        };
      case 'delivered':
        return {
          badge: 'DELIVERED FRESH TO DOORSTEP',
          subtitle: (
            <>
              Delivered from <strong className="text-white">{liveOrder.store.neighborhood} Store</strong>
            </>
          ),
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          colorClass: 'text-emerald-300',
        };
      case 'cancelled':
      default:
        return {
          badge: 'ORDER CANCELLED',
          subtitle: (
            <>
              Cancelled by <strong className="text-white">{liveOrder.store.neighborhood} Store</strong>
              {liveOrder.cancellationReason ? ` — ${liveOrder.cancellationReason}` : ''}
            </>
          ),
          icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
          colorClass: 'text-rose-300',
        };
    }
  };

  const headerMeta = getHeaderMeta(liveOrder.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-stone-200">
        {/* Header */}
        <div className="bg-[#21093b] text-white p-4 sm:p-5 relative">
          <button
            onClick={clearActiveOrder}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-purple-900/80 hover:bg-purple-900 text-purple-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Close order tracking"
          >
            <X className="w-4 h-4" />
          </button>

          <div className={`flex items-center gap-1.5 ${headerMeta.colorClass} text-xs font-semibold mb-1 pr-10`}>
            {headerMeta.icon}
            <span>{headerMeta.badge}</span>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-bold">
            Order #{liveOrder.orderId}
          </h3>
          <p className="text-xs text-purple-200 mt-1">{headerMeta.subtitle}</p>
        </div>

        {/* Cold-Chain Live Status Box */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs">
          <div className="flex items-center gap-2">
            <ThermometerSnowflake className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-stone-500">Live Chiller Telemetry:</span>
              <div className="font-bold text-stone-900">{liveOrder.temperatureLog}</div>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-stone-500">Slot Delivery:</span>
            <div className="font-bold text-purple-950">{liveOrder.deliverySlot.timeWindow}</div>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-4 sm:p-6 space-y-5">
          {syncStatus && (
            <div
              className={`rounded-xl px-3.5 py-2.5 border text-xs flex flex-wrap items-center justify-between gap-2 ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : syncStatus === 'error'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-stone-100 border-stone-200 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {syncStatus === 'synced' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : syncStatus === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 border-2 border-stone-400 border-t-purple-900 rounded-full animate-spin shrink-0" />
                )}
                <span className="font-semibold">
                  {syncStatus === 'synced'
                    ? 'Order received by Store Control Room'
                    : syncStatus === 'error'
                    ? 'Waiting to deliver order to Store Desk'
                    : 'Sending order to Store Desk...'}
                </span>
              </div>
              {syncStatus === 'error' && (
                <button
                  type="button"
                  onClick={handleRetrySync}
                  disabled={retrying}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                  <span>{retrying ? 'Retrying...' : 'Retry Sync'}</span>
                </button>
              )}
            </div>
          )}

          {/* Direct Store WhatsApp Confirmation Card */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-2xl p-4 border border-emerald-500/60 shadow-md space-y-3">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-800/90 border border-emerald-400/50 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <MessageSquare className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-white">
                      {showWhatsAppAction ? 'Transmitted to Store WhatsApp' : 'Order Logged for Store'}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.2 rounded border border-emerald-400/50">
                      {getStoreWhatsAppDisplay(liveOrder.store)}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100/90 mt-0.5">
                    {showWhatsAppAction
                      ? 'Order items, cut specifications, and delivery address sent directly to store butchery team.'
                      : 'Order items, cut specifications, and delivery address are logged for the store team.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-emerald-800/80">
              {showWhatsAppAction && (
                <a
                  href={getStoreWhatsAppUrl(liveOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[44px] py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open in Store WhatsApp ({getStoreWhatsAppLocal10(liveOrder.store)})</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(formatOrderWhatsAppMessage(liveOrder));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`${
                  showWhatsAppAction ? 'px-3' : 'flex-1 justify-center px-3'
                } min-h-[44px] py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs rounded-xl border border-emerald-600/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 font-semibold`}
                title="Copy formatted WhatsApp order message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copied
                    ? 'Order Details Copied'
                    : showWhatsAppAction
                    ? 'Copy Text'
                    : 'Copy Order Summary Text'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {timelineSteps.map((step, idx) => (
              <div key={step.title} className="flex items-start gap-3 relative">
                {idx < timelineSteps.length - 1 && (
                  <div
                    className={`absolute left-3.5 top-6 bottom-0 w-0.5 -mb-4 ${
                      step.done ? 'bg-emerald-600' : 'bg-stone-200'
                    }`}
                  />
                )}

                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 z-10 transition-colors ${
                    step.done
                      ? 'bg-emerald-600 text-white font-bold'
                      : step.active
                      ? 'bg-purple-900 text-white ring-4 ring-purple-100 font-bold'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </div>

                <div className="space-y-0.5">
                  <h4
                    className={`text-xs font-bold ${
                      step.active
                        ? 'text-purple-900'
                        : step.done
                        ? 'text-stone-900'
                        : 'text-stone-400'
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-stone-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Details */}
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 text-xs space-y-2">
            <div className="font-semibold text-stone-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>Items Being Prepared:</span>
                {liveOrder.weightUpdatedAt && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Final Wt Updated · {liveOrder.weightUpdatedAt}
                  </span>
                )}
              </div>
              <span className="font-mono text-purple-950 flex items-center gap-1.5">
                {typeof liveOrder.originalTotal === 'number' &&
                  liveOrder.originalTotal !== liveOrder.total && (
                    <span className="text-[11px] text-stone-400 line-through font-normal">
                      ₹{liveOrder.originalTotal}
                    </span>
                  )}
                <span>Total: ₹{liveOrder.total}</span>
              </span>
            </div>
            <div className="divide-y divide-stone-200">
              {liveOrder.items.map((item) => {
                const originalLineTotal = item.unitPrice * item.quantity;
                const effectiveLineTotal = getEffectiveItemLineTotal(item);
                const hasFinalWeight = typeof item.finalWeightGrams === 'number';
                return (
                  <div key={item.id} className="py-1.5 flex justify-between items-start gap-2 text-[11px] text-stone-600">
                    <div>
                      <span>
                        {item.quantity}x {item.product.name} ({item.selectedWeight})
                      </span>
                      {hasFinalWeight && (
                        <span className="ml-1.5 font-mono font-bold text-purple-900">
                          → Final: {formatWeightGrams(item.finalWeightGrams!)}
                        </span>
                      )}
                    </div>
                    <div className="font-mono shrink-0 text-right">
                      <span className="font-semibold text-stone-900">₹{effectiveLineTotal}</span>
                      {effectiveLineTotal !== originalLineTotal && (
                        <span className="ml-1 text-[10px] text-stone-400 line-through">
                          ₹{originalLineTotal}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {(getOrderLoyaltyDiscount(liveOrder) > 0 || getOrderLoyaltyEarned(liveOrder) > 0) && (
              <div className="pt-1.5 border-t border-stone-200 space-y-1 text-[11px]">
                {getOrderLoyaltyDiscount(liveOrder) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Loyalty Redeemed ({getOrderLoyaltyRedeemed(liveOrder)} pts)</span>
                    <span className="font-mono tabular-nums">
                      -₹{getOrderLoyaltyDiscount(liveOrder)}
                    </span>
                  </div>
                )}
                {getOrderLoyaltyEarned(liveOrder) > 0 && (
                  <div className="flex justify-between text-purple-900 font-semibold">
                    <span>Loyalty Points Earned</span>
                    <span className="font-mono tabular-nums text-emerald-700">
                      +{getOrderLoyaltyEarned(liveOrder)} pts
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="pt-1 text-[11px] text-stone-500 border-t border-stone-200">
              <strong>Delivering to:</strong> {liveOrder.deliveryAddress}
            </div>
          </div>

          <button
            onClick={clearActiveOrder}
            className="w-full min-h-[44px] py-2.5 bg-purple-900 hover:bg-purple-950 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
          >
            Back to Fresh Store
          </button>
        </div>
      </div>
    </div>
  );
};
