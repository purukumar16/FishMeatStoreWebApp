import { serverTimestamp, FieldValue } from 'firebase/firestore';
import {
  CartItem,
  CustomerUser,
  DeliverySlot,
  GuestCustomerRecord,
  MainCategory,
  OrderRecord,
  Product,
  ProductSubscription,
  SavedAddress,
  Store,
  SubscriptionDay,
  SubscriptionFrequency,
  WeightVariant,
  WishlistItemPreference,
} from '../types';
import { PHYSICAL_STORES } from '../data/stores';
import { DELIVERY_SLOTS } from '../data/slots';
import { getLocalDateString } from './date';
import { WELCOME_LOYALTY_POINTS } from './loyalty';

export const FIRESTORE_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && FIRESTORE_ID_REGEX.test(id);
}

export function truncateStr(value: string | undefined | null, maxLength: number): string {
  return (value || '').trim().slice(0, maxLength);
}

export function normalizePhone10(phone: string | undefined | null): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.slice(-10);
}

export function isValidGuestPhone10(phone10: string): boolean {
  return /^[0-9]{10}$/.test(phone10);
}

export function cleanSavedAddress(addr: SavedAddress): SavedAddress {
  const cleaned: SavedAddress = {
    id: truncateStr(addr.id || `addr-${Date.now()}`, 64),
    label: truncateStr(addr.label || 'Home', 40),
    recipientName: truncateStr(addr.recipientName || 'Customer', 100),
    recipientPhone: truncateStr(addr.recipientPhone || '', 30),
    flatBuilding: truncateStr(addr.flatBuilding || '', 160),
    streetArea: truncateStr(addr.streetArea || '', 160),
    city: truncateStr(addr.city || 'Bengaluru', 80),
    pincode: truncateStr(addr.pincode || '', 20),
    isDefault: Boolean(addr.isDefault),
    formattedAddress: truncateStr(addr.formattedAddress || '', 300),
  };
  if (addr.landmark) {
    cleaned.landmark = truncateStr(addr.landmark, 120);
  }
  if (typeof addr.latitude === 'number' && Number.isFinite(addr.latitude)) {
    cleaned.latitude = addr.latitude;
  }
  if (typeof addr.longitude === 'number' && Number.isFinite(addr.longitude)) {
    cleaned.longitude = addr.longitude;
  }
  return cleaned;
}

export function sanitizeWishlistPreferences(
  prefs: Record<string, WishlistItemPreference> | undefined
): Record<string, WishlistItemPreference> {
  if (!prefs) return {};
  const entries = Object.entries(prefs).slice(0, 100);
  const result: Record<string, WishlistItemPreference> = {};
  for (const [key, val] of entries) {
    if (!key || !val) continue;
    const itemPref: WishlistItemPreference = {};
    if (val.weight) itemPref.weight = val.weight;
    if (val.cuttingStyle) itemPref.cuttingStyle = truncateStr(val.cuttingStyle, 100);
    if (val.savedAt) itemPref.savedAt = truncateStr(val.savedAt, 40);
    result[truncateStr(key, 80)] = itemPref;
  }
  return result;
}

export interface SerializedOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  category: MainCategory;
  selectedWeight: WeightVariant;
  unitPrice: number;
  quantity: number;
  finalWeightGrams?: number;
  finalUnitPrice?: number;
  finalLineTotal?: number;
  customNotes?: string;
  cuttingPreference?: string;
  isSubscription?: boolean;
  subscriptionFrequency?: SubscriptionFrequency;
  subscriptionDay?: SubscriptionDay;
  subscriptionSlot?: string;
  subscriptionSavings?: number;
}

