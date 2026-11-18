import React, { useState } from 'react';
import {
  X,
  FileText,
  Building,
  Clock,
  TrendingUp,
  CheckCircle2,
  Send,
  AlertCircle,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { InventoryBatch, PurchaseOrder } from '../../types/inventory';

export const PurchaseOrderDrawer: React.FC<{
  batch: InventoryBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onPODispatched: (po: PurchaseOrder) => void;
}> = ({ batch, isOpen, onClose, onPODispatched }) => {
  if (!isOpen || !batch) return null;

  // Velocity calculation: recommend 2.5x the minThreshold deficit
  const deficitKg = Math.max(0, batch.minThresholdKg - batch.currentStockKg);
  const recommendedQty = Math.max(15, Math.ceil((deficitKg + 15) / 5) * 5);

  const [quantityKg, setQuantityKg] = useState<number>(recommendedQty);
  const [leadTimeHours, setLeadTimeHours] = useState<number>(4);
  const [deliveryUrgency, setDeliveryUrgency] = useState<'PRIORITY_EXPRESS' | 'STANDARD_MORNING'>('PRIORITY_EXPRESS');
  const [poNotes, setPoNotes] = useState(`Urgent replenishment for ${batch.skuName}. Maintain unbroken 0-4°C chill chain.`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCost = quantityKg * batch.costPerKg;
  const poId = `PO-2026-${Math.floor(8000 + Math.random() * 1900)}`;

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newPO: PurchaseOrder = {
        id: poId,
        batchId: batch.id,
        skuName: batch.skuName,
        category: batch.category,
        supplierName: batch.supplierSource,
        supplierContact: batch.supplierContact,
        requestedQtyKg: quantityKg,
        costPerKg: batch.costPerKg,
        totalCost,
        leadTimeHours,
        status: 'DISPATCHED',
        createdDate: new Date().toISOString(),
        recommendedReason: `Triggered by minimum stock threshold breach (${batch.currentStockKg}kg vs ${batch.minThresholdKg}kg min).`,
      };

      onPODispatched(newPO);
      setIsSubmitting(false);
      onClose();
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white text-stone-900 h-full flex flex-col shadow-2xl border-l border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-bold text-base text-purple-950">
                  Automated Purchase Order Generator
                </h3>
                <span className="text-[10px] bg-amber-50 text-amber-700 font-mono font-semibold px-2 py-0.5 rounded border border-amber-200">
                  LOW-STOCK TRIGGER
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Pre-filled EDI procurement manifest for local hub replenishment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close purchase order drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PO Body */}
        <form onSubmit={handleDispatch} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Deficit Alert Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
            <div>
              <span className="font-bold text-stone-900 block">{batch.skuName}</span>
              <span>
                Current Stock: <strong className="text-rose-600">{batch.currentStockKg} kg</strong> · Minimum Safety Threshold: <strong className="text-amber-800">{batch.minThresholdKg} kg</strong>
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-1 rounded self-start sm:self-auto shrink-0">
              Deficit: -{deficitKg.toFixed(1)} kg
            </span>
          </div>

          {/* Supplier Info */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="text-stone-500">Contracted Supplier:</span>
              <span className="font-semibold text-stone-900 text-right">{batch.supplierSource}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="text-stone-500">Supplier Dispatch Desk:</span>
              <span className="font-mono text-emerald-700 font-semibold">{batch.supplierContact}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="text-stone-500">Historical Unit Cost:</span>
              <span className="font-mono text-stone-900">₹{batch.costPerKg} / kg (Pre-negotiated contract)</span>
            </div>
          </div>

          {/* Velocity Trend Recommendation */}
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Smart Run-Rate Recommendation</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Based on the 3-day weekend run rate for {batch.subcategory}, reordering <strong>{recommendedQty} kg</strong> covers customer delivery demand for the next 48 hours without exceeding walk-in chiller capacity.
            </p>
          </div>

          {/* Reorder Quantity Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Reorder Quantity (kg)
              </label>
              <input
                type="number"
                step="5"
                min="5"
                value={quantityKg}
                onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-bold text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Target Lead Time
              </label>
              <select
                value={leadTimeHours}
                onChange={(e) => setLeadTimeHours(parseInt(e.target.value, 10))}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value={2}>2 Hours (Emergency Express Van)</option>
                <option value={4}>4 Hours (Standard Fast Dispatch)</option>
                <option value={6}>6 Hours (Next Shift Morning Intake)</option>
              </select>
            </div>
          </div>

          {/* Total PO Cost */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
                Total Estimated PO Value:
              </span>
              <span className="text-xs text-stone-600">
                {quantityKg} kg @ ₹{batch.costPerKg}/kg
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-stone-900">
              ₹{totalCost.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Notes for Vendor */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Vendor Chilled Dispatch Instructions
            </label>
            <textarea
              rows={2}
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-between gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || quantityKg <= 0}
              className="w-full sm:flex-1 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-md transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Transmitting PO via EDI...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Authorize & Transmit PO #{poId}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
