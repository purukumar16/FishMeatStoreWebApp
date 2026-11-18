import { OrderRecord, Store } from '../types';
import { formatWeightGrams, getEffectiveItemLineTotal } from './orderWeight';

export const STORE_WHATSAPP_NUMBER = '919035179382';
export const STORE_WHATSAPP_DISPLAY = '+91 90351 79382';

const STORE_WHATSAPP_BY_ID: Record<string, string> = {
  store_isiri_hub: '919035179382',
  store_gramiq_hypermart: '919036512513',
};

export const getStoreWhatsAppRaw = (store?: Pick<Store, 'id' | 'name' | 'phone'> | null): string => {
  if (!store) return STORE_WHATSAPP_NUMBER;
  if (STORE_WHATSAPP_BY_ID[store.id]) {
    return STORE_WHATSAPP_BY_ID[store.id];
  }
  const lowerName = (store.name || '').toLowerCase();
  if (lowerName.includes('gramiq')) return '919036512513';
  if (lowerName.includes('isiri')) return '919035179382';
  const digits = (store.phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 12) return digits;
  return STORE_WHATSAPP_NUMBER;
};

export const getStoreWhatsAppLocal10 = (store?: Pick<Store, 'id' | 'name' | 'phone'> | null): string => {
  return getStoreWhatsAppRaw(store).slice(-10);
};

export const getStoreWhatsAppDisplay = (store?: Pick<Store, 'id' | 'name' | 'phone'> | null): string => {
  const local10 = getStoreWhatsAppLocal10(store);
  return `+91 ${local10.slice(0, 5)} ${local10.slice(5)}`;
};

/**
 * Formats a comprehensive, professional WhatsApp message for store fulfillment.
 * Includes complete order breakdown, customer details, address, butchery instructions,
 * final weighed item details if updated, and bill summary.
 */
export const formatOrderWhatsAppMessage = (order: OrderRecord): string => {
  const itemsText = order.items
    .map((item, idx) => {
      const weight = typeof item.selectedWeight === 'string'
        ? item.selectedWeight
        : (item.selectedWeight as any)?.weightLabel || '1kg';
      const hasFinalWeight = typeof item.finalWeightGrams === 'number';
      const lineTotal = getEffectiveItemLineTotal(item);

      let line = `${idx + 1}. *${item.product.name}*\n   • Qty: ${item.quantity} | Ordered: ${weight}`;
      if (hasFinalWeight) {
        line += ` | *Final Weight:* ${formatWeightGrams(item.finalWeightGrams!)}`;
      }
      if (item.cuttingPreference) {
        line += ` | Cut: ${item.cuttingPreference}`;
      }
      if (item.customNotes) {
        line += `\n   • Note: _"${item.customNotes}"_`;
      }
      if (item.isSubscription) {
        line += `\n   • Subscription: ${item.subscriptionFrequency} on ${item.subscriptionDay}`;
      }
      line += `\n   • Price: ₹${lineTotal}`;
      return line;
    })
    .join('\n\n');

  const paymentText =
    order.paymentMethod === 'cod'
      ? 'Cash / UPI on Delivery (Collect at Doorstep)'
      : order.paymentMethod === 'upi'
      ? 'UPI Instant (Paid Online)'
      : 'Credit / Debit Card (Paid Online)';

  const hasWeightUpdate = Boolean(order.weightUpdatedAt);
  const estNote =
    typeof order.originalTotal === 'number' && order.originalTotal !== order.total
      ? ` (Original Est: ₹${order.originalTotal})`
      : '';

  return `🥩 *${hasWeightUpdate ? 'UPDATED FINAL BILL · ' : 'NEW ORDER FROM '}FISH MEAT STORE WEB APP* 🐟
━━━━━━━━━━━━━━━━━━━━━
*Order ID:* #${order.orderId}
*Order Time:* ${order.placedAt}
*Store Hub:* ${order.store.name} (${order.store.neighborhood})

👤 *CUSTOMER DETAILS*
• *Name:* ${order.contactName}
• *Phone:* ${order.contactPhone}
• *Delivery Slot:* ${order.deliverySlot.title} (${order.deliverySlot.timeWindow})

📍 *DELIVERY ADDRESS*
${order.deliveryAddress}

📦 *ITEMS ORDERED (${order.items.length} Cuts)*
${itemsText}

━━━━━━━━━━━━━━━━━━━━━
💰 *${hasWeightUpdate ? 'FINAL BILL SUMMARY' : 'BILL SUMMARY'}*
• Items Subtotal: ₹${order.subtotal}
• Delivery Fee: ₹${order.deliveryFee} ${order.deliveryFee === 0 ? '(Free 45-Min Express)' : ''}
*TOTAL PAYABLE:* ₹${order.total}${estNote}
*Payment Method:* ${paymentText}

❄️ *Cold-Chain Telemetry:* ${order.temperatureLog || '0-4°C Guaranteed'}
⚡ *Origin:* Triggered from *Fish Meat Store Web App*
━━━━━━━━━━━━━━━━━━━━━
_Please confirm cutting allocation and dispatch with 45-min courier._`;
};

/**
 * Returns the wa.me link with encoded message
 */
export const getStoreWhatsAppUrl = (
  order: OrderRecord,
  whatsappNumber?: string
): string => {
  const message = formatOrderWhatsAppMessage(order);
  const resolved = whatsappNumber || getStoreWhatsAppRaw(order.store);
  const cleanNumber = resolved.replace(/\D/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
};

/**
 * Detects whether the user is browsing on a mobile/tablet device.
 * Returns false on desktop computers (Windows, macOS, Linux).
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const uaDataMobile = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData?.mobile;
  if (uaDataMobile === true) {
    return true;
  }

  const ua = navigator.userAgent || '';
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIPadOS =
    /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;

  return isMobileUA || isIPadOS;
};

/**
 * Opens WhatsApp directly with the structured order message ONLY on mobile devices.
 * On desktop computers, returns false without opening a new window.
 */
export const sendOrderToStoreWhatsApp = (
  order: OrderRecord,
  whatsappNumber?: string
): boolean => {
  if (!isMobileDevice()) {
    return false;
  }

  const url = getStoreWhatsAppUrl(order, whatsappNumber || getStoreWhatsAppRaw(order.store));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    window.location.assign(url);
    return true;
  }
};