export function serializeOrderItemsForFirestore(items: CartItem[]): SerializedOrderItem[] {
  return items.slice(0, 50).map((item) => {
    const out: SerializedOrderItem = {
      id: truncateStr(item.id, 100),
      productId: truncateStr(item.productId, 80),
      productName: truncateStr(item.product?.name || item.productId, 140),
      productImage: truncateStr(item.product?.image || '', 300),
      category: item.product?.category || 'CHICKEN',
      selectedWeight: item.selectedWeight,
      unitPrice: Number(item.unitPrice) || 0,
      quantity: Math.max(1, Number(item.quantity) || 1),
    };
    if (typeof item.finalWeightGrams === 'number' && Number.isFinite(item.finalWeightGrams)) {
      out.finalWeightGrams = Math.max(0, Math.min(100000, Math.round(item.finalWeightGrams)));
    }
    if (typeof item.finalUnitPrice === 'number' && Number.isFinite(item.finalUnitPrice)) {
      out.finalUnitPrice = Math.max(0, Math.min(500000, Number(item.finalUnitPrice)));
    }
    if (typeof item.finalLineTotal === 'number' && Number.isFinite(item.finalLineTotal)) {
      out.finalLineTotal = Math.max(0, Math.min(500000, Math.round(item.finalLineTotal)));
    }
    if (item.customNotes) out.customNotes = truncateStr(item.customNotes, 200);
    if (item.cuttingPreference) out.cuttingPreference = truncateStr(item.cuttingPreference, 100);
    if (item.isSubscription) out.isSubscription = true;
    if (item.subscriptionFrequency) out.subscriptionFrequency = item.subscriptionFrequency;
    if (item.subscriptionDay) out.subscriptionDay = item.subscriptionDay;
    if (item.subscriptionSlot) out.subscriptionSlot = truncateStr(item.subscriptionSlot, 100);
    if (typeof item.subscriptionSavings === 'number') {
      out.subscriptionSavings = item.subscriptionSavings;
    }
    return out;
  });
}

