import React, { useMemo, useState } from 'react';
import {
  Users,
  Receipt,
  Package,
  Search,
  Download,
  Lock,
  Calendar,
  RotateCcw,
  ArrowUpDown,
  MapPin,
  Phone,
  IndianRupee,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { MainCategory, OrderRecord } from '../../types';
import { getLocalDateString } from '../../utils/date';
import { normalizePhone10 } from '../../utils/firestoreMappers';
import {
  formatWeightGrams,
  getEffectiveItemLineTotal,
  getOrderedItemWeightGrams,
} from '../../utils/orderWeight';

type ReportTab = 'customer' | 'sales' | 'item_wise' | 'search';
type DatePreset = 'today' | '7d' | '30d' | 'all' | 'custom';

interface UnifiedCustomerRow {
  key: string;
  name: string;
  customerType: 'Guest' | 'Registered';
  isAutoNamedGuest: boolean;
  guestNumber?: number;
  phone: string;
  phone10: string;
  email?: string;
  address: string;
  storeName: string;
  storeId: string;
  ordersCount: number;
  cancelledCount: number;
  totalSpent: number;
  lastOrderDate: string;
  lastOrderAt: string;
}

interface ItemSaleRow {
  productId: string;
  productName: string;
  category: MainCategory | string;
  subcategory: string;
  ordersCount: number;
  packsSold: number;
  totalWeightGrams: number;
  weightAdjustedPacks: number;
  totalRevenue: number;
  avgPricePerPack: number;
}

const ORDER_STATUS_LABELS: Record<OrderRecord['status'], string> = {
  confirmed: 'Confirmed',
  allocated: 'Accepted',
  butchered_sealed: 'Cut & Sealed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const ORDER_STATUS_STYLES: Record<OrderRecord['status'], string> = {
  confirmed: 'bg-amber-50 text-amber-900 border-amber-200',
  allocated: 'bg-sky-50 text-sky-900 border-sky-200',
  butchered_sealed: 'bg-purple-50 text-purple-900 border-purple-200',
  out_for_delivery: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
};

const PAYMENT_LABELS: Record<OrderRecord['paymentMethod'], string> = {
  cod: 'Cash / UPI on Delivery',
  upi: 'UPI Instant',
  card: 'Credit / Debit Card',
};

const escapeCsv = (val: string | number | undefined | null): string => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const downloadCsvFile = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const ReportsDashboard: React.FC = () => {
  const {
    adminUser,
    allOrders,
    stores,
    registeredUsers,
    guestCustomers,
  } = useStore();

  const isRootAdmin = adminUser?.role === 'Admin';

  const todayStr = getLocalDateString(0);
  const sevenDaysAgoStr = getLocalDateString(-6);
  const thirtyDaysAgoStr = getLocalDateString(-29);

  const [activeTab, setActiveTab] = useState<ReportTab>('customer');

  // Shared Date & Store Filters for Sale / Item-wise reports
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFromDate, setCustomFromDate] = useState<string>(sevenDaysAgoStr);
  const [customToDate, setCustomToDate] = useState<string>(todayStr);
  const [storeFilter, setStoreFilter] = useState<string>('ALL');

  // Customer Report filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | 'GUEST' | 'REGISTERED'>('ALL');

  // Sales Report filter
  const [salesStatusFilter, setSalesStatusFilter] = useState<'ALL' | OrderRecord['status']>('ALL');

  // Item-wise Report filters & sorting
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'ALL' | MainCategory>('ALL');
  const [itemSortBy, setItemSortBy] = useState<'revenue' | 'weight' | 'packs'>('revenue');

  // Search Report criteria (mobile, item, amount, date)
  const [searchMobile, setSearchMobile] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [searchExactAmount, setSearchExactAmount] = useState('');
  const [searchMinAmount, setSearchMinAmount] = useState('');
  const [searchMaxAmount, setSearchMaxAmount] = useState('');
  const [searchFromDate, setSearchFromDate] = useState('');
  const [searchToDate, setSearchToDate] = useState('');

  // Resolve effective date bounds
  const effectiveDateBounds = useMemo(() => {
    if (datePreset === 'today') return { from: todayStr, to: todayStr };
    if (datePreset === '7d') return { from: sevenDaysAgoStr, to: todayStr };
    if (datePreset === '30d') return { from: thirtyDaysAgoStr, to: todayStr };
    if (datePreset === 'custom') return { from: customFromDate, to: customToDate };
    return { from: '', to: '' };
  }, [datePreset, todayStr, sevenDaysAgoStr, thirtyDaysAgoStr, customFromDate, customToDate]);

  // Helper: does an order fall within selected date range & store?
  const dateFilteredOrders = useMemo(() => {
    return allOrders.filter((ord) => {
      if (storeFilter !== 'ALL' && ord.store.id !== storeFilter) return false;
      const ordDate = ord.placedDate || todayStr;
      if (effectiveDateBounds.from && ordDate < effectiveDateBounds.from) return false;
      if (effectiveDateBounds.to && ordDate > effectiveDateBounds.to) return false;
      return true;
    });
  }, [allOrders, storeFilter, effectiveDateBounds, todayStr]);

  // ==================== A) CUSTOMER REPORTS ====================
  const unifiedCustomers = useMemo<UnifiedCustomerRow[]>(() => {
    const map = new Map<string, UnifiedCustomerRow>();

    // Index all orders by phone10 & customerUid
    const ordersByPhone = new Map<string, OrderRecord[]>();
    const ordersByUid = new Map<string, OrderRecord[]>();
    allOrders.forEach((ord) => {
      const p10 = normalizePhone10(ord.contactPhone);
      if (p10) {
        ordersByPhone.set(p10, [...(ordersByPhone.get(p10) || []), ord]);
      }
      if (ord.customerUid && ord.customerUid !== 'guest') {
        ordersByUid.set(ord.customerUid, [...(ordersByUid.get(ord.customerUid) || []), ord]);
      }
    });

    // 1. Registered Users (excluding synthetic guest sessions)
    registeredUsers.forEach((user) => {
      if (user.isGuest) return;
      const p10 = normalizePhone10(user.phone);
      const key = p10 ? `phone:${p10}` : `uid:${user.id}`;
      const matchedOrdersMap = new Map<string, OrderRecord>();
      (ordersByUid.get(user.id) || []).forEach((o) => matchedOrdersMap.set(o.orderId, o));
      if (p10) {
        (ordersByPhone.get(p10) || []).forEach((o) => matchedOrdersMap.set(o.orderId, o));
      }
      (user.pastOrders || []).forEach((o) => matchedOrdersMap.set(o.orderId, o));

      const matchedOrders = Array.from(matchedOrdersMap.values());
      const nonCancelled = matchedOrders.filter((o) => o.status !== 'cancelled');
      const totalSpent = nonCancelled.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const sortedDates = matchedOrders
        .map((o) => ({ date: o.placedDate || todayStr, at: o.placedAt || '' }))
        .sort((a, b) => b.date.localeCompare(a.date));
      const latestOrder = matchedOrders[0];
      const defaultAddr =
        user.savedAddresses?.find((a) => a.isDefault)?.formattedAddress ||
        user.savedAddresses?.[0]?.formattedAddress ||
        user.addresses?.[0] ||
        latestOrder?.deliveryAddress ||
        '—';

      map.set(key, {
        key,
        name: user.name || 'Registered Customer',
        customerType: 'Registered',
        isAutoNamedGuest: false,
        phone: user.phone || latestOrder?.contactPhone || '—',
        phone10: p10,
        email: user.email,
        address: defaultAddr,
        storeName: latestOrder?.store.name || 'All Hubs',
        storeId: latestOrder?.store.id || 'ALL',
        ordersCount: Math.max(matchedOrders.length, user.savedOrdersCount || 0),
        cancelledCount: matchedOrders.length - nonCancelled.length,
        totalSpent,
        lastOrderDate: sortedDates[0]?.date || '—',
        lastOrderAt: sortedDates[0]?.at || '',
      });
    });

    // 2. Explicitly Saved Guest Customers (with Guest 1..N sequencing)
    guestCustomers.forEach((guest) => {
      const p10 = normalizePhone10(guest.phone10 || guest.phone);
      const key = p10 ? `phone:${p10}` : `guest:${guest.id}`;
      if (map.has(key)) return; // Registered user takes precedence if upgraded

      const matchedOrdersMap = new Map<string, OrderRecord>();
      (guest.recentOrders || []).forEach((o) => matchedOrdersMap.set(o.orderId, o));
      if (p10) {
        (ordersByPhone.get(p10) || []).forEach((o) => matchedOrdersMap.set(o.orderId, o));
      }
      const matchedOrders = Array.from(matchedOrdersMap.values());
      const nonCancelled = matchedOrders.filter((o) => o.status !== 'cancelled');
      const computedSpend = nonCancelled.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const sortedDates = matchedOrders
        .map((o) => ({ date: o.placedDate || todayStr, at: o.placedAt || '' }))
        .sort((a, b) => b.date.localeCompare(a.date));

      map.set(key, {
        key,
        name: guest.name,
        customerType: 'Guest',
        isAutoNamedGuest: guest.isAutoNamedGuest,
        guestNumber: guest.guestNumber,
        phone: guest.phone || p10,
        phone10: p10,
        address: guest.address || matchedOrders[0]?.deliveryAddress || '—',
        storeName: guest.storeName || matchedOrders[0]?.store.name || '—',
        storeId: guest.storeId || matchedOrders[0]?.store.id || 'ALL',
        ordersCount: Math.max(matchedOrders.length, guest.ordersCount || 0),
        cancelledCount: matchedOrders.length - nonCancelled.length,
        totalSpent: matchedOrders.length > 0 ? computedSpend : guest.totalSpent || 0,
        lastOrderDate: sortedDates[0]?.date || guest.lastOrderDate || '—',
        lastOrderAt: sortedDates[0]?.at || guest.lastOrderAt || '',
      });
    });

    // 3. Fallback: Any remaining orders in allOrders whose mobile isn't in Registered or Guest directories
    ordersByPhone.forEach((orders, p10) => {
      const key = `phone:${p10}`;
      if (map.has(key)) return;
      const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
      const totalSpent = nonCancelled.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const latest = [...orders].sort((a, b) =>
        (b.placedDate || todayStr).localeCompare(a.placedDate || todayStr)
      )[0];
      map.set(key, {
        key,
        name: latest.contactName || 'Guest Customer',
        customerType: 'Guest',
        isAutoNamedGuest: /^Guest\s+\d+$/i.test(latest.contactName || ''),
        phone: latest.contactPhone || p10,
        phone10: p10,
        address: latest.deliveryAddress || '—',
        storeName: latest.store.name,
        storeId: latest.store.id,
        ordersCount: orders.length,
        cancelledCount: orders.length - nonCancelled.length,
        totalSpent,
        lastOrderDate: latest.placedDate || todayStr,
        lastOrderAt: latest.placedAt || '',
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateCmp = b.lastOrderDate.localeCompare(a.lastOrderDate);
      if (dateCmp !== 0) return dateCmp;
      return b.totalSpent - a.totalSpent;
    });
  }, [allOrders, registeredUsers, guestCustomers, todayStr]);

  const filteredCustomerRows = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    const qDigits = customerSearch.replace(/\D/g, '');
    return unifiedCustomers.filter((c) => {
      if (customerTypeFilter === 'GUEST' && c.customerType !== 'Guest') return false;
      if (customerTypeFilter === 'REGISTERED' && c.customerType !== 'Registered') return false;
      if (storeFilter !== 'ALL' && c.storeId !== 'ALL' && c.storeId !== storeFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        (qDigits.length > 0 && c.phone10.includes(qDigits))
      );
    });
  }, [unifiedCustomers, customerTypeFilter, storeFilter, customerSearch]);

  const customerSummary = useMemo(() => {
    const total = filteredCustomerRows.length;
    const guests = filteredCustomerRows.filter((c) => c.customerType === 'Guest').length;
    const registered = filteredCustomerRows.filter((c) => c.customerType === 'Registered').length;
    const repeat = filteredCustomerRows.filter((c) => c.ordersCount >= 2).length;
    const combinedSpend = filteredCustomerRows.reduce((s, c) => s + c.totalSpent, 0);
    return { total, guests, registered, repeat, combinedSpend };
  }, [filteredCustomerRows]);

  // ==================== B) ORDER / SALE REPORT ====================
  const salesOrders = useMemo(() => {
    return dateFilteredOrders.filter((ord) =>
      salesStatusFilter === 'ALL' ? true : ord.status === salesStatusFilter
    );
  }, [dateFilteredOrders, salesStatusFilter]);

  const salesSummary = useMemo(() => {
    const activeOrders = salesOrders.filter((o) => o.status !== 'cancelled');
    const cancelledOrders = salesOrders.filter((o) => o.status === 'cancelled');
    const deliveredOrders = salesOrders.filter((o) => o.status === 'delivered');

    const grossSales = activeOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const deliveredSales = deliveredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cancelledValue = cancelledOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const avgOrderValue = activeOrders.length > 0 ? Math.round(grossSales / activeOrders.length) : 0;
    const weightAdjustedCount = activeOrders.filter((o) => Boolean(o.weightUpdatedAt)).length;

    const paymentBreakdown = (['cod', 'upi', 'card'] as const).map((method) => {
      const subset = activeOrders.filter((o) => o.paymentMethod === method);
      const amount = subset.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return { method, label: PAYMENT_LABELS[method], count: subset.length, amount };
    });

    const statusBreakdown = (
      ['confirmed', 'allocated', 'butchered_sealed', 'out_for_delivery', 'delivered', 'cancelled'] as const
    ).map((status) => {
      const subset = salesOrders.filter((o) => o.status === status);
      const amount = subset.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return { status, label: ORDER_STATUS_LABELS[status], count: subset.length, amount };
    });

    return {
      totalOrders: salesOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledOrders.length,
      deliveredCount: deliveredOrders.length,
      grossSales,
      deliveredSales,
      cancelledValue,
      avgOrderValue,
      weightAdjustedCount,
      paymentBreakdown,
      statusBreakdown,
    };
  }, [salesOrders]);

  // ==================== C) ITEM-WISE SALE REPORT ====================
  const itemWiseRows = useMemo<ItemSaleRow[]>(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        category: MainCategory | string;
        subcategory: string;
        orderIds: Set<string>;
        packsSold: number;
        totalWeightGrams: number;
        weightAdjustedPacks: number;
        totalRevenue: number;
      }
    >();

    dateFilteredOrders
      .filter((ord) => ord.status !== 'cancelled')
      .forEach((ord) => {
        ord.items.forEach((item) => {
          const cat = item.product.category;
          if (itemCategoryFilter !== 'ALL' && cat !== itemCategoryFilter) return;

          const key = item.productId || item.product.id || item.product.name;
          const existing = map.get(key) || {
            productId: key,
            productName: item.product.name,
            category: cat,
            subcategory: item.product.subcategory,
            orderIds: new Set<string>(),
            packsSold: 0,
            totalWeightGrams: 0,
            weightAdjustedPacks: 0,
            totalRevenue: 0,
          };

          const qty = Math.max(1, Number(item.quantity) || 1);
          const itemWeightGrams =
            typeof item.finalWeightGrams === 'number' && Number.isFinite(item.finalWeightGrams)
              ? item.finalWeightGrams
              : getOrderedItemWeightGrams(item);
          const lineRevenue = getEffectiveItemLineTotal(item);

          existing.orderIds.add(ord.orderId);
          existing.packsSold += qty;
          existing.totalWeightGrams += itemWeightGrams;
          if (typeof item.finalWeightGrams === 'number') {
            existing.weightAdjustedPacks += qty;
          }
          existing.totalRevenue += lineRevenue;
          map.set(key, existing);
        });
      });

    const rows: ItemSaleRow[] = Array.from(map.values()).map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      category: entry.category,
      subcategory: entry.subcategory,
      ordersCount: entry.orderIds.size,
      packsSold: entry.packsSold,
      totalWeightGrams: entry.totalWeightGrams,
      weightAdjustedPacks: entry.weightAdjustedPacks,
      totalRevenue: entry.totalRevenue,
      avgPricePerPack: entry.packsSold > 0 ? Math.round(entry.totalRevenue / entry.packsSold) : 0,
    }));

    return rows.sort((a, b) => {
      if (itemSortBy === 'weight') return b.totalWeightGrams - a.totalWeightGrams;
      if (itemSortBy === 'packs') return b.packsSold - a.packsSold;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [dateFilteredOrders, itemCategoryFilter, itemSortBy]);

  const itemSummary = useMemo(() => {
    const skusSold = itemWiseRows.length;
    const totalPacks = itemWiseRows.reduce((s, r) => s + r.packsSold, 0);
    const totalWeightGrams = itemWiseRows.reduce((s, r) => s + r.totalWeightGrams, 0);
    const totalRevenue = itemWiseRows.reduce((s, r) => s + r.totalRevenue, 0);
    return { skusSold, totalPacks, totalWeightGrams, totalRevenue };
  }, [itemWiseRows]);

  // ==================== D) SEARCH REPORT ====================
  const searchResults = useMemo(() => {
    const mobileDigits = searchMobile.replace(/\D/g, '');
    const itemTerm = searchItem.trim().toLowerCase();
    const exactNum = searchExactAmount.trim() ? Number(searchExactAmount) : null;
    const minNum = searchMinAmount.trim() ? Number(searchMinAmount) : null;
    const maxNum = searchMaxAmount.trim() ? Number(searchMaxAmount) : null;

    return allOrders.filter((ord) => {
      if (storeFilter !== 'ALL' && ord.store.id !== storeFilter) return false;

      if (mobileDigits) {
        const orderPhoneDigits = (ord.contactPhone || '').replace(/\D/g, '');
        if (!orderPhoneDigits.includes(mobileDigits)) return false;
      }

      if (itemTerm) {
        const hasItem = ord.items.some(
          (it) =>
            it.product.name.toLowerCase().includes(itemTerm) ||
            it.product.subcategory.toLowerCase().includes(itemTerm) ||
            it.productId.toLowerCase().includes(itemTerm) ||
            (it.cuttingPreference && it.cuttingPreference.toLowerCase().includes(itemTerm))
        );
        if (!hasItem) return false;
      }

      if (exactNum !== null && Number.isFinite(exactNum)) {
        const matchesOrderTotal = Math.round(ord.total) === Math.round(exactNum);
        const matchesLineItem = ord.items.some(
          (it) => Math.round(getEffectiveItemLineTotal(it)) === Math.round(exactNum)
        );
        if (!matchesOrderTotal && !matchesLineItem) return false;
      }

      if (minNum !== null && Number.isFinite(minNum) && ord.total < minNum) {
        return false;
      }
      if (maxNum !== null && Number.isFinite(maxNum) && ord.total > maxNum) {
        return false;
      }

      const ordDate = ord.placedDate || todayStr;
      if (searchFromDate && ordDate < searchFromDate) return false;
      if (searchToDate && ordDate > searchToDate) return false;

      return true;
    });
  }, [
    allOrders,
    storeFilter,
    searchMobile,
    searchItem,
    searchExactAmount,
    searchMinAmount,
    searchMaxAmount,
    searchFromDate,
    searchToDate,
    todayStr,
  ]);

  const searchSummary = useMemo(() => {
    const active = searchResults.filter((o) => o.status !== 'cancelled');
    const revenue = active.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const totalWeightGrams = active.reduce(
      (s, o) =>
        s +
        o.items.reduce(
          (isum, it) => isum + (it.finalWeightGrams ?? getOrderedItemWeightGrams(it)),
          0
        ),
      0
    );
    return {
      count: searchResults.length,
      activeCount: active.length,
      revenue,
      totalWeightGrams,
    };
  }, [searchResults]);

  const hasActiveSearchCriteria = Boolean(
    searchMobile.trim() ||
      searchItem.trim() ||
      searchExactAmount.trim() ||
      searchMinAmount.trim() ||
      searchMaxAmount.trim() ||
      searchFromDate ||
      searchToDate ||
      storeFilter !== 'ALL'
  );

  const resetSearchCriteria = () => {
    setSearchMobile('');
    setSearchItem('');
    setSearchExactAmount('');
    setSearchMinAmount('');
    setSearchMaxAmount('');
    setSearchFromDate('');
    setSearchToDate('');
    setStoreFilter('ALL');
  };

  // Defense-in-depth strict Admin check
  if (!isRootAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white border border-stone-200 rounded-xl p-6 text-center space-y-2">
          <Lock className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-display font-bold text-base text-stone-900">
            Admin Access Only
          </h3>
          <p className="text-xs text-stone-600">
            Financial, customer, and item-wise reports are restricted exclusively to Root Admin accounts.
          </p>
        </div>
      </div>
    );
  }

  // CSV Export Dispatch for active report tab
  const handleExportActiveCsv = () => {
    if (activeTab === 'customer') {
      downloadCsvFile(
        `customer-report-${todayStr}.csv`,
        ['Name', 'Type', 'Mobile', 'Email', 'Address', 'Orders Count', 'Total Spend (INR)', 'Last Order Date', 'Store Hub'],
        filteredCustomerRows.map((c) => [
          c.name,
          c.isAutoNamedGuest && c.guestNumber ? `Guest (Auto #${c.guestNumber})` : c.customerType,
          c.phone,
          c.email || '',
          c.address,
          c.ordersCount,
          c.totalSpent,
          c.lastOrderDate,
          c.storeName,
        ])
      );
      return;
    }

    if (activeTab === 'sales') {
      downloadCsvFile(
        `order-sale-report-${todayStr}.csv`,
        ['Order ID', 'Date', 'Time', 'Customer', 'Mobile', 'Store Hub', 'Payment', 'Status', 'Weight Adjusted', 'Original Total (INR)', 'Final Total (INR)'],
        salesOrders.map((o) => [
          o.orderId,
          o.placedDate || todayStr,
          o.placedAt,
          o.contactName,
          o.contactPhone,
          o.store.name,
          PAYMENT_LABELS[o.paymentMethod],
          ORDER_STATUS_LABELS[o.status],
          o.weightUpdatedAt ? `Yes (${o.weightUpdatedAt})` : 'No',
          typeof o.originalTotal === 'number' ? o.originalTotal : o.total,
          o.total,
        ])
      );
      return;
    }

    if (activeTab === 'item_wise') {
      downloadCsvFile(
        `item-wise-sale-report-${todayStr}.csv`,
        ['SKU ID', 'Item Name', 'Category', 'Subcategory', 'Orders Count', 'Packs Sold', 'Total Weight (g)', 'Avg Price/Pack (INR)', 'Revenue (INR)'],
        itemWiseRows.map((r) => [
          r.productId,
          r.productName,
          r.category,
          r.subcategory,
          r.ordersCount,
          r.packsSold,
          r.totalWeightGrams,
          r.avgPricePerPack,
          r.totalRevenue,
        ])
      );
      return;
    }

    downloadCsvFile(
      `search-report-${todayStr}.csv`,
      ['Order ID', 'Date', 'Time', 'Customer', 'Mobile', 'Address', 'Items', 'Store Hub', 'Status', 'Total (INR)'],
      searchResults.map((o) => [
        o.orderId,
        o.placedDate || todayStr,
        o.placedAt,
        o.contactName,
        o.contactPhone,
        o.deliveryAddress,
        o.items
          .map(
            (i) =>
              `${i.product.name} (${i.selectedWeight} x${i.quantity}${
                typeof i.finalWeightGrams === 'number' ? ` -> Final ${i.finalWeightGrams}g` : ''
              })`
          )
          .join('; '),
        o.store.name,
        ORDER_STATUS_LABELS[o.status],
        o.total,
      ])
    );
  };

  return (
    <div className="p-3 sm:p-5 space-y-4">
      {/* Top Report Segmented Switch & Actions */}
      <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'customer'
                ? 'bg-white text-purple-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'sales'
                ? 'bg-white text-purple-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Order / Sale Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('item_wise')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'item_wise'
                ? 'bg-white text-purple-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Item-Wise Sale Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'search'
                ? 'bg-white text-purple-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Report</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            aria-label="Filter reports by store hub"
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="min-h-[38px] px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 font-medium cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-purple-900"
          >
            <option value="ALL">All Store Hubs</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportActiveCsv}
            className="min-h-[38px] px-3 py-1.5 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Shared Date Filter Bar for Sales & Item-Wise Tabs */}
      {(activeTab === 'sales' || activeTab === 'item_wise') && (
        <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-500 mr-1" />
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7d', label: 'Last 7 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 border ${
                  datePreset === preset.id
                    ? 'bg-purple-900 text-white border-purple-900'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="text-stone-600 font-medium flex items-center gap-1.5">
                <span>From</span>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="px-2 py-1 border border-stone-300 rounded-lg text-xs font-mono"
                />
              </label>
              <label className="text-stone-600 font-medium flex items-center gap-1.5">
                <span>To</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="px-2 py-1 border border-stone-300 rounded-lg text-xs font-mono"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB A: CUSTOMER REPORTS ==================== */}
      {activeTab === 'customer' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Total Customers</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {customerSummary.total}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Saved Guests</span>
              <span className="text-xl font-bold font-mono tabular-nums text-purple-900 mt-1 block">
                {customerSummary.guests}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Registered Accounts</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                {customerSummary.registered}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Repeat Buyers (2+)</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {customerSummary.repeat}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5 col-span-2 lg:col-span-1">
              <span className="text-[11px] font-medium text-stone-500 block">Combined Spend</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1 block">
                ₹{customerSummary.combinedSpend.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Search & Type Filter */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search customer name, Guest 1.., mobile, address..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full min-h-[38px] pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg self-start sm:self-auto">
              {(
                [
                  { id: 'ALL', label: 'All Customers' },
                  { id: 'GUEST', label: 'Guests Only' },
                  { id: 'REGISTERED', label: 'Registered' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCustomerTypeFilter(t.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    customerTypeFilter === t.id
                      ? 'bg-white text-purple-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Directory Table */}
          {filteredCustomerRows.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">No customers match these filters.</p>
              <button
                type="button"
                onClick={() => {
                  setCustomerSearch('');
                  setCustomerTypeFilter('ALL');
                  setStoreFilter('ALL');
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs border-collapse">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-[11px] font-semibold">
                  <tr>
                    <th className="p-3">Customer Name &amp; Type</th>
                    <th className="p-3">Mobile Number</th>
                    <th className="p-3">Saved Address</th>
                    <th className="p-3 text-right">Orders</th>
                    <th className="p-3 text-right">Total Spend</th>
                    <th className="p-3">Last Order Date</th>
                    <th className="p-3">Primary Hub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredCustomerRows.map((c) => (
                    <tr key={c.key} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-stone-900">{c.name}</div>
                        <div className="text-[11px] text-stone-500">
                          {c.customerType}
                          {c.isAutoNamedGuest && c.guestNumber ? ` · Sequential #${c.guestNumber}` : ''}
                          {c.email ? ` · ${c.email}` : ''}
                        </div>
                      </td>
                      <td className="p-3 font-mono tabular-nums text-stone-800 whitespace-nowrap">
                        {c.phone}
                      </td>
                      <td className="p-3 text-stone-600 max-w-[260px]">
                        <div className="line-clamp-2 leading-snug" title={c.address}>
                          {c.address}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-stone-900">
                        {c.ordersCount}
                        {c.cancelledCount > 0 && (
                          <span className="block text-[10px] font-normal text-rose-600">
                            {c.cancelledCount} cancelled
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-emerald-800 whitespace-nowrap">
                        ₹{c.totalSpent.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono tabular-nums text-stone-700 whitespace-nowrap">
                        {c.lastOrderDate}
                        {c.lastOrderAt && (
                          <span className="block text-[10px] text-stone-400">{c.lastOrderAt}</span>
                        )}
                      </td>
                      <td className="p-3 text-stone-700 max-w-[180px] truncate" title={c.storeName}>
                        {c.storeName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB B: ORDER / SALE REPORT ==================== */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Total Orders</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {salesSummary.totalOrders}
              </span>
              <span className="text-[10px] text-stone-500">
                {salesSummary.activeCount} active / delivered
              </span>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Net Sales Revenue</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1 block">
                ₹{salesSummary.grossSales.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-stone-500">
                Includes final weight billing
              </span>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Delivered Sales</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                ₹{salesSummary.deliveredSales.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-stone-500">
                {salesSummary.deliveredCount} completed orders
              </span>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Avg Order Value</span>
              <span className="text-xl font-bold font-mono tabular-nums text-purple-950 mt-1 block">
                ₹{salesSummary.avgOrderValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-stone-500">
                {salesSummary.weightAdjustedCount} final-weight adjusted
              </span>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-3.5 col-span-2 lg:col-span-1">
              <span className="text-[11px] font-medium text-stone-500 block">Cancelled Orders</span>
              <span className="text-xl font-bold font-mono tabular-nums text-rose-700 mt-1 block">
                {salesSummary.cancelledCount}
              </span>
              <span className="text-[10px] text-stone-500 font-mono tabular-nums">
                ₹{salesSummary.cancelledValue.toLocaleString('en-IN')} excluded
              </span>
            </div>
          </div>

          {/* Payment & Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-900">Payment Method Breakdown</h4>
                <span className="text-[11px] text-stone-500">Non-cancelled orders</span>
              </div>
              <div className="space-y-2.5">
                {salesSummary.paymentBreakdown.map((pm) => {
                  const pct =
                    salesSummary.grossSales > 0
                      ? Math.round((pm.amount / salesSummary.grossSales) * 100)
                      : 0;
                  return (
                    <div key={pm.method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-700 font-medium">{pm.label}</span>
                        <span className="font-mono tabular-nums text-stone-900 font-semibold">
                          {pm.count} orders · ₹{pm.amount.toLocaleString('en-IN')} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-stone-900">Fulfillment Stage Filter</h4>
                <select
                  aria-label="Filter sales by order status"
                  value={salesStatusFilter}
                  onChange={(e) => setSalesStatusFilter(e.target.value as 'ALL' | OrderRecord['status'])}
                  className="px-2 py-1 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-800 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {salesSummary.statusBreakdown.map((st) => (
                  <div
                    key={st.status}
                    className="p-2.5 rounded-lg border border-stone-200 bg-stone-50/70"
                  >
                    <div className="text-[11px] font-medium text-stone-600">{st.label}</div>
                    <div className="font-mono tabular-nums text-sm font-bold text-stone-900 mt-0.5">
                      {st.count}
                    </div>
                    <div className="font-mono tabular-nums text-[10px] text-stone-500">
                      ₹{st.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Ledger Table */}
          {salesOrders.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
              <Receipt className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">
                No orders found for the selected date range and filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDatePreset('all');
                  setSalesStatusFilter('ALL');
                  setStoreFilter('ALL');
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Show All Orders
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-xs border-collapse">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-[11px] font-semibold">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Date &amp; Time</th>
                    <th className="p-3">Customer &amp; Mobile</th>
                    <th className="p-3">Store Hub</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Items</th>
                    <th className="p-3 text-right">Final Bill (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {salesOrders.map((ord) => {
                    const hasAdjustedBill =
                      typeof ord.originalTotal === 'number' && ord.originalTotal !== ord.total;
                    return (
                      <tr key={ord.orderId} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-purple-950 whitespace-nowrap">
                          #{ord.orderId}
                        </td>
                        <td className="p-3 font-mono tabular-nums text-stone-700 whitespace-nowrap">
                          <span>{ord.placedDate || todayStr}</span>
                          <span className="block text-[10px] text-stone-400">{ord.placedAt}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-stone-900">{ord.contactName}</div>
                          <div className="font-mono tabular-nums text-[11px] text-stone-500">
                            {ord.contactPhone}
                          </div>
                        </td>
                        <td className="p-3 text-stone-700 max-w-[170px] truncate" title={ord.store.name}>
                          {ord.store.name}
                        </td>
                        <td className="p-3 text-stone-700 whitespace-nowrap">
                          {PAYMENT_LABELS[ord.paymentMethod]}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${ORDER_STATUS_STYLES[ord.status]}`}
                          >
                            {ORDER_STATUS_LABELS[ord.status]}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600 max-w-[220px]">
                          <div className="truncate" title={ord.items.map((i) => i.product.name).join(', ')}>
                            {ord.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')}
                          </div>
                          {ord.weightUpdatedAt && (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Final weights billed ({ord.weightUpdatedAt})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <span
                            className={`font-bold ${
                              ord.status === 'cancelled'
                                ? 'text-stone-400 line-through'
                                : 'text-stone-900'
                            }`}
                          >
                            ₹{ord.total.toLocaleString('en-IN')}
                          </span>
                          {hasAdjustedBill && (
                            <span className="block text-[10px] text-stone-400 line-through">
                              Est. ₹{ord.originalTotal}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB C: ITEM-WISE SALE REPORT ==================== */}
      {activeTab === 'item_wise' && (
        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Unique SKUs Sold</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {itemSummary.skusSold}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Total Packs Sold</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {itemSummary.totalPacks}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Net Weight Dispatched</span>
              <span className="text-xl font-bold font-mono tabular-nums text-purple-950 mt-1 block">
                {(itemSummary.totalWeightGrams / 1000).toFixed(2)} kg
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Total Item Revenue</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1 block">
                ₹{itemSummary.totalRevenue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Category & Sort Controls */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto">
              {(
                ['ALL', 'FISHES & SEAFOOD', 'CHICKEN', 'MUTTON', 'EGGS'] as const
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setItemCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    itemCategoryFilter === cat
                      ? 'bg-white text-purple-950 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
              <select
                aria-label="Sort item sales"
                value={itemSortBy}
                onChange={(e) => setItemSortBy(e.target.value as 'revenue' | 'weight' | 'packs')}
                className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 font-medium cursor-pointer"
              >
                <option value="revenue">Sort: Revenue High–Low</option>
                <option value="weight">Sort: Weight Sold High–Low</option>
                <option value="packs">Sort: Packs Sold High–Low</option>
              </select>
            </div>
          </div>

          {/* Item-Wise Sales Table */}
          {itemWiseRows.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
              <Package className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">
                No item sales found for the selected category and date range.
              </p>
              <button
                type="button"
                onClick={() => {
                  setItemCategoryFilter('ALL');
                  setDatePreset('all');
                  setStoreFilter('ALL');
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs border-collapse">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-[11px] font-semibold">
                  <tr>
                    <th className="p-3">Item / SKU Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Orders</th>
                    <th className="p-3 text-right">Packs Sold</th>
                    <th className="p-3 text-right">Total Weight Dispatched</th>
                    <th className="p-3 text-right">Avg Price / Pack</th>
                    <th className="p-3 text-right">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {itemWiseRows.map((row) => {
                    const revPct =
                      itemSummary.totalRevenue > 0
                        ? Math.round((row.totalRevenue / itemSummary.totalRevenue) * 100)
                        : 0;
                    return (
                      <tr key={row.productId} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-stone-900">{row.productName}</div>
                          {row.weightAdjustedPacks > 0 && (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              {row.weightAdjustedPacks} pack{row.weightAdjustedPacks > 1 ? 's' : ''} billed by final weight
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-stone-600">
                          <div>{row.category}</div>
                          <div className="text-[10px] text-stone-400">{row.subcategory}</div>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-stone-800">
                          {row.ordersCount}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold text-stone-900">
                          {row.packsSold}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-stone-800 whitespace-nowrap">
                          {formatWeightGrams(row.totalWeightGrams)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-stone-700 whitespace-nowrap">
                          ₹{row.avgPricePerPack.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <div className="font-bold text-emerald-800">
                            ₹{row.totalRevenue.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-stone-400">{revPct}% share</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB D: MULTI-CRITERIA SEARCH REPORT ==================== */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          {/* Search Criteria Form */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  Search Orders by Mobile Number, Item, Amount &amp; Date
                </h4>
                <p className="text-[11px] text-stone-500">
                  Combine any criteria below to audit customer orders, guest checkouts, or billed amounts.
                </p>
              </div>
              {hasActiveSearchCriteria && (
                <button
                  type="button"
                  onClick={resetSearchCriteria}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Search</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Mobile Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="e.g. 9876543210"
                    value={searchMobile}
                    onChange={(e) => setSearchMobile(e.target.value)}
                    className="w-full min-h-[38px] pl-8 pr-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Item Name or SKU
                </label>
                <div className="relative flex items-center">
                  <Package className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g. Rohu, Seer, Mutton..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="w-full min-h-[38px] pl-8 pr-2.5 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Exact Amount (₹)
                </label>
                <div className="relative flex items-center">
                  <IndianRupee className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    placeholder="Exact order or item ₹"
                    value={searchExactAmount}
                    onChange={(e) => setSearchExactAmount(e.target.value)}
                    className="w-full min-h-[38px] pl-8 pr-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Amount Range (Min – Max ₹)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min ₹"
                    value={searchMinAmount}
                    onChange={(e) => setSearchMinAmount(e.target.value)}
                    className="w-full min-h-[38px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max ₹"
                    value={searchMaxAmount}
                    onChange={(e) => setSearchMaxAmount(e.target.value)}
                    className="w-full min-h-[38px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={searchFromDate}
                  onChange={(e) => setSearchFromDate(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={searchToDate}
                  onChange={(e) => setSearchToDate(e.target.value)}
                  className="w-full min-h-[38px] px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearchFromDate(todayStr);
                    setSearchToDate(todayStr);
                  }}
                  className="min-h-[38px] px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Filter Today ({todayStr})
                </button>
              </div>
            </div>
          </div>

          {/* Search Summary Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Matching Orders</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {searchSummary.count}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Active Orders</span>
              <span className="text-xl font-bold font-mono tabular-nums text-purple-950 mt-1 block">
                {searchSummary.activeCount}
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Matched Weight</span>
              <span className="text-xl font-bold font-mono tabular-nums text-stone-900 mt-1 block">
                {(searchSummary.totalWeightGrams / 1000).toFixed(2)} kg
              </span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 block">Matched Sales Total</span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1 block">
                ₹{searchSummary.revenue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Search Results Table */}
          {searchResults.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-2">
              <Search className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">
                No matching orders found for these search parameters.
              </p>
              <button
                type="button"
                onClick={resetSearchCriteria}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Clear All Search Filters
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs border-collapse">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 text-[11px] font-semibold">
                  <tr>
                    <th className="p-3">Order &amp; Date</th>
                    <th className="p-3">Customer &amp; Mobile</th>
                    <th className="p-3">Delivery Address</th>
                    <th className="p-3">Ordered Items &amp; Weights</th>
                    <th className="p-3">Store Hub</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {searchResults.map((ord) => (
                    <tr key={ord.orderId} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-purple-950">#{ord.orderId}</div>
                        <div className="font-mono tabular-nums text-[11px] text-stone-500">
                          {ord.placedDate || todayStr} · {ord.placedAt}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-semibold text-stone-900">{ord.contactName}</div>
                        <div className="font-mono tabular-nums text-[11px] text-stone-600">
                          {ord.contactPhone}
                        </div>
                      </td>
                      <td className="p-3 text-stone-600 max-w-[210px]">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-snug" title={ord.deliveryAddress}>
                            {ord.deliveryAddress}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 space-y-1 max-w-[280px]">
                        {ord.items.map((item, idx) => {
                          const lineTotal = getEffectiveItemLineTotal(item);
                          return (
                            <div
                              key={`${item.id}-${idx}`}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <span className="text-stone-800 truncate">
                                {item.quantity}× {item.product.name} ({item.selectedWeight}
                                {typeof item.finalWeightGrams === 'number'
                                  ? ` → ${formatWeightGrams(item.finalWeightGrams)}`
                                  : ''}
                                )
                              </span>
                              <span className="font-mono tabular-nums text-stone-600 shrink-0">
                                ₹{lineTotal}
                              </span>
                            </div>
                          );
                        })}
                      </td>
                      <td className="p-3 text-stone-700 max-w-[160px] truncate" title={ord.store.name}>
                        {ord.store.name}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${ORDER_STATUS_STYLES[ord.status]}`}
                        >
                          {ORDER_STATUS_LABELS[ord.status]}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div
                          className={`font-bold ${
                            ord.status === 'cancelled'
                              ? 'text-stone-400 line-through'
                              : 'text-emerald-800'
                          }`}
                        >
                          ₹{ord.total.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {PAYMENT_LABELS[ord.paymentMethod]}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
