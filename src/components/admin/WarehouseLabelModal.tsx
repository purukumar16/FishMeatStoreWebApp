import React from 'react';
import { X, Printer, Download, QrCode, ShieldCheck, ThermometerSnowflake, CheckCircle2 } from 'lucide-react';
import { WarehouseLabelData } from '../../types/inventory';

export const WarehouseLabelModal: React.FC<{
  labelData: WarehouseLabelData | null;
  onClose: () => void;
}> = ({ labelData, onClose }) => {
  if (!labelData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-300 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="bg-stone-50 border-b border-stone-200 p-3.5 sm:p-4 text-stone-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <QrCode className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-display font-bold text-sm truncate">
              Warehouse Intake Label Generated
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer shrink-0"
            aria-label="Close warehouse label modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Label Preview Container */}
        <div className="p-4 sm:p-6 bg-stone-100 flex flex-col items-center overflow-y-auto flex-1">
          <div
            id="printable-warehouse-label"
            className="w-full bg-white p-4 sm:p-5 rounded-lg border-2 border-dashed border-stone-800 shadow-sm text-stone-950 font-mono space-y-3"
          >
            {/* Label Header */}
            <div className="border-b-2 border-stone-900 pb-2 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider block">
                  Fish Meat Store · Retail Operations
                </span>
                <span className="text-[10px] text-stone-600 block">
                  FSSAI Lic. #{labelData.fssaiNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-stone-900 text-white font-bold px-1.5 py-0.5 rounded">
                  0°C - 4°C CHILL
                </span>
              </div>
            </div>

            {/* SKU Title & Batch */}
            <div>
              <span className="text-[10px] text-stone-500 uppercase tracking-widest block">
                Item Description:
              </span>
              <h4 className="font-bold text-base leading-tight text-stone-950 font-sans">
                {labelData.skuName}
              </h4>
              <div className="text-xs font-bold text-purple-950 mt-1 flex items-center justify-between">
                <span>Batch: {labelData.batchId}</span>
                <span className="text-[10px] text-stone-600">{labelData.category}</span>
              </div>
            </div>

            {/* Net Weight vs Gross Yield */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-stone-300 text-center">
              <div className="bg-stone-50 p-1.5 rounded">
                <span className="text-[9px] text-stone-500 uppercase block">Gross In</span>
                <span className="font-bold text-xs">{labelData.grossWeightKg.toFixed(1)} kg</span>
              </div>
              <div className="bg-emerald-50 p-1.5 rounded border border-emerald-300">
                <span className="text-[9px] text-emerald-800 uppercase font-bold block">Net Usable</span>
                <span className="font-bold text-sm text-emerald-950">{labelData.netWeightKg.toFixed(1)} kg</span>
              </div>
              <div className="bg-stone-50 p-1.5 rounded">
                <span className="text-[9px] text-stone-500 uppercase block">Yield %</span>
                <span className="font-bold text-xs">{labelData.yieldPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Cold Chain & Chiller Bay */}
            <div className="text-[11px] space-y-1.5">
              <div className="flex flex-wrap justify-between gap-1">
                <span className="text-stone-500">Intake Cold Temp:</span>
                <span className="font-bold text-emerald-800 font-mono">
                  {labelData.receivingTempC.toFixed(1)}°C (Verified Safe)
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-1">
                <span className="text-stone-500">Chiller Bay:</span>
                <span className="font-bold text-stone-900 text-right">{labelData.chillerBay}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-1">
                <span className="text-stone-500">Packed Time:</span>
                <span className="font-mono text-stone-700">{labelData.packedDate}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-1 font-bold text-rose-700">
                <span>Expires SLA:</span>
                <span className="font-mono">{labelData.expiryDate}</span>
              </div>
            </div>

            {/* Simulated Barcode & QR code visual */}
            <div className="pt-2 border-t-2 border-stone-900 flex items-center justify-between gap-3">
              {/* QR Matrix */}
              <div className="w-16 h-16 border-2 border-stone-900 p-1 rounded flex items-center justify-center shrink-0 bg-stone-50">
                <QrCode className="w-14 h-14 text-stone-900" />
              </div>

              {/* Barcode Lines */}
              <div className="flex-1 space-y-1 text-center">
                <div className="h-9 w-full flex items-end justify-center gap-[2px] bg-white px-1">
                  {[3, 1, 4, 1, 5, 2, 6, 1, 3, 4, 2, 5, 1, 6, 2, 4, 3, 1, 5, 2, 4, 1, 6, 2, 5, 3, 1, 4, 2].map(
                    (height, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-900"
                        style={{
                          width: idx % 3 === 0 ? '3px' : idx % 2 === 0 ? '2px' : '1px',
                          height: `${height * 5 + 10}px`,
                        }}
                      />
                    )
                  )}
                </div>
                <span className="text-[9px] tracking-widest block font-mono text-stone-700">
                  *{labelData.barcodeNumber}*
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-stone-500">
            Ready for zebra thermal label printer
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Label</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
