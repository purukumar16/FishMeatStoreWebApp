import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Calendar,
  Repeat,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  SkipForward,
  FileSpreadsheet,
  Printer,
  Download,
  Copy,
  X,
  User,
  Phone,
  MapPin,
  Store as StoreIcon,
  Clock,
  Package,
  CalendarCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductSubscription } from '../../types';
import {
  getTodayWeekdayName,
  isSubscriptionDueToday,
  formatTodayFullDate,
  getTwiceWeeklySecondDay,
} from '../../utils/date';

export const SubscriptionsMonitor: React.FC = () => {
  const {
    subscriptions,
    toggleSubscriptionPause,
    skipNextDelivery,
    stores,
    adminUser,
  } = useStore();

  const todayWeekday = getTodayWeekdayName();
  const todayFullDate = formatTodayFullDate();

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
  const [todaysDeliveriesOnly, setTodaysDeliveriesOnly] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'paused'>('ALL');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to resolve store name/id consistently even for legacy subscription items
  const getSubStore = (sub: ProductSubscription) => {
    if (sub.storeId) {
      const matched = stores.find((s) => s.id === sub.storeId);
      if (matched) return matched;
    }
    const addr = (sub.deliveryAddress || '').toLowerCase();
    if (addr.includes('doddabanahalli') || addr.includes('bidareagrahara') || addr.includes('gramiq')) {
      return stores[1] || stores[0];
    }
    return stores[0];
  };

  // Store-scoped base list (if Store Hub filter selected)
  const storeScopedSubs = useMemo(() => {
    if (selectedStoreId === 'ALL') return subscriptions;
    return subscriptions.filter((sub) => getSubStore(sub).id === selectedStoreId);
  }, [subscriptions, selectedStoreId, stores]);

  // Quick KPI counts
  const counts = useMemo(() => {
    const total = storeScopedSubs.length;
    const dueToday = storeScopedSubs.filter((s) => isSubscriptionDueToday(s, todayWeekday)).length;
    const active = storeScopedSubs.filter((s) => s.status === 'active').length;
    const paused = storeScopedSubs.filter((s) => s.status === 'paused').length;
    return { total, dueToday, active, paused };
  }, [storeScopedSubs, todayWeekday]);

  // Filtered list displayed in main table/cards
  const filteredSubscriptions = useMemo(() => {
    return storeScopedSubs.filter((sub) => {
      if (todaysDeliveriesOnly && !isSubscriptionDueToday(sub, todayWeekday)) {
        return false;
      }
      if (statusFilter !== 'ALL' && sub.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = sub.id.toLowerCase().includes(q);
        const matchesName = (sub.customerName || '').toLowerCase().includes(q);
        const matchesPhone = (sub.customerPhone || '').toLowerCase().includes(q);
        const matchesProd = sub.productName.toLowerCase().includes(q);
        const matchesAddr = sub.deliveryAddress.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesProd && !matchesAddr) {
          return false;
        }
      }
      return true;
    });
  }, [storeScopedSubs, todaysDeliveriesOnly, statusFilter, searchQuery, todayWeekday]);

  // Today's deliveries for the Summary Report (respects Store Hub filter if chosen)
  const todaysDeliveriesForReport = useMemo(() => {
    return storeScopedSubs.filter((s) => isSubscriptionDueToday(s, todayWeekday));
  }, [storeScopedSubs, todayWeekday]);

  // Aggregate cut quantities for butcher prep summary inside the report
  const cutPrepSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        productName: string;
        weight: string;
        cuttingStyle: string;
        count: number;
        totalValue: number;
      }
    >();

    todaysDeliveriesForReport.forEach((sub) => {
      const cut = sub.cuttingStyle || 'Standard Clean & Cut';
      const key = `${sub.productId}::${sub.selectedWeight}::${cut}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.totalValue += sub.discountedPrice;
      } else {
        map.set(key, {
          productName: sub.productName,
          weight: sub.selectedWeight,
          cuttingStyle: cut,
          count: 1,
          totalValue: sub.discountedPrice,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [todaysDeliveriesForReport]);

  const totalReportRevenue = useMemo(
    () => todaysDeliveriesForReport.reduce((acc, s) => acc + s.discountedPrice, 0),
    [todaysDeliveriesForReport]
  );

  const buildReportText = () => {
    const storeLabel =
      selectedStoreId === 'ALL'
        ? 'All Store Hubs'
        : stores.find((s) => s.id === selectedStoreId)?.name || 'Selected Store Hub';

    const lines: string[] = [
      `FISH MEAT STORE — TODAY'S SUBSCRIPTION DELIVERIES REPORT`,
      `Date: ${todayFullDate}`,
      `Store Scope: ${storeLabel}`,
      `Total Deliveries Due Today: ${todaysDeliveriesForReport.length}`,
      `Total Billable Value: ₹${totalReportRevenue}`,
      ``,
      `--- BUTCHER PREP SUMMARY (BY CUT) ---`,
      ...cutPrepSummary.map(
        (item, idx) =>
          `${idx + 1}. ${item.count}x ${item.productName} (${item.weight}) · Cut: ${item.cuttingStyle} · ₹${item.totalValue}`
      ),
      ``,
      `--- CUSTOMER DELIVERY MANIFEST ---`,
      ...todaysDeliveriesForReport.map((sub, idx) => {
        const store = getSubStore(sub);
        return `${idx + 1}. ${sub.customerName || 'Registered Customer'} (${
          sub.customerPhone || 'N/A'
        }) | ${sub.productName} (${sub.selectedWeight}) | Slot: ${
          sub.deliverySlot
        } | Hub: ${store.neighborhood} | ₹${sub.discountedPrice}\n   Address: ${
          sub.deliveryAddress
        }${sub.customNotes ? `\n   Note: ${sub.customNotes}` : ''}`;
      }),
    ];

    return lines.join('\n');
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Subscription ID',
      'Customer Name',
      'Phone',
      'Store Hub',
      'Product',
      'Weight',
      'Cutting Style',
      'Custom Notes',
      'Frequency',
      'Delivery Slot',
      'Delivery Address',
      'Amount (INR)',
    ];

    const escapeCsv = (val: string | number | undefined) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = todaysDeliveriesForReport.map((sub) => {
      const store = getSubStore(sub);
      return [
        sub.id,
        sub.customerName || 'Registered Customer',
        sub.customerPhone || '',
        store.name,
        sub.productName,
        sub.selectedWeight,
        sub.cuttingStyle || 'Standard Clean & Cut',
        sub.customNotes || '',
        sub.frequency,
        sub.deliverySlot,
        sub.deliveryAddress,
        sub.discountedPrice,
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todays-subscription-deliveries-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("✓ Downloaded CSV summary report for today's subscription deliveries.");
  };

  const handleCopySummaryText = () => {
    navigator.clipboard?.writeText(buildReportText());
    showToast("✓ Today's delivery summary copied to clipboard.");
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-3 right-3 sm:left-auto sm:top-20 sm:right-6 sm:max-w-sm z-50 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setTodaysDeliveriesOnly(false);
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
            !todaysDeliveriesOnly && statusFilter === 'ALL'
              ? 'bg-purple-50 border-purple-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-purple-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-stone-500 block">Total Subscriptions</span>
          <span className="text-xl font-bold font-mono text-purple-950 mt-0.5 block">
            {counts.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTodaysDeliveriesOnly(true);
            setStatusFilter('ALL');
          }}
          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
            todaysDeliveriesOnly
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-xs'
              : 'bg-white border-stone-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Today&apos;s Deliveries ({todayWeekday})</span>
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 mt-0.5 block">
            {counts.dueToday}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTodaysDeliveriesOnly(false);
            setStatusFilter('active');
          }}
          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
            !todaysDeliveriesOnly && statusFilter === 'active'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-emerald-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-stone-500 block">Active Plans</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-0.5 block">
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTodaysDeliveriesOnly(false);
            setStatusFilter('paused');
          }}
          className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
            !todaysDeliveriesOnly && statusFilter === 'paused'
              ? 'bg-amber-50 border-amber-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-200'
          }`}
        >
          <span className="text-[11px] font-semibold text-stone-500 block">Paused Plans</span>
          <span className="text-xl font-bold font-mono text-amber-700 mt-0.5 block">
            {counts.paused}
          </span>
        </button>
      </div>

      {/* Sticky Filter & Report Toolbar (Frozen while scrolling) */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-stone-50/95 backdrop-blur-xs border-b border-stone-200/70">
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer, phone, item, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-3 py-2 sm:py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Store Hub + Today Summary Report CTA */}
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
                    <option value="ALL">All Store Hubs ({subscriptions.length})</option>
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

              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 sm:py-1.5 bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Generate Today&apos;s Summary Report ({counts.dueToday})</span>
              </button>
            </div>
          </div>

          {/* Filter Chips Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setTodaysDeliveriesOnly((prev) => !prev)}
              className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                todaysDeliveriesOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today&apos;s Deliveries ({counts.dueToday})</span>
            </button>

            <span className="text-stone-300 hidden sm:inline">|</span>

            {(['ALL', 'active', 'paused'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  statusFilter === status
                    ? 'bg-purple-900 text-white border-purple-900'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {status === 'ALL'
                  ? `All Statuses (${counts.total})`
                  : status === 'active'
                  ? `Active (${counts.active})`
                  : `Paused (${counts.paused})`}
              </button>
            ))}

            {(todaysDeliveriesOnly ||
              statusFilter !== 'ALL' ||
              (!isStoreAdmin && selectedStoreId !== 'ALL') ||
              searchQuery.trim() !== '') && (
              <button
                type="button"
                onClick={() => {
                  setTodaysDeliveriesOnly(false);
                  setStatusFilter('ALL');
                  setSelectedStoreId(
                    isStoreAdmin && adminUser?.assignedStoreId ? adminUser.assignedStoreId : 'ALL'
                  );
                  setSearchQuery('');
                }}
                className="min-h-[38px] sm:min-h-0 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 underline font-semibold cursor-pointer ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-3">
        {filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
            <Repeat className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="text-base font-bold text-stone-900">
              {todaysDeliveriesOnly
                ? `No Subscription Deliveries Scheduled for Today (${todayWeekday})`
                : 'No Customer Subscriptions Found'}
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Try clearing active filters or switching store hubs to view all customer recurring subscriptions.
            </p>
          </div>
        ) : (
          filteredSubscriptions.map((sub) => {
            const store = getSubStore(sub);
            const dueToday = isSubscriptionDueToday(sub, todayWeekday);

            return (
              <div
                key={sub.id}
                className={`border rounded-2xl p-4 sm:p-5 transition-all space-y-3 ${
                  dueToday
                    ? 'bg-emerald-50/25 border-emerald-300 shadow-xs'
                    : sub.status === 'paused'
                    ? 'bg-stone-50/70 border-stone-200 opacity-90'
                    : 'bg-white border-stone-200 hover:border-purple-300 shadow-2xs'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-purple-950 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      #{sub.id}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <StoreIcon className="w-3 h-3" />
                      <span>{store.neighborhood} Hub</span>
                    </span>
                    <span className="text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 capitalize">
                      {sub.frequency.replace('-', ' ')} ·{' '}
                      {sub.frequency === 'twice-weekly'
                        ? `${sub.deliveryDay} & ${getTwiceWeeklySecondDay(sub.deliveryDay)}`
                        : sub.deliveryDay}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {dueToday && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                        <CalendarCheck className="w-3 h-3" />
                        <span>Delivery Due Today</span>
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        sub.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {sub.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>

                {/* Body Grid: Customer Info + Product Cut Details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Customer Details */}
                  <div className="lg:col-span-5 bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{sub.customerName || 'Registered Customer'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-600">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-mono">{sub.customerPhone || 'On file'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-stone-600 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{sub.deliveryAddress}</span>
                    </div>
                  </div>

                  {/* Product & Schedule Details */}
                  <div className="lg:col-span-7 flex flex-col sm:flex-row items-start justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
                    <div className="flex items-start gap-3 min-w-0">
                      <img
                        src={sub.productImage || undefined}
                        alt={sub.productName}
                        className="w-14 h-14 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                      />
                      <div className="space-y-1 text-xs min-w-0">
                        <div className="font-bold text-stone-900 text-sm leading-snug">
                          {sub.productName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-600">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded font-mono font-bold">
                            {sub.selectedWeight}
                          </span>
                          {sub.cuttingStyle && (
                            <span className="text-emerald-700 font-semibold">
                              Cut: {sub.cuttingStyle}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
                          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{sub.deliverySlot}</span>
                        </div>
                        {sub.customNotes && (
                          <p className="text-[11px] text-amber-800 italic">
                            Note: &quot;{sub.customNotes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 space-y-0.5">
                      <div className="text-base font-bold font-mono text-purple-950">
                        ₹{sub.discountedPrice}
                      </div>
                      <div className="text-[10px] text-stone-500 line-through font-mono">
                        ₹{sub.originalPrice}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700">
                        Save ₹{sub.savingsPerDelivery}/cycle
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-stone-600">
                    <span className="text-stone-500">Next Delivery: </span>
                    <strong className="text-stone-900">{sub.nextDeliveryDate}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleSubscriptionPause(sub.id);
                        showToast(
                          `Subscription #${sub.id} ${
                            sub.status === 'active' ? 'paused' : 'resumed'
                          }.`
                        );
                      }}
                      className="min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      {sub.status === 'active' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pause Plan</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Resume Plan</span>
                        </>
                      )}
                    </button>

                    {sub.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => {
                          skipNextDelivery(sub.id);
                          showToast(`Skipped next delivery cycle for #${sub.id}.`);
                        }}
                        className="min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-purple-700" />
                        <span>Skip Next Cycle</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TODAY'S DELIVERIES SUMMARY REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white text-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-300 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-purple-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileSpreadsheet className="w-5 h-5 text-emerald-300 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm sm:text-base truncate">
                    Today&apos;s Subscription Deliveries Summary Report
                  </h4>
                  <p className="text-[11px] text-purple-200 truncate">
                    {todayFullDate} ·{' '}
                    {selectedStoreId === 'ALL'
                      ? 'All Store Hubs'
                      : stores.find((s) => s.id === selectedStoreId)?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-1.5 flex items-center justify-center rounded-lg text-purple-200 hover:text-white hover:bg-purple-900 cursor-pointer shrink-0"
                aria-label="Close summary report"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Report Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[11px] text-emerald-700 font-semibold block">
                    Total Deliveries Today
                  </span>
                  <span className="text-2xl font-bold font-mono text-emerald-950">
                    {todaysDeliveriesForReport.length}
                  </span>
                </div>
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="text-[11px] text-purple-700 font-semibold block">
                    Distinct Cuts / SKUs
                  </span>
                  <span className="text-2xl font-bold font-mono text-purple-950">
                    {cutPrepSummary.length}
                  </span>
                </div>
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                  <span className="text-[11px] text-stone-600 font-semibold block">
                    Total Scheduled Revenue
                  </span>
                  <span className="text-2xl font-bold font-mono text-stone-950">
                    ₹{totalReportRevenue}
                  </span>
                </div>
              </div>

              {todaysDeliveriesForReport.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <Package className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="font-bold text-stone-800">
                    No active subscription deliveries scheduled for today ({todayWeekday}).
                  </p>
                  <p className="text-stone-500">
                    Switch Store Hub filter or check other delivery days in the Subscriptions list.
                  </p>
                </div>
              ) : (
                <>
                  {/* Section 1: Butcher Cut & Pack Summary */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-purple-950 border-b border-stone-200 pb-1.5">
                      1. Butcher Prep &amp; Pack Summary (Today)
                    </h5>
                    <div className="overflow-x-auto border border-stone-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-stone-100 text-stone-700 text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Product</th>
                            <th className="p-2.5">Pack Weight</th>
                            <th className="p-2.5">Cutting Style</th>
                            <th className="p-2.5 text-right">Packs Due</th>
                            <th className="p-2.5 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {cutPrepSummary.map((row, idx) => (
                            <tr key={idx} className="hover:bg-stone-50">
                              <td className="p-2.5 font-semibold text-stone-900">
                                {row.productName}
                              </td>
                              <td className="p-2.5 font-mono text-stone-700">{row.weight}</td>
                              <td className="p-2.5 text-emerald-800 font-medium">
                                {row.cuttingStyle}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-purple-950">
                                {row.count}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                                ₹{row.totalValue}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Customer Delivery Manifest */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-purple-950 border-b border-stone-200 pb-1.5">
                      2. Customer Dispatch Manifest ({todaysDeliveriesForReport.length} Stops)
                    </h5>
                    <div className="space-y-2">
                      {todaysDeliveriesForReport.map((sub, idx) => {
                        const store = getSubStore(sub);
                        return (
                          <div
                            key={sub.id}
                            className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-purple-950">
                                  #{idx + 1}
                                </span>
                                <strong className="text-stone-900">
                                  {sub.customerName || 'Registered Customer'}
                                </strong>
                                <span className="font-mono text-stone-600">
                                  ({sub.customerPhone || 'N/A'})
                                </span>
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-semibold">
                                  {store.neighborhood} Hub
                                </span>
                              </div>
                              <div className="text-stone-700">
                                <strong>{sub.productName}</strong> ({sub.selectedWeight})
                                {sub.cuttingStyle ? ` · ${sub.cuttingStyle}` : ''} · Slot:{' '}
                                <span className="font-semibold text-purple-900">
                                  {sub.deliverySlot}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-600">
                                Deliver to: {sub.deliveryAddress}
                              </div>
                              {sub.customNotes && (
                                <div className="text-[11px] text-amber-800 italic">
                                  Butcher Note: {sub.customNotes}
                                </div>
                              )}
                            </div>
                            <div className="text-left sm:text-right shrink-0 font-mono font-bold text-sm text-purple-950">
                              ₹{sub.discountedPrice}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Report Modal Footer Actions */}
            <div className="p-3.5 sm:p-4 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] text-stone-500">
                Generated by: {adminUser?.name || 'Store Incharge'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  disabled={todaysDeliveriesForReport.length === 0}
                  className="min-h-[40px] sm:min-h-0 px-3 py-2 bg-white hover:bg-stone-50 disabled:opacity-50 border border-stone-300 text-stone-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copy Summary</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={todaysDeliveriesForReport.length === 0}
                  className="min-h-[40px] sm:min-h-0 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[40px] sm:min-h-0 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
