import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Filter,
  Package,
  Trash2,
  QrCode,
  CheckCircle2,
  Layers,
  Download,
  LogOut,
  SlidersHorizontal,
  ExternalLink,
  AlertOctagon,
  ShoppingBag,
  BookOpen,
  Menu,
  ToggleLeft,
  ToggleRight,
  Banknote,
  Smartphone,
  CreditCard,
  ShieldCheck,
  Repeat,
  MessageSquare,
  Code2,
  BarChart3,
} from 'lucide-react';
import { getTodayWeekdayName, isSubscriptionDueToday } from '../../utils/date';
import { useStore } from '../../context/StoreContext';
import {
  InventoryBatch,
  WasteRecord,
  WarehouseLabelData,
  InventoryCategory,
  StockAdjustmentReason,
  StockAdjustmentAuditRecord,
} from '../../types/inventory';
import {
  INITIAL_INVENTORY_BATCHES,
  INITIAL_WASTE_RECORDS,
} from '../../data/inventorySeed';
import { WasteLoggingModal } from './WasteLoggingModal';
import { WarehouseLabelModal } from './WarehouseLabelModal';
import { QuickStockEditDrawer } from './QuickStockEditDrawer';
import { ForceOutOfStockModal } from './ForceOutOfStockModal';
import { CustomerOrdersMonitor } from './CustomerOrdersMonitor';
import { StoreInchargesNotebook } from './StoreInchargesNotebook';
import { SubscriptionsMonitor } from './SubscriptionsMonitor';
import { ReportsDashboard } from './ReportsDashboard';
import { SystemSpecsContent } from '../ArchitectureDocsModal';

