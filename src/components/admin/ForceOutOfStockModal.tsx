import React, { useState } from 'react';
import {
  X,
  AlertOctagon,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { InventoryBatch } from '../../types/inventory';

interface ForceOutOfStockModalProps {
  mode: 'confirm_force_out' | 'fast_reversal';
  batch: InventoryBatch;
  adminName: string;
  adminId: string;
  onClose: () => void;
  onConfirmForceOut: (batchId: string, supervisorNote: string) => Promise<void> | void;
  onConfirmReversal: (batchId: string, restoredStockKg: number, reason: string) => Promise<void> | void;
}

export const ForceOutOfStockModal: React.FC<ForceOutOfStockModalProps> = ({
  mode,
  batch,
  adminName,
  adminId,
  onClose,
  onConfirmForceOut,
  onConfirmReversal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoredStockInput, setRestoredStockInput] = useState<string>(
    batch.minThresholdKg > 0 ? batch.minThresholdKg.toString() : '15'
  );
  const [note, setNote] = useState(
    mode === 'confirm_force_out'
      ? 'Emergency manual override due to quality triage'
      : 'Replenished from walk-in cold room'
  );
  const [error, setError] = useState<string | null>(null);

  const handleForceOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirmForceOut(batch.id, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(restoredStockInput);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid positive stock quantity (greater than 0 kg).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmReversal(batch.id, qty, note);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'confirm_force_out') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-stone-900 my-auto max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-rose-200 bg-rose-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-base text-rose-950 truncate">
                  Force OOS (FOOS) Kill-Switch
                </h3>
                <span className="text-[11px] text-rose-700 font-mono">
                  Emergency Manual Override · FOOS
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-rose-100 cursor-pointer shrink-0"
              aria-label="Close FOOS modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleForceOutSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Warning Message */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <p className="text-rose-900 text-sm font-semibold leading-snug">
                Are you sure you want to mark <span className="text-rose-950 underline">{batch.skuName}</span> as Out of Stock?
              </p>
              <p className="text-rose-700 text-xs leading-relaxed">
                This will <strong>instantly disable the &quot;Add to Cart&quot; button</strong> for all online customers and stop POS counter allocations at {batch.chillerLocation}.
              </p>
            </div>

            {/* Target Item Snapshot */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-3">
              <img
                src={batch.image || undefined}
                alt={batch.skuName}
                className="w-11 h-11 rounded-lg object-cover bg-white border border-stone-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-stone-900 block truncate">{batch.skuName}</span>
                <span className="font-mono text-[10px] text-stone-500">
                  {batch.id} · Current Stock: {batch.currentStockKg} kg
                </span>
              </div>
            </div>

            {/* Audit Log Signature */}
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
              <div>
                <span className="text-stone-500">Authorized Operator: </span>
                <strong className="text-stone-900">{adminName}</strong> ({adminId})
              </div>
              <div>
                <span className="text-stone-500">Timestamp: </span>
                <span className="font-mono text-emerald-700 font-semibold">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="font-semibold text-stone-700 block mb-1 text-[11px]">
                Override Note / Audit Reason:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for immediate kill-switch trigger"
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Disabling...</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-4 h-4" />
                    <span>Confirm Force OOS (FOOS)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Fast Reversal View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-emerald-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-stone-900 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-200 bg-emerald-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base text-emerald-950 truncate">
                Restore from FOOS (Re-enable Stock)
              </h3>
              <span className="text-[11px] text-emerald-700 font-mono">
                FOOS Reversal & Cart Reactivation
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-emerald-100 cursor-pointer shrink-0"
            aria-label="Close reversal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleReversalSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <p className="text-emerald-900 font-semibold text-xs">
              Restoring <span className="text-emerald-950 underline">{batch.skuName}</span> to Active Stock
            </p>
            <p className="text-emerald-800/80 text-[11px]">
              Input the verified physical stock available in the local store chiller to make this cut immediately purchasable online again.
            </p>
          </div>

          {/* New Stock Input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-stone-800 block text-xs">
              Physical Stock Count Available (kg) <span className="text-emerald-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={restoredStockInput}
                onChange={(e) => {
                  setRestoredStockInput(e.target.value);
                  setError(null);
                }}
                className="w-full min-h-[44px] sm:min-h-0 px-3 py-2.5 bg-white border border-stone-300 rounded-lg text-stone-900 font-mono font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. 15"
                required
              />
              <span className="font-mono text-stone-600 font-semibold shrink-0">kg salable</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] text-stone-500">Quick presets:</span>
              {[5, 10, 20, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRestoredStockInput(preset.toString())}
                  className="min-h-[36px] sm:min-h-0 px-2.5 sm:px-2 py-1 sm:py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-[10px] text-stone-700 font-mono cursor-pointer font-semibold"
                >
                  {preset}kg
                </button>
              ))}
            </div>
          </div>

          {/* Verification Note */}
          <div>
            <label className="font-semibold text-stone-700 block mb-1 text-[11px]">
              Re-stocking Verification Note:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received fresh butchered batch from morning intake"
              className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
              {error}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Re-enabling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Restore from FOOS & Set Live</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
