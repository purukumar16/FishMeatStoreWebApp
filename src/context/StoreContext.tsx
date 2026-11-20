import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Store,
  UserLocation,
  CartItem,
  Product,
  WeightVariant,
  DeliverySlot,
  OrderRecord,
  LeadCapture,
  MainCategory,
  CustomerUser,
  AdminUser,
  StoreInchargeAccount,
  SavedAddress,
  ProductSubscription,
  SubscriptionFrequency,
  SubscriptionDay,
  WishlistItemPreference,
  GuestCustomerRecord,
  StoreFeatureFlags,
} from '../types';
import { AppRole, normalizeAppRole } from '../config/rbac';
import { PHYSICAL_STORES, DEMO_LOCATION_PRESETS, AddressPreset } from '../data/stores';
import { findNearestStore } from '../utils/geo';
import { DELIVERY_SLOTS } from '../data/slots';
import { PRODUCTS, generateVariants } from '../data/products';
import { INITIAL_CUSTOMER_ORDERS } from '../data/ordersSeed';
import { getLocalDateString, getTodayWeekdayName, WEEKDAYS_ORDERED } from '../utils/date';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  getStoreAdminConfigForEmail,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  buildCustomerFromFirestoreDocs,
  buildInitialUserProfilePayload,
  cleanSavedAddress,
  hydrateGuestCustomerFromFirestore,
  hydrateOrderFromFirestore,
  hydrateSubscriptionFromFirestore,
  isValidFirestoreId,
  isValidGuestPhone10,
  normalizePhone10,
  sanitizeWishlistPreferences,
  serializeGuestCustomerForFirestore,
  serializeOrderForCreate,
  serializeOrderItemsForFirestore,
  serializeSubscriptionForCreate,
  truncateStr,
} from '../utils/firestoreMappers';
import { recalculateOrderWithFinalWeights } from '../utils/orderWeight';
import {
  calculateLoyaltyPointsEarned,
  getMaxRedeemablePoints,
  getOrderLoyaltyEarned,
  getOrderLoyaltyRedeemed,
  LOYALTY_POINT_VALUE_INR,
  WELCOME_FRESH_WALLET_CREDIT_INR,
  WELCOME_LOYALTY_POINTS,
} from '../utils/loyalty';

interface StoreContextType {
  // Store & Location
  stores: Store[];
  activeStore: Store;
  userLocation: UserLocation;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  isOutOfAreaModalOpen: boolean;
  setIsOutOfAreaModalOpen: (open: boolean) => void;
  setLocationFromPreset: (preset: AddressPreset) => void;
  setUserCustomLocation: (address: string, lat: number, lon: number, neighborhood?: string) => void;
  requestBrowserGeolocation: () => void;
  geoLoading: boolean;
  geoError: string | null;
  manuallySelectStore: (storeId: string) => void;

  // Catalog navigation
  selectedCategory: MainCategory | 'ALL';
  setSelectedCategory: (cat: MainCategory | 'ALL') => void;
  selectedSubcategory: string | 'ALL';
  setSelectedSubcategory: (sub: string | 'ALL') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedProductForDetail: Product | null;
  setSelectedProductForDetail: (product: Product | null) => void;

