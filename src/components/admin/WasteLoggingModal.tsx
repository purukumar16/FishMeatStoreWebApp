import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryBatch, WasteRecord, WasteReasonCode } from '../../types/inventory';

const REASON_OPTIONS: { code: WasteReasonCode; label: string; desc: string }[] = [
  {
    code: 'EXPIRED_SHELF_LIFE',
    label: 'Expired Shelf-Life (>48h SLA)',
    desc: 'Exceeded maximum allowable holding time in local chiller display.',
  },
  {
    code: 'COLD_CHAIN_BREACH',
    label: 'Cold-Chain Breach (Temp > 4°C)',
    desc: 'Temperature exceeded 4.0°C due to display door breach or defrost cycle anomaly.',
  },
  {
    code: 'TRIMMING_LOSS',
    label: 'Trimming & De-boning Loss',
    desc: 'Excess sinew, skin, or bone cartilage removed during custom butchery prep.',
  },
  {
    code: 'PACKAGING_SEAL_COMPROMISED',
    label: 'Packaging Seal Compromised',
    desc: 'Thermal vacuum barrier pouch tear or micro-leak detected during pre-dispatch audit.',
  },
  {
    code: 'ORGANOLEPTIC_REJECT',
    label: 'Blemish / Organoleptic Reject',
    desc: 'Texture, marbling, or aroma did not pass Master Butcher QC standards.',
  },
];

export const WasteLoggingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  batches: InventoryBatch[];
  preselectedBatchId?: string | null;
  onWasteLogged: (record: WasteRecord, updatedBatch: InventoryBatch) => void;
}> = ({ isOpen, onClose, batches, preselectedBatchId, onWasteLogged }) => {
  if (!isOpen) return null;

  // Filter batches with available stock (> 0)
  const availableBatches = batches.filter((b) => b.currentStockKg > 0);
  const initialBatch =
    availableBatches.find((b) => b.id === preselectedBatchId) || availableBatches[0] || batches[0];

  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatch?.id || '');
  const [writtenOffKg, setWrittenOffKg] = useState<number>(1.5);
  const [reasonCode, setReasonCode] = useState<WasteReasonCode>('EXPIRED_SHELF_LIFE');
  const [disposalProtocol, setDisposalProtocol] = useState(
    'Bio-incineration via certified cold bio-waste contractor'
  );
  const [supervisorNotes, setSupervisorNotes] = useState('Authorized write-off per store daily HACCP logbook.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId) || initialBatch;
  const maxAvailable = selectedBatch ? selectedBatch.currentStockKg : 0;
  const selectedReason = REASON_OPTIONS.find((r) => r.code === reasonCode) || REASON_OPTIONS[0];

  const costImpact = selectedBatch ? Math.round(writtenOffKg * selectedBatch.costPerKg) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (writtenOffKg <= 0 || writtenOffKg > maxAvailable) {
      alert(`Invalid write-off quantity. Enter between 0.1 and ${maxAvailable} kg.`);
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const record: WasteRecord = {
        id: `WASTE-2026-${Math.floor(100 + Math.random() * 900)}`,
        batchId: selectedBatch.id,
        skuName: selectedBatch.skuName,
        category: selectedBatch.category,
        writtenOffKg: Number(writtenOffKg.toFixed(1)),
        costImpact,
        reasonCode,
        reasonLabel: selectedReason.label,
        loggedBy: 'Vikram Malhotra (Store Mgr)',
        loggedAt: new Date().toISOString(),
        disposalProtocol,
        supervisorApproved: true,
      };

      const updatedStock = Math.max(0, Number((selectedBatch.currentStockKg - writtenOffKg).toFixed(1)));
      const updatedBatch: InventoryBatch = {
        ...selectedBatch,
        currentStockKg: updatedStock,
        status:
          updatedStock === 0
            ? 'OUT_OF_STOCK'
            : updatedStock <= selectedBatch.minThresholdKg
            ? 'LOW_STOCK'
            : selectedBatch.status,
      };

      onWasteLogged(record, updatedBatch);
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/50 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div className="bg-white text-stone-900 rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base text-purple-950 truncate">
                Log Perishable Waste & Shrinkage
              </h3>
              <p className="text-xs text-stone-500">
                Immediately deducts batch inventory & records cost write-off
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close waste logging modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Select Batch to Deduct
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                const b = batches.find((x) => x.id === e.target.value);
                if (b && writtenOffKg > b.currentStockKg) {
                  setWrittenOffKg(Math.min(1.0, b.currentStockKg));
                }
              }}
              className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {availableBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.skuName} ({b.id}) — {b.currentStockKg} kg in stock
                </option>
              ))}
            </select>
          </div>

          {/* Current Batch Info Badge */}
          {selectedBatch && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-stone-500 block text-[11px]">Current Batch Available:</span>
                <span className="font-mono text-emerald-700 font-bold text-sm">
                  {selectedBatch.currentStockKg} kg
                </span>
              </div>
              <div className="text-right">
                <span className="text-stone-500 block text-[11px]">Cost Basis:</span>
                <span className="font-mono text-stone-900 font-semibold">₹{selectedBatch.costPerKg} / kg</span>
              </div>
            </div>
          )}

          {/* Quantity to Write Off */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Weight to Write Off (kg) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max={maxAvailable}
                value={writtenOffKg}
                onChange={(e) => setWrittenOffKg(parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-mono font-bold text-rose-600 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Financial Cost Impact
              </label>
              <div className="min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 flex items-center justify-between">
                <span>₹{costImpact.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-stone-500 font-normal">P&L Loss</span>
              </div>
            </div>
          </div>

          {/* Mandatory Reason Code Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Mandatory Waste Reason Code <span className="text-rose-600">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as WasteReasonCode)}
              className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-stone-500 mt-1">
              {selectedReason.desc}
            </p>
          </div>

          {/* Disposal Protocol */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Bio-Waste Disposal Protocol
            </label>
            <input
              type="text"
              value={disposalProtocol}
              onChange={(e) => setDisposalProtocol(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || writtenOffKg <= 0 || writtenOffKg > maxAvailable}
              className="w-full sm:flex-1 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-md transition-colors"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deducting Stock...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Deduct {writtenOffKg} kg & Post Shrinkage</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
