import { CartItem, OrderRecord, WeightVariant } from '../types';
import { calculateLoyaltyPointsEarned, getOrderLoyaltyDiscount } from './loyalty';

export const parseWeightVariantGrams = (weight: WeightVariant | string | unknown): number => {
  if (weight && typeof weight === 'object') {
    const label = (weight as { weightLabel?: string }).weightLabel;
    return parseWeightVariantGrams(label || '500g');
  }
  const str = String(weight || '').trim().toLowerCase();
  if (!str) return 500;
  if (str.endsWith('kg')) {
    const num = parseFloat(str.replace('kg', '').trim());
    return Number.isFinite(num) && num > 0 ? Math.round(num * 1000) : 1000;
  }
  if (str.endsWith('g')) {
    const num = parseFloat(str.replace('g', '').trim());
    return Number.isFinite(num) && num > 0 ? Math.round(num) : 500;
  }
  const numeric = parseFloat(str);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 500;
};

export const getOrderedItemWeightGrams = (item: CartItem): number => {
  const perPackGrams = parseWeightVariantGrams(item.selectedWeight);
  const qty = Math.max(1, Number(item.quantity) || 1);
  return perPackGrams * qty;
};

export const formatWeightGrams = (grams: number): string => {
  const rounded = Math.max(0, Math.round(grams));
  if (rounded >= 1000) {
    const kg = parseFloat((rounded / 1000).toFixed(3));
    return `${kg}kg (${rounded}g)`;
  }
  return `${rounded}g`;
};

export const getEffectiveItemLineTotal = (item: CartItem): number => {
  if (typeof item.finalLineTotal === 'number' && Number.isFinite(item.finalLineTotal)) {
    return Math.max(0, Math.round(item.finalLineTotal));
  }
  return Math.max(0, Math.round((Number(item.unitPrice) || 0) * Math.max(1, Number(item.quantity) || 1)));
};

export const calculateFinalLineTotal = (item: CartItem, finalWeightGrams: number): number => {
  const orderedGrams = Math.max(1, getOrderedItemWeightGrams(item));
  const qty = Math.max(1, Number(item.quantity) || 1);
  const originalLineTotal = Math.max(0, (Number(item.unitPrice) || 0) * qty);
  const sanitizedGrams = Math.max(0, Math.min(100000, Math.round(finalWeightGrams)));

  if (sanitizedGrams === orderedGrams) {
    return Math.round(originalLineTotal);
  }

  return Math.max(0, Math.round((sanitizedGrams / orderedGrams) * originalLineTotal));
};

export const recalculateOrderWithFinalWeights = (
  order: OrderRecord,
  finalWeightsByIndex: Record<number, number>,
  updatedBy: string,
  updatedAt: string,
  finalLineTotalsByIndex?: Record<number, number>
): OrderRecord => {
  const originalSubtotal =
    typeof order.originalSubtotal === 'number' ? order.originalSubtotal : order.subtotal;
  const originalTotal =
    typeof order.originalTotal === 'number' ? order.originalTotal : order.total;

  const updatedItems: CartItem[] = order.items.map((item, idx) => {
    const fallbackGrams =
      typeof item.finalWeightGrams === 'number'
        ? item.finalWeightGrams
        : getOrderedItemWeightGrams(item);
    const rawWeight = finalWeightsByIndex[idx];
    const finalWeightGrams = Math.max(
      0,
      Math.min(100000, Math.round(Number.isFinite(rawWeight) ? rawWeight : fallbackGrams))
    );
    const overridePrice = finalLineTotalsByIndex?.[idx];
    const finalLineTotal =
      typeof overridePrice === 'number' && Number.isFinite(overridePrice) && overridePrice >= 0
        ? Math.max(0, Math.min(500000, Math.round(overridePrice)))
        : calculateFinalLineTotal(item, finalWeightGrams);
    const qty = Math.max(1, Number(item.quantity) || 1);
    const finalUnitPrice = Math.round((finalLineTotal / qty) * 100) / 100;

    return {
      ...item,
      finalWeightGrams,
      finalUnitPrice,
      finalLineTotal,
    };
  });

  const newSubtotal = updatedItems.reduce((sum, item) => sum + getEffectiveItemLineTotal(item), 0);
  const existingDiscount = getOrderLoyaltyDiscount(order);
  const appliedDiscount = Math.min(newSubtotal, existingDiscount);
  const netSubtotal = Math.max(0, newSubtotal - appliedDiscount);
  const newTotal = netSubtotal + (Number(order.deliveryFee) || 0) + (Number(order.packagingFee) || 0);
  const nextLoyaltyEarned =
    order.status === 'cancelled' ? 0 : calculateLoyaltyPointsEarned(netSubtotal);

  return {
    ...order,
    items: updatedItems,
    subtotal: newSubtotal,
    originalSubtotal,
    loyaltyDiscountAmount: appliedDiscount,
    loyaltyPointsEarned: nextLoyaltyEarned,
    total: newTotal,
    originalTotal,
    weightUpdatedAt: updatedAt,
    weightUpdatedBy: updatedBy,
  };
};
