import React, { useState, useId } from 'react';
import {
  X,
  Truck,
  ThermometerSnowflake,
  ShieldAlert,
  ShieldCheck,
  Scale,
  CheckCircle2,
  Calendar,
  Building,
  Search,
  ArrowRight,
  AlertTriangle,
  QrCode,
  Tag,
  Clock,
} from 'lucide-react';
import { PRODUCTS } from '../../data/products';
import { InventoryBatch, InboundIntakePayload, WarehouseLabelData } from '../../types/inventory';

const VERIFIED_SUPPLIERS = [
  { name: 'Venkateshwara Broiler Farms, Hosur', category: 'CHICKEN', fssai: '11219333000412', contact: '+91 94432 10988' },
  { name: 'Pioneer Farms Certified Poultry, Malur', category: 'CHICKEN', fssai: '11221334000109', contact: '+91 98440 77123' },
  { name: 'Mangalore Deep Sea Trawler Harbour', category: 'FISHES & SEAFOOD', fssai: '11218331000982', contact: '+91 98450 44521' },
  { name: 'Nellore Coastal Brackish Aquafarms', category: 'FISHES & SEAFOOD', fssai: '10120023000541', contact: '+91 93421 99011' },
  { name: 'Kaveri Basin Aquaculture Reservoir', category: 'FISHES & SEAFOOD', fssai: '11222332000871', contact: '+91 94811 55601' },
  { name: 'Rayalaseema Pastoral Goat Co-op', category: 'MUTTON', fssai: '10119034000219', contact: '+91 98860 12399' },
  { name: 'Deccan Organic Meat Producers', category: 'MUTTON', fssai: '10121045000921', contact: '+91 98490 88210' },
  { name: 'Namakkal Daily Layer Farms Co-op', category: 'EGGS', fssai: '11220311000642', contact: '+91 98422 61209' },
];

const CHILLER_BAYS = [
  'Chiller Bay 01 - Seafood Flake Ice Bed',
  'Chiller Bay 02 - Poultry Racks (HEPA Air Filtered)',
  'Chiller Bay 03 - Red Meat Hanging Rails & Offal Case',
  'Cold Room 04 - Pre-Packaged Vacuum Sealed Storage',
];

