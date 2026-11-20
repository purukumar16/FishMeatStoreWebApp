import { OrderRecord } from '../types';

export const LOYALTY_EARN_RATE_PER_100 = 1; // 1 point earned per ₹100 spent
export const LOYALTY_POINT_VALUE_INR = 1; // 1 loyalty point = ₹1 discount at checkout
export const WELCOME_LOYALTY_POINTS = 50; // Welcome bonus points on new registration
export const WELCOME_FRESH_WALLET_CREDIT_INR = 50; // Welcome Fresh Wallet credit for new registration / user / first order

/**
 * Calculates loyalty points earned on net payable item spend (after any redeemed discount).
 * Earns 1 pt per full ₹100 spent.
 */
export function calculateLoyaltyPointsEarned(netAmountInr: number): number {
  const safeAmount = Math.max(0, Number(netAmountInr) || 0);
  return Math.floor((safeAmount * LOYALTY_EARN_RATE_PER_100) / 100);
}

/**
 * Maximum points redeemable for a cart subtotal (capped at available points and cart subtotal).
 */
export function getMaxRedeemablePoints(availablePoints: number, cartSubtotal: number): number {
  const safeAvailable = Math.max(0, Math.floor(Number(availablePoints) || 0));
  const maxBySubtotal = Math.max(0, Math.floor(Math.max(0, Number(cartSubtotal) || 0) / LOYALTY_POINT_VALUE_INR));
  return Math.min(safeAvailable, maxBySubtotal);
}

export function getOrderLoyaltyDiscount(
  order: Pick<OrderRecord, 'loyaltyDiscountAmount' | 'loyaltyPointsRedeemed'>
): number {
  if (typeof order.loyaltyDiscountAmount === 'number' && Number.isFinite(order.loyaltyDiscountAmount)) {
    return Math.max(0, Math.round(order.loyaltyDiscountAmount));
  }
  if (typeof order.loyaltyPointsRedeemed === 'number' && Number.isFinite(order.loyaltyPointsRedeemed)) {
    return Math.max(0, Math.round(order.loyaltyPointsRedeemed * LOYALTY_POINT_VALUE_INR));
  }
  return 0;
}

export function getOrderLoyaltyRedeemed(
  order: Pick<OrderRecord, 'loyaltyPointsRedeemed' | 'loyaltyDiscountAmount'>
): number {
  if (typeof order.loyaltyPointsRedeemed === 'number' && Number.isFinite(order.loyaltyPointsRedeemed)) {
    return Math.max(0, Math.floor(order.loyaltyPointsRedeemed));
  }
  if (typeof order.loyaltyDiscountAmount === 'number' && Number.isFinite(order.loyaltyDiscountAmount)) {
    return Math.max(0, Math.floor(order.loyaltyDiscountAmount / LOYALTY_POINT_VALUE_INR));
  }
  return 0;
}

export function getOrderLoyaltyEarned(
  order: Pick<OrderRecord, 'status' | 'subtotal' | 'loyaltyPointsEarned' | 'loyaltyDiscountAmount' | 'loyaltyPointsRedeemed'>
): number {
  if (order.status === 'cancelled') {
    return 0;
  }
  if (typeof order.loyaltyPointsEarned === 'number' && Number.isFinite(order.loyaltyPointsEarned)) {
    return Math.max(0, Math.floor(order.loyaltyPointsEarned));
  }
  const discount = getOrderLoyaltyDiscount(order);
  const netSubtotal = Math.max(0, (Number(order.subtotal) || 0) - discount);
  return calculateLoyaltyPointsEarned(netSubtotal);
}

export const LOYALTY_EXPIRY_MONTHS = 12;

const MONTH_INDEX_BY_ABBR: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parses YYYY-MM-DD, DD MMM YYYY (with optional " · time"), MMM YYYY, or ISO timestamps
 * into a local midnight Date object. Returns null if unparseable.
 */
