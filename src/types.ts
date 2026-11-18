export type WeightVariant = '250g' | '500g' | '750g' | '1kg';

export type MainCategory = 'FISHES & SEAFOOD' | 'CHICKEN' | 'MUTTON' | 'EGGS';

export interface ProductVariantInfo {
  weight: WeightVariant;
  price: number;
  serves: string;
  pieces: string;
  netWeight: string;
  grossWeight: string;
}

export interface NutritionalInfo {
  calories: number; // kcal per 100g
  protein: number;  // grams per 100g
  fat: number;      // grams per 100g
  carbs: number;    // grams per 100g
  keyHighlight?: string;
  ironMg?: number;
  omega3G?: number;
}

export interface Product {
  id: string;
  name: string;
  category: MainCategory;
  subcategory: string;
  tagline: string;
  description: string;
  image: string;
  coldChainTemp: string;
  shelfLife: string;
  cutSpec: string;
  basePricePerKg: number;
  variants: Record<WeightVariant, ProductVariantInfo>;
  badges: string[];
  nutrition: NutritionalInfo;
  availableWeights?: WeightVariant[];
}

export interface StoreInventoryItem {
  inStock: boolean;
  stockCount: number; // in packs
}

export interface Store {
  id: string;
  name: string;
  neighborhood: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number; // strictly 4.0 km
  phone: string;
  openingHours: string;
  chillerTempC: number;
  inventory: Record<string, Record<WeightVariant, StoreInventoryItem>>;
}

export interface UserLocation {
  address: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  isDetected: boolean;
  distanceToNearestKm: number | null;
  nearestStore: Store | null;
  isWithinRange: boolean;
}

export type SubscriptionFrequency = 'weekly' | 'bi-weekly' | 'twice-weekly';
export type SubscriptionDay = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ProductSubscription {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  category: MainCategory;
  selectedWeight: WeightVariant;
  cuttingStyle?: string;
  customNotes?: string;
  frequency: SubscriptionFrequency;
  deliveryDay: SubscriptionDay;
  deliverySlot: string;
  discountPercent: number; // 10%
  originalPrice: number;
  discountedPrice: number;
  savingsPerDelivery: number;
  status: 'active' | 'paused';
  nextDeliveryDate: string;
  createdAt: string;
  deliveryAddress: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  storeId?: string;
  storeName?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
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

export interface DeliverySlot {
  id: string;
  type: 'express' | 'scheduled';
  title: string;
  subtitle: string;
  timeWindow: string;
  dateLabel: string;
  fee: number;
}

export interface OrderRecord {
  orderId: string;
  customerUid?: string;
  store: Store;
  items: CartItem[];
  subtotal: number;
  originalSubtotal?: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  deliveryFee: number;
  packagingFee: number;
  total: number;
  originalTotal?: number;
  weightUpdatedAt?: string;
  weightUpdatedBy?: string;
  deliverySlot: DeliverySlot;
  deliveryAddress: string;
  contactName: string;
  contactPhone: string;
  paymentMethod: 'cod' | 'upi' | 'card';
  status: 'confirmed' | 'allocated' | 'butchered_sealed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  temperatureLog: string;
  placedAt: string;
  placedDate?: string; // YYYY-MM-DD local date
  acceptedAt?: string;
  acceptedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface LeadCapture {
  email: string;
  phone: string;
  address: string;
  city: string;
  submittedAt: string;
}

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other' | string;
  recipientName: string;
  recipientPhone: string;
  flatBuilding: string;
  streetArea: string;
  landmark?: string;
  city: string;
  pincode: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress: string;
}

export interface WishlistItemPreference {
  weight?: WeightVariant;
  cuttingStyle?: string;
  savedAt?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  customerType?: 'Customer' | 'Admin' | 'Store Admin' | 'Store Incharge' | 'Store Operations Manager' | string;
  password?: string;
  avatar?: string;
  addresses: string[];
  savedAddresses: SavedAddress[];
  savedOrdersCount: number;
  walletBalance: number;
  loyaltyPoints?: number;
  totalLoyaltyEarned?: number;
  totalLoyaltyRedeemed?: number;
  memberSince: string;
  preferredCut?: string;
  subscriptions?: ProductSubscription[];
  pastOrderProductIds?: string[];
  pastOrders?: OrderRecord[];
  wishlistProductIds?: string[];
  wishlistPreferences?: Record<string, WishlistItemPreference>;
  isGuest?: boolean;
  guestNumber?: number;
}

export interface GuestCustomerRecord {
  id: string;
  phone10: string;
  phone: string;
  name: string;
  isAutoNamedGuest: boolean;
  guestNumber?: number;
  address: string;
  addresses: string[];
  storeId: string;
  storeName: string;
  orderIds: string[];
  recentOrders: OrderRecord[];
  ordersCount: number;
  totalSpent: number;
  loyaltyPoints?: number;
  totalLoyaltyEarned?: number;
  totalLoyaltyRedeemed?: number;
  lastOrderDate: string;
  lastOrderAt: string;
  createdAt: string;
}

export interface StoreInchargeAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  assignedStoreId: string;
  assignedStoreName: string;
  role: 'Store Incharge';
  status: 'active' | 'suspended';
  createdAt: string;
  createdByAdminName: string;
  notes?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  workEmail: string;
  role: 'Admin' | 'Store Admin' | 'Store Incharge' | 'Store Operations Manager' | 'Cold-Chain QA Auditor' | 'Dispatch Lead';
  assignedStoreId: string;
  assignedStoreName: string;
  securityClearance: 'Level 2' | 'Level 3 - Root Ops';
  lastLoginAt: string;
  inchargeProfile?: StoreInchargeAccount;
}

export interface StoreFeatureFlags {
  enableOtherPayments: boolean;
  sendWhatsAppOnOrderConfirmation: boolean;
}