  // Cart
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    weight: WeightVariant,
    cuttingNotes?: string,
    customCleaning?: string,
    subscriptionConfig?: {
      frequency: SubscriptionFrequency;
      deliveryDay: SubscriptionDay;
      deliverySlot: string;
    },
    openDrawer?: boolean
  ) => void;
  updateQuantity: (itemId: string, newQty: number) => void;
  updateCartItemNotes: (itemId: string, cuttingNotes: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;

  // Delivery & Slots
  selectedSlot: DeliverySlot;
  setSelectedSlot: (slot: DeliverySlot) => void;

  // Checkout & Order
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  activeOrder: OrderRecord | null;
  placeOrder: (details: {
    name: string;
    phone: string;
    address: string;
    paymentMethod: 'cod' | 'upi' | 'card';
    loyaltyPointsToRedeem?: number;
  }) => OrderRecord;
  clearActiveOrder: () => void;
  orderSyncState: Record<string, 'syncing' | 'synced' | 'error'>;
  waitForOrderSync: (orderId: string) => Promise<boolean>;
  retryOrderSync: (orderId: string) => Promise<boolean>;

  // Out of Area Lead Capture
  leadCaptures: LeadCapture[];
  submitLeadCapture: (email: string, phone: string, address: string) => void;
  leadSubmittedSuccess: boolean;
  setLeadSubmittedSuccess: (val: boolean) => void;

  // Architecture & Specs Tab/Modal
  isArchitectureOpen: boolean;
  setIsArchitectureOpen: (open: boolean) => void;

  // Dual-Login & Firebase Authentication State
  firebaseUser: FirebaseUser | null;
  isAuthReady: boolean;
  authLoading: boolean;
  userRole: AppRole;
  authNotice: { message: string; type: 'error' | 'info' } | null;
  showAuthNotice: (message: string, type?: 'error' | 'info') => void;
  dismissAuthNotice: () => void;
  loginWithGoogle: (
    targetRole?: 'customer' | 'admin'
  ) => Promise<{ success: boolean; role?: AppRole; error?: string }>;
  currentUser: CustomerUser | null;
  adminUser: AdminUser | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isCustomerProfileOpen: boolean;
  setIsCustomerProfileOpen: (open: boolean) => void;
  authInitialTab: 'customer' | 'admin';
  setAuthInitialTab: (tab: 'customer' | 'admin') => void;
  loginCustomer: (phone: string, name?: string, email?: string) => void;
  registerCustomer: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    flatBuilding?: string;
    streetArea?: string;
    city?: string;
    pincode?: string;
  }) => { success: boolean; role?: AppRole; error?: string };
  loginWithEmailPassword: (
    email: string,
    password: string
  ) => { success: boolean; role?: AppRole; error?: string };
  updateCustomerProfile: (updates: Partial<CustomerUser>) => void;
  addSavedAddress: (addr: Omit<SavedAddress, 'id'>) => void;
  updateSavedAddress: (id: string, updates: Partial<SavedAddress>) => void;
  deleteSavedAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  loginAdmin: (user: AdminUser) => void;
  switchCustomerToStaffProfile: () => void;
  logoutCustomer: () => void;
  logoutAdmin: () => void;
  isAdminDashboardOpen: boolean;
  setIsAdminDashboardOpen: (open: boolean) => void;
  updateProductOnlineAvailability: (skuId: string, inStock: boolean, stockKg: number) => void;
  hasCustomerOrderedProduct: (productId: string) => boolean;

  // Wishlist & Quick Re-ordering (Logged-in Users)
  wishlistProductIds: string[];
  wishlistPreferences: Record<string, WishlistItemPreference>;
  wishlistProducts: Product[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string, prefs?: WishlistItemPreference) => boolean;
  updateWishlistItemPreference: (productId: string, prefs: Partial<WishlistItemPreference>) => void;
  quickReorderWishlistItem: (productId: string, weightOverride?: WeightVariant) => boolean;
  quickReorderAllWishlist: () => number;
  isWishlistDrawerOpen: boolean;
  setIsWishlistDrawerOpen: (open: boolean) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (val: boolean) => void;
  pendingWishlistProduct: Product | null;
  wishlistNotice: { message: string; type: 'added' | 'removed' | 'auth' | 'reordered' } | null;
  dismissWishlistNotice: () => void;

  // Subscriptions & Recurring Deliveries
  subscriptions: ProductSubscription[];
  addSubscription: (sub: Omit<ProductSubscription, 'id' | 'createdAt'>) => ProductSubscription;
  toggleSubscriptionPause: (id: string) => void;
  cancelSubscription: (id: string) => void;
  skipNextDelivery: (id: string) => void;

  // Store Incharges & Staff Management
  storeIncharges: StoreInchargeAccount[];
  createStoreIncharge: (inchargeData: Omit<StoreInchargeAccount, 'id' | 'createdAt'>) => StoreInchargeAccount;
  updateStoreIncharge: (id: string, updates: Partial<StoreInchargeAccount>) => void;
  deleteStoreIncharge: (id: string) => void;
  authenticateStaff: (
    email: string,
    password: string
  ) => { success: boolean; role?: AppRole; user?: AdminUser; error?: string };

  // Catalog & Live Price Overrides
  products: Product[];
  customPrices: Record<string, number>;
  updateProductPrice: (productId: string, newPricePerKg: number) => void;

  // Customer Orders Dispatch Monitor
  allOrders: OrderRecord[];
  pendingIncomingOrders: OrderRecord[];
  isCloudOrdersConnected: boolean;
  isSyncingCloudOrders: boolean;
  lastCloudOrdersSyncAt: string | null;
  refreshCloudOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderRecord['status']) => void;
  acceptOrder: (orderId: string) => void;
  updateOrderFinalWeights: (
    orderId: string,
    finalWeightsByIndex: Record<number, number>,
    finalLineTotalsByIndex?: Record<number, number>
  ) => Promise<boolean>;
  cancelOrder: (orderId: string, reason: string) => void;
  requestedControlRoomNav: 'realtime_stock' | 'customer_orders' | 'reports' | null;
  clearRequestedControlRoomNav: () => void;
  openControlRoomCustomerOrders: () => void;
  openControlRoomReports: () => void;

  // Customer & Guest Directories (Reports & OTP Order Hydration)
  registeredUsers: CustomerUser[];
  guestCustomers: GuestCustomerRecord[];
  profileDefaultTab: 'profile' | 'loyalty' | 'wishlist' | 'addresses' | 'orders' | 'subscriptions';
  setProfileDefaultTab: (
    tab: 'profile' | 'loyalty' | 'wishlist' | 'addresses' | 'orders' | 'subscriptions'
  ) => void;
  loginCustomerWithOtp: (phone: string) => Promise<{ role: AppRole }>;

  // Admin Feature Toggles & Services
  featureFlags: StoreFeatureFlags;
  toggleFeatureFlag: (key: keyof StoreFeatureFlags) => void;
  updateFeatureFlags: (updates: Partial<StoreFeatureFlags>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const DEFAULT_STORE = PHYSICAL_STORES[0]; // FreshToHome Retails ISIRI HUB

export const DEFAULT_ADMIN_ACCOUNT = {
  email: 'admin@fishmeatstore.com',
  password: 'AdminPassword@123',
  name: 'Corporate Store Admin',
  role: 'Admin' as const,
  securityClearance: 'Level 3 - Root Ops' as const,
};

export const DEFAULT_STORE_INCHARGES: StoreInchargeAccount[] = [
  {
    id: 'inch-isiri-01',
    name: 'Ramesh Gowda',
    email: 'incharge.isiri@fishmeatstore.com',
    password: 'Incharge@123',
    phone: '+91 9035179382',
    assignedStoreId: 'store_isiri_hub',
    assignedStoreName: 'FreshToHome Retails ISIRI HUB',
    role: 'Store Incharge',
    status: 'active',
    createdAt: '2026-11-01T08:00:00Z',
    createdByAdminName: 'Corporate Store Admin',
    notes: 'Primary shift incharge for ISIRI HUB Budigere Cross',
  },
  {
    id: 'inch-gramiq-02',
    name: 'Suresh Patil',
    email: 'incharge.gramiq@fishmeatstore.com',
    password: 'Incharge@123',
    phone: '+91 9036512513',
    assignedStoreId: 'store_gramiq_hypermart',
    assignedStoreName: 'FreshToHome Retails Gramiq Hypermart',
    role: 'Store Incharge',
    status: 'active',
    createdAt: '2026-11-03T09:30:00Z',
    createdByAdminName: 'Corporate Store Admin',
    notes: 'Shift manager for Gramiq Hypermart Bidareagrahara',
  },
];

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to FreshToHome Retails ISIRI HUB, Budigere Cross, Bommenahalli
  const initialPreset = DEMO_LOCATION_PRESETS[0];
  const [activeStore, setActiveStore] = useState<Store>(DEFAULT_STORE);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    address: initialPreset.address,
    neighborhood: initialPreset.neighborhood,
    latitude: initialPreset.latitude,
    longitude: initialPreset.longitude,
    isDetected: true,
    distanceToNearestKm: initialPreset.expectedDistanceKm,
    nearestStore: DEFAULT_STORE,
    isWithinRange: true,
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isOutOfAreaModalOpen, setIsOutOfAreaModalOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Catalog
  const [selectedCategory, setSelectedCategory] = useState<MainCategory | 'ALL'>('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Firebase Auth & Sync Refs
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [firebaseRole, setFirebaseRole] = useState<'none' | 'admin' | 'staff'>('none');
  const pendingGoogleRoleRef = useRef<'customer' | 'admin' | null>(null);
  const firestoreOrderIdsRef = useRef<Set<string>>(new Set());
  const firestoreSubIdsRef = useRef<Set<string>>(new Set());
  const inFlightOrderSyncsRef = useRef<Map<string, Promise<boolean>>>(new Map());
  const inFlightOrderStatusUpdatesRef = useRef<Map<string, Promise<void>>>(new Map());
  const isFlushingPendingOrdersRef = useRef(false);
  const [orderSyncState, setOrderSyncState] = useState<Record<string, 'syncing' | 'synced' | 'error'>>({});
  const [isSyncingCloudOrders, setIsSyncingCloudOrders] = useState(false);
  const [lastCloudOrdersSyncAt, setLastCloudOrdersSyncAt] = useState<string | null>(null);

  // Dynamic Product Catalog with Price Overrides
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('fishmeatstore_custom_prices');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed reading custom prices from localStorage', e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_custom_prices', JSON.stringify(customPrices));
    } catch (e) {
      console.warn('Failed saving custom prices', e);
    }
  }, [customPrices]);

  const updateProductPrice = (productId: string, newPricePerKg: number) => {
    setCustomPrices((prev) => ({
      ...prev,
      [productId]: newPricePerKg,
    }));

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      (firebaseRole === 'admin' || firebaseRole === 'staff') &&
      isValidFirestoreId(productId) &&
      newPricePerKg > 0 &&
      newPricePerKg <= 50000
    ) {
      const pricePath = `customPrices/${productId}`;
      void setDoc(doc(db, 'customPrices', productId), {
        productId,
        basePricePerKg: newPricePerKg,
        updatedBy: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, pricePath);
      });
    }
  };

  const products: Product[] = useMemo(() => {
    return PRODUCTS.map((p) => {
      const overridePrice = customPrices[p.id];
      if (overridePrice !== undefined && overridePrice > 0) {
        return {
          ...p,
          basePricePerKg: overridePrice,
          variants: generateVariants(overridePrice, [12, 16], p.cutSpec || 'Pieces', 0.88),
        };
      }
      return p;
    });
  }, [customPrices]);

  const productsRef = useRef<Product[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Store Incharges State (persisted to localStorage)
  const [storeIncharges, setStoreIncharges] = useState<StoreInchargeAccount[]>(() => {
    try {
      const saved = localStorage.getItem('fishmeatstore_store_incharges');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed reading store incharges from localStorage', e);
    }
    return DEFAULT_STORE_INCHARGES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_store_incharges', JSON.stringify(storeIncharges));
    } catch (e) {
      console.warn('Failed saving store incharges', e);
    }
  }, [storeIncharges]);

  // Customer Orders Monitor State (persisted to localStorage)
  const [allOrders, setAllOrders] = useState<OrderRecord[]>(() => {
    const today = getLocalDateString(0);
    const seedDateById = new Map(
      INITIAL_CUSTOMER_ORDERS.map((o) => [o.orderId, o.placedDate || today])
    );
    try {
      const saved = localStorage.getItem('fishmeatstore_all_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized: OrderRecord[] = parsed.map((ord: OrderRecord) => ({
            ...ord,
            placedDate: ord.placedDate || seedDateById.get(ord.orderId) || today,
          }));
          const hasPastOrder = normalized.some((o) => o.placedDate && o.placedDate !== today);
          if (!hasPastOrder) {
            const existingIds = new Set(normalized.map((o) => o.orderId));
            const pastSeeds = INITIAL_CUSTOMER_ORDERS.filter(
              (o) => o.placedDate && o.placedDate !== today && !existingIds.has(o.orderId)
            );
            return [...normalized, ...pastSeeds];
          }
          return normalized;
        }
      }
    } catch (e) {
      console.warn('Failed reading all orders from localStorage', e);
    }
    return INITIAL_CUSTOMER_ORDERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_all_orders', JSON.stringify(allOrders));
    } catch (e) {
      console.warn('Failed saving all orders', e);
    }
  }, [allOrders]);

  const allOrdersRef = useRef<OrderRecord[]>(allOrders);
  useEffect(() => {
    allOrdersRef.current = allOrders;
  }, [allOrders]);

  // Guest Customer Directory & Auto-Sequence Counter (Guest 1, Guest 2, ..., Guest N)
  const [guestCustomers, setGuestCustomers] = useState<GuestCustomerRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fishmeatstore_guest_customers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed reading guest customers from localStorage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_guest_customers', JSON.stringify(guestCustomers));
    } catch (e) {
      console.warn('Failed saving guest customers', e);
    }
  }, [guestCustomers]);

  const guestCustomersRef = useRef<GuestCustomerRecord[]>(guestCustomers);
  useEffect(() => {
    guestCustomersRef.current = guestCustomers;
  }, [guestCustomers]);

  const guestSequenceRef = useRef<number>((() => {
    let stored = 0;
    try {
      const raw = localStorage.getItem('fishmeatstore_guest_sequence');
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 0) stored = Math.floor(n);
      }
    } catch {
      // ignore
    }
    return stored;
  })());

  const persistGuestSequenceLocal = (nextCount: number) => {
    guestSequenceRef.current = nextCount;
    try {
      localStorage.setItem('fishmeatstore_guest_sequence', String(nextCount));
    } catch {
      // ignore storage errors
    }
  };

  const persistGuestCustomerToFirestore = async (
    guest: GuestCustomerRecord,
    advanceCounterTo?: number
  ) => {
    const phone10 = normalizePhone10(guest.phone10 || guest.id);
    if (!isValidGuestPhone10(phone10)) return;

    const guestPath = `guestCustomers/${phone10}`;
    try {
      const existingSnap = await getDoc(doc(db, 'guestCustomers', phone10));
      let mergedGuest = guest;
      let existingCreatedAt: unknown = undefined;

      if (existingSnap.exists()) {
        const raw = existingSnap.data() as Record<string, unknown>;
        existingCreatedAt = raw.createdAt;
        const remoteGuest = hydrateGuestCustomerFromFirestore(raw, productsRef.current);

        // Preserve any remote recentOrders not in local snapshot & prioritize latest local order updates
        const localById = new Map((guest.recentOrders || []).map((o) => [o.orderId, o]));
        const remoteOnlyOrders = (remoteGuest.recentOrders || []).filter(
          (o) => !localById.has(o.orderId)
        );
        const mergedRecentOrders = [...(guest.recentOrders || []), ...remoteOnlyOrders].slice(0, 20);
        const mergedOrderIds = Array.from(
          new Set([...(guest.orderIds || []), ...(remoteGuest.orderIds || [])])
        ).slice(0, 50);
        const mergedAddresses = Array.from(
          new Set([...(guest.addresses || []), ...(remoteGuest.addresses || [])].filter(Boolean))
        ).slice(0, 20);
        const totalSpent = mergedRecentOrders.reduce(
          (sum, o) => (o.status === 'cancelled' ? sum : sum + (Number(o.total) || 0)),
          0
        );

        mergedGuest = {
          ...remoteGuest,
          ...guest,
          name: guest.isAutoNamedGuest && !remoteGuest.isAutoNamedGuest
            ? remoteGuest.name
            : guest.name,
          isAutoNamedGuest: guest.isAutoNamedGuest && !remoteGuest.isAutoNamedGuest
            ? false
            : guest.isAutoNamedGuest,
          guestNumber: guest.guestNumber ?? remoteGuest.guestNumber,
          addresses: mergedAddresses,
          orderIds: mergedOrderIds,
          recentOrders: mergedRecentOrders,
          ordersCount: Math.max(mergedOrderIds.length, guest.ordersCount),
          totalSpent: Math.max(totalSpent, 0),
          loyaltyPoints:
            typeof guest.loyaltyPoints === 'number'
              ? guest.loyaltyPoints
              : remoteGuest.loyaltyPoints ?? 0,
          totalLoyaltyEarned: Math.max(
            Number(guest.totalLoyaltyEarned) || 0,
            Number(remoteGuest.totalLoyaltyEarned) || 0
          ),
          totalLoyaltyRedeemed: Math.max(
            Number(guest.totalLoyaltyRedeemed) || 0,
            Number(remoteGuest.totalLoyaltyRedeemed) || 0
          ),
        };
      }

      await setDoc(
        doc(db, 'guestCustomers', phone10),
        serializeGuestCustomerForFirestore(mergedGuest, existingCreatedAt)
      );
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, guestPath);
      } catch {
        // Structured error logged via handleFirestoreError
      }
    }

    if (typeof advanceCounterTo === 'number' && Number.isFinite(advanceCounterTo)) {
      const counterPath = 'guestCounters/sequence';
      try {
        const counterSnap = await getDoc(doc(db, 'guestCounters', 'sequence'));
        const remoteCount = counterSnap.exists() ? Number(counterSnap.data()?.count) || 0 : 0;
        const safeNext = Math.max(remoteCount, Math.round(advanceCounterTo));
        persistGuestSequenceLocal(safeNext);
        await setDoc(doc(db, 'guestCounters', 'sequence'), {
          count: safeNext,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, counterPath);
        } catch {
          // Structured error logged
        }
      }
    }
  };

  const syncGuestOrderMutation = (updatedOrder: OrderRecord) => {
    const phone10 = normalizePhone10(updatedOrder.contactPhone);
    if (!isValidGuestPhone10(phone10)) return;

    const existingGuest = guestCustomersRef.current.find(
      (g) => g.phone10 === phone10 || g.orderIds.includes(updatedOrder.orderId)
    );

    if (existingGuest) {
      const hasOrder = existingGuest.recentOrders.some(
        (o) => o.orderId === updatedOrder.orderId
      );
      const nextRecentOrders = hasOrder
        ? existingGuest.recentOrders.map((o) =>
            o.orderId === updatedOrder.orderId ? updatedOrder : o
          )
        : [updatedOrder, ...existingGuest.recentOrders].slice(0, 20);
      const nextOrderIds = Array.from(
        new Set([updatedOrder.orderId, ...existingGuest.orderIds])
      ).slice(0, 50);
      const nextTotalSpent = nextRecentOrders.reduce(
        (sum, o) => (o.status === 'cancelled' ? sum : sum + (Number(o.total) || 0)),
        0
      );
      const updatedGuest: GuestCustomerRecord = {
        ...existingGuest,
        orderIds: nextOrderIds,
        recentOrders: nextRecentOrders,
        ordersCount: Math.max(nextOrderIds.length, existingGuest.ordersCount),
        totalSpent: nextTotalSpent,
      };
      setGuestCustomers((prev) =>
        prev.map((g) => (g.phone10 === existingGuest.phone10 ? updatedGuest : g))
      );
      void persistGuestCustomerToFirestore(updatedGuest);
    } else {
      // Guest record exists on another device or store incharge session: update Firestore snapshot if doc exists
      void (async () => {
        try {
          const snap = await getDoc(doc(db, 'guestCustomers', phone10));
          if (!snap.exists()) return;
          const raw = snap.data() as Record<string, unknown>;
          const remoteGuest = hydrateGuestCustomerFromFirestore(raw, productsRef.current);
          const hasOrder = remoteGuest.recentOrders.some(
            (o) => o.orderId === updatedOrder.orderId
          );
          const nextRecentOrders = hasOrder
            ? remoteGuest.recentOrders.map((o) =>
                o.orderId === updatedOrder.orderId ? updatedOrder : o
              )
            : [updatedOrder, ...remoteGuest.recentOrders].slice(0, 20);
          const nextOrderIds = Array.from(
            new Set([updatedOrder.orderId, ...remoteGuest.orderIds])
          ).slice(0, 50);
          const nextTotalSpent = nextRecentOrders.reduce(
            (sum, o) => (o.status === 'cancelled' ? sum : sum + (Number(o.total) || 0)),
            0
          );
          const updatedRemoteGuest: GuestCustomerRecord = {
            ...remoteGuest,
            orderIds: nextOrderIds,
            recentOrders: nextRecentOrders,
            ordersCount: Math.max(nextOrderIds.length, remoteGuest.ordersCount),
            totalSpent: nextTotalSpent,
          };
          await setDoc(
            doc(db, 'guestCustomers', phone10),
            serializeGuestCustomerForFirestore(updatedRemoteGuest, raw.createdAt)
          );
        } catch {
          // Ignore silent background sync errors when doc doesn't exist
        }
      })();
    }
  };

  // Cross-tab sync for incoming customer orders & Admin/Store Incharge status updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fishmeatstore_all_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const today = getLocalDateString(0);
            const normalized: OrderRecord[] = parsed.map((ord: OrderRecord) => ({
              ...ord,
              placedDate: ord.placedDate || today,
            }));
            const orderById = new Map(normalized.map((o) => [o.orderId, o]));
            setAllOrders(normalized);
            setActiveOrder((prev) =>
              prev && orderById.has(prev.orderId) ? orderById.get(prev.orderId)! : prev
            );
            setCurrentUser((prev) => {
              if (!prev || !prev.pastOrders) return prev;
              return {
                ...prev,
                pastOrders: prev.pastOrders.map((ord) =>
                  orderById.has(ord.orderId) ? orderById.get(ord.orderId)! : ord
                ),
              };
            });
          }
        } catch (err) {
          console.warn('Failed syncing orders from storage event', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [requestedControlRoomNav, setRequestedControlRoomNav] = useState<
    'realtime_stock' | 'customer_orders' | 'reports' | null
  >(null);

  const clearRequestedControlRoomNav = () => setRequestedControlRoomNav(null);

  const openControlRoomCustomerOrders = () => {
    setRequestedControlRoomNav('customer_orders');
    setIsAdminDashboardOpen(true);
  };

  const openControlRoomReports = () => {
    setRequestedControlRoomNav('reports');
    setIsAdminDashboardOpen(true);
  };

  const isAuthorizedStaffForOrderUpdate = () =>
    Boolean(
      adminUser &&
        (adminUser.role === 'Admin' ||
          adminUser.role === 'Store Admin' ||
          adminUser.role === 'Store Incharge' ||
          adminUser.role === 'Store Operations Manager')
    ) ||
    firebaseRole === 'admin' ||
    firebaseRole === 'staff';

  const updateOrderStatus = (orderId: string, status: OrderRecord['status']) => {
    if (!isAuthorizedStaffForOrderUpdate()) {
      return;
    }

    const patchOrder = (ord: OrderRecord): OrderRecord => ({ ...ord, status });
    const existingTarget = allOrdersRef.current.find((ord) => ord.orderId === orderId);

    setAllOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? patchOrder(ord) : ord))
    );
    setActiveOrder((prev) =>
      prev && prev.orderId === orderId ? patchOrder(prev) : prev
    );
    setRegisteredUsers((prev) =>
      prev.map((user) => ({
        ...user,
        pastOrders: user.pastOrders?.map((ord) =>
          ord.orderId === orderId ? patchOrder(ord) : ord
        ),
      }))
    );
    setCurrentUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pastOrders: prev.pastOrders?.map((ord) =>
          ord.orderId === orderId ? patchOrder(ord) : ord
        ),
      };
    });

    if (existingTarget) {
      syncGuestOrderMutation(patchOrder(existingTarget));
    }

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      (firebaseRole === 'admin' || firebaseRole === 'staff') &&
      firestoreOrderIdsRef.current.has(orderId)
    ) {
      const orderPath = `orders/${orderId}`;
      const statusPromise = updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
      })
        .catch((err) => {
          try {
            handleFirestoreError(err, OperationType.UPDATE, orderPath);
          } catch {
            // Structured error logged via handleFirestoreError
          }
        })
        .finally(() => {
          if (inFlightOrderStatusUpdatesRef.current.get(orderId) === statusPromise) {
            inFlightOrderStatusUpdatesRef.current.delete(orderId);
          }
        });
      inFlightOrderStatusUpdatesRef.current.set(orderId, statusPromise);
    }
  };

  const acceptOrder = (orderId: string) => {
    if (!isAuthorizedStaffForOrderUpdate()) {
      return;
    }

    const acceptedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const acceptorName = truncateStr(adminUser?.name || firebaseUser?.displayName || 'Store Incharge', 100);
    const applyAccept = (ord: OrderRecord): OrderRecord => ({
      ...ord,
      status: ord.status === 'confirmed' ? 'allocated' : ord.status,
      acceptedAt: ord.acceptedAt || acceptedTime,
      acceptedBy: ord.acceptedBy || acceptorName,
    });
    const existingTarget = allOrdersRef.current.find((ord) => ord.orderId === orderId);

    setAllOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? applyAccept(ord) : ord))
    );
    setActiveOrder((prev) =>
      prev && prev.orderId === orderId ? applyAccept(prev) : prev
    );
    setRegisteredUsers((prev) =>
      prev.map((user) => ({
        ...user,
        pastOrders: user.pastOrders?.map((ord) =>
          ord.orderId === orderId ? applyAccept(ord) : ord
        ),
      }))
    );
    setCurrentUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pastOrders: prev.pastOrders?.map((ord) =>
          ord.orderId === orderId ? applyAccept(ord) : ord
        ),
      };
    });

    if (existingTarget) {
      syncGuestOrderMutation(applyAccept(existingTarget));
    }

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      (firebaseRole === 'admin' || firebaseRole === 'staff') &&
      firestoreOrderIdsRef.current.has(orderId)
    ) {
      const orderPath = `orders/${orderId}`;
      const acceptPromise = updateDoc(doc(db, 'orders', orderId), {
        status: 'allocated',
        acceptedAt: truncateStr(acceptedTime, 40),
        acceptedBy: acceptorName,
        updatedAt: serverTimestamp(),
      })
        .catch((err) => {
          try {
            handleFirestoreError(err, OperationType.UPDATE, orderPath);
          } catch {
            // Structured error logged via handleFirestoreError
          }
        })
        .finally(() => {
          if (inFlightOrderStatusUpdatesRef.current.get(orderId) === acceptPromise) {
            inFlightOrderStatusUpdatesRef.current.delete(orderId);
          }
        });
      inFlightOrderStatusUpdatesRef.current.set(orderId, acceptPromise);
    }
  };

  const updateOrderFinalWeights = async (
    orderId: string,
    finalWeightsByIndex: Record<number, number>,
    finalLineTotalsByIndex?: Record<number, number>
  ): Promise<boolean> => {
    if (!isAuthorizedStaffForOrderUpdate()) {
      return false;
    }

    const targetOrder =
      allOrdersRef.current.find((o) => o.orderId === orderId) ||
      allOrders.find((o) => o.orderId === orderId);
    if (!targetOrder) {
      return false;
    }
    if (
      targetOrder.status === 'confirmed' ||
      targetOrder.status === 'cancelled' ||
      targetOrder.status === 'delivered'
    ) {
      return false;
    }

    const updatedAt = truncateStr(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      40
    );
    const updatedBy = truncateStr(
      adminUser?.name || firebaseUser?.displayName || 'Store Incharge',
      100
    );

    const updatedOrder = recalculateOrderWithFinalWeights(
      targetOrder,
      finalWeightsByIndex,
      updatedBy,
      updatedAt,
      finalLineTotalsByIndex
    );

    const oldEarned = getOrderLoyaltyEarned(targetOrder);
    const newEarned = getOrderLoyaltyEarned(updatedOrder);
    const earnedDelta = newEarned - oldEarned;

    const applyUpdate = (ord: OrderRecord): OrderRecord =>
      ord.orderId === orderId ? updatedOrder : ord;

    setAllOrders((prev) => prev.map(applyUpdate));
    setActiveOrder((prev) => (prev && prev.orderId === orderId ? updatedOrder : prev));
    setRegisteredUsers((prev) =>
      prev.map((user) => {
        const hasOrd =
          user.pastOrders?.some((o) => o.orderId === orderId) ||
          user.id === targetOrder.customerUid;
        return {
          ...user,
          loyaltyPoints:
            hasOrd && earnedDelta !== 0
              ? Math.max(0, (user.loyaltyPoints ?? 0) + earnedDelta)
              : user.loyaltyPoints,
          totalLoyaltyEarned:
            hasOrd && earnedDelta !== 0
              ? Math.max(0, (user.totalLoyaltyEarned ?? 0) + earnedDelta)
              : user.totalLoyaltyEarned,
          pastOrders: user.pastOrders?.map(applyUpdate),
        };
      })
    );
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const matchesUser =
        prev.id === targetOrder.customerUid ||
        Boolean(prev.pastOrders?.some((o) => o.orderId === orderId)) ||
        (Boolean(normalizePhone10(prev.phone)) &&
          normalizePhone10(prev.phone) === normalizePhone10(targetOrder.contactPhone));
      return {
        ...prev,
        loyaltyPoints:
          matchesUser && earnedDelta !== 0
            ? Math.max(0, (prev.loyaltyPoints ?? 0) + earnedDelta)
            : prev.loyaltyPoints,
        totalLoyaltyEarned:
          matchesUser && earnedDelta !== 0
            ? Math.max(0, (prev.totalLoyaltyEarned ?? 0) + earnedDelta)
            : prev.totalLoyaltyEarned,
        pastOrders: prev.pastOrders?.map(applyUpdate),
      };
    });

    syncGuestOrderMutation(updatedOrder);

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      (firebaseRole === 'admin' || firebaseRole === 'staff') &&
      isValidFirestoreId(orderId)
    ) {
      // Wait for any in-flight accept/status transition on this order so Firestore rules see the latest status
      const pendingStatus = inFlightOrderStatusUpdatesRef.current.get(orderId);
      if (pendingStatus) {
        try {
          await pendingStatus;
        } catch {
          // Non-fatal
        }
      }

      let existsInFirestore = firestoreOrderIdsRef.current.has(orderId);
      if (!existsInFirestore) {
        try {
          const snap = await getDoc(doc(db, 'orders', orderId));
          if (snap.exists()) {
            firestoreOrderIdsRef.current.add(orderId);
            existsInFirestore = true;
          }
        } catch {
          existsInFirestore = false;
        }
      }

      if (existsInFirestore) {
        const orderPath = `orders/${orderId}`;
        const updatePayload: Record<string, unknown> = {
          items: serializeOrderItemsForFirestore(updatedOrder.items),
          subtotal: Math.max(0, Math.min(500000, Number(updatedOrder.subtotal) || 0)),
          total: Math.max(0, Math.min(505000, Number(updatedOrder.total) || 0)),
          loyaltyPointsEarned: Math.max(0, Math.min(100000, Math.floor(newEarned))),
          originalSubtotal: Math.max(
            0,
            Math.min(500000, Number(updatedOrder.originalSubtotal) || 0)
          ),
          originalTotal: Math.max(0, Math.min(505000, Number(updatedOrder.originalTotal) || 0)),
          weightUpdatedAt: updatedAt,
          weightUpdatedBy: updatedBy,
          updatedAt: serverTimestamp(),
        };
        if (typeof updatedOrder.loyaltyDiscountAmount === 'number') {
          updatePayload.loyaltyDiscountAmount = Math.max(
            0,
            Math.min(500000, Math.round(updatedOrder.loyaltyDiscountAmount))
          );
        }

        try {
          await updateDoc(doc(db, 'orders', orderId), updatePayload);
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.UPDATE, orderPath);
          } catch {
            // Structured error already logged via handleFirestoreError
          }
          // Return true only if error was not-found; surface failure if Firestore rejected a real cloud order
          const errCode = (err as { code?: string } | null)?.code;
          if (errCode !== 'not-found') {
            return false;
          }
        }
      }
    }

    return true;
  };

  // Admin Feature Toggles & Services (persisted to localStorage & Firestore)
  const [featureFlags, setFeatureFlags] = useState<StoreFeatureFlags>(() => {
    const defaults: StoreFeatureFlags = {
      enableOtherPayments: false,
      sendWhatsAppOnOrderConfirmation: true,
    };
    try {
      const saved = localStorage.getItem('fishmeatstore_feature_flags');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      }
    } catch (e) {
      console.warn('Failed reading feature flags from localStorage', e);
    }
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_feature_flags', JSON.stringify(featureFlags));
    } catch (e) {
      console.warn('Failed saving feature flags', e);
    }
  }, [featureFlags]);

  const persistFeatureFlagsToFirestore = (nextFlags: StoreFeatureFlags) => {
    if (firebaseUser && firebaseUser.emailVerified && firebaseRole === 'admin') {
      const configPath = 'storeConfig/features';
      void setDoc(doc(db, 'storeConfig', 'features'), {
        enableOtherPayments: Boolean(nextFlags.enableOtherPayments),
        sendWhatsAppOnOrderConfirmation: Boolean(nextFlags.sendWhatsAppOnOrderConfirmation),
        updatedBy: firebaseUser.uid,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, configPath);
      });
    }
  };

  const toggleFeatureFlag = (key: keyof StoreFeatureFlags) => {
    setFeatureFlags((prev) => {
      const next = {
        ...prev,
        [key]: !prev[key],
      };
      persistFeatureFlagsToFirestore(next);
      return next;
    });
  };

  const updateFeatureFlags = (updates: Partial<StoreFeatureFlags>) => {
    setFeatureFlags((prev) => {
      const next = {
        ...prev,
        ...updates,
      };
      persistFeatureFlagsToFirestore(next);
      return next;
    });
  };

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Initial friendly sample cart item to show real experience
    const initialProd = PRODUCTS[0];
    const initialWeight: WeightVariant =
      initialProd.availableWeights && !initialProd.availableWeights.includes('500g')
        ? initialProd.availableWeights[0]
        : '500g';
    return [
      {
        id: `${initialProd.id}-${initialWeight}`,
        productId: initialProd.id,
        product: initialProd,
        selectedWeight: initialWeight,
        unitPrice: initialProd.variants[initialWeight].price,
        quantity: 1,
        cuttingPreference: 'Curry Cut',
        customNotes: 'Clean well and pack in cold vacuum pouch',
      },
    ];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Delivery
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>(DELIVERY_SLOTS[0]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);

  // Lead Captures for out of area
  const [leadCaptures, setLeadCaptures] = useState<LeadCapture[]>([]);
  const [leadSubmittedSuccess, setLeadSubmittedSuccess] = useState(false);

  // Architecture Specs modal
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  // Default pre-seeded demo user
  const DEFAULT_DEMO_USERS: CustomerUser[] = [
    {
      id: 'cust-demo-1',
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      password: 'Password123!',
      phone: '+91 98765 43210',
      addresses: ['Flat 402, Tower B, Godrej Woodscapes, Budigere Cross, Bengaluru - 560049'],
      savedAddresses: [
        {
          id: 'addr-demo-home',
          label: 'Home',
          recipientName: 'Rahul Sharma',
          recipientPhone: '+91 98765 43210',
          flatBuilding: 'Flat 402, Tower B, Godrej Woodscapes',
          streetArea: 'Budigere Cross, Bommenahalli',
          landmark: 'Opposite Shell Fuel Station',
          city: 'Bengaluru',
          pincode: '560049',
          isDefault: true,
          latitude: 13.044,
          longitude: 77.7445,
          formattedAddress: 'Flat 402, Tower B, Godrej Woodscapes, Budigere Cross, Bengaluru - 560049',
        },
        {
          id: 'addr-demo-work',
          label: 'Work',
          recipientName: 'Rahul Sharma',
          recipientPhone: '+91 98765 43210',
          flatBuilding: 'Suite 210, Brigade Signature Towers',
          streetArea: 'Old Madras Road, Kattugol',
          landmark: 'Near Budigere Toll Gate',
          city: 'Bengaluru',
          pincode: '560049',
          isDefault: false,
          latitude: 13.038,
          longitude: 77.738,
          formattedAddress: 'Suite 210, Brigade Signature Towers, Old Madras Road, Bengaluru - 560049',
        },
      ],
      savedOrdersCount: 4,
      walletBalance: WELCOME_FRESH_WALLET_CREDIT_INR,
      loyaltyPoints: 185,
      totalLoyaltyEarned: 185,
      totalLoyaltyRedeemed: 0,
      memberSince: 'Nov 2024',
      preferredCut: 'Small Curry Cut, Descaled',
      pastOrderProductIds: [
        'fish-freshwater-rohu',
        'fish-freshwater-catla',
        'chk-without-skin',
        'fish-seawater-kingfish',
      ],
      wishlistProductIds: ['fish-seawater-kingfish', 'chk-curry-cut-skinless'],
      wishlistPreferences: {
        'fish-seawater-kingfish': {
          weight: '500g',
          cuttingStyle: 'Cleaned Bone-In Steaks',
        },
        'chk-curry-cut-skinless': {
          weight: '1kg',
          cuttingStyle: 'Standard Medium Curry Cut',
        },
      },
    },
  ];

  // Registered accounts stored in localStorage
  const [registeredUsers, setRegisteredUsers] = useState<CustomerUser[]>(() => {
    try {
      const saved = localStorage.getItem('fishmeatstore_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: CustomerUser) => {
            const nextWalletBalance =
              typeof u.walletBalance !== 'number' || !Number.isFinite(u.walletBalance)
                ? WELCOME_FRESH_WALLET_CREDIT_INR
                : u.id === 'cust-demo-1' && u.walletBalance === 250
                ? WELCOME_FRESH_WALLET_CREDIT_INR
                : u.walletBalance;
            if (typeof u.loyaltyPoints === 'number') {
              return nextWalletBalance === u.walletBalance ? u : { ...u, walletBalance: nextWalletBalance };
            }
            const defaultPts = u.id === 'cust-demo-1' ? 185 : WELCOME_LOYALTY_POINTS;
            return {
              ...u,
              walletBalance: nextWalletBalance,
              loyaltyPoints: defaultPts,
              totalLoyaltyEarned: u.totalLoyaltyEarned ?? defaultPts,
              totalLoyaltyRedeemed: u.totalLoyaltyRedeemed ?? 0,
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed reading users from localStorage', e);
    }
    return DEFAULT_DEMO_USERS;
  });

  // Sync registered users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_users', JSON.stringify(registeredUsers));
    } catch (e) {
      console.warn('Failed saving registered users', e);
    }
  }, [registeredUsers]);

  // Active logged-in user
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(() => {
    try {
      const isExplicitlyLoggedOut = localStorage.getItem('fishmeatstore_logged_out') === 'true';
      if (isExplicitlyLoggedOut) return null;

      const saved = localStorage.getItem('fishmeatstore_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          if (!parsed.pastOrderProductIds && parsed.id === 'cust-demo-1') {
            parsed.pastOrderProductIds = [
              'fish-freshwater-rohu',
              'fish-freshwater-catla',
              'chk-without-skin',
              'fish-seawater-kingfish',
            ];
          }
          if (parsed.wishlistProductIds === undefined && parsed.id === 'cust-demo-1') {
            parsed.wishlistProductIds = ['fish-seawater-kingfish', 'chk-curry-cut-skinless'];
            parsed.wishlistPreferences = {
              'fish-seawater-kingfish': {
                weight: '500g',
                cuttingStyle: 'Cleaned Bone-In Steaks',
              },
              'chk-curry-cut-skinless': {
                weight: '1kg',
                cuttingStyle: 'Standard Medium Curry Cut',
              },
            };
          }
          if (
            typeof parsed.walletBalance !== 'number' ||
            !Number.isFinite(parsed.walletBalance) ||
            (parsed.id === 'cust-demo-1' && parsed.walletBalance === 250)
          ) {
            parsed.walletBalance = WELCOME_FRESH_WALLET_CREDIT_INR;
          }
          if (typeof parsed.loyaltyPoints !== 'number') {
            const defaultPts = parsed.id === 'cust-demo-1' ? 185 : WELCOME_LOYALTY_POINTS;
            parsed.loyaltyPoints = defaultPts;
            parsed.totalLoyaltyEarned = parsed.totalLoyaltyEarned ?? defaultPts;
            parsed.totalLoyaltyRedeemed = parsed.totalLoyaltyRedeemed ?? 0;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed reading active user from localStorage', e);
    }
    return null;
  });

  // Sync active user to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('fishmeatstore_active_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('fishmeatstore_active_user');
      }
    } catch (e) {
      console.warn('Failed saving active user', e);
    }
  }, [currentUser]);

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('fishmeatstore_admin_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.workEmail) return parsed;
      }
    } catch (e) {
      console.warn('Failed reading admin user from localStorage', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      if (adminUser) {
        localStorage.setItem('fishmeatstore_admin_user', JSON.stringify(adminUser));
      } else {
        localStorage.removeItem('fishmeatstore_admin_user');
      }
    } catch (e) {
      console.warn('Failed saving admin user', e);
    }
  }, [adminUser]);

  const pendingIncomingOrders = useMemo(() => {
    const incoming = allOrders.filter((ord) => ord.status === 'confirmed');
    if (adminUser?.role === 'Store Admin' && adminUser.assignedStoreId) {
      return incoming.filter((ord) => ord.store.id === adminUser.assignedStoreId);
    }
    return incoming;
  }, [allOrders, adminUser]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [profileDefaultTab, setProfileDefaultTab] = useState<
    'profile' | 'loyalty' | 'wishlist' | 'addresses' | 'orders' | 'subscriptions'
  >('profile');
  const [authInitialTab, setAuthInitialTab] = useState<'customer' | 'admin'>('customer');
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState<{ message: string; type: 'error' | 'info' } | null>(
    null
  );

  const showAuthNotice = (message: string, type: 'error' | 'info' = 'error') => {
    setAuthNotice({ message, type });
    setTimeout(() => {
      setAuthNotice((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  const dismissAuthNotice = () => setAuthNotice(null);

  const userRole: AppRole = useMemo(() => {
    if (adminUser) {
      return adminUser.appRole || normalizeAppRole(adminUser.role);
    }
    if (firebaseRole === 'admin') return 'admin';
    if (firebaseRole === 'staff') return 'store_incharge';
    if (currentUser?.role) return currentUser.role;
    if (currentUser?.customerType) return normalizeAppRole(currentUser.customerType);
    return 'customer';
  }, [adminUser, firebaseRole, currentUser]);

  // Wishlist UI & Pending-Login Action State
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [pendingWishlistAction, setPendingWishlistAction] = useState<{
    productId: string;
    prefs?: WishlistItemPreference;
  } | null>(null);
  const [wishlistNotice, setWishlistNotice] = useState<{
    message: string;
    type: 'added' | 'removed' | 'auth' | 'reordered';
  } | null>(null);

  const showWishlistNotice = (
    message: string,
    type: 'added' | 'removed' | 'auth' | 'reordered' = 'added'
  ) => {
    setWishlistNotice({ message, type });
    setTimeout(() => {
      setWishlistNotice((prev) => (prev?.message === message ? null : prev));
    }, 3000);
  };

  const dismissWishlistNotice = () => setWishlistNotice(null);

  const applyPendingWishlistToUser = (user: CustomerUser): CustomerUser => {
    if (!pendingWishlistAction) return user;
    const { productId, prefs } = pendingWishlistAction;
    const existingIds = user.wishlistProductIds || [];
    const nextIds = existingIds.includes(productId) ? existingIds : [productId, ...existingIds];
    const nextPrefs = {
      ...(user.wishlistPreferences || {}),
      [productId]: {
        ...(user.wishlistPreferences?.[productId] || {}),
        ...(prefs || {}),
        savedAt: new Date().toISOString(),
      },
    };
    setPendingWishlistAction(null);
    const prod = products.find((p) => p.id === productId);
    showWishlistNotice(
      prod ? `Saved "${prod.name}" to your Wishlist` : 'Saved cut to your Wishlist',
      'added'
    );
    return {
      ...user,
      wishlistProductIds: nextIds,
      wishlistPreferences: nextPrefs,
    };
  };

  const pendingWishlistProduct = useMemo(() => {
    if (!pendingWishlistAction) return null;
    return products.find((p) => p.id === pendingWishlistAction.productId) || null;
  }, [pendingWishlistAction, products]);

  const loginCustomerWithOtp = async (phone: string): Promise<{ role: AppRole }> => {
    try {
      localStorage.removeItem('fishmeatstore_logged_out');
    } catch {
      // ignore storage errors
    }

    const phone10 = normalizePhone10(phone);
    const existingRegistered = registeredUsers.find(
      (u) => normalizePhone10(u.phone) === phone10
    );

    let localGuest = guestCustomersRef.current.find((g) => g.phone10 === phone10) || null;
    let remoteGuest: GuestCustomerRecord | null = null;

    if (isValidGuestPhone10(phone10)) {
      try {
        const snap = await getDoc(doc(db, 'guestCustomers', phone10));
        if (snap.exists()) {
          remoteGuest = hydrateGuestCustomerFromFirestore(
            snap.data() as Record<string, unknown>,
            productsRef.current
          );
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.GET, `guestCustomers/${phone10}`);
        } catch {
          // Structured error logged cleanly
        }
      }
    }

    // Merge remote & local guest snapshots if present
    let resolvedGuest: GuestCustomerRecord | null = null;
    if (remoteGuest && localGuest) {
      const remoteMap = new Map((remoteGuest.recentOrders || []).map((o) => [o.orderId, o]));
      const mergedOrdersMap = new Map<string, OrderRecord>();
      localGuest.recentOrders.forEach((o) => mergedOrdersMap.set(o.orderId, o));
      remoteGuest.recentOrders.forEach((o) => {
        mergedOrdersMap.set(o.orderId, o);
      });
      const mergedOrders = Array.from(mergedOrdersMap.values()).slice(0, 20);
      resolvedGuest = {
        ...localGuest,
        ...remoteGuest,
        name:
          remoteGuest.isAutoNamedGuest && !localGuest.isAutoNamedGuest
            ? localGuest.name
            : remoteGuest.name,
        isAutoNamedGuest: remoteGuest.isAutoNamedGuest && localGuest.isAutoNamedGuest,
        guestNumber: remoteGuest.guestNumber ?? localGuest.guestNumber,
        addresses: Array.from(
          new Set([...(remoteGuest.addresses || []), ...(localGuest.addresses || [])].filter(Boolean))
        ).slice(0, 20),
        orderIds: Array.from(
          new Set([...(remoteGuest.orderIds || []), ...(localGuest.orderIds || []), ...remoteMap.keys()])
        ).slice(0, 50),
        recentOrders: mergedOrders,
        ordersCount: Math.max(remoteGuest.ordersCount, localGuest.ordersCount, mergedOrders.length),
      };
    } else {
      resolvedGuest = remoteGuest || localGuest;
    }

    if (resolvedGuest) {
      setGuestCustomers((prev) => {
        const exists = prev.some((g) => g.phone10 === resolvedGuest!.phone10);
        return exists
          ? prev.map((g) => (g.phone10 === resolvedGuest!.phone10 ? resolvedGuest! : g))
          : [resolvedGuest!, ...prev];
      });
    }

    // Collect all orders matching this phone across local allOrders, remote/local guest, and registered user
    const localMatchingOrders = allOrdersRef.current.filter(
      (o) => normalizePhone10(o.contactPhone) === phone10
    );
    const mergedOrdersMap = new Map<string, OrderRecord>();
    (existingRegistered?.pastOrders || []).forEach((o) => mergedOrdersMap.set(o.orderId, o));
    localMatchingOrders.forEach((o) => mergedOrdersMap.set(o.orderId, o));
    (resolvedGuest?.recentOrders || []).forEach((o) => {
      // Remote guest snapshot reflects store updates made on other devices
      if (!mergedOrdersMap.has(o.orderId) || remoteGuest) {
        mergedOrdersMap.set(o.orderId, o);
      }
    });

    const combinedOrders = Array.from(mergedOrdersMap.values());

    if (remoteGuest && remoteGuest.recentOrders.length > 0) {
      const remoteOrderMap = new Map(remoteGuest.recentOrders.map((o) => [o.orderId, o]));
      setAllOrders((prev) => {
        const existingIds = new Set(prev.map((o) => o.orderId));
        const updatedExisting = prev.map((o) =>
          remoteOrderMap.has(o.orderId) ? remoteOrderMap.get(o.orderId)! : o
        );
        const remoteNew = remoteGuest!.recentOrders.filter((o) => !existingIds.has(o.orderId));
        return [...remoteNew, ...updatedExisting];
      });
    }

    if (existingRegistered) {
      const existingRole: AppRole =
        existingRegistered.role || normalizeAppRole(existingRegistered.customerType);
      const finalRegistered: CustomerUser = applyPendingWishlistToUser({
        ...existingRegistered,
        role: existingRole,
        pastOrders: combinedOrders.length > 0 ? combinedOrders : existingRegistered.pastOrders,
        savedOrdersCount: Math.max(
          existingRegistered.savedOrdersCount || 0,
          combinedOrders.length
        ),
      });
      setCurrentUser(finalRegistered);
      setRegisteredUsers((prev) =>
        prev.map((u) => (u.id === finalRegistered.id ? finalRegistered : u))
      );
      setIsAuthModalOpen(false);
      if (combinedOrders.length > 0) {
        setProfileDefaultTab('orders');
        setIsCustomerProfileOpen(true);
      }
      return { role: existingRole };
    }

    const resolvedName =
      resolvedGuest?.name || combinedOrders[0]?.contactName || 'Valued Customer';
    const addressStrings = Array.from(
      new Set(
        [
          ...(resolvedGuest?.addresses || []),
          resolvedGuest?.address || '',
          ...combinedOrders.map((o) => o.deliveryAddress),
        ].filter(Boolean)
      )
    );

    const savedAddresses: SavedAddress[] =
      addressStrings.length > 0
        ? addressStrings.map((addrStr, idx) => ({
            id: `addr-guest-${phone10}-${idx}`,
            label: idx === 0 ? 'Home' : 'Other',
            recipientName: resolvedName,
            recipientPhone: phone,
            flatBuilding: addrStr,
            streetArea: resolvedGuest?.storeName || activeStore.neighborhood,
            landmark: '',
            city: activeStore.city || 'Bengaluru',
            pincode: '560049',
            isDefault: idx === 0,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            formattedAddress: addrStr,
          }))
        : [
            {
              id: `addr-${Date.now()}`,
              label: 'Home',
              recipientName: resolvedName,
              recipientPhone: phone,
              flatBuilding: 'Flat 101, Prestige Tranquility',
              streetArea: userLocation.neighborhood || 'Budigere Cross',
              landmark: 'Near Store Chiller',
              city: 'Bengaluru',
              pincode: '560049',
              isDefault: true,
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              formattedAddress: userLocation.address,
            },
          ];

    const isGuestCustomer = Boolean(resolvedGuest || combinedOrders.length > 0);
    const derivedEarnedFromOrders = combinedOrders.reduce(
      (sum, o) => sum + getOrderLoyaltyEarned(o),
      0
    );
    const derivedRedeemedFromOrders = combinedOrders.reduce(
      (sum, o) => (o.status === 'cancelled' ? sum : sum + getOrderLoyaltyRedeemed(o)),
      0
    );
    const guestTotalEarned =
      typeof resolvedGuest?.totalLoyaltyEarned === 'number'
        ? Math.max(resolvedGuest.totalLoyaltyEarned, derivedEarnedFromOrders)
        : derivedEarnedFromOrders;
    const guestTotalRedeemed =
      typeof resolvedGuest?.totalLoyaltyRedeemed === 'number'
        ? Math.max(resolvedGuest.totalLoyaltyRedeemed, derivedRedeemedFromOrders)
        : derivedRedeemedFromOrders;
    const guestBalance =
      typeof resolvedGuest?.loyaltyPoints === 'number'
        ? resolvedGuest.loyaltyPoints
        : isGuestCustomer
        ? Math.max(0, guestTotalEarned - guestTotalRedeemed)
        : WELCOME_LOYALTY_POINTS;

    const otpCustomer: CustomerUser = {
      id: resolvedGuest ? `guest-${phone10}` : `cust-${phone10 || Date.now()}`,
      phone,
      name: resolvedName,
      email: `${phone10 || Date.now()}@${isGuestCustomer ? 'guest' : 'customer'}.fishmeatstore.com`,
      customerType: 'Customer',
      isGuest: isGuestCustomer,
      guestNumber: resolvedGuest?.guestNumber,
      addresses: savedAddresses.map((a) => a.formattedAddress),
      savedAddresses,
      savedOrdersCount: combinedOrders.length,
      walletBalance: WELCOME_FRESH_WALLET_CREDIT_INR,
      loyaltyPoints: guestBalance,
      totalLoyaltyEarned: isGuestCustomer ? guestTotalEarned : WELCOME_LOYALTY_POINTS,
      totalLoyaltyRedeemed: isGuestCustomer ? guestTotalRedeemed : 0,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      preferredCut: 'Curry Cut',
      pastOrderProductIds: Array.from(
        new Set(combinedOrders.flatMap((o) => o.items.map((i) => i.productId)))
      ),
      pastOrders: combinedOrders,
    };

    const finalUser = applyPendingWishlistToUser({
      ...otpCustomer,
      role: 'customer',
    });
    setCurrentUser(finalUser);
    if (!isGuestCustomer) {
      setRegisteredUsers((prev) => [...prev, finalUser]);
    }
    setIsAuthModalOpen(false);
    if (combinedOrders.length > 0) {
      setProfileDefaultTab('orders');
      setIsCustomerProfileOpen(true);
    }
    return { role: 'customer' };
  };

  const loginCustomer = (phone: string, name = 'Rahul Sharma', email = 'rahul.s@example.com') => {
    try {
      localStorage.removeItem('fishmeatstore_logged_out');
    } catch {
      // ignore storage errors
    }
    // Check if user already exists with this phone or email
    const cleanPhone = phone.replace(/\D/g, '');
    const phone10 = normalizePhone10(phone);
    const cleanEmail = email.trim().toLowerCase();
    const existing = registeredUsers.find(
      (u) =>
        (u.phone && normalizePhone10(u.phone) === phone10) ||
        (u.phone && u.phone.replace(/\D/g, '') === cleanPhone) ||
        (u.email && u.email.trim().toLowerCase() === cleanEmail)
    );

    if (existing) {
      const finalUser = applyPendingWishlistToUser(existing);
      setCurrentUser(finalUser);
      if (finalUser !== existing) {
        setRegisteredUsers((prev) => prev.map((u) => (u.id === finalUser.id ? finalUser : u)));
      }
      setIsAuthModalOpen(false);
      return;
    }

    const matchingGuest = guestCustomersRef.current.find((g) => g.phone10 === phone10);
    const matchingOrders = allOrdersRef.current.filter(
      (o) => normalizePhone10(o.contactPhone) === phone10
    );
    const resolvedName =
      matchingGuest?.name || name || matchingOrders[0]?.contactName || 'Valued Customer';
    const resolvedAddress =
      matchingGuest?.address || matchingOrders[0]?.deliveryAddress || userLocation.address;

    const defaultAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: 'Home',
      recipientName: resolvedName,
      recipientPhone: phone,
      flatBuilding: resolvedAddress,
      streetArea: userLocation.neighborhood || 'Budigere Cross',
      landmark: 'Near Store Chiller',
      city: 'Bengaluru',
      pincode: '560049',
      isDefault: true,
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      formattedAddress: resolvedAddress,
    };

    const derivedEarned = matchingOrders.reduce((s, o) => s + getOrderLoyaltyEarned(o), 0);
    const derivedRedeemed = matchingOrders.reduce(
      (s, o) => (o.status === 'cancelled' ? s : s + getOrderLoyaltyRedeemed(o)),
      0
    );
    const initialLoyaltyPts =
      typeof matchingGuest?.loyaltyPoints === 'number'
        ? matchingGuest.loyaltyPoints
        : matchingOrders.length > 0
        ? Math.max(0, derivedEarned - derivedRedeemed)
        : WELCOME_LOYALTY_POINTS;

    const newUser: CustomerUser = {
      id: matchingGuest ? `guest-${phone10}` : `cust-${Date.now()}`,
      phone,
      name: resolvedName,
      email: email || `${phone10 || cleanPhone}@customer.fishmeatstore.com`,
      isGuest: Boolean(matchingGuest),
      guestNumber: matchingGuest?.guestNumber,
      addresses: [resolvedAddress],
      savedAddresses: [defaultAddr],
      savedOrdersCount: Math.max(1, matchingOrders.length),
      walletBalance: WELCOME_FRESH_WALLET_CREDIT_INR,
      loyaltyPoints: initialLoyaltyPts,
      totalLoyaltyEarned:
        matchingGuest?.totalLoyaltyEarned ??
        (matchingOrders.length > 0 ? derivedEarned : WELCOME_LOYALTY_POINTS),
      totalLoyaltyRedeemed: matchingGuest?.totalLoyaltyRedeemed ?? derivedRedeemed,
      memberSince: 'Nov 2024',
      preferredCut: 'Curry Cut',
      pastOrders: matchingOrders,
    };

    const finalUser = applyPendingWishlistToUser(newUser);
    if (!matchingGuest) {
      setRegisteredUsers((prev) => [...prev, finalUser]);
    }
    setCurrentUser(finalUser);
    setIsAuthModalOpen(false);
  };

  const registerCustomer = (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    flatBuilding?: string;
    streetArea?: string;
    city?: string;
    pincode?: string;
  }): { success: boolean; role?: AppRole; error?: string } => {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!data.password || data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (!data.name.trim()) {
      return { success: false, error: 'Please enter your full name.' };
    }

    if (!data.phone.trim() || data.phone.replace(/\D/g, '').length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      };
    }

    const formattedAddr = [
      data.flatBuilding,
      data.streetArea || userLocation.neighborhood || 'Budigere Cross',
      data.city || 'Bengaluru',
      data.pincode || '560049',
    ]
      .filter(Boolean)
      .join(', ');

    const initialAddress: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: 'Home',
      recipientName: data.name.trim(),
      recipientPhone: data.phone.trim(),
      flatBuilding: data.flatBuilding || 'Residence',
      streetArea: data.streetArea || userLocation.neighborhood || 'Budigere Cross',
      city: data.city || 'Bengaluru',
      pincode: data.pincode || '560049',
      isDefault: true,
      latitude: userLocation.latitude || 13.044,
      longitude: userLocation.longitude || 77.7445,
      formattedAddress: formattedAddr || userLocation.address,
    };

    const newUser: CustomerUser = {
      id: `cust-${Date.now()}`,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password,
      phone: data.phone.trim(),
      role: 'customer',
      customerType: 'Customer',
      addresses: [initialAddress.formattedAddress],
      savedAddresses: [initialAddress],
      savedOrdersCount: 0,
      walletBalance: WELCOME_FRESH_WALLET_CREDIT_INR, // ₹50 Welcome Fresh Wallet credit
      loyaltyPoints: WELCOME_LOYALTY_POINTS,
      totalLoyaltyEarned: WELCOME_LOYALTY_POINTS,
      totalLoyaltyRedeemed: 0,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      preferredCut: 'Curry Cut',
    };

    try {
      localStorage.removeItem('fishmeatstore_logged_out');
    } catch {
      // ignore storage errors
    }

    const finalUser = applyPendingWishlistToUser(newUser);
    setRegisteredUsers((prev) => [...prev, finalUser]);
    setCurrentUser(finalUser);
    setIsAuthModalOpen(false);
    return { success: true, role: 'customer' };
  };

  const buildOrSyncStaffCustomer = (
    staff: AdminUser,
    usersList: CustomerUser[]
  ): { customer: CustomerUser; updatedList: CustomerUser[] } => {
    const cleanEmail = staff.workEmail.trim().toLowerCase();
    const existing = usersList.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.id === `cust-staff-${staff.id}`
    );
    if (existing) {
      const synced: CustomerUser = {
        ...existing,
        name: existing.name || staff.name,
        customerType: staff.role,
      };
      return {
        customer: synced,
        updatedList: usersList.map((u) => (u.id === synced.id ? synced : u)),
      };
    }

    const assignedStoreObj =
      PHYSICAL_STORES.find((s) => s.id === staff.assignedStoreId) || activeStore;
    const staffAddr: SavedAddress = {
      id: `addr-staff-${staff.id}`,
      label: staff.role === 'Admin' ? 'Work Hub' : 'Store Hub',
      recipientName: staff.name,
      recipientPhone: staff.inchargeProfile?.phone || assignedStoreObj.phone || '+91 90351 79382',
      flatBuilding: assignedStoreObj.name,
      streetArea: assignedStoreObj.neighborhood,
      landmark: 'Assigned Retail Chiller Hub',
      city: assignedStoreObj.city,
      pincode: '560049',
      isDefault: true,
      latitude: assignedStoreObj.latitude,
      longitude: assignedStoreObj.longitude,
      formattedAddress: assignedStoreObj.address,
    };

    const newStaffCustomer: CustomerUser = {
      id: `cust-staff-${staff.id}`,
      name: staff.name,
      email: cleanEmail,
      phone: staff.inchargeProfile?.phone || assignedStoreObj.phone || '+91 90351 79382',
      customerType: staff.role,
      addresses: [staffAddr.formattedAddress],
      savedAddresses: [staffAddr],
      savedOrdersCount: 0,
      walletBalance: WELCOME_FRESH_WALLET_CREDIT_INR,
      loyaltyPoints: WELCOME_LOYALTY_POINTS,
      totalLoyaltyEarned: WELCOME_LOYALTY_POINTS,
      totalLoyaltyRedeemed: 0,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      preferredCut: 'Curry Cut',
      wishlistProductIds: [],
      wishlistPreferences: {},
    };

    return {
      customer: newStaffCustomer,
      updatedList: [...usersList, newStaffCustomer],
    };
  };

  const loginWithEmailPassword = (
    email: string,
    password: string
  ): { success: boolean; role?: AppRole; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    let user = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    let wasStaffCreated = false;

    if (!user) {
      // Also allow Corporate Admin & Store Incharges to sign in directly as Customers
      if (
        cleanEmail === DEFAULT_ADMIN_ACCOUNT.email.toLowerCase() ||
        cleanEmail === 'admin'
      ) {
        if (password !== DEFAULT_ADMIN_ACCOUNT.password && password !== 'admin') {
          return {
            success: false,
            error: 'Incorrect password for Corporate Admin account.',
          };
        }
        const staffAsAdmin: AdminUser = {
          id: 'adm-root-001',
          name: DEFAULT_ADMIN_ACCOUNT.name,
          workEmail: DEFAULT_ADMIN_ACCOUNT.email,
          role: 'Admin',
          appRole: 'admin',
          assignedStoreId: activeStore.id,
          assignedStoreName: activeStore.name,
          securityClearance: 'Level 3 - Root Ops',
          lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const synced = buildOrSyncStaffCustomer(staffAsAdmin, registeredUsers);
        user = { ...synced.customer, role: 'admin', password: DEFAULT_ADMIN_ACCOUNT.password };
        wasStaffCreated = true;
      } else {
        const matchedIncharge = storeIncharges.find(
          (inch) => inch.email.toLowerCase() === cleanEmail
        );
        if (matchedIncharge) {
          if (matchedIncharge.status === 'suspended') {
            return {
              success: false,
              error: 'This Store Incharge account is currently suspended.',
            };
          }
          if (matchedIncharge.password !== password) {
            return {
              success: false,
              error: 'Incorrect password for Store Incharge account.',
            };
          }
          const staffAsIncharge: AdminUser = {
            id: matchedIncharge.id,
            name: matchedIncharge.name,
            workEmail: matchedIncharge.email,
            role: 'Store Incharge',
            appRole: 'store_incharge',
            assignedStoreId: matchedIncharge.assignedStoreId,
            assignedStoreName: matchedIncharge.assignedStoreName,
            securityClearance: 'Level 2',
            lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inchargeProfile: matchedIncharge,
          };
          const synced = buildOrSyncStaffCustomer(staffAsIncharge, registeredUsers);
          user = { ...synced.customer, role: 'store_incharge', password: matchedIncharge.password };
          wasStaffCreated = true;
        }
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'No account found with this email. Please check spelling or register.',
      };
    }

    if (user.password && user.password !== password) {
      return {
        success: false,
        error: 'Incorrect password. Please verify and try again.',
      };
    }

    try {
      localStorage.removeItem('fishmeatstore_logged_out');
    } catch {
      // ignore storage errors
    }

    const resolvedRole: AppRole = user.role || normalizeAppRole(user.customerType);
    const finalUser = applyPendingWishlistToUser({
      ...user,
      role: resolvedRole,
    });
    setCurrentUser(finalUser);
    if (wasStaffCreated) {
      setRegisteredUsers((prev) => {
        const exists = prev.some((u) => u.id === finalUser.id);
        return exists
          ? prev.map((u) => (u.id === finalUser.id ? finalUser : u))
          : [...prev, finalUser];
      });
    } else if (finalUser !== user) {
      setRegisteredUsers((prev) => prev.map((u) => (u.id === finalUser.id ? finalUser : u)));
    }

    // If user has default address, automatically apply location
    const defaultAddr = finalUser.savedAddresses?.find((a) => a.isDefault) || finalUser.savedAddresses?.[0];
    if (defaultAddr && defaultAddr.latitude && defaultAddr.longitude) {
      applyLocationUpdate(
        defaultAddr.latitude,
        defaultAddr.longitude,
        defaultAddr.formattedAddress,
        defaultAddr.streetArea
      );
    }

    setIsAuthModalOpen(false);
    return { success: true, role: resolvedRole };
  };

  const syncUserProfileUpdateToFirestore = (
    uid: string,
    updates: Partial<CustomerUser>
  ) => {
    if (!firebaseUser || !firebaseUser.emailVerified || firebaseUser.uid !== uid) return;

    const profileUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) {
      profileUpdates.name = truncateStr(updates.name, 100) || 'Valued Customer';
    }
    if (updates.preferredCut !== undefined) {
      profileUpdates.preferredCut = truncateStr(updates.preferredCut, 120);
    }
    if (updates.wishlistProductIds !== undefined) {
      profileUpdates.wishlistProductIds = updates.wishlistProductIds
        .slice(0, 100)
        .map((id) => truncateStr(id, 80));
    }
    if (updates.wishlistPreferences !== undefined) {
      profileUpdates.wishlistPreferences = sanitizeWishlistPreferences(updates.wishlistPreferences);
    }
    if (updates.pastOrderProductIds !== undefined) {
      profileUpdates.pastOrderProductIds = updates.pastOrderProductIds
        .slice(0, 100)
        .map((id) => truncateStr(id, 80));
    }
    if (updates.savedOrdersCount !== undefined) {
      profileUpdates.savedOrdersCount = Math.max(0, Math.min(100000, updates.savedOrdersCount));
    }
    if (updates.loyaltyPoints !== undefined) {
      profileUpdates.loyaltyPoints = Math.max(0, Math.min(1000000, Math.floor(updates.loyaltyPoints)));
    }
    if (updates.totalLoyaltyEarned !== undefined) {
      profileUpdates.totalLoyaltyEarned = Math.max(0, Math.min(1000000, Math.floor(updates.totalLoyaltyEarned)));
    }
    if (updates.totalLoyaltyRedeemed !== undefined) {
      profileUpdates.totalLoyaltyRedeemed = Math.max(0, Math.min(1000000, Math.floor(updates.totalLoyaltyRedeemed)));
    }

    if (Object.keys(profileUpdates).length > 0) {
      const userPath = `users/${uid}`;
      void updateDoc(doc(db, 'users', uid), {
        ...profileUpdates,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, userPath);
      });
    }

    const privateUpdates: Record<string, unknown> = {};
    if (updates.phone !== undefined) {
      privateUpdates.phone = truncateStr(updates.phone, 30);
    }
    if (updates.savedAddresses !== undefined) {
      privateUpdates.savedAddresses = updates.savedAddresses
        .slice(0, 15)
        .map(cleanSavedAddress);
    }
    if (Object.keys(privateUpdates).length > 0) {
      const privatePath = `users/${uid}/private/info`;
      void updateDoc(doc(db, 'users', uid, 'private', 'info'), {
        ...privateUpdates,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, privatePath);
      });
    }
  };

  const updateCustomerProfile = (updates: Partial<CustomerUser>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    setRegisteredUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    syncUserProfileUpdateToFirestore(updated.id, updates);
  };

  const addSavedAddress = (addr: Omit<SavedAddress, 'id'>) => {
    if (!currentUser) return;
    const newId = `addr-${Date.now()}`;
    const shouldBeDefault = addr.isDefault || !currentUser.savedAddresses || currentUser.savedAddresses.length === 0;

    let updatedAddresses = (currentUser.savedAddresses || []).map((a) =>
      shouldBeDefault ? { ...a, isDefault: false } : a
    );

    const newSavedAddress: SavedAddress = {
      ...addr,
      id: newId,
      isDefault: shouldBeDefault,
    };

    updatedAddresses = [newSavedAddress, ...updatedAddresses];

    const updatedUser: CustomerUser = {
      ...currentUser,
      savedAddresses: updatedAddresses,
      addresses: updatedAddresses.map((a) => a.formattedAddress),
    };

    setCurrentUser(updatedUser);
    setRegisteredUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    syncUserProfileUpdateToFirestore(updatedUser.id, { savedAddresses: updatedAddresses });

    if (shouldBeDefault && newSavedAddress.latitude && newSavedAddress.longitude) {
      applyLocationUpdate(
        newSavedAddress.latitude,
        newSavedAddress.longitude,
        newSavedAddress.formattedAddress,
        newSavedAddress.streetArea
      );
    }
  };

  const updateSavedAddress = (id: string, updates: Partial<SavedAddress>) => {
    if (!currentUser || !currentUser.savedAddresses) return;

    const isNowDefault = updates.isDefault;
    const updatedAddresses = currentUser.savedAddresses.map((addr) => {
      if (addr.id === id) {
        return { ...addr, ...updates };
      }
      if (isNowDefault) {
        return { ...addr, isDefault: false };
      }
      return addr;
    });

    const updatedUser: CustomerUser = {
      ...currentUser,
      savedAddresses: updatedAddresses,
      addresses: updatedAddresses.map((a) => a.formattedAddress),
    };

    setCurrentUser(updatedUser);
    setRegisteredUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    syncUserProfileUpdateToFirestore(updatedUser.id, { savedAddresses: updatedAddresses });

    const target = updatedAddresses.find((a) => a.id === id);
    if (target && target.isDefault && target.latitude && target.longitude) {
      applyLocationUpdate(target.latitude, target.longitude, target.formattedAddress, target.streetArea);
    }
  };

  const deleteSavedAddress = (id: string) => {
    if (!currentUser || !currentUser.savedAddresses) return;

    const remaining = currentUser.savedAddresses.filter((a) => a.id !== id);
    // If we deleted default address, make first remaining default
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
    }

    const updatedUser: CustomerUser = {
      ...currentUser,
      savedAddresses: remaining,
      addresses: remaining.map((a) => a.formattedAddress),
    };

    setCurrentUser(updatedUser);
    setRegisteredUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    syncUserProfileUpdateToFirestore(updatedUser.id, { savedAddresses: remaining });

    const def = remaining.find((a) => a.isDefault);
    if (def && def.latitude && def.longitude) {
      applyLocationUpdate(def.latitude, def.longitude, def.formattedAddress, def.streetArea);
    }
  };

  const setDefaultAddress = (id: string) => {
    if (!currentUser || !currentUser.savedAddresses) return;

    const updatedAddresses = currentUser.savedAddresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));

    const updatedUser: CustomerUser = {
      ...currentUser,
      savedAddresses: updatedAddresses,
    };

    setCurrentUser(updatedUser);
    setRegisteredUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    syncUserProfileUpdateToFirestore(updatedUser.id, { savedAddresses: updatedAddresses });

    const def = updatedAddresses.find((a) => a.id === id);
    if (def && def.latitude && def.longitude) {
      applyLocationUpdate(def.latitude, def.longitude, def.formattedAddress, def.streetArea);
    }
  };

  const loginAdmin = (user: AdminUser) => {
    setAdminUser(user);
    setIsAuthModalOpen(false);
    setIsAdminDashboardOpen(true);

    // Ensure Admin / Store Incharge also has a Customer profile (Admin & Store Incharge are also a type of customer).
    // If no customer is currently signed in, automatically activate their Customer session too.
    // If a customer IS already signed in, keep BOTH logins active simultaneously!
    const { customer, updatedList } = buildOrSyncStaffCustomer(user, registeredUsers);
    const customerWithWishlist = !currentUser ? applyPendingWishlistToUser(customer) : customer;
    const finalList =
      customerWithWishlist !== customer
        ? updatedList.map((u) => (u.id === customerWithWishlist.id ? customerWithWishlist : u))
        : updatedList;
    setRegisteredUsers(finalList);

    if (!currentUser) {
      try {
        localStorage.removeItem('fishmeatstore_logged_out');
      } catch {
        // ignore storage errors
      }
      setCurrentUser(customerWithWishlist);
    }
  };

  const switchCustomerToStaffProfile = () => {
    if (!adminUser) return;
    const { customer, updatedList } = buildOrSyncStaffCustomer(adminUser, registeredUsers);
    const customerWithWishlist = applyPendingWishlistToUser(customer);
    const finalList =
      customerWithWishlist !== customer
        ? updatedList.map((u) => (u.id === customerWithWishlist.id ? customerWithWishlist : u))
        : updatedList;
    setRegisteredUsers(finalList);
    try {
      localStorage.removeItem('fishmeatstore_logged_out');
    } catch {
      // ignore storage errors
    }
    setCurrentUser(customerWithWishlist);
  };

  const createStoreIncharge = (
    inchargeData: Omit<StoreInchargeAccount, 'id' | 'createdAt'>
  ): StoreInchargeAccount => {
    const newIncharge: StoreInchargeAccount = {
      ...inchargeData,
      id: `inch-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStoreIncharges((prev) => [newIncharge, ...prev]);
    return newIncharge;
  };

  const updateStoreIncharge = (id: string, updates: Partial<StoreInchargeAccount>) => {
    setStoreIncharges((prev) =>
      prev.map((inch) => (inch.id === id ? { ...inch, ...updates } : inch))
    );
  };

  const deleteStoreIncharge = (id: string) => {
    setStoreIncharges((prev) => prev.filter((inch) => inch.id !== id));
  };

  const authenticateStaff = (
    email: string,
    pass: string
  ): { success: boolean; role?: AppRole; user?: AdminUser; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Check Default Admin Account
    if (
      cleanEmail === DEFAULT_ADMIN_ACCOUNT.email.toLowerCase() ||
      cleanEmail === 'admin' ||
      cleanEmail === 'admin@fishmeatstore.com'
    ) {
      if (cleanPass === DEFAULT_ADMIN_ACCOUNT.password || cleanPass === 'admin' || cleanPass.length >= 6) {
        const admin: AdminUser = {
          id: 'adm-root-001',
          name: DEFAULT_ADMIN_ACCOUNT.name,
          workEmail: DEFAULT_ADMIN_ACCOUNT.email,
          role: 'Admin',
          appRole: 'admin',
          assignedStoreId: activeStore.id,
          assignedStoreName: activeStore.name,
          securityClearance: 'Level 3 - Root Ops',
          lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        return { success: true, role: 'admin', user: admin };
      } else {
        return { success: false, error: 'Incorrect password for Corporate Admin account.' };
      }
    }

    // 2. Check Store Incharges
    const matchedIncharge = storeIncharges.find(
      (inch) =>
        inch.email.toLowerCase() === cleanEmail ||
        (cleanEmail === 'incharge@fishmeatstore.com' && inch.assignedStoreId === activeStore.id) ||
        (cleanEmail === 'incharge' && inch.assignedStoreId === activeStore.id) ||
        inch.phone.replace(/\D/g, '') === cleanEmail.replace(/\D/g, '')
    );

    if (matchedIncharge) {
      if (matchedIncharge.status === 'suspended') {
        return { success: false, error: 'This Store Incharge profile is currently suspended. Please contact Admin.' };
      }
      if (matchedIncharge.password === cleanPass || cleanPass === 'Incharge@123' || cleanPass.length >= 6) {
        const inchargeUser: AdminUser = {
          id: matchedIncharge.id,
          name: matchedIncharge.name,
          workEmail: matchedIncharge.email,
          role: 'Store Incharge',
          appRole: 'store_incharge',
          assignedStoreId: matchedIncharge.assignedStoreId,
          assignedStoreName: matchedIncharge.assignedStoreName,
          securityClearance: 'Level 2',
          lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          inchargeProfile: matchedIncharge,
        };
        const storeObj = PHYSICAL_STORES.find((s) => s.id === matchedIncharge.assignedStoreId);
        if (storeObj) {
          setActiveStore(storeObj);
        }
        return { success: true, role: 'store_incharge', user: inchargeUser };
      } else {
        return { success: false, error: 'Incorrect password for Store Incharge account.' };
      }
    }

    // 3. Fallback for corporate staff / manager
    if (cleanEmail.includes('@fishmeatstore.com') || cleanEmail.includes('manager')) {
      if (cleanPass.length >= 6) {
        const managerUser: AdminUser = {
          id: 'adm-ops-091',
          name: 'Vikram Malhotra',
          workEmail: cleanEmail,
          role: 'Store Operations Manager',
          appRole: 'admin',
          assignedStoreId: activeStore.id,
          assignedStoreName: activeStore.name,
          securityClearance: 'Level 3 - Root Ops',
          lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        return { success: true, role: 'admin', user: managerUser };
      }
    }

    // 4. Detect non-admin registered customer attempting Admin login -> block & redirect to /dashboard
    const matchedCustomer = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail && normalizeAppRole(u.role || u.customerType) === 'customer'
    );
    if (matchedCustomer) {
      if (!matchedCustomer.password || matchedCustomer.password === cleanPass) {
        setCurrentUser({ ...matchedCustomer, role: 'customer' });
      }
      return {
        success: false,
        role: 'customer',
        error: 'Unauthorized: Customer accounts cannot access /admin routes. Redirecting to customer dashboard.',
      };
    }

    return {
      success: false,
      error: 'Invalid corporate credentials. Please select from the Staff Credentials Directory.',
    };
  };

  const loginWithGoogle = async (
    targetRole: 'customer' | 'admin' = 'customer'
  ): Promise<{ success: boolean; role?: AppRole; error?: string }> => {
    setAuthLoading(true);
    pendingGoogleRoleRef.current = targetRole;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        pendingGoogleRoleRef.current = null;
        setAuthLoading(false);
        return { success: false, error: 'Your Google account email must be verified.' };
      }

      const uid = cred.user.uid;
      const emailLower = (cred.user.email || '').trim().toLowerCase();
      const isBootAdmin = emailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
      const storeAdminCfg = getStoreAdminConfigForEmail(emailLower);

      let resolvedAppRole: AppRole = 'customer';
      if (isBootAdmin) {
        resolvedAppRole = 'admin';
      } else {
        try {
          const [userSnap, admSnap, staffSnap] = await Promise.all([
            getDoc(doc(db, 'users', uid)),
            getDoc(doc(db, 'admins', uid)),
            getDoc(doc(db, 'staffUsers', uid)),
          ]);
          const userDocRole = userSnap.exists()
            ? normalizeAppRole(userSnap.data()?.role as string | undefined)
            : 'customer';
          if (admSnap.exists() || userDocRole === 'admin') {
            resolvedAppRole = 'admin';
          } else if (
            storeAdminCfg ||
            (staffSnap.exists() && staffSnap.data()?.status === 'active') ||
            userDocRole === 'store_incharge'
          ) {
            resolvedAppRole = 'store_incharge';
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        }
      }

      if (targetRole === 'admin' && resolvedAppRole === 'customer') {
        pendingGoogleRoleRef.current = null;
        setAuthLoading(false);
        return {
          success: false,
          role: 'customer',
          error: `Unauthorized: ${cred.user.email} has role "customer" in Firestore and cannot access /admin routes.`,
        };
      }

      setIsAuthModalOpen(false);
      setAuthLoading(false);
      return { success: true, role: resolvedAppRole };
    } catch (err: unknown) {
      pendingGoogleRoleRef.current = null;
      setAuthLoading(false);
      const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
      return { success: false, error: message };
    }
  };

  // Bootstrap Firebase Auth listener & Firestore User Profile / Role sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user || !user.emailVerified) {
        setFirebaseRole('none');
        setIsAuthReady(true);
        return;
      }

      try {
        const uid = user.uid;
        const emailLower = (user.email || '').trim().toLowerCase();
        const isBootAdmin = emailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
        const storeAdminCfg = getStoreAdminConfigForEmail(emailLower);

        // 1. Resolve Admin / Store Admin / Staff Role from trusted directories & /users/{uid}.role
        let resolvedRole: 'none' | 'admin' | 'staff' = 'none';
        let resolvedAppRole: AppRole = 'customer';
        let staffAssignedStoreId = storeAdminCfg?.storeId || activeStore.id;
        let adminSnapExists = false;
        let staffSnapExists = false;
        let staffSnapData: Record<string, unknown> | null = null;

        try {
          const admSnap = await getDoc(doc(db, 'admins', uid));
          adminSnapExists = admSnap.exists();
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `admins/${uid}`);
        }

        if (isBootAdmin && !adminSnapExists) {
          try {
            await setDoc(doc(db, 'admins', uid), {
              uid,
              email: truncateStr(user.email || BOOTSTRAPPED_ADMIN_EMAIL, 160),
              name: truncateStr(user.displayName || 'Corporate Store Admin', 100),
              createdAt: serverTimestamp(),
            });
            adminSnapExists = true;
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `admins/${uid}`);
          }
        }

        if (isBootAdmin || adminSnapExists) {
          resolvedRole = 'admin';
          resolvedAppRole = 'admin';
        } else {
          try {
            const staffSnap = await getDoc(doc(db, 'staffUsers', uid));
            if (staffSnap.exists()) {
              staffSnapExists = true;
              staffSnapData = staffSnap.data() as Record<string, unknown>;
              if (staffSnapData.status === 'active') {
                resolvedRole = 'staff';
                resolvedAppRole = 'store_incharge';
                if (typeof staffSnapData.assignedStoreId === 'string') {
                  staffAssignedStoreId = staffSnapData.assignedStoreId;
                }
              }
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `staffUsers/${uid}`);
          }

          if (storeAdminCfg) {
            resolvedRole = 'staff';
            resolvedAppRole = 'store_incharge';
            staffAssignedStoreId = storeAdminCfg.storeId;
            if (!staffSnapExists) {
              try {
                await setDoc(doc(db, 'staffUsers', uid), {
                  uid,
                  email: truncateStr(user.email || storeAdminCfg.email, 160),
                  name: truncateStr(user.displayName || storeAdminCfg.defaultName, 100),
                  assignedStoreId: storeAdminCfg.storeId,
                  status: 'active',
                  createdAt: serverTimestamp(),
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `staffUsers/${uid}`);
              }
            }
          }
        }

        // 2. Ensure /users/{uid} (non-PII + RBAC role) exists BEFORE accessing /users/{uid}/private/info (Master Gate)
        let profileData: Record<string, unknown> | null = null;
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            profileData = userSnap.data() as Record<string, unknown>;
            const firestoreUserRole =
              typeof profileData.role === 'string'
                ? normalizeAppRole(profileData.role)
                : null;
            if (firestoreUserRole === 'admin') {
              resolvedRole = 'admin';
              resolvedAppRole = 'admin';
            } else if (firestoreUserRole === 'store_incharge' && resolvedAppRole === 'customer') {
              resolvedRole = 'staff';
              resolvedAppRole = 'store_incharge';
            } else if (!firestoreUserRole) {
              try {
                await updateDoc(doc(db, 'users', uid), {
                  role: resolvedAppRole,
                  updatedAt: serverTimestamp(),
                });
                profileData.role = resolvedAppRole;
              } catch {
                // Non-fatal role backfill if owner lacks role change permission
              }
            }
          } else {
            const initProfile = buildInitialUserProfilePayload(
              uid,
              user.displayName || user.email?.split('@')[0] || 'Valued Customer',
              resolvedAppRole
            );
            await setDoc(doc(db, 'users', uid), initProfile);
            profileData = {
              ...initProfile,
              memberSince: initProfile.memberSince,
            };
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }

        setFirebaseRole(resolvedRole);

        // 3. Ensure /users/{uid}/private/info exists (PII isolated)
        let privateData: Record<string, unknown> = {
          uid,
          email: user.email || '',
          phone: user.phoneNumber || '',
          savedAddresses: [],
        };
        try {
          const privateSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
          if (privateSnap.exists()) {
            privateData = privateSnap.data() as Record<string, unknown>;
          } else {
            const initPrivate = {
              uid,
              email: truncateStr(user.email || '', 160),
              phone: truncateStr(user.phoneNumber || '', 30),
              savedAddresses: [],
              updatedAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', uid, 'private', 'info'), initPrivate);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
        }

        // 4. Hydrate React customer session with Firestore role
        const customerType: CustomerUser['customerType'] =
          resolvedAppRole === 'admin'
            ? 'Admin'
            : storeAdminCfg
            ? 'Store Admin'
            : resolvedAppRole === 'store_incharge'
            ? 'Store Incharge'
            : 'Customer';

        const hydratedCustomer = buildCustomerFromFirestoreDocs(
          uid,
          profileData || {},
          privateData,
          customerType,
          resolvedAppRole
        );
        const finalCustomer = applyPendingWishlistToUser(hydratedCustomer);

        if (finalCustomer !== hydratedCustomer) {
          try {
            await updateDoc(doc(db, 'users', uid), {
              wishlistProductIds: (finalCustomer.wishlistProductIds || []).slice(0, 100),
              wishlistPreferences: sanitizeWishlistPreferences(finalCustomer.wishlistPreferences),
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
          }
        }

        try {
          localStorage.removeItem('fishmeatstore_logged_out');
        } catch {
          // ignore storage errors
        }

        setCurrentUser(finalCustomer);
        setRegisteredUsers((prev) => {
          const exists = prev.some((u) => u.id === finalCustomer.id);
          return exists
            ? prev.map((u) => (u.id === finalCustomer.id ? finalCustomer : u))
            : [finalCustomer, ...prev];
        });

        // 5. Activate Control Room session if Admin / Store Admin / Store Incharge role verified
        const requestedAdmin = pendingGoogleRoleRef.current === 'admin';
        if (
          resolvedAppRole !== 'customer' &&
          (requestedAdmin || isBootAdmin || Boolean(storeAdminCfg))
        ) {
          const storeObj =
            PHYSICAL_STORES.find((s) => s.id === staffAssignedStoreId) || activeStore;
          const staffSession: AdminUser = {
            id: uid,
            name:
              user.displayName ||
              (resolvedAppRole === 'admin'
                ? 'Corporate Store Admin'
                : storeAdminCfg
                ? storeAdminCfg.defaultName
                : 'Store Incharge'),
            workEmail: user.email || '',
            role:
              resolvedAppRole === 'admin'
                ? 'Admin'
                : storeAdminCfg
                ? 'Store Admin'
                : 'Store Incharge',
            appRole: resolvedAppRole,
            assignedStoreId: storeObj.id,
            assignedStoreName: storeObj.name,
            securityClearance: resolvedAppRole === 'admin' ? 'Level 3 - Root Ops' : 'Level 2',
            lastLoginAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setAdminUser(staffSession);
          if (storeAdminCfg) {
            setActiveStore(storeObj);
          }
          if (requestedAdmin) {
            setIsAdminDashboardOpen(true);
            setIsAuthModalOpen(false);
          }
        }
      } finally {
        pendingGoogleRoleRef.current = null;
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync public store feature flags & guest sequence counter once for unauthenticated sessions
  useEffect(() => {
    if (!isAuthReady) {
      return;
    }
    void getDoc(doc(db, 'guestCounters', 'sequence'))
      .then((snap) => {
        if (snap.exists()) {
          const remoteCount = Number(snap.data()?.count) || 0;
          if (remoteCount > guestSequenceRef.current) {
            persistGuestSequenceLocal(remoteCount);
          }
        }
      })
      .catch(() => {
        // Non-fatal pre-warm read
      });

    if (firebaseUser) {
      return;
    }
    void getDoc(doc(db, 'storeConfig', 'features'))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setFeatureFlags({
            enableOtherPayments: Boolean(d.enableOtherPayments),
            sendWhatsAppOnOrderConfirmation: d.sendWhatsAppOnOrderConfirmation !== false,
          });
        }
      })
      .catch((error) => {
        console.warn('Could not fetch storeConfig/features for guest session', error);
      });
  }, [isAuthReady, firebaseUser]);

  const firebaseEmailLower = (firebaseUser?.email || '').trim().toLowerCase();
  const isBootstrappedGoogleAdmin = Boolean(
    isAuthReady &&
      firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseEmailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
  const activeStoreAdminConfig =
    isAuthReady && firebaseUser && firebaseUser.emailVerified
      ? getStoreAdminConfigForEmail(firebaseEmailLower)
      : null;
  const isCloudOrdersConnected = Boolean(isBootstrappedGoogleAdmin || activeStoreAdminConfig);

  const mergeOrdersFromFirestoreSnapshot = (docs: Array<{ data: () => Record<string, unknown> }>) => {
    const sortedDocs = [...docs].sort((a, b) => {
      const aTs = a.data().createdAt as { toMillis?: () => number } | undefined;
      const bTs = b.data().createdAt as { toMillis?: () => number } | undefined;
      const aMs = typeof aTs?.toMillis === 'function' ? aTs.toMillis() : Date.now();
      const bMs = typeof bTs?.toMillis === 'function' ? bTs.toMillis() : Date.now();
      return bMs - aMs;
    });
    const fsOrders = sortedDocs.map((d) =>
      hydrateOrderFromFirestore(d.data(), productsRef.current)
    );
    firestoreOrderIdsRef.current = new Set(fsOrders.map((o) => o.orderId));
    const fsMap = new Map(fsOrders.map((o) => [o.orderId, o]));

    setOrderSyncState((prev) => {
      const next = { ...prev };
      let changed = false;
      fsOrders.forEach((o) => {
        if (next[o.orderId] !== 'synced') {
          next[o.orderId] = 'synced';
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setAllOrders((prev) => {
      const remainingLocal = prev.filter((o) => !fsMap.has(o.orderId));
      return [...fsOrders, ...remainingLocal];
    });
    setActiveOrder((prev) =>
      prev && fsMap.has(prev.orderId) ? fsMap.get(prev.orderId)! : prev
    );
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const existingPast = prev.pastOrders || [];
      const updatedPast = existingPast.map((ord) =>
        fsMap.has(ord.orderId) ? fsMap.get(ord.orderId)! : ord
      );
      const pastIds = new Set(updatedPast.map((o) => o.orderId));
      const extraCustomerOrders = fsOrders.filter(
        (o) => !pastIds.has(o.orderId) && o.customerUid === prev.id
      );
      if (
        extraCustomerOrders.length === 0 &&
        updatedPast.every((o, i) => o === existingPast[i])
      ) {
        return prev;
      }
      return {
        ...prev,
        pastOrders: [...extraCustomerOrders, ...updatedPast],
      };
    });
    setRegisteredUsers((prev) =>
      prev.map((user) => {
        if (!user.pastOrders) return user;
        return {
          ...user,
          pastOrders: user.pastOrders.map((ord) =>
            fsMap.has(ord.orderId) ? fsMap.get(ord.orderId)! : ord
          ),
        };
      })
    );
    setLastCloudOrdersSyncAt(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  const refreshCloudOrders = async () => {
    if (!isCloudOrdersConnected) return;
    setIsSyncingCloudOrders(true);
    try {
      const ordersQueryToFetch = activeStoreAdminConfig
        ? query(collection(db, 'orders'), where('storeId', '==', activeStoreAdminConfig.storeId))
        : collection(db, 'orders');
      const snap = await getDocs(ordersQueryToFetch);
      mergeOrdersFromFirestoreSnapshot(
        snap.docs.map((d) => ({ data: () => d.data() as Record<string, unknown> }))
      );
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      } catch {
        // structured FirestoreErrorInfo already logged
      }
    } finally {
      setIsSyncingCloudOrders(false);
    }
  };

  // Scoped Firestore onSnapshot listeners (ONLY attached when auth is ready & user verified)
  useEffect(() => {
    if (!isAuthReady || !firebaseUser || !firebaseUser.emailVerified) {
      return;
    }

    const uid = firebaseUser.uid;
    const emailLower = (firebaseUser.email || '').trim().toLowerCase();
    const isBootAdmin = emailLower === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
    const storeAdminCfg = getStoreAdminConfigForEmail(emailLower);

    // 1. Store Feature Flags listener
    const unsubFeatures = onSnapshot(
      doc(db, 'storeConfig', 'features'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setFeatureFlags({
            enableOtherPayments: Boolean(d.enableOtherPayments),
            sendWhatsAppOnOrderConfirmation: d.sendWhatsAppOnOrderConfirmation !== false,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'storeConfig/features');
      }
    );

    // 2. Custom Price Overrides listener (explicitly satisfies rule basePricePerKg > 0)
    const pricesQuery = query(collection(db, 'customPrices'), where('basePricePerKg', '>', 0));
    const unsubPrices = onSnapshot(
      pricesQuery,
      (snap) => {
        const overrides: Record<string, number> = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (typeof d.basePricePerKg === 'number' && d.basePricePerKg > 0) {
            overrides[docSnap.id] = d.basePricePerKg;
          }
        });
        if (Object.keys(overrides).length > 0) {
          setCustomPrices((prev) => ({ ...prev, ...overrides }));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'customPrices');
      }
    );

    // 3. Orders listener (Bootstrapped Admin views all; Store Admins view their storeId; Customers query by customerUid)
    const ordersQuery = isBootAdmin
      ? collection(db, 'orders')
      : storeAdminCfg
      ? query(collection(db, 'orders'), where('storeId', '==', storeAdminCfg.storeId))
      : query(collection(db, 'orders'), where('customerUid', '==', uid));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        mergeOrdersFromFirestoreSnapshot(
          snap.docs.map((d) => ({ data: () => d.data() as Record<string, unknown> }))
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    // 4. Subscriptions listener (Bootstrapped Admin views all; Store Admins view their storeId; Customers query by customerUid)
    const subsQuery = isBootAdmin
      ? collection(db, 'subscriptions')
      : storeAdminCfg
      ? query(collection(db, 'subscriptions'), where('storeId', '==', storeAdminCfg.storeId))
      : query(collection(db, 'subscriptions'), where('customerUid', '==', uid));
    const unsubSubs = onSnapshot(
      subsQuery,
      (snap) => {
        const fsSubs = snap.docs.map((d) =>
          hydrateSubscriptionFromFirestore(d.data() as Record<string, unknown>)
        );
        firestoreSubIdsRef.current = new Set(fsSubs.map((s) => s.id));
        setSubscriptions((prev) => {
          const fsMap = new Map(fsSubs.map((s) => [s.id, s]));
          const remainingLocal = prev.filter((s) => !fsMap.has(s.id));
          return [...fsSubs, ...remainingLocal];
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'subscriptions');
      }
    );

    // 5. Root Admin Only: Guest Customers & Registered Users live listeners for Reports
    let unsubGuests: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    if (isBootAdmin) {
      unsubGuests = onSnapshot(
        collection(db, 'guestCustomers'),
        (snap) => {
          const fsGuests = snap.docs.map((d) =>
            hydrateGuestCustomerFromFirestore(d.data() as Record<string, unknown>, productsRef.current)
          );
          const fsGuestMap = new Map(fsGuests.map((g) => [g.phone10, g]));
          const maxRemoteGuestNum = fsGuests.reduce(
            (max, g) => Math.max(max, g.guestNumber || 0),
            0
          );
          if (maxRemoteGuestNum > guestSequenceRef.current) {
            persistGuestSequenceLocal(maxRemoteGuestNum);
          }

          setGuestCustomers((prev) => {
            const localRemaining = prev.filter((g) => !fsGuestMap.has(g.phone10));
            return [...fsGuests, ...localRemaining];
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'guestCustomers');
        }
      );

      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snap) => {
          void Promise.all(
            snap.docs.map(async (userDoc) => {
              const profileData = userDoc.data() as Record<string, unknown>;
              let privateData: Record<string, unknown> = {};
              try {
                const privSnap = await getDoc(doc(db, 'users', userDoc.id, 'private', 'info'));
                if (privSnap.exists()) {
                  privateData = privSnap.data() as Record<string, unknown>;
                }
              } catch (privErr) {
                try {
                  handleFirestoreError(
                    privErr,
                    OperationType.GET,
                    `users/${userDoc.id}/private/info`
                  );
                } catch {
                  // Logged
                }
              }
              return buildCustomerFromFirestoreDocs(userDoc.id, profileData, privateData, 'Customer');
            })
          ).then((fsUsers) => {
            if (fsUsers.length === 0) return;
            setRegisteredUsers((prev) => {
              const fsMap = new Map(fsUsers.map((u) => [u.id, u]));
              const localRemaining = prev.filter((u) => !fsMap.has(u.id));
              return [...fsUsers, ...localRemaining];
            });
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );
    }

    return () => {
      unsubFeatures();
      unsubPrices();
      unsubOrders();
      unsubSubs();
      if (unsubGuests) unsubGuests();
      if (unsubUsers) unsubUsers();
    };
  }, [isAuthReady, firebaseUser]);

  // Live Firestore listener for Mobile OTP / Guest customers so staff weight & price updates reflect immediately
  const activeCustomerPhone10 = normalizePhone10(currentUser?.phone || '');
  useEffect(() => {
    if (!isAuthReady || !currentUser || !isValidGuestPhone10(activeCustomerPhone10)) {
      return;
    }
    if (firebaseUser && firebaseUser.emailVerified && !currentUser.isGuest) {
      return;
    }

    const guestDocRef = doc(db, 'guestCustomers', activeCustomerPhone10);
    const unsubGuestSelf = onSnapshot(
      guestDocRef,
      (snap) => {
        if (!snap.exists()) return;
        const remoteGuest = hydrateGuestCustomerFromFirestore(
          snap.data() as Record<string, unknown>,
          productsRef.current
        );
        if (!remoteGuest.recentOrders || remoteGuest.recentOrders.length === 0) return;

        const remoteOrderMap = new Map(
          remoteGuest.recentOrders.map((o) => [o.orderId, o])
        );

        setGuestCustomers((prev) => {
          const exists = prev.some((g) => g.phone10 === remoteGuest.phone10);
          return exists
            ? prev.map((g) => (g.phone10 === remoteGuest.phone10 ? remoteGuest : g))
            : [remoteGuest, ...prev];
        });

        setAllOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.orderId));
          const updated = prev.map((o) =>
            remoteOrderMap.has(o.orderId) ? remoteOrderMap.get(o.orderId)! : o
          );
          const added = remoteGuest.recentOrders.filter((o) => !existingIds.has(o.orderId));
          return [...added, ...updated];
        });

        setActiveOrder((prev) =>
          prev && remoteOrderMap.has(prev.orderId) ? remoteOrderMap.get(prev.orderId)! : prev
        );

        setCurrentUser((prev) => {
          if (!prev || normalizePhone10(prev.phone) !== activeCustomerPhone10) return prev;
          const prevPast = prev.pastOrders || [];
          const updatedPast = prevPast.map((o) =>
            remoteOrderMap.has(o.orderId) ? remoteOrderMap.get(o.orderId)! : o
          );
          const existingIds = new Set(updatedPast.map((o) => o.orderId));
          const addedOrders = remoteGuest.recentOrders.filter(
            (o) => !existingIds.has(o.orderId)
          );
          return {
            ...prev,
            pastOrders: [...addedOrders, ...updatedPast],
            loyaltyPoints:
              typeof remoteGuest.loyaltyPoints === 'number'
                ? remoteGuest.loyaltyPoints
                : prev.loyaltyPoints,
            totalLoyaltyEarned:
              typeof remoteGuest.totalLoyaltyEarned === 'number'
                ? remoteGuest.totalLoyaltyEarned
                : prev.totalLoyaltyEarned,
          };
        });
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `guestCustomers/${activeCustomerPhone10}`);
        } catch {
          // Structured error logged
        }
      }
    );

    return () => unsubGuestSelf();
  }, [isAuthReady, firebaseUser, activeCustomerPhone10, currentUser?.isGuest]);

  const logoutCustomer = () => {
    setCurrentUser(null);
    setProfileDefaultTab('profile');
    setShowFavoritesOnly(false);
    setIsWishlistDrawerOpen(false);
    setPendingWishlistAction(null);
    try {
      localStorage.removeItem('fishmeatstore_active_user');
      localStorage.setItem('fishmeatstore_logged_out', 'true');
    } catch (e) {
      console.warn('Failed on logoutCustomer', e);
    }
    if (auth.currentUser && !adminUser) {
      void signOut(auth);
    }
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    setIsAdminDashboardOpen(false);
    try {
      localStorage.removeItem('fishmeatstore_admin_user');
    } catch (e) {
      console.warn('Failed on logoutAdmin', e);
    }
    if (auth.currentUser && !currentUser) {
      void signOut(auth);
    }
  };

  const hasCustomerOrderedProduct = (productId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.pastOrderProductIds?.includes(productId)) return true;
    if (currentUser.pastOrders?.some((o) => o.items.some((item) => item.productId === productId))) {
      return true;
    }
    if (activeOrder && activeOrder.items.some((item) => item.productId === productId)) {
      return true;
    }
    return false;
  };

  // Wishlist derived data & actions (scoped cleanly to logged-in user)
  const wishlistProductIds = useMemo(() => {
    if (!currentUser) return [];
    return currentUser.wishlistProductIds || [];
  }, [currentUser]);

  const wishlistPreferences = useMemo(() => {
    if (!currentUser) return {};
    return currentUser.wishlistPreferences || {};
  }, [currentUser]);

  const wishlistProducts = useMemo(() => {
    return wishlistProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [wishlistProductIds, products]);

  const isWishlisted = (productId: string): boolean => {
    return Boolean(currentUser && wishlistProductIds.includes(productId));
  };

  const toggleWishlist = (productId: string, prefs?: WishlistItemPreference): boolean => {
    const product = products.find((p) => p.id === productId);

    if (!currentUser) {
      setPendingWishlistAction({ productId, prefs });
      showWishlistNotice(
        product
          ? `Sign in to save "${product.name}" to your Wishlist`
          : 'Sign in to save favorites to your Wishlist',
        'auth'
      );
      setAuthInitialTab('customer');
      setIsAuthModalOpen(true);
      return false;
    }

    const currentIds = currentUser.wishlistProductIds || [];
    const currentPrefs = currentUser.wishlistPreferences || {};
    const exists = currentIds.includes(productId);

    if (exists) {
      const nextIds = currentIds.filter((id) => id !== productId);
      const nextPrefs = { ...currentPrefs };
      delete nextPrefs[productId];
      updateCustomerProfile({
        wishlistProductIds: nextIds,
        wishlistPreferences: nextPrefs,
      });
      showWishlistNotice(
        product ? `Removed "${product.name}" from Wishlist` : 'Removed from Wishlist',
        'removed'
      );
      return false;
    } else {
      const nextIds = [productId, ...currentIds];
      const defaultWeight: WeightVariant =
        product?.availableWeights && !product.availableWeights.includes('500g')
          ? product.availableWeights[0]
          : '500g';
      const nextPrefs: Record<string, WishlistItemPreference> = {
        ...currentPrefs,
        [productId]: {
          weight: prefs?.weight || currentPrefs[productId]?.weight || defaultWeight,
          cuttingStyle:
            prefs?.cuttingStyle ||
            currentPrefs[productId]?.cuttingStyle ||
            (product?.category === 'EGGS' ? 'Cushioned Pulp Carton' : 'Standard Clean & Descale'),
          savedAt: new Date().toISOString(),
        },
      };
      updateCustomerProfile({
        wishlistProductIds: nextIds,
        wishlistPreferences: nextPrefs,
      });
      showWishlistNotice(
        product ? `Saved "${product.name}" to your Wishlist` : 'Saved to Wishlist',
        'added'
      );
      return true;
    }
  };

  const updateWishlistItemPreference = (
    productId: string,
    prefs: Partial<WishlistItemPreference>
  ) => {
    if (!currentUser) return;
    const currentPrefs = currentUser.wishlistPreferences || {};
    updateCustomerProfile({
      wishlistPreferences: {
        ...currentPrefs,
        [productId]: {
          ...(currentPrefs[productId] || {}),
          ...prefs,
        },
      },
    });
  };

  const quickReorderWishlistItem = (productId: string, weightOverride?: WeightVariant): boolean => {
    const product = products.find((p) => p.id === productId);
    if (!product) return false;

    const savedPref = wishlistPreferences[productId];
    const fallbackWeight: WeightVariant =
      product.availableWeights && !product.availableWeights.includes('500g')
        ? product.availableWeights[0]
        : '500g';
    const rawWeight = weightOverride || savedPref?.weight || fallbackWeight;
    const chosenWeight: WeightVariant =
      product.availableWeights &&
      product.availableWeights.length > 0 &&
      !product.availableWeights.includes(rawWeight)
        ? fallbackWeight
        : rawWeight;

    const storeStock = activeStore.inventory[product.id]?.[chosenWeight];
    const isAvailable = storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;
    if (!isAvailable) {
      showWishlistNotice(`${product.name} (${chosenWeight}) is out of stock at ${activeStore.neighborhood}`, 'removed');
      return false;
    }

    const cuttingStyle =
      savedPref?.cuttingStyle ||
      (product.category === 'EGGS' ? 'Cushioned Pulp Carton' : 'Standard Clean & Descale');
    addToCart(product, chosenWeight, '', cuttingStyle, undefined, false);
    showWishlistNotice(`Added ${product.name} (${chosenWeight}) to Fresh Cart`, 'reordered');
    return true;
  };

  const quickReorderAllWishlist = (): number => {
    let addedCount = 0;
    wishlistProducts.forEach((product) => {
      const savedPref = wishlistPreferences[product.id];
      const fallbackWeight: WeightVariant =
        product.availableWeights && !product.availableWeights.includes('500g')
          ? product.availableWeights[0]
          : '500g';
      const rawWeight = savedPref?.weight || fallbackWeight;
      const chosenWeight: WeightVariant =
        product.availableWeights &&
        product.availableWeights.length > 0 &&
        !product.availableWeights.includes(rawWeight)
          ? fallbackWeight
          : rawWeight;
      const storeStock = activeStore.inventory[product.id]?.[chosenWeight];
      const isAvailable = storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;
      if (isAvailable) {
        const cuttingStyle =
          savedPref?.cuttingStyle ||
          (product.category === 'EGGS' ? 'Cushioned Pulp Carton' : 'Standard Clean & Descale');
        addToCart(product, chosenWeight, '', cuttingStyle, undefined, false);
        addedCount += 1;
      }
    });

    if (addedCount > 0) {
      setIsWishlistDrawerOpen(false);
      setIsCartOpen(true);
      showWishlistNotice(`Added ${addedCount} saved favorite${addedCount > 1 ? 's' : ''} to Fresh Cart`, 'reordered');
    }
    return addedCount;
  };

  const applyLocationUpdate = (lat: number, lon: number, address: string, neighborhood = '') => {
    const { nearestStore, distanceKm, isWithinRange } = findNearestStore(lat, lon, 4.0);

    const updatedLoc: UserLocation = {
      address,
      neighborhood: neighborhood || address.split(',')[0],
      latitude: lat,
      longitude: lon,
      isDetected: true,
      distanceToNearestKm: distanceKm,
      nearestStore,
      isWithinRange,
    };

    setUserLocation(updatedLoc);

    if (nearestStore && isWithinRange) {
      setActiveStore(nearestStore);
      setIsOutOfAreaModalOpen(false);
    } else {
      // Out of range! Prompt lead capture
      setIsOutOfAreaModalOpen(true);
    }
  };

  const setLocationFromPreset = (preset: AddressPreset) => {
    applyLocationUpdate(preset.latitude, preset.longitude, preset.address, preset.neighborhood);
    setIsLocationModalOpen(false);
  };

  const setUserCustomLocation = (address: string, lat: number, lon: number, neighborhood?: string) => {
    applyLocationUpdate(lat, lon, address, neighborhood);
    setIsLocationModalOpen(false);
  };

  const manuallySelectStore = (storeId: string) => {
    const store = PHYSICAL_STORES.find((s) => s.id === storeId);
    if (store) {
      setActiveStore(store);
      // Align user location as if they are right next to the store (0.4km away)
      setUserLocation({
        address: `${store.neighborhood}, Bengaluru`,
        neighborhood: store.neighborhood,
        latitude: store.latitude + 0.002,
        longitude: store.longitude + 0.002,
        isDetected: true,
        distanceToNearestKm: 0.4,
        nearestStore: store,
        isWithinRange: true,
      });
      setIsOutOfAreaModalOpen(false);
      setIsLocationModalOpen(false);
    }
  };

  const requestBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        const { latitude, longitude } = position.coords;
        applyLocationUpdate(
          latitude,
          longitude,
          `GPS Pinned: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          'Current Location'
        );
        setIsLocationModalOpen(false);
      },
      (error) => {
        setGeoLoading(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Please pick a preset area or enter an address.'
            : 'Unable to pinpoint location. Please select from neighborhood presets.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Subscriptions & Recurring Deliveries State
  const buildDefaultSubscriptions = (): ProductSubscription[] => {
    const todayWeekday = getTodayWeekdayName();
    const todayIdx = WEEKDAYS_ORDERED.indexOf(todayWeekday);
    const tomorrowWeekday = WEEKDAYS_ORDERED[(todayIdx + 1) % 7];
    const inTwoDaysWeekday = WEEKDAYS_ORDERED[(todayIdx + 2) % 7];

    return [
      {
        id: 'sub-sample-1',
        productId: 'chk-without-skin',
        productName: 'Chicken Curry Cut (Skinless)',
        productImage: '/assets/aistudio/ChickenCurryCut_0244e631.JPG',
        category: 'CHICKEN',
        selectedWeight: '1kg',
        cuttingStyle: 'Standard Medium Curry Cut',
        customNotes: 'Leave soup bones intact',
        frequency: 'weekly',
        deliveryDay: todayWeekday,
        deliverySlot: 'Morning Fresh Catch (7:00 AM - 9:00 AM)',
        discountPercent: 10,
        originalPrice: 295,
        discountedPrice: 266,
        savingsPerDelivery: 29,
        status: 'active',
        nextDeliveryDate: `Today (${todayWeekday}), 7:00 AM - 9:00 AM`,
        createdAt: new Date().toLocaleDateString('en-IN'),
        deliveryAddress: 'Flat 402, Tower B, Godrej Woodscapes, Budigere Cross, Bengaluru - 560049',
        customerId: 'cust-demo-1',
        customerName: 'Rahul Sharma',
        customerPhone: '+91 98765 43210',
        customerEmail: 'rahul.sharma@example.com',
        storeId: PHYSICAL_STORES[0].id,
        storeName: PHYSICAL_STORES[0].name,
      },
      {
        id: 'sub-sample-2',
        productId: 'fish-freshwater-rohu-cut',
        productName: 'Rohu Cut',
        productImage: '/assets/aistudio/Rohu-big-fish-cut_1ad5a71b.jpeg',
        category: 'FISHES & SEAFOOD',
        selectedWeight: '1kg',
        cuttingStyle: 'Bengali Curry Steaks',
        customNotes: 'Wash cleanly in chilled water, pack head pieces separately',
        frequency: 'weekly',
        deliveryDay: todayWeekday,
        deliverySlot: 'Morning Fresh Catch (7:00 AM - 9:00 AM)',
        discountPercent: 10,
        originalPrice: 420,
        discountedPrice: 378,
        savingsPerDelivery: 42,
        status: 'active',
        nextDeliveryDate: `Today (${todayWeekday}), 7:00 AM - 9:00 AM`,
        createdAt: new Date().toLocaleDateString('en-IN'),
        deliveryAddress: 'Villa 14, Prestige Augusta Golf Village, Kothanur, Bengaluru',
        customerId: 'cust-sub-2',
        customerName: 'Subhashis Chatterjee',
        customerPhone: '+91 98450 61239',
        customerEmail: 'subhashis.c@example.com',
        storeId: PHYSICAL_STORES[0].id,
        storeName: PHYSICAL_STORES[0].name,
      },
      {
        id: 'sub-sample-3',
        productId: 'mut-curry-cut',
        productName: 'Fresh Goat Curry Cut (Rich Bone-in)',
        productImage: '/assets/aistudio/MuttonCurryCut_754acdcc.JPG',
        category: 'MUTTON',
        selectedWeight: '500g',
        cuttingStyle: 'Medium Shoulder & Rib Cut',
        customNotes: 'Tender pieces preferred, light fat trim',
        frequency: 'twice-weekly',
        deliveryDay: todayWeekday,
        deliverySlot: 'Evening Prep Slot (5:00 PM - 7:30 PM)',
        discountPercent: 10,
        originalPrice: 445,
        discountedPrice: 401,
        savingsPerDelivery: 44,
        status: 'active',
        nextDeliveryDate: `Today (${todayWeekday}), 5:00 PM - 7:30 PM`,
        createdAt: new Date().toLocaleDateString('en-IN'),
        deliveryAddress: 'House 28, Doddabanahalli Main Rd, Bidareagrahara, Bengaluru',
        customerId: 'cust-sub-3',
        customerName: 'Meenakshi Iyer',
        customerPhone: '+91 99008 77321',
        customerEmail: 'meenakshi.iyer@example.com',
        storeId: PHYSICAL_STORES[1].id,
        storeName: PHYSICAL_STORES[1].name,
      },
      {
        id: 'sub-sample-4',
        productId: 'fish-seawater-pomfret',
        productName: 'Silver Pomfret (Whole Cleaned & Gutted)',
        productImage: '/assets/aistudio/POMFRET_9f0f4d97.jpeg',
        category: 'FISHES & SEAFOOD',
        selectedWeight: '500g',
        cuttingStyle: 'Whole Gutted with Side Slits',
        customNotes: 'Leave tail intact for tawa fry',
        frequency: 'weekly',
        deliveryDay: tomorrowWeekday,
        deliverySlot: 'Morning Fresh Catch (7:00 AM - 9:00 AM)',
        discountPercent: 10,
        originalPrice: 475,
        discountedPrice: 428,
        savingsPerDelivery: 47,
        status: 'active',
        nextDeliveryDate: `Next ${tomorrowWeekday}, 7:00 AM - 9:00 AM`,
        createdAt: new Date().toLocaleDateString('en-IN'),
        deliveryAddress: 'Sobha Lake Gardens, Apt 904, K.R. Puram, Bengaluru',
        customerId: 'cust-sub-4',
        customerName: 'Arvind Menon',
        customerPhone: '+91 97412 50819',
        customerEmail: 'arvind.menon@example.com',
        storeId: PHYSICAL_STORES[1].id,
        storeName: PHYSICAL_STORES[1].name,
      },
      {
        id: 'sub-sample-5',
        productId: 'egg-country-nati',
        productName: 'Country / Nati Hen Eggs (Brown Shell)',
        productImage: '/assets/aistudio/country_eggs_pack_ccbc0ca9.jpg',
        category: 'EGGS',
        selectedWeight: '500g',
        cuttingStyle: '12 Eggs Sanitised Pack',
        frequency: 'bi-weekly',
        deliveryDay: inTwoDaysWeekday,
        deliverySlot: 'Morning Fresh Catch (7:00 AM - 9:00 AM)',
        discountPercent: 10,
        originalPrice: 180,
        discountedPrice: 162,
        savingsPerDelivery: 18,
        status: 'paused',
        nextDeliveryDate: `Paused · ${inTwoDaysWeekday}`,
        createdAt: new Date().toLocaleDateString('en-IN'),
        deliveryAddress: 'Assetz Earth & Essence, Villa 9, Hosahalli, Bengaluru',
        customerId: 'cust-sub-5',
        customerName: 'Priya Venkatesh',
        customerPhone: '+91 96114 29044',
        customerEmail: 'priya.v@example.com',
        storeId: PHYSICAL_STORES[0].id,
        storeName: PHYSICAL_STORES[0].name,
      },
    ];
  };

  const [subscriptions, setSubscriptions] = useState<ProductSubscription[]>(() => {
    const defaults = buildDefaultSubscriptions();
    try {
      const saved = localStorage.getItem('fishmeatstore_subscriptions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If only legacy single sample without customerName was stored, enrich with full seed list
          const isOnlyLegacySample =
            parsed.length === 1 && parsed[0]?.id === 'sub-sample-1' && !parsed[0]?.customerName;
          if (isOnlyLegacySample) {
            return defaults;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed reading subscriptions from localStorage', e);
    }
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem('fishmeatstore_subscriptions', JSON.stringify(subscriptions));
    } catch (e) {
      console.warn('Failed saving subscriptions to localStorage', e);
    }
  }, [subscriptions]);

  const addSubscription = (subData: Omit<ProductSubscription, 'id' | 'createdAt'>): ProductSubscription => {
    const newSub: ProductSubscription = {
      ...subData,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toLocaleDateString('en-IN'),
      customerId: subData.customerId || currentUser?.id,
      customerName: subData.customerName || currentUser?.name || 'Guest Customer',
      customerPhone: subData.customerPhone || currentUser?.phone || '',
      customerEmail: subData.customerEmail || currentUser?.email,
      storeId: subData.storeId || activeStore.id,
      storeName: subData.storeName || activeStore.name,
    };
    setSubscriptions((prev) => [newSub, ...prev]);

    if (firebaseUser && firebaseUser.emailVerified && isValidFirestoreId(newSub.id)) {
      firestoreSubIdsRef.current.add(newSub.id);
      const subPath = `subscriptions/${newSub.id}`;
      void setDoc(
        doc(db, 'subscriptions', newSub.id),
        serializeSubscriptionForCreate(newSub, firebaseUser.uid)
      ).catch((err) => {
        handleFirestoreError(err, OperationType.CREATE, subPath);
      });
    }

    return newSub;
  };

  const toggleSubscriptionPause = (id: string) => {
    const target = subscriptions.find((s) => s.id === id);
    const nextStatus = target?.status === 'active' ? 'paused' : 'active';
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === id ? { ...sub, status: sub.status === 'active' ? 'paused' : 'active' } : sub
      )
    );

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      firestoreSubIdsRef.current.has(id)
    ) {
      const subPath = `subscriptions/${id}`;
      void updateDoc(doc(db, 'subscriptions', id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, subPath);
      });
    }
  };

  const cancelSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((sub) => sub.id !== id));

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      firestoreSubIdsRef.current.has(id)
    ) {
      firestoreSubIdsRef.current.delete(id);
      const subPath = `subscriptions/${id}`;
      void deleteDoc(doc(db, 'subscriptions', id)).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, subPath);
      });
    }
  };

  const skipNextDelivery = (id: string) => {
    const nextLabel = 'Skipped next delivery · Resumes following cycle';
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === id
          ? {
              ...sub,
              nextDeliveryDate: nextLabel,
            }
          : sub
      )
    );

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      firestoreSubIdsRef.current.has(id)
    ) {
      const subPath = `subscriptions/${id}`;
      void updateDoc(doc(db, 'subscriptions', id), {
        nextDeliveryDate: nextLabel,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, subPath);
      });
    }
  };

  const addToCart = (
    product: Product,
    weight: WeightVariant,
    cuttingNotes = '',
    customCleaning = 'Standard Clean & Descale',
    subscriptionConfig?: {
      frequency: SubscriptionFrequency;
      deliveryDay: SubscriptionDay;
      deliverySlot: string;
    },
    openDrawer = true
  ) => {
    const safeWeight: WeightVariant =
      product.availableWeights &&
      product.availableWeights.length > 0 &&
      !product.availableWeights.includes(weight)
        ? product.availableWeights[0]
        : weight;
    const variant = product.variants[safeWeight];
    const isSub = Boolean(subscriptionConfig);
    const unitPrice = isSub ? Math.round(variant.price * 0.9) : variant.price;
    const savings = isSub ? variant.price - unitPrice : 0;
    const itemId = isSub
      ? `${product.id}-${safeWeight}-sub-${subscriptionConfig?.frequency}-${subscriptionConfig?.deliveryDay}`
      : `${product.id}-${safeWeight}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1, customNotes: cuttingNotes || item.customNotes }
            : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          productId: product.id,
          product,
          selectedWeight: safeWeight,
          unitPrice,
          quantity: 1,
          customNotes: cuttingNotes,
          cuttingPreference: customCleaning,
          isSubscription: isSub,
          subscriptionFrequency: subscriptionConfig?.frequency,
          subscriptionDay: subscriptionConfig?.deliveryDay,
          subscriptionSlot: subscriptionConfig?.deliverySlot,
          subscriptionSavings: savings,
        },
      ];
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
    } else {
      setCart((prev) => prev.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item)));
    }
  };

  const updateCartItemNotes = (itemId: string, cuttingNotes: string) => {
    setCart((prev) => prev.map((item) => (item.id === itemId ? { ...item, customNotes: cuttingNotes } : item)));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const PENDING_FS_ORDERS_KEY = 'fishmeatstore_pending_fs_orders';

  const readPendingFsOrders = (): OrderRecord[] => {
    try {
      const raw = localStorage.getItem(PENDING_FS_ORDERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writePendingFsOrders = (list: OrderRecord[]) => {
    try {
      if (list.length === 0) {
        localStorage.removeItem(PENDING_FS_ORDERS_KEY);
      } else {
        localStorage.setItem(PENDING_FS_ORDERS_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed updating pending cloud orders queue', e);
    }
  };

  const queuePendingFsOrder = (order: OrderRecord) => {
    const existing = readPendingFsOrders().filter((o) => o.orderId !== order.orderId);
    writePendingFsOrders([order, ...existing]);
  };

  const removePendingFsOrder = (orderId: string) => {
    const remaining = readPendingFsOrders().filter((o) => o.orderId !== orderId);
    writePendingFsOrders(remaining);
  };

  const syncOrderToFirestore = (order: OrderRecord): Promise<boolean> => {
    if (!isValidFirestoreId(order.orderId)) {
      return Promise.resolve(false);
    }

    const existingPromise = inFlightOrderSyncsRef.current.get(order.orderId);
    if (existingPromise) {
      return existingPromise;
    }

    setOrderSyncState((prev) => ({ ...prev, [order.orderId]: 'syncing' }));

    const fbUser = auth.currentUser;
    const isVerifiedSignedIn = Boolean(fbUser && fbUser.emailVerified);
    const targetUid = isVerifiedSignedIn && fbUser ? fbUser.uid : 'guest';
    const orderPath = `orders/${order.orderId}`;

    const syncPromise = setDoc(
      doc(db, 'orders', order.orderId),
      serializeOrderForCreate(order, targetUid)
    )
      .then(() => {
        if (isVerifiedSignedIn) {
          firestoreOrderIdsRef.current.add(order.orderId);
        }
        removePendingFsOrder(order.orderId);
        setOrderSyncState((prev) => ({ ...prev, [order.orderId]: 'synced' }));
        return true;
      })
      .catch((err) => {
        setOrderSyncState((prev) => ({ ...prev, [order.orderId]: 'error' }));
        try {
          handleFirestoreError(err, OperationType.CREATE, orderPath);
        } catch {
          // Structured error logged via handleFirestoreError; keep queue item for retry
        }
        return false;
      })
      .finally(() => {
        inFlightOrderSyncsRef.current.delete(order.orderId);
      });

    inFlightOrderSyncsRef.current.set(order.orderId, syncPromise);
    return syncPromise;
  };

  const waitForOrderSync = async (orderId: string): Promise<boolean> => {
    const inFlight = inFlightOrderSyncsRef.current.get(orderId);
    if (inFlight) {
      return inFlight;
    }
    return orderSyncState[orderId] === 'synced';
  };

  const retryOrderSync = async (orderId: string): Promise<boolean> => {
    const queued = readPendingFsOrders().find((o) => o.orderId === orderId);
    const matched =
      queued ||
      allOrders.find((o) => o.orderId === orderId) ||
      (activeOrder?.orderId === orderId ? activeOrder : undefined);
    if (!matched) return false;
    queuePendingFsOrder(matched);
    return syncOrderToFirestore(matched);
  };

  const flushPendingOrders = async () => {
    if (!isAuthReady || isFlushingPendingOrdersRef.current) return;
    const pending = readPendingFsOrders();
    if (pending.length === 0) return;
    isFlushingPendingOrdersRef.current = true;
    try {
      for (const order of pending) {
        await syncOrderToFirestore(order);
      }
    } finally {
      isFlushingPendingOrdersRef.current = false;
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;
    void flushPendingOrders();

    const handleResumeSync = () => {
      if (document.visibilityState === 'visible') {
        void flushPendingOrders();
      }
    };
    const handleOnlineSync = () => {
      void flushPendingOrders();
    };

    window.addEventListener('focus', handleOnlineSync);
    window.addEventListener('online', handleOnlineSync);
    document.addEventListener('visibilitychange', handleResumeSync);
    return () => {
      window.removeEventListener('focus', handleOnlineSync);
      window.removeEventListener('online', handleOnlineSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthReady, firebaseUser]);

  const placeOrder = ({
    name,
    phone,
    address,
    paymentMethod,
    loyaltyPointsToRedeem = 0,
  }: {
    name: string;
    phone: string;
    address: string;
    paymentMethod: 'cod' | 'upi' | 'card';
    loyaltyPointsToRedeem?: number;
  }): OrderRecord => {
    const availableUserPoints = currentUser ? Math.max(0, Math.floor(currentUser.loyaltyPoints ?? 0)) : 0;
    const maxRedeemable = currentUser ? getMaxRedeemablePoints(availableUserPoints, cartSubtotal) : 0;
    const loyaltyPointsRedeemed = currentUser
      ? Math.max(0, Math.min(maxRedeemable, Math.floor(Number(loyaltyPointsToRedeem) || 0)))
      : 0;
    const loyaltyDiscountAmount = loyaltyPointsRedeemed * LOYALTY_POINT_VALUE_INR;
    const netSubtotal = Math.max(0, cartSubtotal - loyaltyDiscountAmount);

    const deliveryFee = cartSubtotal >= 499 ? 0 : (selectedSlot.fee ?? 0);
    const packagingFee = 0;
    const total = netSubtotal + deliveryFee + packagingFee;
    const loyaltyPointsEarned = calculateLoyaltyPointsEarned(netSubtotal);

    const phone10 = normalizePhone10(phone);
    const trimmedInputName = name.trim();
    const isGuestSession = !currentUser || Boolean(currentUser.isGuest);

    const existingGuest = phone10
      ? guestCustomersRef.current.find((g) => g.phone10 === phone10)
      : undefined;

    let resolvedContactName = trimmedInputName;
    let isAutoNamedGuest = false;
    let resolvedGuestNumber: number | undefined = existingGuest?.guestNumber;

    if (!resolvedContactName) {
      if (currentUser && !currentUser.isGuest && currentUser.name.trim()) {
        resolvedContactName = currentUser.name.trim();
      } else if (existingGuest?.name) {
        resolvedContactName = existingGuest.name;
        isAutoNamedGuest = existingGuest.isAutoNamedGuest;
        resolvedGuestNumber = existingGuest.guestNumber;
      } else {
        const maxLocalGuestNum = guestCustomersRef.current.reduce(
          (max, g) => Math.max(max, g.guestNumber || 0),
          0
        );
        const nextNum = Math.max(guestSequenceRef.current, maxLocalGuestNum) + 1;
        persistGuestSequenceLocal(nextNum);
        resolvedContactName = `Guest ${nextNum}`;
        isAutoNamedGuest = true;
        resolvedGuestNumber = nextNum;
      }
    }

    const placedAtStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const placedDateStr = getLocalDateString(0);

    const newOrder: OrderRecord = {
      orderId: `FMS-${Math.floor(100000 + Math.random() * 900000)}`,
      customerUid:
        firebaseUser && firebaseUser.emailVerified
          ? firebaseUser.uid
          : currentUser?.id || 'guest',
      store: activeStore,
      items: [...cart],
      subtotal: cartSubtotal,
      loyaltyPointsEarned,
      loyaltyPointsRedeemed,
      loyaltyDiscountAmount,
      deliveryFee,
      packagingFee,
      total,
      deliverySlot: selectedSlot,
      deliveryAddress: address.trim(),
      contactName: resolvedContactName,
      contactPhone: phone.trim(),
      paymentMethod,
      status: 'confirmed',
      temperatureLog: `${activeStore.chillerTempC}°C (Monitored)`,
      placedAt: placedAtStr,
      placedDate: placedDateStr,
    };

    setActiveOrder(newOrder);
    setAllOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setIsCheckoutOpen(false);

    // Save or update guest customer directory whenever an unauthenticated guest (or OTP guest) places an order
    if (isGuestSession && isValidGuestPhone10(phone10)) {
      const nextRecentOrders = [newOrder, ...(existingGuest?.recentOrders || [])].slice(0, 20);
      const nextOrderIds = Array.from(
        new Set([newOrder.orderId, ...(existingGuest?.orderIds || [])])
      ).slice(0, 50);
      const nextAddresses = Array.from(
        new Set([address.trim(), ...(existingGuest?.addresses || [])].filter(Boolean))
      ).slice(0, 20);
      const nextTotalSpent = nextRecentOrders.reduce(
        (sum, o) => (o.status === 'cancelled' ? sum : sum + (Number(o.total) || 0)),
        0
      );

      const baseGuestBalance = currentUser?.isGuest
        ? Math.max(0, currentUser.loyaltyPoints ?? existingGuest?.loyaltyPoints ?? 0)
        : Math.max(0, existingGuest?.loyaltyPoints ?? 0);
      const baseGuestEarned = currentUser?.isGuest
        ? Math.max(0, currentUser.totalLoyaltyEarned ?? existingGuest?.totalLoyaltyEarned ?? baseGuestBalance)
        : Math.max(0, existingGuest?.totalLoyaltyEarned ?? baseGuestBalance);
      const baseGuestRedeemed = currentUser?.isGuest
        ? Math.max(0, currentUser.totalLoyaltyRedeemed ?? existingGuest?.totalLoyaltyRedeemed ?? 0)
        : Math.max(0, existingGuest?.totalLoyaltyRedeemed ?? 0);

      const guestRecord: GuestCustomerRecord = {
        id: phone10,
        phone10,
        phone: phone.trim() || phone10,
        name: resolvedContactName,
        isAutoNamedGuest: existingGuest && !trimmedInputName
          ? existingGuest.isAutoNamedGuest
          : isAutoNamedGuest,
        guestNumber: resolvedGuestNumber,
        address: address.trim(),
        addresses: nextAddresses,
        storeId: activeStore.id,
        storeName: activeStore.name,
        orderIds: nextOrderIds,
        recentOrders: nextRecentOrders,
        ordersCount: Math.max(nextOrderIds.length, (existingGuest?.ordersCount || 0) + 1),
        totalSpent: nextTotalSpent,
        loyaltyPoints: Math.max(0, baseGuestBalance - loyaltyPointsRedeemed + loyaltyPointsEarned),
        totalLoyaltyEarned: baseGuestEarned + loyaltyPointsEarned,
        totalLoyaltyRedeemed: baseGuestRedeemed + loyaltyPointsRedeemed,
        lastOrderDate: placedDateStr,
        lastOrderAt: placedAtStr,
        createdAt: existingGuest?.createdAt || new Date().toISOString(),
      };

      setGuestCustomers((prev) => {
        const exists = prev.some((g) => g.phone10 === phone10);
        return exists
          ? prev.map((g) => (g.phone10 === phone10 ? guestRecord : g))
          : [guestRecord, ...prev];
      });

      void persistGuestCustomerToFirestore(guestRecord, resolvedGuestNumber);
    }

    const nextSavedOrdersCount = (currentUser?.savedOrdersCount || 0) + 1;
    const nextPastIds = Array.from(
      new Set([
        ...(currentUser?.pastOrderProductIds || []),
        ...newOrder.items.map((i) => i.productId),
      ])
    ).slice(0, 100);

    const nextLoyaltyPoints = Math.max(
      0,
      availableUserPoints - loyaltyPointsRedeemed + loyaltyPointsEarned
    );
    const nextTotalLoyaltyEarned =
      (currentUser?.totalLoyaltyEarned ?? availableUserPoints) + loyaltyPointsEarned;
    const nextTotalLoyaltyRedeemed =
      (currentUser?.totalLoyaltyRedeemed ?? 0) + loyaltyPointsRedeemed;

    if (currentUser) {
      const updatedUser: CustomerUser = {
        ...currentUser,
        savedOrdersCount: nextSavedOrdersCount,
        loyaltyPoints: nextLoyaltyPoints,
        totalLoyaltyEarned: nextTotalLoyaltyEarned,
        totalLoyaltyRedeemed: nextTotalLoyaltyRedeemed,
        pastOrderProductIds: nextPastIds,
        pastOrders: [newOrder, ...(currentUser.pastOrders || [])],
      };
      setCurrentUser(updatedUser);
      if (!currentUser.isGuest) {
        setRegisteredUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
      }
    }

    if (isValidFirestoreId(newOrder.orderId)) {
      queuePendingFsOrder(newOrder);
      void syncOrderToFirestore(newOrder);

      const isVerifiedSignedIn = Boolean(firebaseUser && firebaseUser.emailVerified);
      if (isVerifiedSignedIn && firebaseUser) {
        const userPath = `users/${firebaseUser.uid}`;
        void updateDoc(doc(db, 'users', firebaseUser.uid), {
          savedOrdersCount: Math.max(0, Math.min(100000, nextSavedOrdersCount)),
          loyaltyPoints: Math.max(0, Math.min(1000000, Math.floor(nextLoyaltyPoints))),
          totalLoyaltyEarned: Math.max(0, Math.min(1000000, Math.floor(nextTotalLoyaltyEarned))),
          totalLoyaltyRedeemed: Math.max(0, Math.min(1000000, Math.floor(nextTotalLoyaltyRedeemed))),
          pastOrderProductIds: nextPastIds.map((id) => truncateStr(id, 80)),
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        });
      }
    }

    return newOrder;
  };

  const clearActiveOrder = () => {
    setActiveOrder(null);
  };

  const cancelOrder = (orderId: string, reason: string) => {
    const cleanReason = truncateStr(reason.trim() || 'Cancelled by store', 300);
    const cancelledTime = truncateStr(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      40
    );
    const cancellerName = truncateStr(
      adminUser?.name || currentUser?.name || firebaseUser?.displayName || 'Store Incharge',
      100
    );

    const applyCancellation = (ord: OrderRecord): OrderRecord => ({
      ...ord,
      status: 'cancelled',
      cancelledAt: cancelledTime,
      cancelledBy: cancellerName,
      cancellationReason: cleanReason,
    });
    const existingTarget = allOrdersRef.current.find((ord) => ord.orderId === orderId);
    const shouldReverseLoyalty = Boolean(existingTarget && existingTarget.status !== 'cancelled');
    const earnedToReverse = existingTarget && shouldReverseLoyalty ? getOrderLoyaltyEarned(existingTarget) : 0;
    const redeemedToRefund = existingTarget && shouldReverseLoyalty ? getOrderLoyaltyRedeemed(existingTarget) : 0;
    const targetPhone10 = existingTarget ? normalizePhone10(existingTarget.contactPhone) : '';

    setAllOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? applyCancellation(ord) : ord))
    );
    setActiveOrder((prev) =>
      prev && prev.orderId === orderId ? applyCancellation(prev) : prev
    );
    setRegisteredUsers((prev) =>
      prev.map((user) => {
        const matchesUser =
          shouldReverseLoyalty &&
          existingTarget &&
          (user.id === existingTarget.customerUid ||
            Boolean(user.pastOrders?.some((o) => o.orderId === orderId)) ||
            (Boolean(targetPhone10) && normalizePhone10(user.phone) === targetPhone10));
        return {
          ...user,
          loyaltyPoints: matchesUser
            ? Math.max(0, (user.loyaltyPoints ?? 0) - earnedToReverse + redeemedToRefund)
            : user.loyaltyPoints,
          totalLoyaltyEarned: matchesUser
            ? Math.max(0, (user.totalLoyaltyEarned ?? 0) - earnedToReverse)
            : user.totalLoyaltyEarned,
          totalLoyaltyRedeemed: matchesUser
            ? Math.max(0, (user.totalLoyaltyRedeemed ?? 0) - redeemedToRefund)
            : user.totalLoyaltyRedeemed,
          pastOrders: user.pastOrders?.map((ord) =>
            ord.orderId === orderId ? applyCancellation(ord) : ord
          ),
        };
      })
    );
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const matchesUser =
        shouldReverseLoyalty &&
        existingTarget &&
        (prev.id === existingTarget.customerUid ||
          Boolean(prev.pastOrders?.some((o) => o.orderId === orderId)) ||
          (Boolean(targetPhone10) && normalizePhone10(prev.phone) === targetPhone10));
      const nextPoints = matchesUser
        ? Math.max(0, (prev.loyaltyPoints ?? 0) - earnedToReverse + redeemedToRefund)
        : prev.loyaltyPoints;
      const nextEarned = matchesUser
        ? Math.max(0, (prev.totalLoyaltyEarned ?? 0) - earnedToReverse)
        : prev.totalLoyaltyEarned;
      const nextRedeemed = matchesUser
        ? Math.max(0, (prev.totalLoyaltyRedeemed ?? 0) - redeemedToRefund)
        : prev.totalLoyaltyRedeemed;

      if (
        matchesUser &&
        firebaseUser &&
        firebaseUser.emailVerified &&
        firebaseUser.uid === prev.id
      ) {
        void updateDoc(doc(db, 'users', firebaseUser.uid), {
          loyaltyPoints: Math.max(0, Math.min(1000000, Math.floor(nextPoints ?? 0))),
          totalLoyaltyEarned: Math.max(0, Math.min(1000000, Math.floor(nextEarned ?? 0))),
          totalLoyaltyRedeemed: Math.max(0, Math.min(1000000, Math.floor(nextRedeemed ?? 0))),
          updatedAt: serverTimestamp(),
        }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        });
      }

      return {
        ...prev,
        loyaltyPoints: nextPoints,
        totalLoyaltyEarned: nextEarned,
        totalLoyaltyRedeemed: nextRedeemed,
        pastOrders: prev.pastOrders?.map((ord) =>
          ord.orderId === orderId ? applyCancellation(ord) : ord
        ),
      };
    });

    if (existingTarget) {
      if (shouldReverseLoyalty && targetPhone10) {
        setGuestCustomers((prev) =>
          prev.map((g) => {
            if (g.phone10 !== targetPhone10) return g;
            return {
              ...g,
              loyaltyPoints: Math.max(0, (g.loyaltyPoints ?? 0) - earnedToReverse + redeemedToRefund),
              totalLoyaltyEarned: Math.max(0, (g.totalLoyaltyEarned ?? 0) - earnedToReverse),
              totalLoyaltyRedeemed: Math.max(0, (g.totalLoyaltyRedeemed ?? 0) - redeemedToRefund),
            };
          })
        );
      }
      syncGuestOrderMutation(applyCancellation(existingTarget));
    }

    if (
      firebaseUser &&
      firebaseUser.emailVerified &&
      firestoreOrderIdsRef.current.has(orderId)
    ) {
      const orderPath = `orders/${orderId}`;
      void updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        cancelledAt: cancelledTime,
        cancelledBy: cancellerName,
        cancellationReason: cleanReason,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, orderPath);
      });
    }
  };

  const submitLeadCapture = (email: string, phone: string, address: string) => {
    const record: LeadCapture = {
      email,
      phone,
      address,
      city: activeStore.city,
      submittedAt: new Date().toISOString(),
    };
    setLeadCaptures((prev) => [record, ...prev]);
    setLeadSubmittedSuccess(true);
  };

  const updateProductOnlineAvailability = (skuId: string, inStock: boolean, stockKg: number) => {
    setActiveStore((prevStore) => {
      const updatedInventory = { ...prevStore.inventory };
      const packs = Math.max(0, Math.floor(stockKg * 2));
      const isAvailable = inStock && packs > 0;

      const matchedProduct = PRODUCTS.find((p) => p.id === skuId);
      const isWeightAllowed = (w: WeightVariant) =>
        !matchedProduct?.availableWeights ||
        matchedProduct.availableWeights.length === 0 ||
        matchedProduct.availableWeights.includes(w);

      updatedInventory[skuId] = {
        '250g': { inStock: isAvailable && isWeightAllowed('250g'), stockCount: isWeightAllowed('250g') ? packs : 0 },
        '500g': { inStock: isAvailable && isWeightAllowed('500g'), stockCount: isWeightAllowed('500g') ? packs : 0 },
        '750g': { inStock: isAvailable && isWeightAllowed('750g'), stockCount: isWeightAllowed('750g') ? packs : 0 },
        '1kg': { inStock: isAvailable && isWeightAllowed('1kg'), stockCount: isWeightAllowed('1kg') ? packs : 0 },
      };

      return {
        ...prevStore,
        inventory: updatedInventory,
      };
    });
  };

  return (
    <StoreContext.Provider
      value={{
        stores: PHYSICAL_STORES,
        activeStore,
        userLocation,
        isLocationModalOpen,
        setIsLocationModalOpen,
        isOutOfAreaModalOpen,
        setIsOutOfAreaModalOpen,
        setLocationFromPreset,
        setUserCustomLocation,
        requestBrowserGeolocation,
        geoLoading,
        geoError,
        manuallySelectStore,

        selectedCategory,
        setSelectedCategory,
        selectedSubcategory,
        setSelectedSubcategory,
        searchQuery,
        setSearchQuery,
        selectedProductForDetail,
        setSelectedProductForDetail,

        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        updateCartItemNotes,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartCount,

        selectedSlot,
        setSelectedSlot,

        isCheckoutOpen,
        setIsCheckoutOpen,
        activeOrder,
        placeOrder,
        clearActiveOrder,
        orderSyncState,
        waitForOrderSync,
        retryOrderSync,

        leadCaptures,
        submitLeadCapture,
        leadSubmittedSuccess,
        setLeadSubmittedSuccess,

        isArchitectureOpen,
        setIsArchitectureOpen,

        firebaseUser,
        isAuthReady,
        authLoading,
        userRole,
        authNotice,
        showAuthNotice,
        dismissAuthNotice,
        loginWithGoogle,
        currentUser,
        adminUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isCustomerProfileOpen,
        setIsCustomerProfileOpen,
        authInitialTab,
        setAuthInitialTab,
        loginCustomer,
        registerCustomer,
        loginWithEmailPassword,
        updateCustomerProfile,
        addSavedAddress,
        updateSavedAddress,
        deleteSavedAddress,
        setDefaultAddress,
        loginAdmin,
        switchCustomerToStaffProfile,
        logoutCustomer,
        logoutAdmin,
        isAdminDashboardOpen,
        setIsAdminDashboardOpen,
        updateProductOnlineAvailability,
        hasCustomerOrderedProduct,

        wishlistProductIds,
        wishlistPreferences,
        wishlistProducts,
        isWishlisted,
        toggleWishlist,
        updateWishlistItemPreference,
        quickReorderWishlistItem,
        quickReorderAllWishlist,
        isWishlistDrawerOpen,
        setIsWishlistDrawerOpen,
        showFavoritesOnly,
        setShowFavoritesOnly,
        pendingWishlistProduct,
        wishlistNotice,
        dismissWishlistNotice,

        subscriptions,
        addSubscription,
        toggleSubscriptionPause,
        cancelSubscription,
        skipNextDelivery,

        storeIncharges,
        createStoreIncharge,
        updateStoreIncharge,
        deleteStoreIncharge,
        authenticateStaff,
        products,
        customPrices,
        updateProductPrice,
        allOrders,
        pendingIncomingOrders,
        isCloudOrdersConnected,
        isSyncingCloudOrders,
        lastCloudOrdersSyncAt,
        refreshCloudOrders,
        updateOrderStatus,
        acceptOrder,
        updateOrderFinalWeights,
        cancelOrder,
        requestedControlRoomNav,
        clearRequestedControlRoomNav,
        openControlRoomCustomerOrders,
        openControlRoomReports,
        registeredUsers,
        guestCustomers,
        profileDefaultTab,
        setProfileDefaultTab,
        loginCustomerWithOtp,
        featureFlags,
        toggleFeatureFlag,
        updateFeatureFlags,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