export const ControlRoomDashboard: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const {
    adminUser,
    logoutAdmin,
    activeStore,
    stores,
    updateProductOnlineAvailability,
    allOrders,
    pendingIncomingOrders,
    requestedControlRoomNav,
    clearRequestedControlRoomNav,
    storeIncharges,
    customPrices,
    updateProductPrice,
    featureFlags,
    toggleFeatureFlag,
    subscriptions,
  } = useStore();

  const isAdminRole = adminUser?.role === 'Admin';
  const isStoreAdmin = adminUser?.role === 'Store Admin';
  const isStoreIncharge = adminUser?.role === 'Store Incharge';

  const displayedActiveStore = useMemo(() => {
    if ((isStoreAdmin || isStoreIncharge) && adminUser?.assignedStoreId) {
      return stores.find((s) => s.id === adminUser.assignedStoreId) || activeStore;
    }
    return activeStore;
  }, [isStoreAdmin, isStoreIncharge, adminUser?.assignedStoreId, stores, activeStore]);

  const scopedOrders = useMemo(() => {
    if (isStoreAdmin && adminUser?.assignedStoreId) {
      return allOrders.filter((o) => o.store.id === adminUser.assignedStoreId);
    }
    return allOrders;
  }, [allOrders, isStoreAdmin, adminUser?.assignedStoreId]);

  const scopedSubscriptions = useMemo(() => {
    if (isStoreAdmin && adminUser?.assignedStoreId) {
      return subscriptions.filter((s) => s.storeId === adminUser.assignedStoreId);
    }
    return subscriptions;
  }, [subscriptions, isStoreAdmin, adminUser?.assignedStoreId]);

  const todayWeekday = getTodayWeekdayName();
  const todaysDueSubsCount = useMemo(
    () => scopedSubscriptions.filter((s) => isSubscriptionDueToday(s, todayWeekday)).length,
    [scopedSubscriptions, todayWeekday]
  );

  // Navigation sub-views (Customer Orders first as primary operations tab)
  const [activeNav, setActiveNav] = useState<
    | 'realtime_stock'
    | 'customer_orders'
    | 'subscriptions'
    | 'reports'
    | 'store_incharges'
    | 'waste_log'
    | 'features'
    | 'system_specs'
  >('customer_orders');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Switch tab when triggered from global New Order alert banner or CustomerProfile shortcut
  useEffect(() => {
    if (requestedControlRoomNav) {
      if (requestedControlRoomNav === 'reports' && !isAdminRole) {
        setActiveNav('customer_orders');
      } else {
        setActiveNav(requestedControlRoomNav);
      }
      clearRequestedControlRoomNav();
    }
  }, [requestedControlRoomNav, clearRequestedControlRoomNav, isAdminRole]);

  // Enforce screen access restrictions when logged in as Store Incharge, Store Admin, or non-Admin
  useEffect(() => {
    if (
      isStoreIncharge &&
      activeNav !== 'realtime_stock' &&
      activeNav !== 'customer_orders' &&
      activeNav !== 'subscriptions'
    ) {
      setActiveNav('customer_orders');
    } else if (
      !isAdminRole &&
      (activeNav === 'reports' ||
        activeNav === 'features' ||
        activeNav === 'system_specs' ||
        activeNav === 'store_incharges')
    ) {
      setActiveNav('customer_orders');
    }
  }, [isStoreIncharge, isAdminRole, activeNav]);

  // Master Inventory State
  const [batches, setBatches] = useState<InventoryBatch[]>(INITIAL_INVENTORY_BATCHES);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>(INITIAL_WASTE_RECORDS);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRY_HAZARD'>('ALL');

  // Multi-Select Row Checkboxes
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Drawer / Modal states
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [preselectedWasteBatchId, setPreselectedWasteBatchId] = useState<string | null>(null);

  const [activeLabelData, setActiveLabelData] = useState<WarehouseLabelData | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Quick Stock Edit Drawer state
  const [selectedBatchForQuickEdit, setSelectedBatchForQuickEdit] = useState<InventoryBatch | null>(null);

  // Emergency Force Out of Stock Kill-Switch Modal state
  const [forceOutModalBatch, setForceOutModalBatch] = useState<InventoryBatch | null>(null);
  const [forceOutModalMode, setForceOutModalMode] = useState<'confirm_force_out' | 'fast_reversal'>('confirm_force_out');

  // Stock Adjustment Audit Trail
  const [stockAuditLogs, setStockAuditLogs] = useState<StockAdjustmentAuditRecord[]>([
    {
      id: 'ADJ-2026-901',
      batchId: 'BATCH-CHK-20261108-01',
      skuName: 'Premium Chicken Breast - Boneless',
      previousStockKg: 10.0,
      newStockKg: 4.8,
      deltaKg: -5.2,
      reason: 'Physical Count Audit',
      notes: 'Evening reconciliation before night shift',
      adminId: adminUser?.id || 'ADM-8901',
      adminName: adminUser?.name || 'Shift Supervisor Rahim',
      timestamp: 'Today, 09:15 AM',
    },
  ]);

  // Success notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalSKUs = batches.length;
    const outOfStockCount = batches.filter((b) => b.currentStockKg === 0).length;
    const lowStockCount = batches.filter(
      (b) => b.currentStockKg > 0 && b.currentStockKg <= b.minThresholdKg
    ).length;
    const expiryHazardsCount = batches.filter(
      (b) => b.currentStockKg > 0 && b.hoursUntilExpiry > 0 && b.hoursUntilExpiry <= 48
    ).length;
    const totalStockKg = batches.reduce((acc, b) => acc + b.currentStockKg, 0);

    return {
      totalSKUs,
      outOfStockCount,
      lowStockCount,
      expiryHazardsCount,
      totalStockKg: Math.round(totalStockKg * 10) / 10,
    };
  }, [batches]);

  // Waste analytics calculations
  const wasteStats = useMemo(() => {
    const totalWasteKg = wasteRecords.reduce((acc, r) => acc + r.writtenOffKg, 0);
    const totalWasteCost = wasteRecords.reduce((acc, r) => acc + r.costImpact, 0);
    const shrinkageRate =
      stats.totalStockKg > 0
        ? ((totalWasteKg / (stats.totalStockKg + totalWasteKg)) * 100).toFixed(1)
        : '2.1';

    return {
      totalWasteKg: Math.round(totalWasteKg * 10) / 10,
      totalWasteCost,
      shrinkageRate,
    };
  }, [wasteRecords, stats.totalStockKg]);

  // Filtered Inventory Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        b.skuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.supplierSource.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || b.category === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'OUT_OF_STOCK') matchesStatus = b.currentStockKg === 0;
      else if (statusFilter === 'LOW_STOCK')
        matchesStatus = b.currentStockKg > 0 && b.currentStockKg <= b.minThresholdKg;
      else if (statusFilter === 'EXPIRY_HAZARD')
        matchesStatus = b.currentStockKg > 0 && b.hoursUntilExpiry > 0 && b.hoursUntilExpiry <= 48;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [batches, searchQuery, categoryFilter, statusFilter]);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedBatchIds.length === filteredBatches.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(filteredBatches.map((b) => b.id));
    }
  };

  const toggleSelectBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Handlers
  const handleWasteLogged = (record: WasteRecord, updatedBatch: InventoryBatch) => {
    setWasteRecords((prev) => [record, ...prev]);
    setBatches((prev) => prev.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
    showToast(`Deducted ${record.writtenOffKg} kg from ${record.batchId} (${record.reasonLabel})`);
  };

  const openWasteForBatch = (b: InventoryBatch) => {
    setPreselectedWasteBatchId(b.id);
    setIsWasteModalOpen(true);
  };

  const openLabelForBatch = (b: InventoryBatch) => {
    const label: WarehouseLabelData = {
      labelId: `LBL-${Date.now().toString().slice(-6)}`,
      batchId: b.id,
      skuName: b.skuName,
      category: b.category,
      grossWeightKg: b.grossReceivedKg,
      netWeightKg: b.currentStockKg,
      yieldPct: b.usableYieldPct,
      receivingTempC: b.receivingTempC,
      packedDate: b.procurementDate.slice(0, 10),
      expiryDate: b.expiryDate.slice(0, 10),
      chillerBay: b.chillerLocation,
      fssaiNumber: '11224333000892',
      supplierName: b.supplierSource,
      barcodeNumber: `FMS-${b.id.slice(-8)}`,
    };
    setActiveLabelData(label);
    setIsLabelModalOpen(true);
  };

  const handleBulkMarkWaste = () => {
    if (selectedBatchIds.length === 0) return;
    setPreselectedWasteBatchId(selectedBatchIds[0]);
    setIsWasteModalOpen(true);
  };

  const handleExportManifest = () => {
    const rows = filteredBatches.map((b) => ({
      BatchId: b.id,
      SKU: b.skuName,
      Category: b.category,
      CurrentStockKg: b.currentStockKg,
      MinThresholdKg: b.minThresholdKg,
      Supplier: b.supplierSource,
      TempC: b.receivingTempC,
      ExpiryDate: b.expiryDate,
      Status: b.status,
    }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rows, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FMS_Inventory_Manifest_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Inventory Manifest exported successfully');
  };

  // Handler for Quick Stock & Price Edit
  const handleSaveStockAdjustment = async (
    batchId: string,
    newStockKg: number,
    deltaKg: number,
    reason: StockAdjustmentReason,
    notes?: string,
    newPricePerKg?: number
  ) => {
    await new Promise((r) => setTimeout(r, 450));

    let affectedSkuId = '';
    let affectedSkuName = '';

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        affectedSkuId = b.skuId;
        affectedSkuName = b.skuName;

        let status: InventoryBatch['status'] = 'IN_STOCK';
        if (newStockKg === 0) status = 'OUT_OF_STOCK';
        else if (newStockKg <= b.minThresholdKg) status = 'LOW_STOCK';
        else if (b.hoursUntilExpiry <= 48) status = 'EXPIRY_HAZARD';

        return {
          ...b,
          currentStockKg: newStockKg,
          status,
          isForcedOutOfStock: newStockKg === 0 ? b.isForcedOutOfStock : false,
        };
      })
    );

    // Update Live Consumer Storefront instantly
    if (affectedSkuId) {
      updateProductOnlineAvailability(affectedSkuId, newStockKg > 0, newStockKg);
      if (newPricePerKg !== undefined && newPricePerKg > 0) {
        updateProductPrice(affectedSkuId, newPricePerKg);
      }
    }

    // Record Audit Log
    const newLog: StockAdjustmentAuditRecord = {
      id: `ADJ-${Date.now().toString().slice(-6)}`,
      batchId,
      skuName: affectedSkuName || batchId,
      previousStockKg: selectedBatchForQuickEdit?.currentStockKg || 0,
      newStockKg,
      deltaKg,
      reason,
      notes: `${notes || ''}${newPricePerKg ? ` [Price updated to ₹${newPricePerKg}/kg]` : ''}`.trim(),
      adminId: adminUser?.id || 'ADM-8901',
      adminName: adminUser?.name || 'Ops Supervisor',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setStockAuditLogs((prev) => [newLog, ...prev]);

    const priceText = newPricePerKg ? ` & Price set to ₹${newPricePerKg}/kg` : '';
    showToast(`✓ Stock updated to ${newStockKg} kg${priceText} for ${affectedSkuName}. Live consumer inventory synced.`);
  };

  // Handler for Emergency Kill-Switch Force Out of Stock
  const handleConfirmForceOut = async (batchId: string, supervisorNote: string) => {
    await new Promise((r) => setTimeout(r, 450));

    let affectedSkuId = '';
    let affectedSkuName = '';

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        affectedSkuId = b.skuId;
        affectedSkuName = b.skuName;
        return {
          ...b,
          currentStockKg: 0,
          status: 'OUT_OF_STOCK',
          isForcedOutOfStock: true,
          forcedOutOfStockBy: adminUser?.name || 'Shift Supervisor',
          forcedOutOfStockAt: new Date().toLocaleTimeString(),
        };
      })
    );

    if (affectedSkuId) {
      updateProductOnlineAvailability(affectedSkuId, false, 0);
    }

    showToast(`🚨 ${affectedSkuName} FORCED OUT OF STOCK! Online 'Add to Cart' disabled.`);
  };

  // Handler for Fast Reversal
  const handleConfirmReversal = async (batchId: string, restoredStockKg: number, reason: string) => {
    await new Promise((r) => setTimeout(r, 450));

    let affectedSkuId = '';
    let affectedSkuName = '';

    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        affectedSkuId = b.skuId;
        affectedSkuName = b.skuName;
        const status = restoredStockKg <= b.minThresholdKg ? 'LOW_STOCK' : 'IN_STOCK';
        return {
          ...b,
          currentStockKg: restoredStockKg,
          status,
          isForcedOutOfStock: false,
          forcedOutOfStockBy: undefined,
          forcedOutOfStockAt: undefined,
        };
      })
    );

    if (affectedSkuId) {
      updateProductOnlineAvailability(affectedSkuId, true, restoredStockKg);
    }

    showToast(`✓ ${affectedSkuName} re-enabled! Online stock restored to ${restoredStockKg} kg.`);
  };

  const handleToggleForceOut = (batch: InventoryBatch) => {
    setForceOutModalBatch(batch);
    if (batch.isForcedOutOfStock || batch.currentStockKg === 0) {
      setForceOutModalMode('fast_reversal');
    } else {
      setForceOutModalMode('confirm_force_out');
    }
  };

  const selectNav = (
    nav:
      | 'realtime_stock'
      | 'customer_orders'
      | 'subscriptions'
      | 'reports'
      | 'store_incharges'
      | 'waste_log'
      | 'features'
      | 'system_specs'
  ) => {
    setActiveNav(nav);
    setIsMobileNavOpen(false);
  };

  const renderSidebarContent = (showCloseButton: boolean) => (
    <>
      <div>
        {/* Logo & Hub Info */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-sm text-purple-950 tracking-wide truncate">
                Fish Meat Store
              </h1>
              <span className="text-[10px] text-emerald-700 font-semibold block truncate">
                A Franchise of FreshToHome
              </span>
              <span className="text-[10px] text-stone-500 font-mono block truncate">
                Ops Control Room · v2.6
              </span>
            </div>
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close control room menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active Retail Store Info Badge */}
        <div className="p-3 mx-3 my-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
          <div className="flex items-center justify-between text-[11px] text-stone-500">
            <span>{isStoreAdmin ? 'Assigned Store Admin Hub:' : 'Active Hub:'}</span>
            <span className="text-emerald-700 font-bold font-mono">LIVE IoT</span>
          </div>
          <div className="font-bold text-stone-900 text-xs mt-0.5 truncate">
            {displayedActiveStore.name}
          </div>
          <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-1">
            <span>Chiller: <strong className="text-emerald-700">{displayedActiveStore.chillerTempC}°C</strong></span>
            <span aria-hidden="true">·</span>
            <span>4.0km Delivery SLA</span>
          </div>
        </div>

        {/* Nav List */}
        <nav className="px-3 space-y-1 text-xs font-semibold">
          {/* Primary Customer Orders Monitor Tab (First Tab) */}
          <button
            type="button"
            onClick={() => selectNav('customer_orders')}
            className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
              activeNav === 'customer_orders'
                ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Customer Orders</span>
            </div>
            {pendingIncomingOrders.length > 0 ? (
              <span className="font-mono text-[10px] bg-amber-500 text-stone-950 px-1.5 py-0.5 rounded font-bold animate-pulse">
                {pendingIncomingOrders.length} New
              </span>
            ) : (
              <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                {scopedOrders.length} Live
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => selectNav('realtime_stock')}
            className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
              activeNav === 'realtime_stock'
                ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Real-Time Stock & Prices</span>
            </div>
            <span className="font-mono text-[10px] bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded text-stone-700">
              {stats.totalSKUs}
            </span>
          </button>

          {/* Subscriptions Tab (Accessible to Root Admin, Store Admin & Store Incharge) */}
          <button
            type="button"
            onClick={() => selectNav('subscriptions')}
            className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
              activeNav === 'subscriptions'
                ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Repeat className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Subscriptions</span>
            </div>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                todaysDueSubsCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {todaysDueSubsCount > 0 ? `${todaysDueSubsCount} Today` : scopedSubscriptions.length}
            </span>
          </button>

          {/* Reports Analytics Dashboard (Root Admin only) */}
          {isAdminRole && (
            <button
              type="button"
              onClick={() => selectNav('reports')}
              className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                activeNav === 'reports'
                  ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                  : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Reports</span>
              </div>
              <span className="font-mono text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                Admin
              </span>
            </button>
          )}

          {/* Store Incharges & Credentials Notebook Tab (Root Admin only) */}
          {isAdminRole && (
            <button
              type="button"
              onClick={() => selectNav('store_incharges')}
              className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                activeNav === 'store_incharges'
                  ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                  : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Incharge Notebook</span>
              </div>
              <span className="font-mono text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded">
                {storeIncharges.length} Staff
              </span>
            </button>
          )}

          {/* Waste & Shrinkage Log Tab (Hidden for Store Incharge) */}
          {!isStoreIncharge && (
            <button
              type="button"
              onClick={() => selectNav('waste_log')}
              className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                activeNav === 'waste_log'
                  ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                  : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Waste & Shrinkage Log</span>
              </div>
              <span className="font-mono text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                {wasteRecords.length}
              </span>
            </button>
          )}

          {isAdminRole && (
            <>
              <button
                type="button"
                onClick={() => selectNav('features')}
                className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeNav === 'features'
                    ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                    : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ToggleRight className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Features</span>
                </div>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded border font-bold ${
                    featureFlags.enableOtherPayments || featureFlags.sendWhatsAppOnOrderConfirmation
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectNav('system_specs')}
                className={`w-full min-h-[44px] lg:min-h-0 px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  activeNav === 'system_specs'
                    ? 'bg-purple-50 text-purple-950 border border-purple-200 shadow-2xs'
                    : 'text-stone-600 hover:text-purple-950 hover:bg-stone-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>System Specs</span>
                </div>
                <span className="font-mono text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                  Admin
                </span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* User Session & Back to Storefront */}
      <div className="p-4 border-t border-stone-200 space-y-2.5 bg-stone-50/70">
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="truncate">
            <span className="font-bold text-stone-900 block truncate">
              {adminUser?.name || 'Operations Lead'}
            </span>
            <span className="text-[10px] text-stone-500 truncate block">
              {adminUser?.role || 'Store Manager'}
            </span>
          </div>
          <button
            type="button"
            onClick={logoutAdmin}
            className="min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 p-2 lg:p-1.5 flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Sign Out of Admin"
            aria-label="Sign Out of Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] lg:min-h-0 py-2 px-3 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>
      </div>
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-stone-50 text-stone-900 overflow-hidden font-sans select-none"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 sm:max-w-md z-60 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile/Tablet Navigation Drawer (< 1024px) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-[85vw] max-w-[290px] h-full bg-white border-r border-stone-200 flex flex-col justify-between shadow-2xl overflow-y-auto">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* 1. DESKTOP SIDE NAVIGATION */}
      <aside className="hidden lg:flex lg:w-64 bg-white border-r border-stone-200 flex-col justify-between shrink-0 shadow-2xs overflow-y-auto">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. MAIN WORKSPACE (Full vertical page scrolling enabled on all screen sizes) */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-y-auto bg-stone-50">
        {/* Top Operational Status Bar */}
        <header className="p-3 sm:p-4 bg-white border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
          <div className="flex items-start gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 shrink-0 cursor-pointer"
              aria-label="Open control room navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-base sm:text-lg text-purple-950 leading-snug">
                {activeNav === 'realtime_stock' && 'Real-Time Inventory & Price Control Room'}
                {activeNav === 'customer_orders' && 'Live Customer Orders Dispatch & Fulfillment Console'}
                {activeNav === 'subscriptions' && 'Customer Recurring Subscriptions & Daily Delivery Planner'}
                {activeNav === 'reports' && 'Admin Reports & Sales Analytics Dashboard'}
                {activeNav === 'store_incharges' && 'Store Incharge Profiles & Admin Credentials Notebook'}
                {activeNav === 'waste_log' && 'Perishable Waste, Expiry & Blemish Tracking Log'}
                {activeNav === 'features' && 'Features & Storefront Services Control'}
                {activeNav === 'system_specs' && 'Architecture, UI/UX & Engineering Specifications'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {activeNav === 'customer_orders'
                  ? 'Real-time monitoring of customer orders across store hubs with butcher cutting slips and 45-min express fulfillment.'
                  : activeNav === 'subscriptions'
                  ? 'View all customer subscriptions, filter deliveries scheduled for today, and generate today’s butcher & dispatch summary report.'
                  : activeNav === 'reports'
                  ? 'Admin-only Customer, Order/Sale, Item-Wise Sale, and Multi-Criteria Search reports across all guests & accounts.'
                  : activeNav === 'store_incharges'
                  ? 'Manage Store Incharge logins, passwords, shift notes, and employee credentials to keep notes safe.'
                  : activeNav === 'features'
                  ? 'Enable or disable storefront payment services and operational features dynamically under Admin Login.'
                  : activeNav === 'system_specs'
                  ? 'Complete Information Architecture, UI layout contract, tech stack, and 4km hyperlocal store-routing logic.'
                  : 'Live batch tracking, 0-4°C unbroken chill chain enforcement, and dynamic shrinkage accounting.'}
              </p>
            </div>
          </div>

          {/* Quick Header Action Trigger */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleExportManifest}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export Manifest</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE SUB-VIEW 1: REAL-TIME STOCK GRID */}
        {activeNav === 'realtime_stock' && (
          <div className="p-3 sm:p-4 space-y-3">
            {/* Sticky Action Triggers: Quick Search Bar, Category Filters, Status Filter (Frozen while scrolling) */}
            <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-stone-50/95 backdrop-blur-xs border-b border-stone-200/70">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter cuts, batches, suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-3.5 py-2 sm:py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Category & Status Filter Dropdowns */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-stone-600">
                  <Filter className="w-3.5 h-3.5 text-stone-500" />
                  <span>Filter:</span>
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-2.5 py-2 sm:py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="FISHES & SEAFOOD">Fishes & Seafood</option>
                  <option value="CHICKEN">Chicken</option>
                  <option value="MUTTON">Mutton</option>
                  <option value="EGGS">Eggs</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-2.5 py-2 sm:py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="LOW_STOCK">Low Stock Only</option>
                  <option value="OUT_OF_STOCK">Out of Stock Only</option>
                  <option value="EXPIRY_HAZARD">Expiry &lt;48h Only</option>
                </select>

                {statusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="min-h-[44px] sm:min-h-0 px-2 text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              </div>
            </div>

            {/* Multi-Select Batch Actions Toolbar (Visible when rows selected) */}
            {selectedBatchIds.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-fade-in">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-purple-950 font-mono bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
                    {selectedBatchIds.length} Batches Selected
                  </span>
                  <span className="text-purple-800">Apply Batch Action:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkMarkWaste}
                    className="min-h-[44px] sm:min-h-0 flex items-center gap-1 px-3 py-1.5 sm:py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Log Waste / Blemish</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBatchIds([])}
                    className="min-h-[44px] sm:min-h-0 px-2 text-purple-700 hover:text-purple-950 underline cursor-pointer font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {/* Live Storefront Sync & Access Control Alert Banner */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 via-white to-purple-50 rounded-xl border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      Restricted Access · Authorized Admin
                    </span>
                    <span className="text-stone-300 hidden sm:inline">|</span>
                    <span className="font-semibold text-stone-900">Live Consumer-Facing Inventory Sync Active</span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Stock overrides and <strong>Emergency Kill-Switch (Force Out of Stock)</strong> triggers instantly update consumer-facing cart availability and local retail scales.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-[10px] text-stone-700 font-mono">
                  Operator: <strong className="text-emerald-700">{adminUser?.name || 'Shift Supervisor'}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-mono">
                  Chiller: {activeStore.chillerTempC}°C
                </span>
              </div>
            </div>

            {/* Responsive Data Table */}
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs">
              <table className="w-full min-w-[740px] text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredBatches.length > 0 &&
                          selectedBatchIds.length === filteredBatches.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-stone-300 bg-white text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">SKU Name & Category</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Retail Price (Live)</th>
                    <th className="p-3">Threshold Limit</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredBatches.map((b) => {
                    const isSelected = selectedBatchIds.includes(b.id);
                    const isLow = b.currentStockKg > 0 && b.currentStockKg <= b.minThresholdKg;
                    const isOut = b.currentStockKg === 0;
                    const isExpiryHazard =
                      b.currentStockKg > 0 && b.hoursUntilExpiry > 0 && b.hoursUntilExpiry <= 48;

                    return (
                      <tr
                        key={b.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-purple-50'
                            : isOut
                            ? 'bg-rose-50/70 hover:bg-rose-50'
                            : isLow
                            ? 'bg-amber-50/70 hover:bg-amber-50'
                            : isExpiryHazard
                            ? 'bg-cyan-50/70 hover:bg-cyan-50'
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBatch(b.id)}
                            className="rounded border-stone-300 bg-white text-emerald-600 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* SKU Name & Thumbnail */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={b.image || undefined}
                              alt={b.skuName}
                              className="w-9 h-9 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                            />
                            <div>
                              <span className="font-bold text-stone-900 block leading-tight">
                                {b.skuName}
                              </span>
                              <span className="text-[10px] text-stone-500">
                                {b.category} · {b.subcategory}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="p-3">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {b.currentStockKg} kg
                          </span>
                        </td>

                        {/* Retail Price Live */}
                        <td className="p-3">
                          <div className="font-mono font-bold text-xs text-stone-900">
                            ₹{customPrices[b.skuId] || (b.costPerKg ? Math.round(b.costPerKg * 1.35) : 295)}
                            <span className="text-[10px] text-stone-500 font-sans font-normal"> / kg</span>
                          </div>
                          <div className="text-[9px] text-emerald-700 font-semibold">Synced Online</div>
                        </td>

                        {/* Minimum Safety Threshold */}
                        <td className="p-3 font-mono text-stone-600 text-[11px]">
                          {b.minThresholdKg} kg min
                        </td>

                        {/* Status Badge */}
                        <td className="p-3">
                          {b.isForcedOutOfStock ? (
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 uppercase tracking-tight flex items-center gap-1 shadow-2xs whitespace-nowrap"
                              title={`Force OOS (FOOS) triggered by ${b.forcedOutOfStockBy || 'Admin'} at ${b.forcedOutOfStockAt || 'recent'}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                              <span>FOOS ACTIVE (OOS)</span>
                            </span>
                          ) : isOut ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                              Low Stock
                            </span>
                          ) : isExpiryHazard ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 uppercase">
                              &lt;48h Expiry
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                              In Stock
                            </span>
                          )}
                        </td>

                        {/* Operational Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {/* 1. Quick Edit Stock & Price Action Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedBatchForQuickEdit(b)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95"
                              title="Quickly modify stock level and live price per kg"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                              <span>Edit Stock & Price</span>
                            </button>

                            {/* 2. Emergency Force Out of Stock (FOOS) Kill-Switch Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleForceOut(b)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 ${
                                b.isForcedOutOfStock
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                              }`}
                              title={
                                b.isForcedOutOfStock
                                  ? 'FOOS Active: Click to re-enable stock and consumer purchasing'
                                  : 'Emergency Kill-Switch: Force Out of Stock (FOOS) instantly'
                              }
                            >
                              <AlertOctagon
                                className={`w-3 h-3 ${
                                  b.isForcedOutOfStock ? 'text-rose-600 animate-pulse' : 'text-stone-500'
                                }`}
                              />
                              <span>{b.isForcedOutOfStock ? 'FOOS Active (Restore)' : 'Force OOS'}</span>
                            </button>

                            {/* Log Waste Button */}
                            {b.currentStockKg > 0 && (
                              <button
                                type="button"
                                onClick={() => openWasteForBatch(b)}
                                className="p-1 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                                title="Log perishable shrinkage / trimming loss"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* QR Warehouse Label */}
                            <button
                              type="button"
                              onClick={() => openLabelForBatch(b)}
                              className="p-1 hover:bg-stone-100 text-stone-500 hover:text-stone-900 rounded transition-colors cursor-pointer shrink-0"
                              title="View & print warehouse QR/barcode label"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKSPACE SUB-VIEW 2: WASTE & SHRINKAGE TRACKING LOG */}
        {activeNav === 'waste_log' && !isStoreIncharge && (
          <div className="p-3 sm:p-4 space-y-5">
            {/* Shrinkage KPI Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-xs text-stone-600 block">Total Perishable Shrinkage</span>
                <span className="text-2xl font-bold font-mono text-rose-600 mt-1 block">
                  {wasteStats.totalWasteKg} kg
                </span>
                <span className="text-[10px] text-stone-500">Current 7-day store period</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
                <span className="text-xs text-stone-600 block">Financial Shrinkage Cost</span>
                <span className="text-2xl font-bold font-mono text-stone-900 mt-1 block">
                  ₹{wasteStats.totalWasteCost.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-stone-500">P&L write-off audited</span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Shrinkage Rate %</span>
                  <span className="text-[10px] text-emerald-700 font-mono font-semibold">Target &lt; 3.0%</span>
                </div>
                <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
                  {wasteStats.shrinkageRate}%
                </span>
                <span className="text-[10px] text-stone-500">Well within meat retail standard</span>
              </div>
            </div>

            {/* Waste Reason Breakdown Visual Progress Bars */}
            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold">
                <span className="text-stone-900">Shrinkage Breakdown by Root Cause</span>
                <button
                  type="button"
                  onClick={() => setIsWasteModalOpen(true)}
                  className="min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3 py-1.5 sm:py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Log New Write-Off</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-600">Expired Shelf-Life (&gt;48h Holding Limit)</span>
                    <span className="font-mono text-stone-900 font-semibold">42%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full w-[42%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-600">Butchery Trimming & De-boning Loss</span>
                    <span className="font-mono text-stone-900 font-semibold">35%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-[35%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-600">Packaging Vacuum Seal Breach</span>
                    <span className="font-mono text-stone-900 font-semibold">15%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full w-[15%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-stone-600">Cold-Chain Temperature Anomaly (&gt;4.0°C)</span>
                    <span className="font-mono text-stone-900 font-semibold">8%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-[8%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Audit Table */}
            <div className="rounded-xl border border-stone-200 overflow-x-auto bg-white shadow-2xs">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] border-b border-stone-200">
                  <tr>
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Batch ID</th>
                    <th className="p-3">Item SKU</th>
                    <th className="p-3">Written Off</th>
                    <th className="p-3">Cost Loss</th>
                    <th className="p-3">Reason Code</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3">Supervisor Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {wasteRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-3 font-mono text-rose-700 font-bold">{r.id}</td>
                      <td className="p-3 font-mono text-stone-600">{r.batchId}</td>
                      <td className="p-3 font-semibold text-stone-900">{r.skuName}</td>
                      <td className="p-3 font-mono font-bold text-rose-600">{r.writtenOffKg} kg</td>
                      <td className="p-3 font-mono text-stone-900">₹{r.costImpact.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {r.reasonLabel}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-stone-600">{r.loggedBy}</td>
                      <td className="p-3">
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Audited & Cleared</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKSPACE SUB-VIEW 3: ADMIN FEATURES & SERVICES TOGGLES */}
        {activeNav === 'features' && isAdminRole && (
          <div className="p-3 sm:p-4 space-y-4 max-w-4xl">
            <div className="p-4 bg-white rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Admin Feature &amp; Service Toggles
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Configure which customer-facing features and checkout payment options are active across Fish Meat Store. Changes apply immediately.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[11px] bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-md font-bold self-start sm:self-auto shrink-0">
                Admin Access Only
              </span>
            </div>

            {/* Feature Card: Other Payments */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-bold text-sm text-stone-900">
                      Other Payments
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        featureFlags.enableOtherPayments
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {featureFlags.enableOtherPayments ? 'Enabled' : 'Disabled (COD / UPI on Delivery Only)'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Controls whether <strong className="text-stone-900">UPI Instant</strong> and{' '}
                    <strong className="text-stone-900">Credit / Debit Card</strong> payment options are shown during checkout. When disabled, customers only see{' '}
                    <strong className="text-emerald-700">Cash / UPI on Delivery</strong>.
                  </p>
                </div>

                {/* Enable / Disable Toggle Control */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={featureFlags.enableOtherPayments}
                    onClick={() => {
                      const nextEnabled = !featureFlags.enableOtherPayments;
                      toggleFeatureFlag('enableOtherPayments');
                      showToast(
                        nextEnabled
                          ? 'Other Payments ENABLED — UPI Instant & Credit/Debit Card are now visible at Checkout.'
                          : 'Other Payments DISABLED — Checkout restricted to Cash / UPI on Delivery only.'
                      );
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      featureFlags.enableOtherPayments
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                    }`}
                  >
                    {featureFlags.enableOtherPayments ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        <span>Enabled (Click to Disable)</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-stone-500" />
                        <span>Disabled (Click to Enable)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Checkout Payment Methods Preview */}
              <div className="bg-stone-50 border-t border-stone-200 p-4 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Live Checkout Payment Methods Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Banknote className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate">Cash / UPI on Delivery</div>
                        <div className="text-[10px] text-stone-500">Default active method</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                      Visible
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-opacity ${
                      featureFlags.enableOtherPayments
                        ? 'border-emerald-200 bg-white'
                        : 'border-stone-200 bg-stone-100/80 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="w-4 h-4 text-purple-800 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate">UPI Instant</div>
                        <div className="text-[10px] text-stone-500">GPay, PhonePe, Paytm</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        featureFlags.enableOtherPayments
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-200 text-stone-600 border-stone-300'
                      }`}
                    >
                      {featureFlags.enableOtherPayments ? 'Visible' : 'Hidden'}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-opacity ${
                      featureFlags.enableOtherPayments
                        ? 'border-emerald-200 bg-white'
                        : 'border-stone-200 bg-stone-100/80 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CreditCard className="w-4 h-4 text-purple-800 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate">Credit / Debit Card</div>
                        <div className="text-[10px] text-stone-500">Visa, Mastercard, RuPay</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        featureFlags.enableOtherPayments
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-200 text-stone-600 border-stone-300'
                      }`}
                    >
                      {featureFlags.enableOtherPayments ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Card: Send Whatsapp Message on order confirmation */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Send Whatsapp Message on order confirmation</span>
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        featureFlags.sendWhatsAppOnOrderConfirmation
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {featureFlags.sendWhatsAppOnOrderConfirmation
                        ? 'Enabled (Mobile Devices)'
                        : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Enable or disable opening and sending the order confirmation message on{' '}
                    <strong className="text-stone-900">WhatsApp</strong> right after an order is submitted while using a{' '}
                    <strong className="text-emerald-700">mobile device</strong>. Desktop browsers continue placing orders directly to the store desk without opening WhatsApp.
                  </p>
                </div>

                {/* Enable / Disable Toggle Control */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={featureFlags.sendWhatsAppOnOrderConfirmation}
                    onClick={() => {
                      const nextEnabled = !featureFlags.sendWhatsAppOnOrderConfirmation;
                      toggleFeatureFlag('sendWhatsAppOnOrderConfirmation');
                      showToast(
                        nextEnabled
                          ? 'WhatsApp Order Confirmation ENABLED — Mobile customers will open Store WhatsApp upon order submission.'
                          : 'WhatsApp Order Confirmation DISABLED — Orders confirm directly without opening WhatsApp on mobile.'
                      );
                    }}
                    className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95 ${
                      featureFlags.sendWhatsAppOnOrderConfirmation
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                    }`}
                  >
                    {featureFlags.sendWhatsAppOnOrderConfirmation ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        <span>Enabled (Click to Disable)</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-stone-500" />
                        <span>Disabled (Click to Enable)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Channel Behavior Status */}
              <div className="bg-stone-50 border-t border-stone-200 p-4 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Order Confirmation Channel Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-opacity ${
                      featureFlags.sendWhatsAppOnOrderConfirmation
                        ? 'border-emerald-200 bg-white'
                        : 'border-stone-200 bg-stone-100/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate">
                          Mobile Browser Checkout
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {featureFlags.sendWhatsAppOnOrderConfirmation
                            ? 'Opens Store WhatsApp after order confirmation'
                            : 'Confirms order silently without opening WhatsApp'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                        featureFlags.sendWhatsAppOnOrderConfirmation
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-200 text-stone-600 border-stone-300'
                      }`}
                    >
                      {featureFlags.sendWhatsAppOnOrderConfirmation ? 'WhatsApp Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-stone-200 bg-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="w-4 h-4 text-purple-800 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 truncate">
                          Store Desk Live Alert
                        </div>
                        <div className="text-[10px] text-stone-500">
                          Instant Control Room order notification
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                      Always Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORKSPACE SUB-VIEW: CUSTOMER ORDERS MONITOR */}
        {activeNav === 'customer_orders' && <CustomerOrdersMonitor />}

        {/* WORKSPACE SUB-VIEW: SUBSCRIPTIONS MONITOR */}
        {activeNav === 'subscriptions' && <SubscriptionsMonitor />}

        {/* WORKSPACE SUB-VIEW: REPORTS DASHBOARD (ADMIN ONLY) */}
        {activeNav === 'reports' && isAdminRole && <ReportsDashboard />}

        {/* WORKSPACE SUB-VIEW: STORE INCHARGES NOTEBOOK */}
        {activeNav === 'store_incharges' && !isStoreIncharge && <StoreInchargesNotebook />}

        {/* WORKSPACE SUB-VIEW: SYSTEM SPECS (ADMIN ONLY) */}
        {activeNav === 'system_specs' && isAdminRole && (
          <div className="p-3 sm:p-4">
            <div className="rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs">
              <SystemSpecsContent />
            </div>
          </div>
        )}
      </main>

      {/* MODALS & DRAWERS */}
      <WasteLoggingModal
        isOpen={isWasteModalOpen}
        onClose={() => {
          setIsWasteModalOpen(false);
          setPreselectedWasteBatchId(null);
        }}
        batches={batches}
        preselectedBatchId={preselectedWasteBatchId}
        onWasteLogged={handleWasteLogged}
      />

      <WarehouseLabelModal
        labelData={activeLabelData}
        onClose={() => {
          setIsLabelModalOpen(false);
          setActiveLabelData(null);
        }}
      />

      {/* QUICK STOCK EDIT DRAWER */}
      {selectedBatchForQuickEdit && (
        <QuickStockEditDrawer
          batch={selectedBatchForQuickEdit}
          currentPricePerKg={
            customPrices[selectedBatchForQuickEdit.skuId] ||
            (selectedBatchForQuickEdit.costPerKg ? Math.round(selectedBatchForQuickEdit.costPerKg * 1.35) : 295)
          }
          onClose={() => setSelectedBatchForQuickEdit(null)}
          onSaveAdjustment={handleSaveStockAdjustment}
        />
      )}

      {/* FORCE OUT OF STOCK MODAL (EMERGENCY KILL-SWITCH & REVERSAL) */}
      {forceOutModalBatch && (
        <ForceOutOfStockModal
          mode={forceOutModalMode}
          batch={forceOutModalBatch}
          adminName={adminUser?.name || 'Shift Supervisor Rahim'}
          adminId={adminUser?.id || 'ADM-8901'}
          onClose={() => setForceOutModalBatch(null)}
          onConfirmForceOut={handleConfirmForceOut}
          onConfirmReversal={handleConfirmReversal}
        />
      )}
    </div>
  );
};