export function serializeOrderForCreate(
  order: OrderRecord,
  customerUid: string
): Record<string, unknown> {
  const safePhone = truncateStr(order.contactPhone, 30);
  const safeAddress = truncateStr(order.deliveryAddress, 300);
  const safeSlotTitle = truncateStr(order.deliverySlot?.title || 'Express 45 Min', 100);
  const safeSlotWindow = truncateStr(order.deliverySlot?.timeWindow || '45 Mins', 100);
  const safePlacedDate =
    order.placedDate && /^\d{4}-\d{2}-\d{2}$/.test(order.placedDate)
      ? order.placedDate
      : getLocalDateString(0);

  const serializedItems = serializeOrderItemsForFirestore(order.items);

  const payload: Record<string, unknown> = {
    orderId: truncateStr(order.orderId, 40),
    customerUid: truncateStr(customerUid, 128),
    storeId: truncateStr(order.store?.id || PHYSICAL_STORES[0].id, 64),
    storeName: truncateStr(order.store?.name || PHYSICAL_STORES[0].name, 120),
    contactName: truncateStr(order.contactName || 'Customer', 100) || 'Customer',
    contactPhone: safePhone.length >= 5 ? safePhone : '0000000000',
    deliveryAddress: safeAddress.length >= 5 ? safeAddress : 'Bengaluru Delivery Address',
    subtotal: Math.max(0, Math.min(500000, Number(order.subtotal) || 0)),
    deliveryFee: Math.max(0, Math.min(5000, Number(order.deliveryFee) || 0)),
    total: Math.max(0, Math.min(505000, Number(order.total) || 0)),
    paymentMethod: order.paymentMethod,
    status: 'confirmed',
    temperatureLog: truncateStr(order.temperatureLog || '2°C (Monitored)', 80),
    placedAt: truncateStr(order.placedAt || 'Just now', 40),
    placedDate: safePlacedDate,
    deliverySlotTitle: safeSlotTitle,
    deliverySlotWindow: safeSlotWindow,
    items: serializedItems,
    loyaltyPointsEarned: Math.max(0, Math.min(100000, Math.floor(Number(order.loyaltyPointsEarned) || 0))),
    loyaltyPointsRedeemed: Math.max(0, Math.min(100000, Math.floor(Number(order.loyaltyPointsRedeemed) || 0))),
    loyaltyDiscountAmount: Math.max(0, Math.min(500000, Math.round(Number(order.loyaltyDiscountAmount) || 0))),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  return payload;
}

export function hydrateOrderFromFirestore(
  data: Record<string, unknown>,
  liveProducts: Product[]
): OrderRecord {
  const storeId = String(data.storeId || PHYSICAL_STORES[0].id);
  const matchedStore: Store =
    PHYSICAL_STORES.find((s) => s.id === storeId) || PHYSICAL_STORES[0];

  const slotTitle = String(data.deliverySlotTitle || DELIVERY_SLOTS[0].title);
  const slotWindow = String(data.deliverySlotWindow || DELIVERY_SLOTS[0].timeWindow);
  const matchedSlot: DeliverySlot = DELIVERY_SLOTS.find((s) => s.title === slotTitle) || {
    ...DELIVERY_SLOTS[0],
    title: slotTitle,
    timeWindow: slotWindow,
  };

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const hydratedItems: CartItem[] = rawItems.map((raw: Record<string, unknown>, idx: number) => {
    const productId = String(raw.productId || `unknown-${idx}`);
    const weight = (String(raw.selectedWeight || '500g') as WeightVariant);
    const unitPrice = Number(raw.unitPrice) || 0;
    const foundProduct = liveProducts.find((p) => p.id === productId);
    const fallbackProduct: Product = foundProduct || {
      id: productId,
      name: String(raw.productName || 'Fresh Cut'),
      category: (String(raw.category || 'CHICKEN') as MainCategory),
      subcategory: 'Fresh Cut',
      tagline: 'Cold-chain fresh cut',
      description: '',
      image: String(raw.productImage || ''),
      coldChainTemp: '0°C - 4°C',
      shelfLife: '24 Hours',
      cutSpec: 'Standard Cut',
      basePricePerKg: unitPrice,
      variants: {
        '250g': { weight: '250g', price: unitPrice, serves: '1-2', pieces: '4-6', netWeight: '250g', grossWeight: '300g' },
        '500g': { weight: '500g', price: unitPrice, serves: '2-3', pieces: '8-12', netWeight: '500g', grossWeight: '600g' },
        '750g': { weight: '750g', price: unitPrice, serves: '3-4', pieces: '12-16', netWeight: '750g', grossWeight: '900g' },
        '1kg': { weight: '1kg', price: unitPrice, serves: '4-6', pieces: '16-24', netWeight: '1kg', grossWeight: '1.2kg' },
      },
      badges: [],
      nutrition: { calories: 150, protein: 22, fat: 6, carbs: 0 },
    };

    const hydratedItem: CartItem = {
      id: String(raw.id || `${productId}-${weight}`),
      productId,
      product: fallbackProduct,
      selectedWeight: weight,
      unitPrice,
      quantity: Math.max(1, Number(raw.quantity) || 1),
      customNotes: raw.customNotes ? String(raw.customNotes) : undefined,
      cuttingPreference: raw.cuttingPreference ? String(raw.cuttingPreference) : undefined,
      isSubscription: Boolean(raw.isSubscription),
      subscriptionFrequency: raw.subscriptionFrequency
        ? (String(raw.subscriptionFrequency) as SubscriptionFrequency)
        : undefined,
      subscriptionDay: raw.subscriptionDay
        ? (String(raw.subscriptionDay) as SubscriptionDay)
        : undefined,
      subscriptionSlot: raw.subscriptionSlot ? String(raw.subscriptionSlot) : undefined,
      subscriptionSavings:
        typeof raw.subscriptionSavings === 'number' ? raw.subscriptionSavings : undefined,
    };

    if (typeof raw.finalWeightGrams === 'number' && Number.isFinite(raw.finalWeightGrams)) {
      hydratedItem.finalWeightGrams = raw.finalWeightGrams;
    }
    if (typeof raw.finalUnitPrice === 'number' && Number.isFinite(raw.finalUnitPrice)) {
      hydratedItem.finalUnitPrice = raw.finalUnitPrice;
    }
    if (typeof raw.finalLineTotal === 'number' && Number.isFinite(raw.finalLineTotal)) {
      hydratedItem.finalLineTotal = raw.finalLineTotal;
    }

    return hydratedItem;
  });

  const order: OrderRecord = {
    orderId: String(data.orderId || ''),
    customerUid: data.customerUid ? String(data.customerUid) : undefined,
    store: matchedStore,
    items: hydratedItems,
    subtotal: Number(data.subtotal) || 0,
    deliveryFee: Number(data.deliveryFee) || 0,
    packagingFee: 0,
    total: Number(data.total) || 0,
    deliverySlot: matchedSlot,
    deliveryAddress: String(data.deliveryAddress || ''),
    contactName: String(data.contactName || 'Customer'),
    contactPhone: String(data.contactPhone || ''),
    paymentMethod: (String(data.paymentMethod || 'cod') as OrderRecord['paymentMethod']),
    status: (String(data.status || 'confirmed') as OrderRecord['status']),
    temperatureLog: String(data.temperatureLog || '2°C (Monitored)'),
    placedAt: String(data.placedAt || ''),
    placedDate: String(data.placedDate || getLocalDateString(0)),
  };

  if (typeof data.loyaltyPointsEarned === 'number' && Number.isFinite(data.loyaltyPointsEarned)) {
    order.loyaltyPointsEarned = Math.max(0, Math.floor(data.loyaltyPointsEarned));
  }
  if (typeof data.loyaltyPointsRedeemed === 'number' && Number.isFinite(data.loyaltyPointsRedeemed)) {
    order.loyaltyPointsRedeemed = Math.max(0, Math.floor(data.loyaltyPointsRedeemed));
  }
  if (typeof data.loyaltyDiscountAmount === 'number' && Number.isFinite(data.loyaltyDiscountAmount)) {
    order.loyaltyDiscountAmount = Math.max(0, Math.round(data.loyaltyDiscountAmount));
  }
  if (typeof data.originalSubtotal === 'number' && Number.isFinite(data.originalSubtotal)) {
    order.originalSubtotal = data.originalSubtotal;
  }
  if (typeof data.originalTotal === 'number' && Number.isFinite(data.originalTotal)) {
    order.originalTotal = data.originalTotal;
  }
  if (data.weightUpdatedAt) order.weightUpdatedAt = String(data.weightUpdatedAt);
  if (data.weightUpdatedBy) order.weightUpdatedBy = String(data.weightUpdatedBy);
  if (data.acceptedAt) order.acceptedAt = String(data.acceptedAt);
  if (data.acceptedBy) order.acceptedBy = String(data.acceptedBy);
  if (data.cancelledAt) order.cancelledAt = String(data.cancelledAt);
  if (data.cancelledBy) order.cancelledBy = String(data.cancelledBy);
  if (data.cancellationReason) order.cancellationReason = String(data.cancellationReason);

  return order;
}

export function serializeSubscriptionForCreate(
  sub: ProductSubscription,
  customerUid: string
): Record<string, unknown> {
  const safeAddr = truncateStr(sub.deliveryAddress, 300);
  const safePhone = truncateStr(sub.customerPhone, 30);

  const payload: Record<string, unknown> = {
    id: truncateStr(sub.id, 64),
    customerUid: truncateStr(customerUid, 128),
    productId: truncateStr(sub.productId, 80),
    productName: truncateStr(sub.productName, 140),
    category: truncateStr(sub.category, 60),
    selectedWeight: sub.selectedWeight,
    frequency: sub.frequency,
    deliveryDay: sub.deliveryDay,
    deliverySlot: truncateStr(sub.deliverySlot, 100),
    discountPercent: Math.max(0, Math.min(50, Number(sub.discountPercent) || 10)),
    originalPrice: Math.max(0, Math.min(50000, Number(sub.originalPrice) || 0)),
    discountedPrice: Math.max(0, Math.min(50000, Number(sub.discountedPrice) || 0)),
    savingsPerDelivery: Math.max(0, Math.min(50000, Number(sub.savingsPerDelivery) || 0)),
    status: sub.status === 'paused' ? 'paused' : 'active',
    nextDeliveryDate: truncateStr(sub.nextDeliveryDate || 'Scheduled', 120),
    deliveryAddress: safeAddr.length >= 5 ? safeAddr : 'Bengaluru Delivery Address',
    customerName: truncateStr(sub.customerName || 'Subscriber', 100) || 'Subscriber',
    customerPhone: safePhone.length >= 5 ? safePhone : '0000000000',
    storeId: truncateStr(sub.storeId || PHYSICAL_STORES[0].id, 64),
    storeName: truncateStr(sub.storeName || PHYSICAL_STORES[0].name, 120),
    createdAtLabel: truncateStr(sub.createdAt || new Date().toLocaleDateString('en-IN'), 40),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (sub.productImage) {
    payload.productImage = truncateStr(sub.productImage, 300);
  }
  if (sub.cuttingStyle) {
    payload.cuttingStyle = truncateStr(sub.cuttingStyle, 100);
  }
  if (sub.customNotes) {
    payload.customNotes = truncateStr(sub.customNotes, 200);
  }

  return payload;
}

export function hydrateSubscriptionFromFirestore(
  data: Record<string, unknown>
): ProductSubscription {
  return {
    id: String(data.id || ''),
    productId: String(data.productId || ''),
    productName: String(data.productName || ''),
    productImage: String(data.productImage || ''),
    category: String(data.category || 'CHICKEN') as MainCategory,
    selectedWeight: String(data.selectedWeight || '500g') as WeightVariant,
    cuttingStyle: data.cuttingStyle ? String(data.cuttingStyle) : undefined,
    customNotes: data.customNotes ? String(data.customNotes) : undefined,
    frequency: String(data.frequency || 'weekly') as SubscriptionFrequency,
    deliveryDay: String(data.deliveryDay || 'Sunday') as SubscriptionDay,
    deliverySlot: String(data.deliverySlot || ''),
    discountPercent: Number(data.discountPercent) || 10,
    originalPrice: Number(data.originalPrice) || 0,
    discountedPrice: Number(data.discountedPrice) || 0,
    savingsPerDelivery: Number(data.savingsPerDelivery) || 0,
    status: data.status === 'paused' ? 'paused' : 'active',
    nextDeliveryDate: String(data.nextDeliveryDate || ''),
    createdAt: String(data.createdAtLabel || new Date().toLocaleDateString('en-IN')),
    deliveryAddress: String(data.deliveryAddress || ''),
    customerId: String(data.customerUid || ''),
    customerName: data.customerName ? String(data.customerName) : undefined,
    customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
    storeId: data.storeId ? String(data.storeId) : undefined,
    storeName: data.storeName ? String(data.storeName) : undefined,
  };
}

export function buildInitialUserProfilePayload(
  uid: string,
  name: string
): Record<string, unknown> & { createdAt: FieldValue; updatedAt: FieldValue } {
  return {
    uid: truncateStr(uid, 128),
    name: truncateStr(name || 'Valued Customer', 100) || 'Valued Customer',
    walletBalance: 250,
    loyaltyPoints: WELCOME_LOYALTY_POINTS,
    totalLoyaltyEarned: WELCOME_LOYALTY_POINTS,
    totalLoyaltyRedeemed: 0,
    memberSince: truncateStr(
      new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      40
    ),
    preferredCut: 'Curry Cut',
    savedOrdersCount: 0,
    wishlistProductIds: [],
    wishlistPreferences: {},
    pastOrderProductIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildCustomerFromFirestoreDocs(
  uid: string,
  profileData: Record<string, unknown>,
  privateData: Record<string, unknown>,
  customerType?: CustomerUser['customerType']
): CustomerUser {
  const savedAddressesRaw = Array.isArray(privateData.savedAddresses)
    ? (privateData.savedAddresses as SavedAddress[])
    : [];
  const savedAddresses = savedAddressesRaw.slice(0, 15).map(cleanSavedAddress);

  const loyaltyPoints =
    typeof profileData.loyaltyPoints === 'number' && Number.isFinite(profileData.loyaltyPoints)
      ? Math.max(0, Math.floor(profileData.loyaltyPoints))
      : WELCOME_LOYALTY_POINTS;
  const totalLoyaltyEarned =
    typeof profileData.totalLoyaltyEarned === 'number' && Number.isFinite(profileData.totalLoyaltyEarned)
      ? Math.max(0, Math.floor(profileData.totalLoyaltyEarned))
      : loyaltyPoints;
  const totalLoyaltyRedeemed =
    typeof profileData.totalLoyaltyRedeemed === 'number' && Number.isFinite(profileData.totalLoyaltyRedeemed)
      ? Math.max(0, Math.floor(profileData.totalLoyaltyRedeemed))
      : 0;

  return {
    id: uid,
    name: String(profileData.name || 'Valued Customer'),
    email: String(privateData.email || ''),
    phone: String(privateData.phone || ''),
    customerType,
    addresses: savedAddresses.map((a) => a.formattedAddress).filter(Boolean),
    savedAddresses,
    savedOrdersCount: Number(profileData.savedOrdersCount) || 0,
    walletBalance: Number(profileData.walletBalance) || 250,
    loyaltyPoints,
    totalLoyaltyEarned,
    totalLoyaltyRedeemed,
    memberSince: String(profileData.memberSince || 'Nov 2024'),
    preferredCut: profileData.preferredCut ? String(profileData.preferredCut) : 'Curry Cut',
    wishlistProductIds: Array.isArray(profileData.wishlistProductIds)
      ? (profileData.wishlistProductIds as string[]).slice(0, 100)
      : [],
    wishlistPreferences:
      (profileData.wishlistPreferences as Record<string, WishlistItemPreference>) || {},
    pastOrderProductIds: Array.isArray(profileData.pastOrderProductIds)
      ? (profileData.pastOrderProductIds as string[]).slice(0, 100)
      : [],
  };
}

export function serializeGuestOrderSnapshot(order: OrderRecord): Record<string, unknown> {
  const safePlacedDate =
    order.placedDate && /^\d{4}-\d{2}-\d{2}$/.test(order.placedDate)
      ? order.placedDate
      : getLocalDateString(0);

  const snapshot: Record<string, unknown> = {
    orderId: truncateStr(order.orderId, 40),
    customerUid: truncateStr(order.customerUid || 'guest', 128),
    storeId: truncateStr(order.store?.id || PHYSICAL_STORES[0].id, 64),
    storeName: truncateStr(order.store?.name || PHYSICAL_STORES[0].name, 120),
    contactName: truncateStr(order.contactName || 'Guest 1', 100) || 'Guest 1',
    contactPhone: truncateStr(order.contactPhone || '0000000000', 30) || '0000000000',
    deliveryAddress: truncateStr(order.deliveryAddress || 'Bengaluru Delivery Address', 300),
    subtotal: Math.max(0, Math.min(500000, Number(order.subtotal) || 0)),
    deliveryFee: Math.max(0, Math.min(5000, Number(order.deliveryFee) || 0)),
    total: Math.max(0, Math.min(505000, Number(order.total) || 0)),
    paymentMethod: order.paymentMethod,
    status: order.status,
    temperatureLog: truncateStr(order.temperatureLog || '2°C (Monitored)', 80),
    placedAt: truncateStr(order.placedAt || 'Just now', 40),
    placedDate: safePlacedDate,
    deliverySlotTitle: truncateStr(order.deliverySlot?.title || 'Express 45 Min', 100),
    deliverySlotWindow: truncateStr(order.deliverySlot?.timeWindow || '45 Mins', 100),
    items: serializeOrderItemsForFirestore(order.items),
  };

  if (typeof order.loyaltyPointsEarned === 'number' && Number.isFinite(order.loyaltyPointsEarned)) {
    snapshot.loyaltyPointsEarned = Math.max(0, Math.floor(order.loyaltyPointsEarned));
  }
  if (typeof order.loyaltyPointsRedeemed === 'number' && Number.isFinite(order.loyaltyPointsRedeemed)) {
    snapshot.loyaltyPointsRedeemed = Math.max(0, Math.floor(order.loyaltyPointsRedeemed));
  }
  if (typeof order.loyaltyDiscountAmount === 'number' && Number.isFinite(order.loyaltyDiscountAmount)) {
    snapshot.loyaltyDiscountAmount = Math.max(0, Math.round(order.loyaltyDiscountAmount));
  }
  if (typeof order.originalSubtotal === 'number' && Number.isFinite(order.originalSubtotal)) {
    snapshot.originalSubtotal = Math.max(0, Math.min(500000, Number(order.originalSubtotal)));
  }
  if (typeof order.originalTotal === 'number' && Number.isFinite(order.originalTotal)) {
    snapshot.originalTotal = Math.max(0, Math.min(505000, Number(order.originalTotal)));
  }
  if (order.weightUpdatedAt) snapshot.weightUpdatedAt = truncateStr(order.weightUpdatedAt, 40);
  if (order.weightUpdatedBy) snapshot.weightUpdatedBy = truncateStr(order.weightUpdatedBy, 100);
  if (order.acceptedAt) snapshot.acceptedAt = truncateStr(order.acceptedAt, 40);
  if (order.acceptedBy) snapshot.acceptedBy = truncateStr(order.acceptedBy, 100);
  if (order.cancelledAt) snapshot.cancelledAt = truncateStr(order.cancelledAt, 40);
  if (order.cancelledBy) snapshot.cancelledBy = truncateStr(order.cancelledBy, 100);
  if (order.cancellationReason) snapshot.cancellationReason = truncateStr(order.cancellationReason, 300);

  return snapshot;
}

export function serializeGuestCustomerForFirestore(
  guest: GuestCustomerRecord,
  existingCreatedAt?: unknown
): Record<string, unknown> {
  const safePhone10 = normalizePhone10(guest.phone10 || guest.id);
  const safeDate =
    guest.lastOrderDate && /^\d{4}-\d{2}-\d{2}$/.test(guest.lastOrderDate)
      ? guest.lastOrderDate
      : getLocalDateString(0);
  const safeAddress = truncateStr(guest.address, 300);
  const safePhone = truncateStr(guest.phone || safePhone10, 30);

  const payload: Record<string, unknown> = {
    guestId: safePhone10,
    phone10: safePhone10,
    phone: safePhone.length >= 5 ? safePhone : safePhone10,
    name: truncateStr(guest.name || 'Guest 1', 100) || 'Guest 1',
    isAutoNamedGuest: Boolean(guest.isAutoNamedGuest),
    address: safeAddress.length >= 5 ? safeAddress : 'Bengaluru Delivery Address',
    addresses: (guest.addresses || [safeAddress])
      .filter(Boolean)
      .slice(0, 20)
      .map((a) => truncateStr(a, 300)),
    storeId: truncateStr(guest.storeId || PHYSICAL_STORES[0].id, 64),
    storeName: truncateStr(guest.storeName || PHYSICAL_STORES[0].name, 120),
    orderIds: (guest.orderIds || []).slice(0, 50).map((id) => truncateStr(id, 40)),
    recentOrders: (guest.recentOrders || []).slice(0, 20).map(serializeGuestOrderSnapshot),
    ordersCount: Math.max(0, Math.min(10000, Number(guest.ordersCount) || 0)),
    totalSpent: Math.max(0, Math.min(10000000, Number(guest.totalSpent) || 0)),
    loyaltyPoints: Math.max(0, Math.min(1000000, Math.floor(Number(guest.loyaltyPoints) || 0))),
    totalLoyaltyEarned: Math.max(0, Math.min(1000000, Math.floor(Number(guest.totalLoyaltyEarned) || 0))),
    totalLoyaltyRedeemed: Math.max(0, Math.min(1000000, Math.floor(Number(guest.totalLoyaltyRedeemed) || 0))),
    lastOrderDate: safeDate,
    lastOrderAt: truncateStr(guest.lastOrderAt || 'Just now', 40) || 'Just now',
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (typeof guest.guestNumber === 'number' && Number.isFinite(guest.guestNumber)) {
    payload.guestNumber = Math.max(0, Math.min(1000000, Math.round(guest.guestNumber)));
  }

  return payload;
}

export function hydrateGuestCustomerFromFirestore(
  data: Record<string, unknown>,
  liveProducts: Product[]
): GuestCustomerRecord {
  const phone10 = normalizePhone10(String(data.phone10 || data.guestId || data.phone || ''));
  const rawRecentOrders = Array.isArray(data.recentOrders)
    ? (data.recentOrders as Record<string, unknown>[])
    : [];
  const recentOrders = rawRecentOrders.map((ord) =>
    hydrateOrderFromFirestore(ord, liveProducts)
  );
  const createdTs = data.createdAt as { toDate?: () => Date } | string | undefined;
  const createdAtStr =
    typeof createdTs === 'object' && createdTs && typeof createdTs.toDate === 'function'
      ? createdTs.toDate().toISOString()
      : typeof createdTs === 'string'
      ? createdTs
      : new Date().toISOString();

  const derivedEarned = recentOrders.reduce(
    (sum, o) => (o.status === 'cancelled' ? sum : sum + (Number(o.loyaltyPointsEarned) || 0)),
    0
  );
  const derivedRedeemed = recentOrders.reduce(
    (sum, o) => (o.status === 'cancelled' ? sum : sum + (Number(o.loyaltyPointsRedeemed) || 0)),
    0
  );
  const totalLoyaltyEarned =
    typeof data.totalLoyaltyEarned === 'number' && Number.isFinite(data.totalLoyaltyEarned)
      ? Math.max(0, Math.floor(data.totalLoyaltyEarned))
      : derivedEarned;
  const totalLoyaltyRedeemed =
    typeof data.totalLoyaltyRedeemed === 'number' && Number.isFinite(data.totalLoyaltyRedeemed)
      ? Math.max(0, Math.floor(data.totalLoyaltyRedeemed))
      : derivedRedeemed;
  const loyaltyPoints =
    typeof data.loyaltyPoints === 'number' && Number.isFinite(data.loyaltyPoints)
      ? Math.max(0, Math.floor(data.loyaltyPoints))
      : Math.max(0, totalLoyaltyEarned - totalLoyaltyRedeemed);

  return {
    id: phone10 || String(data.guestId || ''),
    phone10: phone10 || String(data.guestId || ''),
    phone: String(data.phone || phone10 || ''),
    name: String(data.name || 'Guest 1'),
    isAutoNamedGuest: Boolean(data.isAutoNamedGuest),
    guestNumber:
      typeof data.guestNumber === 'number' && Number.isFinite(data.guestNumber)
        ? data.guestNumber
        : undefined,
    address: String(data.address || ''),
    addresses: Array.isArray(data.addresses)
      ? (data.addresses as string[]).filter(Boolean)
      : data.address
      ? [String(data.address)]
      : [],
    storeId: String(data.storeId || PHYSICAL_STORES[0].id),
    storeName: String(data.storeName || PHYSICAL_STORES[0].name),
    orderIds: Array.isArray(data.orderIds) ? (data.orderIds as string[]).filter(Boolean) : [],
    recentOrders,
    ordersCount: Number(data.ordersCount) || recentOrders.length || 0,
    totalSpent: Number(data.totalSpent) || 0,
    loyaltyPoints,
    totalLoyaltyEarned,
    totalLoyaltyRedeemed,
    lastOrderDate: String(data.lastOrderDate || getLocalDateString(0)),
    lastOrderAt: String(data.lastOrderAt || 'Recent'),
    createdAt: createdAtStr,
  };
}
