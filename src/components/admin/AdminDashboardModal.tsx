import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Package,
  Bike,
  Activity,
  LogOut,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { PRODUCTS } from '../../data/products';

import { ControlRoomDashboard } from './ControlRoomDashboard';

export const AdminDashboardModal: React.FC = () => {
  const {
    adminUser,
    logoutAdmin,
    isAdminDashboardOpen,
    setIsAdminDashboardOpen,
    activeStore,
  } = useStore();

  const [viewMode] = useState<'control_room' | 'quick_summary'>('control_room');
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  const [stockOverrides, setStockOverrides] = useState<Record<string, boolean>>({});

  if (!isAdminDashboardOpen || !adminUser) return null;

  // Render Full Control Room Suite by default
  if (viewMode === 'control_room') {
    return <ControlRoomDashboard onClose={() => setIsAdminDashboardOpen(false)} />;
  }

  const toggleItemStock = (productId: string) => {
    setStockOverrides((prev) => ({
      ...prev,
      [productId]: prev[productId] === false ? true : false,
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/50 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-5xl bg-white text-stone-900 rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Operations Header */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-bold text-base sm:text-lg text-stone-900">
                  Retail Operations & Cold-Chain Management Portal
                </h3>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  MFA VERIFIED
                </span>
              </div>
              <div className="text-xs text-stone-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span>Manager: <strong className="text-stone-900">{adminUser.name}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Role: <strong className="text-emerald-700">{adminUser.role}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Assigned Store: <strong className="text-stone-900">{adminUser.assignedStoreName}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setIsAdminDashboardOpen(false)}
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              View Public Storefront
            </button>
            <button
              type="button"
              onClick={logoutAdmin}
              className="min-h-[44px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdminDashboardOpen(false)}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer"
              aria-label="Close dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-stone-50/60 border-b border-stone-200">

          <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>4km Radius SLA</span>
              <Bike className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-stone-900 mt-1">
              18.4 mins
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">Avg door delivery time</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>Active Batch Stock</span>
              <Package className="w-4 h-4 text-purple-700" />
            </div>
            <div className="text-xl font-bold font-mono text-stone-900 mt-1">
              26 Cuts Live
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">Fish, Poultry & Goat Mutton</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>Security Clear</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold font-mono text-stone-900 mt-1">
              Level 3 Ops
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">Session timeout: 15 mins</div>
          </div>
        </div>

        {/* Operations Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-stone-200 px-4 sm:px-5 gap-4 sm:gap-6 text-xs font-semibold bg-white shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`min-h-[44px] py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-purple-800 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Live Store Inventory ({PRODUCTS.length} Cuts)</span>
          </button>
        </div>

        {/* Tab 1: Live Store Inventory Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-stone-50/40">
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-stone-600">
                  Manage real-time availability for customers ordering within the 4km delivery radius of {activeStore.neighborhood}:
                </span>
                <span className="text-[11px] text-stone-500 font-mono shrink-0">
                  Syncing with POS Chiller Scales
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Cut Name & Category</th>
                      <th className="p-3">Base Price/Kg</th>
                      <th className="p-3">Prep Cold Temp</th>
                      <th className="p-3">Variants</th>
                      <th className="p-3 text-right">Live Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {PRODUCTS.slice(0, 10).map((prod) => {
                      const isOutOfStock = stockOverrides[prod.id] === false;
                      return (
                        <tr key={prod.id} className="hover:bg-stone-50 transition-colors">
                          <td className="p-3 font-semibold text-stone-900">
                            <div>{prod.name}</div>
                            <div className="text-[10px] text-stone-500 font-normal">
                              {prod.category} · {prod.subcategory}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-stone-800">
                            ₹{prod.basePricePerKg}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono">
                              {prod.coldChainTemp}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-stone-600">
                            250g, 500g, 750g, 1kg
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleItemStock(prod.id)}
                              className={`min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isOutOfStock ? 'Marked Out of Stock' : 'In Stock (Live)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-stone-600">
          <span className="break-all">Enterprise Portal session: <strong className="text-stone-900 font-mono">{adminUser.workEmail}</strong></span>
          <span className="font-mono text-emerald-700 font-semibold">ISO/IEC 27001 Certified Terminal</span>
        </div>
      </div>
    </div>
  );
};
