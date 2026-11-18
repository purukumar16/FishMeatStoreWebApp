export type InventoryCategory = 'FISHES & SEAFOOD' | 'CHICKEN' | 'MUTTON' | 'EGGS' | 'COLD CUTS';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRY_HAZARD';

export type WasteReasonCode =
  | 'EXPIRED_SHELF_LIFE'
  | 'COLD_CHAIN_BREACH'
  | 'TRIMMING_LOSS'
  | 'PACKAGING_SEAL_COMPROMISED'
  | 'ORGANOLEPTIC_REJECT';

export type StockAdjustmentReason =
  | 'Physical Count Audit'
  | 'Damaged/Spoiled In-house'
  | 'Supplier Shortage'
  | 'Data Correction';

export interface StockAdjustmentAuditRecord {
  id: string;
  batchId: string;
  skuName: string;
  previousStockKg: number;
  newStockKg: number;
  deltaKg: number;
  reason: StockAdjustmentReason;
  notes?: string;
  adminId: string;
  adminName: string;
  timestamp: string;
}

export interface InventoryBatch {
  id: string; // e.g. "BATCH-CHK-20261108-01"
  skuId: string;
  skuName: string;
  category: InventoryCategory;
  subcategory: string;
  image: string;
  currentStockKg: number;
  minThresholdKg: number;
  grossReceivedKg: number;
  usableYieldPct: number; // e.g. 88.5%
  supplierSource: string;
  supplierContact: string;
  procurementDate: string; // ISO
  expiryDate: string; // ISO
  hoursUntilExpiry: number;
  receivingTempC: number;
  chillerLocation: string; // e.g. "Chiller Bay 02 - Poultry Racks"
  costPerKg: number;
  retailPricePerKg: number;
  status: StockStatus;
  hasActivePO?: boolean;
  activePONumber?: string;
  isForcedOutOfStock?: boolean;
  forcedOutOfStockBy?: string;
  forcedOutOfStockAt?: string;
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-2026-8812"
  batchId: string;
  skuName: string;
  category: InventoryCategory;
  supplierName: string;
  supplierContact: string;
  requestedQtyKg: number;
  costPerKg: number;
  totalCost: number;
  leadTimeHours: number;
  status: 'DRAFT' | 'DISPATCHED' | 'CONFIRMED' | 'DELIVERED';
  createdDate: string;
  recommendedReason: string;
}

export interface WasteRecord {
  id: string;
  batchId: string;
  skuName: string;
  category: InventoryCategory;
  writtenOffKg: number;
  costImpact: number;
  reasonCode: WasteReasonCode;
  reasonLabel: string;
  loggedBy: string;
  loggedAt: string;
  disposalProtocol: string;
  supervisorApproved: boolean;
}

export interface InboundIntakePayload {
  supplierVendor: string;
  procurementDate: string;
  skuId: string;
  skuName: string;
  category: InventoryCategory;
  grossWeightKg: number;
  netUsableWeightKg: number;
  coldChainTempC: number;
  chillerBay: string;
  costPerKg: number;
  shelfLifeHours: number;
  notes?: string;
}

export interface WarehouseLabelData {
  labelId: string;
  batchId: string;
  skuName: string;
  category: string;
  grossWeightKg: number;
  netWeightKg: number;
  yieldPct: number;
  receivingTempC: number;
  packedDate: string;
  expiryDate: string;
  chillerBay: string;
  fssaiNumber: string;
  supplierName: string;
  barcodeNumber: string;
}
