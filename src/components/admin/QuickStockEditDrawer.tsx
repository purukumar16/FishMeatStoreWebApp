import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Package,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { InventoryBatch, StockAdjustmentReason } from '../../types/inventory';

interface QuickStockEditDrawerProps {
  batch: InventoryBatch;
  currentPricePerKg?: number;
  onClose: () => void;
  onSaveAdjustment: (
    batchId: string,
    newStockKg: number,
    deltaKg: number,
    reason: StockAdjustmentReason,
    notes?: string,
    newPricePerKg?: number
  ) => Promise<void> | void;
}

export const QuickStockEditDrawer: React.FC<QuickStockEditDrawerProps> = ({
  batch,
  currentPricePerKg,
  onClose,
  onSaveAdjustment,
}) => {
  const [adjustmentMode, setAdjustmentMode] = useState<'relative' | 'direct'>('relative');
  const [relativeDelta, setRelativeDelta] = useState<number>(0);
  const [directTotalInput, setDirectTotalInput] = useState<string>(batch.currentStockKg.toString());
  const [reason, setReason] = useState<StockAdjustmentReason>('Physical Count Audit');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Price adjustment state
  const initialPrice = currentPricePerKg || Math.round(batch.costPerKg * 1.35) || 290;
  const [priceInput, setPriceInput] = useState<string>(initialPrice.toString());
  const parsedPrice = parseFloat(priceInput);
  const isValidPrice = !isNaN(parsedPrice) && parsedPrice > 0;
  const isPriceModified = isValidPrice && Math.round(parsedPrice) !== initialPrice;

  // Compute calculated new stock
  const baselineStock = batch.currentStockKg;
  let newStockKg = baselineStock;

  if (adjustmentMode === 'relative') {
    newStockKg = Math.round((baselineStock + relativeDelta) * 10) / 10;
  } else {
    const parsed = parseFloat(directTotalInput);
    newStockKg = isNaN(parsed) ? baselineStock : Math.round(parsed * 10) / 10;
  }

  const deltaKg = Math.round((newStockKg - baselineStock) * 10) / 10;
  const isNegative = newStockKg < 0;

  const handleApplyModifier = (amount: number) => {
    if (adjustmentMode === 'direct') {
      setAdjustmentMode('relative');
    }
    setRelativeDelta((prev) => Math.round((prev + amount) * 10) / 10);
    setValidationError(null);
  };

  const handleReset = () => {
    setRelativeDelta(0);
    setDirectTotalInput(batch.currentStockKg.toString());
    setValidationError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStockKg < 0) {
      setValidationError('Salable stock cannot be negative. Adjust modifier or direct override.');
      return;
    }
    if (deltaKg === 0 && !batch.isForcedOutOfStock && !isPriceModified) {
      setValidationError('No stock or price change detected. Please specify an adjustment or direct override.');
      return;
    }

    setIsSaving(true);
    try {
      const priceToSave = isPriceModified && isValidPrice ? Math.round(parsedPrice) : undefined;
      await onSaveAdjustment(batch.id, Math.max(0, newStockKg), deltaKg, reason, notes, priceToSave);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Semi-transparent backdrop maintaining visible context of inventory list */}
      <div
        className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Sliding Side-Drawer */}
      <div className="relative w-full max-w-lg bg-white border-l border-stone-200 text-stone-900 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between gap-2 bg-stone-50">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-bold text-base text-purple-950">Quick Edit Stock & Price</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Modify stock levels and retail pricing anytime with live consumer sync
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close stock editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Consumer Warning Indicator */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-5 py-2.5 flex items-center gap-2 text-xs text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
          <span>
            <strong>Instant Consumer Update:</strong> Saved stock pushes immediately to physical store kiosks and online shoppers.
          </span>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* 1. Product Header Card */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-3.5">
            <img
              src={batch.image || undefined}
              alt={batch.skuName}
              className="w-14 h-14 rounded-xl object-cover bg-white border border-stone-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span className="font-bold text-sm text-stone-900 truncate block">
                  {batch.skuName}
                </span>
                <span className="font-mono text-[10px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {batch.id}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {batch.category} · {batch.subcategory}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <div>
                  <span className="text-stone-500">Baseline Stock: </span>
                  <strong className="text-emerald-700 font-mono text-sm">{batch.currentStockKg} kg</strong>
                </div>
                <span className="text-stone-300">·</span>
                <div>
                  <span className="text-stone-500">Min Safety: </span>
                  <span className="text-stone-700 font-mono">{batch.minThresholdKg} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Adjustment Mode Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-stone-700 block uppercase tracking-wider text-[11px]">
              Adjustment Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setAdjustmentMode('relative')}
                className={`min-h-[44px] sm:min-h-0 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  adjustmentMode === 'relative'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Relative Modifier (+ / -)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentMode('direct');
                  setDirectTotalInput(newStockKg.toString());
                }}
                className={`min-h-[44px] sm:min-h-0 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  adjustmentMode === 'direct'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Direct Total Override</span>
              </button>
            </div>
          </div>

          {/* 3. Smart Adjustment Field */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-4">
            {adjustmentMode === 'relative' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900 text-xs">Relative Increment Modifiers:</span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-purple-700 hover:text-emerald-700 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset (0 kg)</span>
                  </button>
                </div>

                {/* Decrement pills */}
                <div>
                  <span className="text-[10px] text-rose-700 font-semibold block mb-1">
                    Decrease Salable Stock:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[-1, -5, -10].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleApplyModifier(val)}
                        className="min-h-[44px] sm:min-h-0 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                        <span>{Math.abs(val)} kg</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Increment pills */}
                <div>
                  <span className="text-[10px] text-emerald-700 font-semibold block mb-1">
                    Increase Salable Stock:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 5, 10].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleApplyModifier(val)}
                        className="min-h-[44px] sm:min-h-0 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{val} kg</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Relative Delta Input */}
                <div className="pt-1">
                  <label className="text-[11px] text-stone-600 block mb-1 font-medium">
                    Custom Increment / Decrement Amount (kg):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={relativeDelta}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setRelativeDelta(isNaN(val) ? 0 : Math.round(val * 10) / 10);
                        setValidationError(null);
                      }}
                      className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="font-mono text-stone-500 text-xs shrink-0">kg delta</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="font-semibold text-stone-900 text-xs block">
                  Direct Total Salable Stock Override:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={directTotalInput}
                    onChange={(e) => {
                      setDirectTotalInput(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Enter absolute kg count (e.g. 50)"
                    className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="font-mono text-stone-500 text-xs shrink-0">kg total</span>
                </div>
                <p className="text-[10px] text-stone-500">
                  Directly replaces baseline count in local chiller inventory database.
                </p>
              </div>
            )}

            {/* Live Calculation Preview Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
              isNegative
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-white border-stone-200 text-stone-900'
            }`}>
              <div>
                <span className="text-[10px] text-stone-500 block font-sans">Current Baseline:</span>
                <span className="font-bold">{baselineStock} kg</span>
              </div>
              <span className="text-stone-500">
                {deltaKg >= 0 ? '+' : ''}{deltaKg} kg
              </span>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block font-sans">New Salable Stock:</span>
                <strong className={`text-sm ${isNegative ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {newStockKg} kg
                </strong>
              </div>
            </div>

            {/* Validation Message */}
            {(validationError || isNegative) && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError || 'Negative stock values are blocked. Increase modifier.'}</span>
              </div>
            )}
          </div>

          {/* 3b. Retail Price Adjustment (Edit price anytime) */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-900 uppercase tracking-wider text-[11px]">
                  Retail Price (Live Online Sync)
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-mono font-semibold">
                  Storefront
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-500">
                Baseline: ₹{initialPrice}/kg
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 text-base">₹</span>
              <input
                type="number"
                min="10"
                step="5"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                placeholder="Retail price in ₹ per kg"
              />
              <span className="text-xs font-mono text-stone-500 shrink-0">/ kg</span>
            </div>

            {/* Quick Price Modifiers */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-500">Quick adjust:</span>
              {[-20, -10, 10, 20].map((adj) => (
                <button
                  key={adj}
                  type="button"
                  onClick={() => {
                    const current = parseFloat(priceInput) || initialPrice;
                    setPriceInput(Math.max(10, Math.round(current + adj)).toString());
                  }}
                  className={`min-h-[36px] sm:min-h-0 px-2.5 sm:px-2 py-1 sm:py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer transition-colors ${
                    adj > 0
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  {adj > 0 ? `+₹${adj}` : `-₹${Math.abs(adj)}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPriceInput(initialPrice.toString())}
                className="min-h-[36px] sm:min-h-0 px-2.5 sm:px-2 py-1 sm:py-0.5 rounded text-[10px] text-purple-800 hover:bg-purple-100 bg-purple-50 border border-purple-200 cursor-pointer ml-auto font-medium"
              >
                Reset Price
              </button>
            </div>

            {/* Live Weight Variants Price Breakdown */}
            {isValidPrice && (
              <div className="p-2.5 rounded-lg bg-white border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-mono">
                <div>
                  <span className="text-stone-500 block font-sans">250g</span>
                  <strong className="text-emerald-700">₹{Math.round(parsedPrice * 0.28)}</strong>
                </div>
                <div>
                  <span className="text-stone-500 block font-sans">500g</span>
                  <strong className="text-emerald-700">₹{Math.round(parsedPrice * 0.52)}</strong>
                </div>
                <div>
                  <span className="text-stone-500 block font-sans">750g</span>
                  <strong className="text-emerald-700">₹{Math.round(parsedPrice * 0.76)}</strong>
                </div>
                <div>
                  <span className="text-stone-500 block font-sans">1kg</span>
                  <strong className="text-emerald-700">₹{Math.round(parsedPrice)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* 4. Mandatory Audit Logging Field */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
            <div>
              <label className="font-semibold text-stone-800 block uppercase tracking-wider text-[11px] mb-1">
                Audit Reason <span className="text-rose-600">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                required
              >
                <option value="Physical Count Audit">Physical Count Audit</option>
                <option value="Damaged/Spoiled In-house">Damaged/Spoiled In-house</option>
                <option value="Supplier Shortage">Supplier Shortage</option>
                <option value="Data Correction">Data Correction</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-stone-600 font-medium block mb-1">
                Operational Notes / Verification (Optional):
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Evening chiller count reconciliation by Shift Lead Rahim"
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* Footer CTA Buttons */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isNegative}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Applying Live...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                <span>Save & Apply Live</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