export const InboundIntakeDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onIntakeCompleted: (batch: InventoryBatch, label: WarehouseLabelData) => void;
}> = ({ isOpen, onClose, onIntakeCompleted }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [supplier, setSupplier] = useState(VERIFIED_SUPPLIERS[0].name);
  const [procurementDate, setProcurementDate] = useState(new Date().toISOString().slice(0, 16));
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  const [selectedSkuId, setSelectedSkuId] = useState(PRODUCTS[0].id);

  const [grossWeightKg, setGrossWeightKg] = useState<number>(25.0);
  const [netUsableWeightKg, setNetUsableWeightKg] = useState<number>(22.5);
  const [receivingTempC, setReceivingTempC] = useState<number>(1.8);
  const [chillerBay, setChillerBay] = useState(CHILLER_BAYS[1]);
  const [costPerKg, setCostPerKg] = useState<number>(240);
  const [shelfLifeHours, setShelfLifeHours] = useState<number>(72);
  const [intakeNotes, setIntakeNotes] = useState('Standard intake dock inspection passed. Organoleptic check clear.');

  if (!isOpen) return null;

  // Selected product metadata
  const selectedProduct = PRODUCTS.find((p) => p.id === selectedSkuId) || PRODUCTS[0];

  // Filtered SKUs based on search-as-you-type
  const filteredProducts = PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(skuSearchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(skuSearchQuery.toLowerCase()) ||
      p.subcategory.toLowerCase().includes(skuSearchQuery.toLowerCase())
  );

  // Calculations
  const yieldPct = grossWeightKg > 0 ? (netUsableWeightKg / grossWeightKg) * 100 : 0;
  const trimmingDeltaKg = Math.max(0, grossWeightKg - netUsableWeightKg);
  const isColdChainBreach = receivingTempC > 4.0;

  // Auto-generate unique batch ID
  const prefix =
    selectedProduct.category === 'FISHES & SEAFOOD'
      ? 'SEA'
      : selectedProduct.category === 'CHICKEN'
      ? 'CHK'
      : selectedProduct.category === 'EGGS'
      ? 'EGG'
      : 'MUT';
  const timestampCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const generatedBatchId = `BATCH-${prefix}-${timestampCode}-${Math.floor(100 + Math.random() * 900)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isColdChainBreach) {
      alert('CANNOT INTAKE: Cold chain temperature exceeds 4.0°C! Discard or quarantine shipment per HACCP policy.');
      return;
    }

    const expiryTime = new Date(Date.now() + shelfLifeHours * 3600 * 1000);
    const supplierObj = VERIFIED_SUPPLIERS.find((s) => s.name === supplier) || VERIFIED_SUPPLIERS[0];

    const newBatch: InventoryBatch = {
      id: generatedBatchId,
      skuId: selectedProduct.id,
      skuName: selectedProduct.name,
      category: selectedProduct.category,
      subcategory: selectedProduct.subcategory,
      image: selectedProduct.image,
      currentStockKg: Number(netUsableWeightKg.toFixed(1)),
      minThresholdKg: 10.0,
      grossReceivedKg: Number(grossWeightKg.toFixed(1)),
      usableYieldPct: Number(yieldPct.toFixed(1)),
      supplierSource: supplier,
      supplierContact: supplierObj.contact,
      procurementDate: new Date(procurementDate).toISOString(),
      expiryDate: expiryTime.toISOString(),
      hoursUntilExpiry: shelfLifeHours,
      receivingTempC: Number(receivingTempC.toFixed(1)),
      chillerLocation: chillerBay,
      costPerKg: costPerKg,
      retailPricePerKg: selectedProduct.basePricePerKg,
      status: 'IN_STOCK',
    };

    const labelData: WarehouseLabelData = {
      labelId: `LBL-${Date.now().toString().slice(-6)}`,
      batchId: generatedBatchId,
      skuName: selectedProduct.name,
      category: selectedProduct.category,
      grossWeightKg: Number(grossWeightKg.toFixed(1)),
      netWeightKg: Number(netUsableWeightKg.toFixed(1)),
      yieldPct: Number(yieldPct.toFixed(1)),
      receivingTempC: Number(receivingTempC.toFixed(1)),
      packedDate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
      expiryDate: expiryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }),
      chillerBay,
      fssaiNumber: supplierObj.fssai,
      supplierName: supplier,
      barcodeNumber: `FMS-${timestampCode}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    onIntakeCompleted(newBatch, labelData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/50 backdrop-blur-xs animate-fade-in"
    >
      <div className="w-full max-w-2xl bg-white text-stone-900 h-full flex flex-col shadow-2xl border-l border-stone-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base text-purple-950 truncate">
                Inbound Stock & Batch Intake Flow
              </h3>
              <p className="text-xs text-stone-500">
                Receiving dock inspection, yield measurement & cold-chain safety gate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 rounded-lg bg-white border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close inbound intake drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Step Indicator */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 font-semibold cursor-pointer ${
                currentStep === 1 ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${currentStep === 1 ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200'}`}>1</span>
              <span>Supplier & SKU</span>
            </button>
            <span className="text-stone-300 hidden sm:inline">→</span>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 font-semibold cursor-pointer ${
                currentStep === 2 ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${currentStep === 2 ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200'}`}>2</span>
              <span>Yield & Cold Check</span>
            </button>
            <span className="text-stone-300 hidden sm:inline">→</span>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`min-h-[36px] sm:min-h-0 flex items-center gap-1.5 font-semibold cursor-pointer ${
                currentStep === 3 ? 'text-emerald-700' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${currentStep === 3 ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600 border border-stone-200'}`}>3</span>
              <span>Review & Barcode</span>
            </button>
          </div>

          <span className="font-mono text-[11px] text-stone-500">Step {currentStep} of 3</span>
        </div>

        {/* Drawer Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STEP 1: Supplier & SKU Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Procurement Vendor / Supplier Source
                </label>
                <select
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {VERIFIED_SUPPLIERS.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} [{s.category}] — FSSAI #{s.fssai}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Procurement Date & Arrival Time
                </label>
                <input
                  type="datetime-local"
                  value={procurementDate}
                  onChange={(e) => setProcurementDate(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Search-As-You-Type SKU Selection */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Select Cut / SKU (Search-As-You-Type)
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search cuts (e.g. Boneless Chicken, Silver Pomfret, Goat Leg)..."
                    value={skuSearchQuery}
                    onChange={(e) => setSkuSearchQuery(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-0 pl-9 pr-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* SKU List */}
                <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-200 bg-stone-50">
                  {filteredProducts.map((p) => {
                    const isSelected = p.id === selectedSkuId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedSkuId(p.id)}
                        className={`w-full p-2.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 font-semibold'
                            : 'hover:bg-white text-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover bg-white border border-stone-200 shrink-0"
                          />
                          <div>
                            <span className="block text-stone-900 leading-tight">{p.name}</span>
                            <span className="text-[10px] text-stone-500">
                              {p.category} · {p.subcategory}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-stone-700 font-semibold">₹{p.basePricePerKg}/kg</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <span>Continue to Yield & Temperature Check</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Gross vs Net Usable Yield & Cold Chain Temperature */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Selected SKU summary banner */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase">Intake Cut Selected:</span>
                  <span className="text-sm font-bold text-stone-900">{selectedProduct.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-purple-50 border border-purple-200 text-purple-800 font-semibold">
                  {selectedProduct.category}
                </span>
              </div>

              {/* Weight Yield Calculator */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-stone-800">
                    <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Processing Yield Ratio (Gross In vs. Net Usable)</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${yieldPct >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {yieldPct.toFixed(1)}% Usable Yield
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Gross Received Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={grossWeightKg}
                      onChange={(e) => setGrossWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Net Usable Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={netUsableWeightKg}
                      onChange={(e) => setNetUsableWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-emerald-700 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-stone-600 pt-1 flex items-center justify-between">
                  <span>Trimming & Bone/Viscera Delta:</span>
                  <span className="font-mono text-amber-700 font-semibold">{trimmingDeltaKg.toFixed(1)} kg</span>
                </div>
              </div>

              {/* CRITICAL SAFETY CHECK: Cold Chain Temperature Check */}
              <div className={`p-4 rounded-xl border transition-all ${isColdChainBreach ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <ThermometerSnowflake className={`w-4 h-4 shrink-0 ${isColdChainBreach ? 'text-rose-600 animate-bounce' : 'text-emerald-600'}`} />
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Critical Cold-Chain Gate (&le; 4.0°C Required)
                    </span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isColdChainBreach ? 'bg-rose-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {receivingTempC.toFixed(1)}°C
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs text-stone-600">
                    Enter probe temperature on arrival (°C):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={receivingTempC}
                    onChange={(e) => setReceivingTempC(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* ALERT IF > 4°C */}
                {isColdChainBreach && (
                  <div className="mt-3 p-3 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2 animate-pulse">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">COLD CHAIN BREACH DETECTED!</strong>
                      <span>
                        Recorded temperature of {receivingTempC.toFixed(1)}°C exceeds the critical bacteriostatic limit of 4.0°C. Bacterial multiplication hazard! HACCP protocol requires placing this shipment on Quarantine Hold.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ← Back to Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={isColdChainBreach}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-900 hover:bg-purple-950 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <span>Review & Assign Bay</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Bay Assignment, Batch Generation & Review */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Generated Batch Identifier:</span>
                  <span className="font-mono text-emerald-700 font-bold">{generatedBatchId}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Assigned SKU:</span>
                  <span className="font-semibold text-stone-900">{selectedProduct.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Net Usable Stock Added:</span>
                  <span className="font-mono text-emerald-700 font-bold">{netUsableWeightKg} kg</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Receiving Cold Temp:</span>
                  <span className="font-mono text-stone-900">{receivingTempC}°C (Verified Safe)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Walk-In Storage Chiller Bay Assignment
                </label>
                <select
                  value={chillerBay}
                  onChange={(e) => setChillerBay(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {CHILLER_BAYS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Shelf Life Window (Hours)
                  </label>
                  <select
                    value={shelfLifeHours}
                    onChange={(e) => setShelfLifeHours(parseInt(e.target.value, 10))}
                    className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value={48}>48 Hours (Fresh Fish & Shellfish)</option>
                    <option value={72}>72 Hours (Chilled Poultry & Chicken)</option>
                    <option value={96}>96 Hours (Tender Goat Mutton)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Procurement Cost / Kg (₹)
                  </label>
                  <input
                    type="number"
                    value={costPerKg}
                    onChange={(e) => setCostPerKg(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Receiving Inspector Notes
                </label>
                <textarea
                  rows={2}
                  value={intakeNotes}
                  onChange={(e) => setIntakeNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ← Back to Yield
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Submit Intake & Generate Label</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
