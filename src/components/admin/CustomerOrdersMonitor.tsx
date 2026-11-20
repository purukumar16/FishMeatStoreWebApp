import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  User,
  Phone,
  MapPin,
  ChevronRight,
  Printer,
  X,
  ThermometerSnowflake,
  MessageSquare,
  Copy,
  PhoneCall,
  BellRing,
  XCircle,
  AlertTriangle,
  Calendar,
  RotateCcw,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderRecord } from '../../types';
import {
  getStoreWhatsAppUrl,
  formatOrderWhatsAppMessage,
  isMobileDevice,
  getStoreWhatsAppDisplay,
} from '../../utils/whatsapp';
import { getLocalDateString, formatOrderDateLabel } from '../../utils/date';
import {
  calculateFinalLineTotal,
  formatWeightGrams,
  getEffectiveItemLineTotal,
  getOrderedItemWeightGrams,
} from '../../utils/orderWeight';
import { getOrderLoyaltyDiscount } from '../../utils/loyalty';

export const CustomerOrdersMonitor: React.FC = () => {
  const {
    allOrders,
    pendingIncomingOrders,
    updateOrderStatus,
    acceptOrder,
    updateOrderFinalWeights,
    cancelOrder,
    stores,
    adminUser,
    isCloudOrdersConnected,
    isSyncingCloudOrders,
    lastCloudOrdersSyncAt,
    refreshCloudOrders,
    loginWithGoogle,
    firebaseUser,
    authLoading,
  } = useStore();
  const isMobile = isMobileDevice();

  const todayDateStr = getLocalDateString(0);
  const yesterdayDateStr = getLocalDateString(-1);

  const isStoreAdmin = adminUser?.role === 'Store Admin' && Boolean(adminUser.assignedStoreId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isStoreAdmin && adminUser?.assignedStoreId ? adminUser.assignedStoreId : 'ALL'
  );

  useEffect(() => {
    if (isStoreAdmin && adminUser?.assignedStoreId) {
      setSelectedStoreId(adminUser.assignedStoreId);
    }
  }, [isStoreAdmin, adminUser?.assignedStoreId]);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderRecord['status']>('ALL');
  const [selectedOrderForKOT, setSelectedOrderForKOT] = useState<OrderRecord | null>(null);
  const [orderForWeightUpdate, setOrderForWeightUpdate] = useState<OrderRecord | null>(null);
  const [weightInputsByIndex, setWeightInputsByIndex] = useState<Record<number, string>>({});
  const [priceInputsByIndex, setPriceInputsByIndex] = useState<Record<number, string>>({});
  const [customPriceEditedByIndex, setCustomPriceEditedByIndex] = useState<Record<number, boolean>>({});
  const [isSavingFinalWeights, setIsSavingFinalWeights] = useState(false);
  const [weightUpdateError, setWeightUpdateError] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<OrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  const openFinalWeightModal = (order: OrderRecord) => {
    const initialWeights: Record<number, string> = {};
    const initialPrices: Record<number, string> = {};
    const initialEdited: Record<number, boolean> = {};
    order.items.forEach((item, idx) => {
      const grams =
        typeof item.finalWeightGrams === 'number'
          ? item.finalWeightGrams
          : getOrderedItemWeightGrams(item);
      const calculatedPrice = calculateFinalLineTotal(item, grams);
      const currentPrice = getEffectiveItemLineTotal(item);
      initialWeights[idx] = String(grams);
      initialPrices[idx] = String(currentPrice);
      initialEdited[idx] = currentPrice !== calculatedPrice;
    });
    setWeightInputsByIndex(initialWeights);
    setPriceInputsByIndex(initialPrices);
    setCustomPriceEditedByIndex(initialEdited);
    setWeightUpdateError(null);
    setOrderForWeightUpdate(order);
  };

  const parsedFinalWeights = useMemo<Record<number, number>>(() => {
    if (!orderForWeightUpdate) return {};
    const out: Record<number, number> = {};
    orderForWeightUpdate.items.forEach((item, idx) => {
      const raw = weightInputsByIndex[idx];
      const parsed = Number(raw);
      out[idx] =
        raw !== undefined && raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 0
          ? Math.min(100000, Math.round(parsed))
          : getOrderedItemWeightGrams(item);
    });
    return out;
  }, [orderForWeightUpdate, weightInputsByIndex]);

  const parsedFinalPrices = useMemo<Record<number, number>>(() => {
    if (!orderForWeightUpdate) return {};
    const out: Record<number, number> = {};
    orderForWeightUpdate.items.forEach((item, idx) => {
      const finalGrams = parsedFinalWeights[idx] ?? getOrderedItemWeightGrams(item);
      const autoPrice = calculateFinalLineTotal(item, finalGrams);
      if (customPriceEditedByIndex[idx]) {
        const rawPrice = priceInputsByIndex[idx];
        const parsedPrice = Number(rawPrice);
        out[idx] =
          rawPrice !== undefined &&
          rawPrice.trim() !== '' &&
          Number.isFinite(parsedPrice) &&
          parsedPrice >= 0
            ? Math.min(500000, Math.round(parsedPrice))
            : autoPrice;
      } else {
        out[idx] = autoPrice;
      }
    });
    return out;
  }, [orderForWeightUpdate, parsedFinalWeights, priceInputsByIndex, customPriceEditedByIndex]);

  const handleSaveFinalWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForWeightUpdate || isSavingFinalWeights) return;

    const finalWeightsPayload: Record<number, number> = {};
    const finalPricesPayload: Record<number, number> = {};

    for (let idx = 0; idx < orderForWeightUpdate.items.length; idx++) {
      const item = orderForWeightUpdate.items[idx];
      const rawWeight = weightInputsByIndex[idx];
      const parsedWeight = Number(rawWeight);
      if (
        rawWeight === undefined ||
        rawWeight.trim() === '' ||
        !Number.isFinite(parsedWeight) ||
        parsedWeight < 0 ||
        parsedWeight > 100000
      ) {
        setWeightUpdateError(
          `Please enter a valid final weight (0g - 100,000g) for ${item.product.name}.`
        );
        return;
      }
      const cleanWeight = Math.min(100000, Math.round(parsedWeight));
      finalWeightsPayload[idx] = cleanWeight;

      if (customPriceEditedByIndex[idx]) {
        const rawPrice = priceInputsByIndex[idx];
        const parsedPrice = Number(rawPrice);
        if (
          rawPrice === undefined ||
          rawPrice.trim() === '' ||
          !Number.isFinite(parsedPrice) ||
          parsedPrice < 0 ||
          parsedPrice > 500000
        ) {
          setWeightUpdateError(
            `Please enter a valid final price (₹0 - ₹500,000) for ${item.product.name}.`
          );
          return;
        }
        finalPricesPayload[idx] = Math.min(500000, Math.round(parsedPrice));
      } else {
        finalPricesPayload[idx] = calculateFinalLineTotal(item, cleanWeight);
      }
    }

    const nextSubtotal = Object.values(finalPricesPayload).reduce((sum, val) => sum + val, 0);
    const appliedDiscount = Math.min(
      nextSubtotal,
      getOrderLoyaltyDiscount(orderForWeightUpdate)
    );
    const nextTotal =
      Math.max(0, nextSubtotal - appliedDiscount) +
      (Number(orderForWeightUpdate.deliveryFee) || 0) +
      (Number(orderForWeightUpdate.packagingFee) || 0);

    setIsSavingFinalWeights(true);
    setWeightUpdateError(null);
    try {
      const saved = await updateOrderFinalWeights(
        orderForWeightUpdate.orderId,
        finalWeightsPayload,
        finalPricesPayload
      );
      if (saved) {
        const updatedId = orderForWeightUpdate.orderId;
        setOrderForWeightUpdate(null);
        setWeightUpdateError(null);
        showToast(
          `✓ Final weight & price updated for Order #${updatedId} — Updated Bill: ₹${nextTotal}.`
        );
      } else {
        setWeightUpdateError(
          'Unable to save final weight & price update to Firestore. Please verify you are signed in with Admin/Store Admin permissions and try again.'
        );
      }
    } catch {
      setWeightUpdateError(
        'Failed to save final weight & price update. Please check your connection and try again.'
      );
    } finally {
      setIsSavingFinalWeights(false);
    }
  };

  const showToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3000);
  };

  // Scope orders to selected date (Today includes incoming orders & cross-timezone ahead dates)
  const ordersForSelectedDate = useMemo(() => {
    if (selectedDate === 'ALL') {
      return allOrders;
    }
    if (selectedDate === todayDateStr) {
      return allOrders.filter(
        (order) =>
          (order.placedDate || todayDateStr) >= todayDateStr ||
          order.status === 'confirmed'
      );
    }
    return allOrders.filter((order) => (order.placedDate || todayDateStr) === selectedDate);
  }, [allOrders, selectedDate, todayDateStr]);

  // Filter orders across Store Hub, Status, Search within the selected date
  const filteredOrders = useMemo(() => {
    return ordersForSelectedDate.filter((order) => {
      if (selectedStoreId !== 'ALL' && order.store.id !== selectedStoreId) {
        return false;
      }
      if (statusFilter !== 'ALL') {
        if (order.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = order.orderId.toLowerCase().includes(q);
        const matchesCustomer = order.contactName.toLowerCase().includes(q);
        const matchesPhone = order.contactPhone.toLowerCase().includes(q);
        const matchesItem = order.items.some((i) =>
          i.product.name.toLowerCase().includes(q)
        );
        if (!matchesId && !matchesCustomer && !matchesPhone && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [ordersForSelectedDate, selectedStoreId, statusFilter, searchQuery]);

  // Order counts for quick status filter tabs (scoped to selected date: Today by default)
  const counts = useMemo(() => {
    const total = ordersForSelectedDate.length;
    const unaccepted = ordersForSelectedDate.filter((o) => o.status === 'confirmed').length;
    const pending = ordersForSelectedDate.filter((o) => o.status === 'allocated').length;
    const butchering = ordersForSelectedDate.filter((o) => o.status === 'butchered_sealed').length;
    const outForDelivery = ordersForSelectedDate.filter((o) => o.status === 'out_for_delivery').length;
    const delivered = ordersForSelectedDate.filter((o) => o.status === 'delivered').length;
    const cancelled = ordersForSelectedDate.filter((o) => o.status === 'cancelled').length;

    return { total, unaccepted, pending, butchering, outForDelivery, delivered, cancelled };
  }, [ordersForSelectedDate]);

  const handleAcceptOrder = (orderId: string) => {
    acceptOrder(orderId);
    showToast(`✓ Order #${orderId} accepted! Moving to Pending Butchery.`);
  };

  const openCancelModal = (order: OrderRecord) => {
    setOrderToCancel(order);
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToCancel) return;
    if (!cancelReason.trim()) {
      setCancelError('Please enter a reason to cancel this order.');
      return;
    }
    cancelOrder(orderToCancel.orderId, cancelReason.trim());
    showToast(`Order #${orderToCancel.orderId} cancelled.`);
    setOrderToCancel(null);
    setCancelReason('');
    setCancelError(null);
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: OrderRecord['status']) => {
    let nextStatus: OrderRecord['status'] = 'allocated';
    let label = '';

    if (currentStatus === 'confirmed' || currentStatus === 'allocated') {
      nextStatus = 'butchered_sealed';
      label = 'Order moved to Butcher Cutting & Vacuum-Sealing';
    } else if (currentStatus === 'butchered_sealed') {
      nextStatus = 'out_for_delivery';
      label = 'Order dispatched with 45-Min Express Courier';
    } else if (currentStatus === 'out_for_delivery') {
      nextStatus = 'delivered';
      label = 'Order marked as Delivered to Customer';
    }

    if (nextStatus) {
      updateOrderStatus(orderId, nextStatus);
      showToast(`✓ Order #${orderId}: ${label}`);
    }
  };

  const getStatusBadge = (status: OrderRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
            <BellRing className="w-3 h-3 text-rose-600 animate-bounce" />
            <span>New Order · Awaiting Acceptance</span>
          </span>
        );
      case 'allocated':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Order Accepted · Preparing</span>
          </span>
        );
      case 'butchered_sealed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            <span>Cutting & Insulated Packaging</span>
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5 shadow-2xs">
            <Truck className="w-3 h-3 text-blue-600 animate-pulse" />
            <span>Out for 45-Min Express Delivery</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Delivered</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Toast */}
      {actionSuccessToast && (
        <div className="fixed top-4 left-3 right-3 sm:left-auto sm:top-20 sm:right-6 sm:max-w-sm z-50 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Cross-Device Cloud Sync Status / Connect Banner */}
      {isCloudOrdersConnected ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-emerald-950">Live Cross-Device Order Sync Active</span>
              <span className="text-emerald-800 ml-2 text-[11px]">
                Connected as {firebaseUser?.email}
                {isStoreAdmin && adminUser?.assignedStoreName ? ` · ${adminUser.assignedStoreName}` : ''}
                {lastCloudOrdersSyncAt ? ` · Updated ${lastCloudOrdersSyncAt}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshCloudOrders()}
            disabled={isSyncingCloudOrders}
            className="min-h-[36px] sm:min-h-0 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 font-semibold text-xs rounded-lg border border-emerald-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncingCloudOrders ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloudOrders ? 'Refreshing...' : 'Refresh Cloud Orders'}</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-rose-950">
                Cross-Device Live Order Sync Disconnected
              </div>
              <p className="text-[11px] text-rose-900 leading-relaxed">
                {firebaseUser?.email
                  ? `Signed in with ${firebaseUser.email}, which only shows its own orders. Sign in with your Store Admin Google account (fthisirihub@gmail.com for ISIRI HUB, fthgramiq@gmail.com for Gramiq Hypermart) or Root Admin to receive orders from other sessions & mobile devices.`
                  : 'Portal credentials only display orders placed on this same browser. Connect Google Admin Sync (fthisirihub@gmail.com for ISIRI HUB, fthgramiq@gmail.com for Gramiq Hypermart, or Root Admin) to receive orders from other sessions and mobile devices.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loginWithGoogle('admin')}
            disabled={authLoading}
            className="min-h-[40px] sm:min-h-0 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {authLoading ? 'Connecting...' : 'Connect Google Admin Sync'}
          </button>
        </div>
      )}

      {/* Incoming Ringing Orders Banner */}
      {pendingIncomingOrders.length > 0 && (
        <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 animate-bounce">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900">
                {pendingIncomingOrders.length} New Incoming Order
                {pendingIncomingOrders.length > 1 ? 's' : ''} Awaiting Store Acceptance
              </div>
              <p className="text-[11px] text-amber-900">
                Alert sound loops continuously until each new order is accepted below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const hasIncomingInSelectedDate = ordersForSelectedDate.some(
                (o) => o.status === 'confirmed'
              );
              if (!hasIncomingInSelectedDate) {
                setSelectedDate('ALL');
              }
              setStatusFilter('confirmed');
            }}
            className="min-h-[40px] sm:min-h-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Show New Orders ({pendingIncomingOrders.length})
          </button>
        </div>
      )}

      {/* Sticky Filter & Hub Bar (Frozen at top while scrolling orders) */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-stone-50/95 backdrop-blur-xs border-b border-stone-200/70">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Order #, customer name, phone, cut..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-3 py-2 sm:py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Store Hub Filter + Count */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-600 font-medium shrink-0">Store Hub:</span>
              <select
                value={selectedStoreId}
                disabled={isStoreAdmin}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-3 py-2 sm:py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer disabled:bg-stone-100 disabled:cursor-not-allowed"
              >
                {!isStoreAdmin && (
                  <option value="ALL">All Store Hubs ({ordersForSelectedDate.length})</option>
                )}
                {stores
                  .filter((s) => !isStoreAdmin || s.id === adminUser?.assignedStoreId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.neighborhood})
                    </option>
                  ))}
              </select>
            </div>

            <span className="text-xs text-stone-600 sm:pl-2 sm:border-l sm:border-stone-200 whitespace-nowrap">
              Showing <strong className="text-stone-900">{filteredOrders.length}</strong>{' '}
              {selectedDate === 'ALL'
                ? 'orders (All Dates)'
                : `orders (${formatOrderDateLabel(selectedDate)})`}
            </span>
          </div>
        </div>

        {/* Date Filter Bar (Defaults to Today) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mr-1">
            <Calendar className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <span>Order Date:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(todayDateStr)}
            className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              selectedDate === todayDateStr
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(yesterdayDateStr)}
            className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              selectedDate === yesterdayDateStr
                ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            Yesterday
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate('ALL')}
            className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              selectedDate === 'ALL'
                ? 'bg-purple-900 text-white border-purple-900 shadow-2xs'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            All Past & Today
          </button>

          <div className="flex items-center gap-1.5 ml-0 sm:ml-1">
            <label htmlFor="customer-orders-date-picker" className="text-[11px] text-stone-500 font-medium">
              Pick Date:
            </label>
            <input
              id="customer-orders-date-picker"
              type="date"
              value={selectedDate === 'ALL' ? '' : selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value || todayDateStr);
              }}
              className="min-h-[38px] sm:min-h-0 px-2.5 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white cursor-pointer"
            />
          </div>
        </div>

        {/* Status Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-purple-900 text-white border-purple-900'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>All Orders ({counts.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('confirmed')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'confirmed'
                ? 'bg-rose-600 text-white border-rose-600'
                : counts.unaccepted > 0
                ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>New Orders ({counts.unaccepted})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('allocated')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'allocated'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Butchery ({counts.pending})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('butchered_sealed')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'butchered_sealed'
                ? 'bg-purple-700 text-white border-purple-700'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cutting & Pack ({counts.butchering})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('out_for_delivery')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'out_for_delivery'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>In 45-Min Transit ({counts.outForDelivery})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('delivered')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'delivered'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered ({counts.delivered})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('cancelled')}
            className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'cancelled'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled ({counts.cancelled})</span>
          </button>

          {(statusFilter !== 'ALL' ||
            (!isStoreAdmin && selectedStoreId !== 'ALL') ||
            selectedDate !== todayDateStr ||
            searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setSelectedStoreId(
                  isStoreAdmin && adminUser?.assignedStoreId ? adminUser.assignedStoreId : 'ALL'
                );
                setSelectedDate(todayDateStr);
                setSearchQuery('');
              }}
              className="min-h-[40px] sm:min-h-0 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 underline font-semibold cursor-pointer ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
            <Package className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="text-base font-bold text-stone-900">
              No Customer Orders Found{' '}
              {selectedDate !== 'ALL' ? `for ${formatOrderDateLabel(selectedDate)}` : ''}
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              No orders matched the selected date and filters. Pick a different date to view past orders, switch store hubs, or clear your search.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const itemCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
            const isUnaccepted = order.status === 'confirmed';
            const isCancelled = order.status === 'cancelled';

            return (
              <div
                key={order.orderId}
                className={`border rounded-2xl p-4 sm:p-5 transition-all space-y-4 ${
                  isCancelled
                    ? 'bg-rose-50/20 border-rose-200 opacity-90 shadow-2xs'
                    : isUnaccepted
                    ? 'bg-amber-50/30 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                    : 'bg-white border-stone-200 hover:border-purple-300 shadow-2xs'
                }`}
              >
                {/* Order Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-purple-950 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      #{order.orderId}
                    </span>
                    <span className="text-xs text-stone-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {formatOrderDateLabel(order.placedDate)} · {order.placedAt}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {order.store.neighborhood} Hub
                    </span>
                    <span className="text-[11px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 flex items-center gap-1">
                      <ThermometerSnowflake className="w-3 h-3 text-cyan-600" />
                      <span>{order.temperatureLog}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Main Order Details: Customer & Items (Expanded Full Window) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Customer & Address Information */}
                  <div className="lg:col-span-4 space-y-2.5 bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs">
                    <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{order.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono">{order.contactPhone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-stone-600 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{order.deliveryAddress}</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">Delivery Slot:</span>
                      <strong className="text-emerald-700">{order.deliverySlot.title}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">Store Hub:</span>
                      <strong className="text-stone-800 text-right">{order.store.name}</strong>
                    </div>
                  </div>

                  {/* Order Items Breakdown (Full list, no height clipping) */}
                  <div className="lg:col-span-8 space-y-2">
                    <div className="text-xs font-bold text-stone-900 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Purchased Cuts & Items ({itemCount} items)</span>
                        {order.weightUpdatedAt && (
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Final Wt Updated · {order.weightUpdatedAt}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        {(order.status === 'allocated' ||
                          order.status === 'butchered_sealed' ||
                          order.status === 'out_for_delivery') && (
                          <button
                            type="button"
                            onClick={() => openFinalWeightModal(order)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Scale className="w-3 h-3 text-purple-700" />
                            <span>{order.weightUpdatedAt ? 'Edit Final Weight' : 'Update Final Weight'}</span>
                          </button>
                        )}
                        <span className="font-mono text-sm text-purple-900 flex items-center gap-1.5">
                          {typeof order.originalTotal === 'number' && order.originalTotal !== order.total && (
                            <span className="text-[11px] text-stone-400 line-through font-normal">
                              ₹{order.originalTotal}
                            </span>
                          )}
                          <span>{order.weightUpdatedAt ? `Updated Total: ₹${order.total}` : `Total: ₹${order.total}`}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {order.items.map((item, idx) => {
                        const orderedGrams = getOrderedItemWeightGrams(item);
                        const originalLineTotal = Math.round(item.unitPrice * item.quantity);
                        const effectiveLineTotal = getEffectiveItemLineTotal(item);
                        const hasFinalWeight = typeof item.finalWeightGrams === 'number';
                        const weightDiff = hasFinalWeight ? item.finalWeightGrams! - orderedGrams : 0;

                        return (
                          <div
                            key={idx}
                            className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={item.product.image || undefined}
                                alt={item.product.name}
                                className="w-11 h-11 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-stone-900 block leading-snug">
                                  {item.product.name}
                                </span>
                                <div className="text-[11px] text-stone-600 flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="bg-white px-1.5 py-0.2 rounded border border-stone-200 font-mono text-stone-800">
                                    Ordered:{' '}
                                    {typeof item.selectedWeight === 'string'
                                      ? item.selectedWeight
                                      : (item.selectedWeight as any)?.weightLabel || '1kg'}
                                  </span>
                                  <span>
                                    Qty: <strong className="text-stone-900">{item.quantity}</strong>
                                  </span>
                                  {hasFinalWeight && (
                                    <span className="bg-purple-50 text-purple-950 border border-purple-300 px-1.5 py-0.2 rounded font-mono font-bold">
                                      Final: {formatWeightGrams(item.finalWeightGrams!)}
                                      {weightDiff !== 0
                                        ? ` (${weightDiff > 0 ? '+' : ''}${weightDiff}g)`
                                        : ''}
                                    </span>
                                  )}
                                  {item.cuttingPreference && (
                                    <span className="text-emerald-700 font-medium">
                                      Cut: {item.cuttingPreference}
                                    </span>
                                  )}
                                </div>
                                {item.customNotes && (
                                  <p className="text-[10px] text-amber-800 mt-1 italic">
                                    Note: &quot;{item.customNotes}&quot;
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-stone-900 block">
                                ₹{effectiveLineTotal}
                              </span>
                              {effectiveLineTotal !== originalLineTotal && (
                                <span className="font-mono text-[10px] text-stone-400 line-through block">
                                  ₹{originalLineTotal}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Cancellation Details Banner if Cancelled */}
                {isCancelled && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-rose-900">
                        Order Cancelled
                        {order.cancelledAt ? ` at ${order.cancelledAt}` : ''}
                        {order.cancelledBy ? ` · by ${order.cancelledBy}` : ''}
                      </div>
                      <p className="text-rose-800">
                        <strong className="font-semibold">Reason:</strong>{' '}
                        {order.cancellationReason || 'Cancelled by store'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Actions Row */}
                <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                    <span>
                      Payment: <strong className="text-stone-900 uppercase font-mono">{order.paymentMethod}</strong>
                    </span>
                    <span className="text-stone-400">·</span>
                    <span>
                      Bill: <strong className="font-mono text-purple-950">₹{order.total}</strong>
                      {order.deliveryFee > 0 ? ` (incl. ₹${order.deliveryFee} delivery)` : ''}
                    </span>
                    {order.weightUpdatedBy && (
                      <span className="text-[11px] text-emerald-700 font-medium">
                        (Weighed by {order.weightUpdatedBy})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                    {isMobile ? (
                      <a
                        href={getStoreWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title={`Send or open order on Store WhatsApp (${getStoreWhatsAppDisplay(order.store)})`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Store WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(formatOrderWhatsAppMessage(order));
                          showToast(`Order #${order.orderId} WhatsApp summary copied to clipboard.`);
                        }}
                        className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Copy formatted WhatsApp order details (WhatsApp window disabled on desktop)"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copy Order Text</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForKOT(order)}
                      className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-semibold border border-purple-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Print KOT</span>
                    </button>

                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => openCancelModal(order)}
                        className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-semibold border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancel Order</span>
                      </button>
                    )}

                    {isCancelled ? (
                      <span className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center justify-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Order Cancelled</span>
                      </span>
                    ) : isUnaccepted ? (
                      <button
                        type="button"
                        onClick={() => handleAcceptOrder(order.orderId)}
                        className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 animate-pulse"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Accept Order</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1.5 cursor-default opacity-90"
                          title={
                            order.acceptedAt
                              ? `Accepted at ${order.acceptedAt}${order.acceptedBy ? ` by ${order.acceptedBy}` : ''}`
                              : 'Order Accepted'
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Accept Order · Accepted</span>
                        </button>

                        {order.status !== 'delivered' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order.orderId, order.status)}
                            className={`w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                              order.status === 'allocated'
                                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                                : order.status === 'butchered_sealed'
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {order.status === 'allocated' ? (
                              <>
                                <span>Start Cutting & Packing</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            ) : order.status === 'butchered_sealed' ? (
                              <>
                                <Truck className="w-3.5 h-3.5" />
                                <span>Handover to 45-Min Courier</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark as Delivered</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* KOT / PACKING SLIP MODAL */}
      {selectedOrderForKOT && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white text-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-300 my-auto max-h-[92vh] flex flex-col">
            <div className="bg-stone-50 border-b border-stone-200 text-stone-900 p-3.5 sm:p-4 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Printer className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-bold text-sm tracking-wide truncate">
                  Butchery KOT & Transit Cold-Chain Slip
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForKOT(null)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-900 cursor-pointer shrink-0"
                aria-label="Close KOT modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs font-mono overflow-y-auto flex-1">
              <div className="text-center pb-3 border-b border-dashed border-stone-300">
                <h3 className="font-bold text-base uppercase">Fish Meat Store</h3>
                <p className="text-[11px] text-stone-600">
                  {selectedOrderForKOT.store.name} · {selectedOrderForKOT.store.neighborhood}
                </p>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  FSSAI Lic: 11224333000892 · Temperature Compliance SOC2
                </p>
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
                <span>ORDER: <strong>#{selectedOrderForKOT.orderId}</strong></span>
                <span>TIME: {selectedOrderForKOT.placedAt}</span>
              </div>

              <div className="bg-stone-100 p-2.5 rounded-lg space-y-1">
                <div>CUSTOMER: <strong>{selectedOrderForKOT.contactName}</strong> ({selectedOrderForKOT.contactPhone})</div>
                <div className="text-[11px] text-stone-700">DELIVER TO: {selectedOrderForKOT.deliveryAddress}</div>
                <div>EXPRESS SLOT: <span className="underline">{selectedOrderForKOT.deliverySlot.title}</span></div>
              </div>

              <div>
                <div className="font-bold text-[11px] uppercase border-b border-stone-300 pb-1 mb-2">
                  Butcher Cut & Pack Instructions
                </div>
                <div className="space-y-2">
                  {selectedOrderForKOT.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2">
                      <div>
                        <strong>{item.quantity}x {item.product.name}</strong> ({typeof item.selectedWeight === 'string' ? item.selectedWeight : (item.selectedWeight as any)?.weightLabel || '1kg'})
                        {typeof item.finalWeightGrams === 'number' && (
                          <div className="text-[10px] font-bold text-purple-900">
                            Final Weight: {formatWeightGrams(item.finalWeightGrams)}
                          </div>
                        )}
                        {item.cuttingPreference && (
                          <div className="text-[10px] text-stone-600">Cut: {item.cuttingPreference}</div>
                        )}
                        {item.customNotes && (
                          <div className="text-[10px] text-amber-800 font-sans font-bold">
                            ⚠️ Note: {item.customNotes}
                          </div>
                        )}
                      </div>
                      <div className="font-bold shrink-0">₹{getEffectiveItemLineTotal(item)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-stone-300 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{selectedOrderForKOT.subtotal}</span>
                </div>
                {selectedOrderForKOT.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>₹{selectedOrderForKOT.deliveryFee}</span>
                  </div>
                )}
                {selectedOrderForKOT.packagingFee > 0 && (
                  <div className="flex justify-between">
                    <span>Packaging Fee:</span>
                    <span>₹{selectedOrderForKOT.packagingFee}</span>
                  </div>
                )}
                {typeof selectedOrderForKOT.originalTotal === 'number' &&
                  selectedOrderForKOT.originalTotal !== selectedOrderForKOT.total && (
                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>Original Estimated Bill:</span>
                      <span className="line-through">₹{selectedOrderForKOT.originalTotal}</span>
                    </div>
                  )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-stone-300">
                  <span>FINAL TOTAL BILL:</span>
                  <span>₹{selectedOrderForKOT.total}</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-0.5 text-[11px] text-emerald-900">
                <div className="font-bold">VERIFIED COLD-CHAIN DISPATCH: {selectedOrderForKOT.temperatureLog}</div>
                <div className="text-[10px]">Butcher Verified & Insulated Sealed · Delivered in 45 Mins</div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] text-stone-500 font-sans">
                Printed by: {adminUser?.name || 'Store Incharge'}
              </span>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForKOT(null)}
                  className="min-h-[44px] sm:min-h-0 px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* UPDATE FINAL WEIGHT & BILL MODAL */}
      {orderForWeightUpdate && (
        <div className="fixed inset-0 z-50 bg-stone-950/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white text-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-200 my-auto max-h-[92vh] flex flex-col">
            <div className="bg-purple-950 text-white p-4 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-800 flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">
                    Update Final Item Weight &amp; Bill · #{orderForWeightUpdate.orderId}
                  </h4>
                  <p className="text-[11px] text-purple-200 truncate">
                    {orderForWeightUpdate.contactName} · {orderForWeightUpdate.store.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderForWeightUpdate(null);
                  setWeightUpdateError(null);
                }}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg text-purple-200 hover:text-white hover:bg-purple-900 cursor-pointer shrink-0"
                aria-label="Close final weight modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFinalWeights} noValidate className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 leading-relaxed">
                  Enter the exact weighed weight (in <strong>grams</strong>) for each freshly prepared cut below. Item prices and the customer&apos;s final bill recalculate automatically (or you can adjust the final item price directly).
                </div>

                <div className="space-y-3">
                  {orderForWeightUpdate.items.map((item, idx) => {
                    const orderedGrams = getOrderedItemWeightGrams(item);
                    const rawInput = weightInputsByIndex[idx] ?? String(orderedGrams);
                    const finalGrams = parsedFinalWeights[idx] ?? orderedGrams;
                    const originalLineTotal = Math.round(item.unitPrice * item.quantity);
                    const autoCalculatedPrice = calculateFinalLineTotal(item, finalGrams);
                    const updatedLineTotal = parsedFinalPrices[idx] ?? autoCalculatedPrice;
                    const rawPriceInput = customPriceEditedByIndex[idx]
                      ? (priceInputsByIndex[idx] ?? String(updatedLineTotal))
                      : String(autoCalculatedPrice);
                    const gramsDiff = finalGrams - orderedGrams;
                    const priceDiff = updatedLineTotal - originalLineTotal;

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={item.product.image || undefined}
                              alt={item.product.name}
                              className="w-11 h-11 rounded-lg object-cover bg-white border border-stone-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 text-xs sm:text-sm leading-snug">
                                {item.product.name}
                              </div>
                              <div className="text-[11px] text-stone-600 flex flex-wrap items-center gap-2 mt-0.5">
                                <span>
                                  Ordered: <strong className="font-mono text-stone-900">{item.selectedWeight} × {item.quantity}</strong> ({formatWeightGrams(orderedGrams)})
                                </span>
                                {item.cuttingPreference && (
                                  <span className="text-emerald-700 font-medium">
                                    Cut: {item.cuttingPreference}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-stone-500">Quoted Price</div>
                            <div className="font-mono font-semibold text-stone-700">₹{originalLineTotal}</div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-stone-200">
                          <div className="flex flex-wrap items-center gap-2">
                            <label
                              htmlFor={`final-weight-input-${idx}`}
                              className="font-bold text-stone-800 whitespace-nowrap"
                            >
                              Final Weight (g):
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                id={`final-weight-input-${idx}`}
                                type="number"
                                min={0}
                                max={100000}
                                step="any"
                                value={rawInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setWeightInputsByIndex((prev) => ({ ...prev, [idx]: val }));
                                  const parsed = Number(val);
                                  if (val.trim() !== '' && Number.isFinite(parsed) && parsed >= 0) {
                                    const nextPrice = calculateFinalLineTotal(
                                      item,
                                      Math.min(100000, Math.round(parsed))
                                    );
                                    setPriceInputsByIndex((prev) => ({
                                      ...prev,
                                      [idx]: String(nextPrice),
                                    }));
                                    setCustomPriceEditedByIndex((prev) => ({
                                      ...prev,
                                      [idx]: false,
                                    }));
                                  }
                                  if (weightUpdateError) setWeightUpdateError(null);
                                }}
                                className="w-28 min-h-[40px] sm:min-h-[34px] px-2.5 py-1 bg-white border border-purple-300 rounded-lg font-mono font-bold text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                              />
                              <span className="text-[11px] font-mono text-stone-500">
                                g ({(finalGrams / 1000).toFixed(2)} kg)
                              </span>
                            </div>

                            {gramsDiff !== 0 || customPriceEditedByIndex[idx] ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setWeightInputsByIndex((prev) => ({
                                    ...prev,
                                    [idx]: String(orderedGrams),
                                  }));
                                  setPriceInputsByIndex((prev) => ({
                                    ...prev,
                                    [idx]: String(originalLineTotal),
                                  }));
                                  setCustomPriceEditedByIndex((prev) => ({
                                    ...prev,
                                    [idx]: false,
                                  }));
                                  if (weightUpdateError) setWeightUpdateError(null);
                                }}
                                className="text-[11px] text-purple-800 hover:text-purple-950 underline font-semibold cursor-pointer"
                              >
                                Reset ({orderedGrams}g / ₹{originalLineTotal})
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                                Exact ordered weight
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                            {gramsDiff !== 0 && (
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                                  gramsDiff > 0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {gramsDiff > 0 ? `+${gramsDiff}g` : `${gramsDiff}g`}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5">
                              <label
                                htmlFor={`final-price-input-${idx}`}
                                className="text-[10px] font-semibold text-stone-600 whitespace-nowrap"
                              >
                                Final Price (₹):
                              </label>
                              <input
                                id={`final-price-input-${idx}`}
                                type="number"
                                min={0}
                                max={500000}
                                step="any"
                                value={rawPriceInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPriceInputsByIndex((prev) => ({ ...prev, [idx]: val }));
                                  setCustomPriceEditedByIndex((prev) => ({ ...prev, [idx]: true }));
                                  if (weightUpdateError) setWeightUpdateError(null);
                                }}
                                className="w-24 min-h-[40px] sm:min-h-[34px] px-2 py-1 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-950 text-xs text-right focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                              />
                              {priceDiff !== 0 && (
                                <span
                                  className={`text-[10px] font-mono font-bold ${
                                    priceDiff > 0 ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  ({priceDiff > 0 ? `+₹${priceDiff}` : `-₹${Math.abs(priceDiff)}`})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Recalculated Bill Summary */}
                {(() => {
                  const previewSubtotal = orderForWeightUpdate.items.reduce(
                    (sum, item, idx) =>
                      sum +
                      (parsedFinalPrices[idx] ??
                        calculateFinalLineTotal(
                          item,
                          parsedFinalWeights[idx] ?? getOrderedItemWeightGrams(item)
                        )),
                    0
                  );
                  const existingDiscount = getOrderLoyaltyDiscount(orderForWeightUpdate);
                  const appliedDiscount = Math.min(previewSubtotal, existingDiscount);
                  const netSubtotal = Math.max(0, previewSubtotal - appliedDiscount);
                  const previewTotal =
                    netSubtotal +
                    (Number(orderForWeightUpdate.deliveryFee) || 0) +
                    (Number(orderForWeightUpdate.packagingFee) || 0);
                  const baseEstTotal =
                    typeof orderForWeightUpdate.originalTotal === 'number'
                      ? orderForWeightUpdate.originalTotal
                      : orderForWeightUpdate.total;
                  const totalDiff = previewTotal - baseEstTotal;

                  return (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-stone-700">
                        <span>Updated Items Subtotal</span>
                        <span className="font-mono font-bold text-stone-900">₹{previewSubtotal}</span>
                      </div>
                      {appliedDiscount > 0 && (
                        <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
                          <span>Loyalty Points Discount</span>
                          <span className="font-mono">-₹{appliedDiscount}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-stone-700">
                        <span>Delivery Fee</span>
                        <span className="font-mono">
                          {orderForWeightUpdate.deliveryFee === 0
                            ? 'FREE'
                            : `₹${orderForWeightUpdate.deliveryFee}`}
                        </span>
                      </div>
                      {orderForWeightUpdate.packagingFee > 0 && (
                        <div className="flex items-center justify-between text-xs text-stone-700">
                          <span>Packaging Fee</span>
                          <span className="font-mono">₹{orderForWeightUpdate.packagingFee}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-purple-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-purple-950">Final Customer Bill</span>
                          {totalDiff !== 0 && (
                            <span className="ml-2 text-[11px] font-mono text-stone-500">
                              (Est. ₹{baseEstTotal})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {totalDiff !== 0 && (
                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                totalDiff > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {totalDiff > 0 ? `+₹${totalDiff}` : `-₹${Math.abs(totalDiff)}`}
                            </span>
                          )}
                          <span className="font-mono font-bold text-lg text-purple-950">
                            ₹{previewTotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {weightUpdateError && (
                  <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                    {weightUpdateError}
                  </p>
                )}
              </div>

              <div className="p-3.5 sm:p-4 bg-stone-100 border-t border-stone-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setOrderForWeightUpdate(null);
                    setWeightUpdateError(null);
                  }}
                  disabled={isSavingFinalWeights}
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-white hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl border border-stone-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFinalWeights}
                  className="min-h-[44px] sm:min-h-0 px-5 py-2 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {isSavingFinalWeights
                      ? 'Saving Weights & Price...'
                      : 'Save & Update Price'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL ORDER MODAL */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white text-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-200 my-auto">
            <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <h4 className="font-bold text-sm text-rose-950 truncate">
                  Cancel Order #{orderToCancel.orderId}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderToCancel(null);
                  setCancelReason('');
                  setCancelError(null);
                }}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer shrink-0"
                aria-label="Close cancel order modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelOrder} className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <div className="font-bold text-stone-900">
                  {orderToCancel.contactName} ({orderToCancel.contactPhone})
                </div>
                <div className="text-stone-600">
                  {orderToCancel.items.length} item(s) · Total: <strong className="font-mono text-stone-900">₹{orderToCancel.total}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-stone-800">
                  Quick Reasons (optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Customer requested cancellation',
                    'Item out of stock',
                    'Unable to reach customer',
                    'Delivery slot unavailable',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCancelReason(preset);
                        setCancelError(null);
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                        cancelReason === preset
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cancel-order-reason" className="block font-bold text-stone-800">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="cancel-order-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelError) setCancelError(null);
                  }}
                  placeholder="Enter the reason for cancelling this order..."
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white resize-none"
                  autoFocus
                />
                {cancelError && (
                  <p className="text-[11px] font-semibold text-rose-600">{cancelError}</p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setOrderToCancel(null);
                    setCancelReason('');
                    setCancelError(null);
                  }}
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Confirm Cancel Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