export function parseLoyaltyDate(dateInput?: string | null): Date | null {
  if (!dateInput || typeof dateInput !== 'string') return null;
  const cleaned = dateInput.split('·')[0].trim();
  if (!cleaned) return null;

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]) - 1;
    const day = Number(isoDateMatch[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmyMatch = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(cleaned);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const monthIdx = MONTH_INDEX_BY_ABBR[dmyMatch[2].slice(0, 3).toLowerCase()];
    const year = Number(dmyMatch[3]);
    if (monthIdx !== undefined) {
      const d = new Date(year, monthIdx, day);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const myMatch = /^([A-Za-z]{3,})\s+(\d{4})$/.exec(cleaned);
  if (myMatch) {
    const monthIdx = MONTH_INDEX_BY_ABBR[myMatch[1].slice(0, 3).toLowerCase()];
    const year = Number(myMatch[2]);
    if (monthIdx !== undefined) {
      const d = new Date(year, monthIdx, 1);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

export function isLoyaltyDateOlderThanMonths(
  earnedDate: Date,
  monthsThreshold = LOYALTY_EXPIRY_MONTHS,
  referenceDate = new Date()
): boolean {
  const refDay = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const cutoff = new Date(
    refDay.getFullYear(),
    refDay.getMonth() - monthsThreshold,
    refDay.getDate()
  );
  const earnedDay = new Date(
    earnedDate.getFullYear(),
    earnedDate.getMonth(),
    earnedDate.getDate()
  );
  return earnedDay.getTime() < cutoff.getTime();
}

export function getFullMonthsElapsed(earnedDate: Date, referenceDate = new Date()): number {
  let months =
    (referenceDate.getFullYear() - earnedDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - earnedDate.getMonth());
  if (referenceDate.getDate() < earnedDate.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export interface LoyaltyPointBatchInput {
  id: string;
  label: string;
  earnedPoints: number;
  dateStr?: string;
  dateDisplay?: string;
  isBonus?: boolean;
}

export interface LoyaltyPointBatchStatus {
  id: string;
  label: string;
  originalPoints: number;
  remainingPoints: number;
  earnedDate: Date | null;
  dateDisplay: string;
  ageMonths: number;
  isExpiringSoon: boolean;
  isBonus?: boolean;
}

export interface LoyaltyExpirySummary {
  availableBalance: number;
  expiringSoonPoints: number;
  expiringSoonValueInr: number;
  oldestExpiringDateLabel: string | null;
  oldestExpiringAgeMonths: number;
  batchesById: Record<string, LoyaltyPointBatchStatus>;
  expiringBatches: LoyaltyPointBatchStatus[];
}

/**
 * Reconciles remaining loyalty points on a FIFO (oldest-earned redeemed first) basis
 * and identifies unredeemed points earned more than 12 months ago.
 */
export function computeLoyaltyExpirySummary({
  availableBalance,
  totalRedeemed,
  batches,
  referenceDate = new Date(),
}: {
  availableBalance: number;
  totalRedeemed: number;
  batches: LoyaltyPointBatchInput[];
  referenceDate?: Date;
}): LoyaltyExpirySummary {
  const safeBalance = Math.max(0, Math.floor(Number(availableBalance) || 0));
  const safeRedeemed = Math.max(0, Math.floor(Number(totalRedeemed) || 0));

  const validBatches = batches
    .filter((b) => b.earnedPoints > 0)
    .map((b) => {
      const earnedDate = parseLoyaltyDate(b.dateStr);
      const dateDisplay =
        b.dateDisplay ||
        (earnedDate
          ? earnedDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : b.dateStr || 'Recent');
      return {
        id: b.id,
        label: b.label,
        originalPoints: Math.max(0, Math.floor(b.earnedPoints)),
        earnedDate,
        dateDisplay,
        isBonus: Boolean(b.isBonus),
      };
    });

  // Sort chronologically (oldest first); put undated batches at the end so they are not falsely expired
  const chronological = [...validBatches].sort((a, b) => {
    if (a.earnedDate && b.earnedDate) {
      return a.earnedDate.getTime() - b.earnedDate.getTime();
    }
    if (a.earnedDate) return -1;
    if (b.earnedDate) return 1;
    return 0;
  });

  const totalBatchEarned = chronological.reduce((sum, b) => sum + b.originalPoints, 0);
  const impliedConsumed = Math.max(0, totalBatchEarned - safeBalance);
  let remainingToConsume = safeBalance === 0 ? totalBatchEarned : Math.max(safeRedeemed, impliedConsumed);

  const batchesById: Record<string, LoyaltyPointBatchStatus> = {};
  const expiringBatches: LoyaltyPointBatchStatus[] = [];

  for (const batch of chronological) {
    const consumed = Math.min(batch.originalPoints, remainingToConsume);
    remainingToConsume = Math.max(0, remainingToConsume - consumed);
    const remainingPoints = safeBalance === 0 ? 0 : Math.max(0, batch.originalPoints - consumed);
    const ageMonths = batch.earnedDate
      ? getFullMonthsElapsed(batch.earnedDate, referenceDate)
      : 0;
    const isExpiringSoon =
      remainingPoints > 0 &&
      batch.earnedDate !== null &&
      isLoyaltyDateOlderThanMonths(batch.earnedDate, LOYALTY_EXPIRY_MONTHS, referenceDate);

    const status: LoyaltyPointBatchStatus = {
      id: batch.id,
      label: batch.label,
      originalPoints: batch.originalPoints,
      remainingPoints,
      earnedDate: batch.earnedDate,
      dateDisplay: batch.dateDisplay,
      ageMonths,
      isExpiringSoon,
      isBonus: batch.isBonus,
    };

    batchesById[batch.id] = status;
    if (isExpiringSoon) {
      expiringBatches.push(status);
    }
  }

  const rawExpiringSum = expiringBatches.reduce((sum, b) => sum + b.remainingPoints, 0);
  const expiringSoonPoints = Math.min(safeBalance, rawExpiringSum);
  const expiringSoonValueInr = expiringSoonPoints * LOYALTY_POINT_VALUE_INR;

  const oldestExpiring = expiringBatches[0] || null;

  return {
    availableBalance: safeBalance,
    expiringSoonPoints,
    expiringSoonValueInr,
    oldestExpiringDateLabel: oldestExpiring ? oldestExpiring.dateDisplay : null,
    oldestExpiringAgeMonths: oldestExpiring ? oldestExpiring.ageMonths : 0,
    batchesById,
    expiringBatches,
  };
}

