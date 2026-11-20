import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Clock,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  Sparkles,
  Scissors,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Building,
  Briefcase,
  Home,
  Check,
  AlertCircle,
  Repeat,
  Calendar,
  Play,
  Pause,
  FastForward,
  Heart,
  RotateCcw,
  Package,
  Truck,
  XCircle,
  Award,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { canAccessAdminSection } from '../../config/rbac';
import { OrderRecord, SavedAddress, WeightVariant } from '../../types';
import { formatWeightGrams, getEffectiveItemLineTotal } from '../../utils/orderWeight';
import {
  calculateLoyaltyPointsEarned,
  computeLoyaltyExpirySummary,
  getOrderLoyaltyDiscount,
  getOrderLoyaltyEarned,
  getOrderLoyaltyRedeemed,
  LOYALTY_EARN_RATE_PER_100,
  LOYALTY_EXPIRY_MONTHS,
  LOYALTY_POINT_VALUE_INR,
} from '../../utils/loyalty';

const getCustomerOrderStatusMeta = (status: OrderRecord['status']) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Order Confirmed',
        subtext: 'Awaiting acceptance by store team',
        stepIndex: 0,
        cardBg: 'bg-amber-50/70 border-amber-300',
        titleColor: 'text-amber-950',
        dotColor: 'bg-amber-500',
        badgeClass: 'text-amber-900 bg-amber-200/80 border border-amber-300',
        detailColor: 'text-amber-900',
        subDetailColor: 'text-amber-800',
        borderColor: 'border-amber-200',
      };
    case 'allocated':
      return {
        label: 'Accepted · Preparing',
        subtext: 'Accepted by store · Preparing fresh cuts',
        stepIndex: 1,
        cardBg: 'bg-amber-50/80 border-emerald-300',
        titleColor: 'text-emerald-950',
        dotColor: 'bg-emerald-500 animate-pulse',
        badgeClass: 'text-amber-900 bg-amber-100 border border-amber-300',
        detailColor: 'text-emerald-900',
        subDetailColor: 'text-emerald-800',
        borderColor: 'border-emerald-200',
      };
    case 'butchered_sealed':
      return {
        label: 'Cutting & Vacuum Sealed',
        subtext: 'Freshly cut and sealed in 0°C–4°C cold chain',
        stepIndex: 2,
        cardBg: 'bg-purple-50/80 border-purple-300',
        titleColor: 'text-purple-950',
        dotColor: 'bg-purple-600 animate-pulse',
        badgeClass: 'text-purple-900 bg-purple-200/80 border border-purple-300',
        detailColor: 'text-purple-900',
        subDetailColor: 'text-purple-800',
        borderColor: 'border-purple-200',
      };
    case 'out_for_delivery':
      return {
        label: 'Out for Delivery',
        subtext: 'Dispatched via 45-min hyperlocal cold-chain courier',
        stepIndex: 3,
        cardBg: 'bg-sky-50/80 border-sky-300',
        titleColor: 'text-sky-950',
        dotColor: 'bg-sky-500 animate-pulse',
        badgeClass: 'text-sky-900 bg-sky-200/80 border border-sky-300',
        detailColor: 'text-sky-900',
        subDetailColor: 'text-sky-800',
        borderColor: 'border-sky-200',
      };
    case 'delivered':
      return {
        label: 'Delivered',
        subtext: 'Delivered fresh to your doorstep',
        stepIndex: 4,
        cardBg: 'bg-emerald-50/70 border-emerald-300',
        titleColor: 'text-emerald-950',
        dotColor: 'bg-emerald-600',
        badgeClass: 'text-emerald-900 bg-emerald-200/80 border border-emerald-300',
        detailColor: 'text-emerald-900',
        subDetailColor: 'text-emerald-800',
        borderColor: 'border-emerald-200',
      };
    case 'cancelled':
    default:
      return {
        label: 'Cancelled',
        subtext: 'Order was cancelled',
        stepIndex: -1,
        cardBg: 'bg-rose-50/80 border-rose-300',
        titleColor: 'text-rose-950',
        dotColor: 'bg-rose-500',
        badgeClass: 'text-rose-800 bg-rose-200 border border-rose-300',
        detailColor: 'text-rose-900',
        subDetailColor: 'text-rose-800',
        borderColor: 'border-rose-200',
      };
  }
};

const ORDER_PROGRESS_LABELS = [
  'Confirmed',
  'Accepted',
  'Cut & Sealed',
  'Out for Delivery',
  'Delivered',
];

export const CustomerProfileModal: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const navigate = useNavigate();
  const {
    isCustomerProfileOpen,
    setIsCustomerProfileOpen,
    currentUser,
    logoutCustomer,
    updateCustomerProfile,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    setDefaultAddress,
    activeStore,
    activeOrder,
    allOrders,
    subscriptions,
    toggleSubscriptionPause,
    cancelSubscription,
    skipNextDelivery,
    wishlistProducts,
    wishlistPreferences,
    toggleWishlist,
    quickReorderWishlistItem,
    quickReorderAllWishlist,
    setSelectedProductForDetail,
    adminUser,
    userRole,
    profileDefaultTab,
    setProfileDefaultTab,
    cart,
    setIsCheckoutOpen,
  } = useStore();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isCustomerProfileOpen;
  const handleClose = () => {
    setProfileDefaultTab('profile');
    if (propOnClose) {
      propOnClose();
    } else {
      setIsCustomerProfileOpen(false);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const [activeTab, setActiveTab] = useState<
    'profile' | 'loyalty' | 'wishlist' | 'addresses' | 'orders' | 'subscriptions'
  >('profile');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(profileDefaultTab);
    }
  }, [isOpen, profileDefaultTab]);

  // Profile Edit State
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [preferredCut, setPreferredCut] = useState(
    currentUser?.preferredCut || 'Small Curry Cut, Descaled'
  );
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Address Modal/Form State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form Fields for Add/Edit Address
  const [addrLabel, setAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [recipientName, setRecipientName] = useState(currentUser?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(currentUser?.phone || '');
  const [flatBuilding, setFlatBuilding] = useState('');
  const [streetArea, setStreetArea] = useState('Budigere Cross, Bommenahalli');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560049');
  const [isDefault, setIsDefault] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setPreferredCut(currentUser.preferredCut || 'Small Curry Cut, Descaled');
      setRecipientName(currentUser.name || '');
      setRecipientPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomerProfile({
      name: name.trim(),
      phone: phone.trim(),
      preferredCut,
    });
    setProfileSuccessMsg(true);
    setTimeout(() => setProfileSuccessMsg(false), 2500);
  };

  const handleStartAddAddress = () => {
    setEditingAddressId(null);
    setAddrLabel('Home');
    setRecipientName(currentUser.name);
    setRecipientPhone(currentUser.phone);
    setFlatBuilding('');
    setStreetArea('Budigere Cross, Bommenahalli');
    setLandmark('');
    setCity('Bengaluru');
    setPincode('560049');
    setIsDefault(currentUser.savedAddresses?.length === 0);
    setAddrError(null);
    setIsAddingAddress(true);
  };

  const handleStartEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddrLabel((addr.label as 'Home' | 'Work' | 'Other') || 'Home');
    setRecipientName(addr.recipientName || currentUser.name);
    setRecipientPhone(addr.recipientPhone || currentUser.phone);
    setFlatBuilding(addr.flatBuilding || '');
    setStreetArea(addr.streetArea || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Bengaluru');
    setPincode(addr.pincode || '560049');
    setIsDefault(addr.isDefault);
    setAddrError(null);
    setIsAddingAddress(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatBuilding.trim() || !streetArea.trim()) {
      setAddrError('Please provide complete flat/house details and area.');
      return;
    }

    const formattedAddress = [flatBuilding, streetArea, landmark ? `Near ${landmark}` : '', city, pincode]
      .filter(Boolean)
      .join(', ');

    // Use approximate coordinates for Budigere Cross / Doddabanahalli corridor
    const lat = streetArea.toLowerCase().includes('doddabanahalli') ? 13.0180 : 13.0440;
    const lon = streetArea.toLowerCase().includes('doddabanahalli') ? 77.7510 : 77.7445;

    if (editingAddressId) {
      updateSavedAddress(editingAddressId, {
        label: addrLabel,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        flatBuilding: flatBuilding.trim(),
        streetArea: streetArea.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        isDefault,
        formattedAddress,
        latitude: lat,
        longitude: lon,
      });
    } else {
      addSavedAddress({
        label: addrLabel,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        flatBuilding: flatBuilding.trim(),
        streetArea: streetArea.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        isDefault,
        formattedAddress,
        latitude: lat,
        longitude: lon,
      });
    }

    setIsAddingAddress(false);
    setEditingAddressId(null);
  };

  const addresses = currentUser.savedAddresses || [];

  // Unified customer orders list shared across Loyalty & Orders tabs
  const liveById = new Map(allOrders.map((o) => [o.orderId, o]));
  const normalizeDigits = (val?: string) => (val || '').replace(/\D/g, '').slice(-10);
  const userPhone10 = normalizeDigits(currentUser.phone);
  const customerOrderMap = new Map<string, OrderRecord>();

  if (activeOrder) {
    const resolvedActive = liveById.get(activeOrder.orderId) || activeOrder;
    const activePhoneMatches =
      Boolean(userPhone10) &&
      userPhone10.length === 10 &&
      normalizeDigits(resolvedActive.contactPhone) === userPhone10;
    if (
      !resolvedActive.customerUid ||
      resolvedActive.customerUid === currentUser.id ||
      activePhoneMatches
    ) {
      customerOrderMap.set(resolvedActive.orderId, resolvedActive);
    }
  }

  allOrders.forEach((ord) => {
    const matchesUid = ord.customerUid === currentUser.id;
    const matchesPhone =
      Boolean(userPhone10) &&
      userPhone10.length === 10 &&
      normalizeDigits(ord.contactPhone) === userPhone10;
    if (matchesUid || matchesPhone) {
      customerOrderMap.set(ord.orderId, ord);
    }
  });

  (currentUser.pastOrders || []).forEach((ord) => {
    const liveOrd = liveById.get(ord.orderId) || ord;
    if (!customerOrderMap.has(liveOrd.orderId)) {
      customerOrderMap.set(liveOrd.orderId, liveOrd);
    }
  });

  const customerOrders = Array.from(customerOrderMap.values());
  const loyaltyBalance = Math.max(0, Math.floor(currentUser.loyaltyPoints ?? 0));
  const totalLoyaltyEarned = Math.max(
    loyaltyBalance,
    Math.floor(currentUser.totalLoyaltyEarned ?? loyaltyBalance)
  );
  const totalLoyaltyRedeemed = Math.max(0, Math.floor(currentUser.totalLoyaltyRedeemed ?? 0));

  const demoSeedEntries =
    currentUser.id === 'cust-demo-1'
      ? [
          {
            orderId: 'FMS-842109',
            dateStr: '2024-11-10',
            dateLabel: '10 Nov 2024',
            summary: 'Rohu Fish (Small Curry Cut) 1kg + Catla Fish 1kg',
            amount: 620,
            earned: calculateLoyaltyPointsEarned(620),
            redeemed: 0,
            discount: 0,
            status: 'delivered' as const,
          },
          {
            orderId: 'FMS-731902',
            dateStr: '2024-11-03',
            dateLabel: '03 Nov 2024',
            summary: 'Fresh Farm Chicken Curry Cut 500g + Seer Fish Slices 500g',
            amount: 780,
            earned: calculateLoyaltyPointsEarned(780),
            redeemed: 0,
            discount: 0,
            status: 'delivered' as const,
          },
        ]
      : [];

  const loyaltyPurchaseRows = [
    ...customerOrders.map((ord) => {
      const earned = getOrderLoyaltyEarned(ord);
      const redeemed = getOrderLoyaltyRedeemed(ord);
      const discount = getOrderLoyaltyDiscount(ord);
      const firstItem = ord.items[0]
        ? `${ord.items[0].quantity}x ${ord.items[0].product.name}`
        : 'Fresh Cuts';
      const extraCount = ord.items.length > 1 ? ` +${ord.items.length - 1} more` : '';
      return {
        orderId: ord.orderId,
        dateStr: ord.placedDate || ord.placedAt || '',
        dateLabel: `${ord.placedDate || ''} ${ord.placedAt ? `· ${ord.placedAt}` : ''}`.trim(),
        summary: `${firstItem}${extraCount}`,
        amount: ord.total,
        earned,
        redeemed,
        discount,
        status: ord.status,
      };
    }),
    ...demoSeedEntries,
  ];

  const listedEarnedTotal = loyaltyPurchaseRows.reduce((s, r) => s + r.earned, 0);
  const bonusPointsDiff = Math.max(0, totalLoyaltyEarned - listedEarnedTotal);
  const bonusBatchLabel =
    currentUser.id === 'cust-demo-1'
      ? 'Prior Member Purchases & Gold Bonus'
      : 'Welcome Member Loyalty Bonus';

  const loyaltyExpirySummary = computeLoyaltyExpirySummary({
    availableBalance: loyaltyBalance,
    totalRedeemed: totalLoyaltyRedeemed,
    batches: [
      ...loyaltyPurchaseRows
        .filter((row) => row.status !== 'cancelled' && row.earned > 0)
        .map((row) => ({
          id: row.orderId,
          label: `#${row.orderId}`,
          earnedPoints: row.earned,
          dateStr: row.dateStr,
          dateDisplay: row.dateLabel || row.dateStr,
        })),
      ...(bonusPointsDiff > 0
        ? [
            {
              id: '__bonus__',
              label: bonusBatchLabel,
              earnedPoints: bonusPointsDiff,
              dateStr: currentUser.memberSince,
              dateDisplay: currentUser.memberSince,
              isBonus: true,
            },
          ]
        : []),
    ],
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-2xl my-auto transition-all bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-purple-950/20 max-h-[90vh] flex flex-col">
        {/* Customer Header */}
        <div className="bg-[#21093b] p-4 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-2 rounded-xl bg-purple-900/70 text-purple-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Close profile"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 pr-10">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-bold text-lg sm:text-xl shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  {currentUser.name}
                </h3>
                {currentUser.isGuest && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-200 font-semibold px-2 py-0.5 rounded-full border border-amber-300/40">
                    Guest Customer{currentUser.guestNumber ? ` #${currentUser.guestNumber}` : ''}
                  </span>
                )}
                {currentUser.customerType && currentUser.customerType !== 'Customer' && (
                  <span className="text-[10px] bg-purple-800/80 text-purple-100 font-semibold px-2 py-0.5 rounded-full border border-purple-400/50">
                    {currentUser.customerType} · Customer
                  </span>
                )}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/40">
                  {currentUser.isGuest ? 'OTP Verified' : 'Fresh Gold Member'}
                </span>
              </div>
              <p className="text-xs text-purple-200/90 mt-0.5 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                {!currentUser.isGuest && (
                  <>
                    <span className="truncate max-w-full">{currentUser.email}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span>{currentUser.phone}</span>
                <span aria-hidden="true">·</span>
                <span>Member since {currentUser.memberSince}</span>
              </p>
              {adminUser && (
                <div className="mt-2 inline-flex flex-wrap items-center gap-2 text-[11px] bg-purple-950/70 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-emerald-200">
                  <span>
                    Simultaneous Staff Session: <strong className="text-white">{adminUser.name}</strong> ({adminUser.role})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate('/admin/dashboard');
                    }}
                    className="text-emerald-300 hover:text-white underline font-semibold cursor-pointer"
                  >
                    Open Control Room
                  </button>
                  {canAccessAdminSection(userRole, 'reports') && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        navigate('/admin/reports');
                      }}
                      className="text-amber-300 hover:text-white underline font-semibold cursor-pointer"
                    >
                      Reports Dashboard
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 border-t border-purple-800/80 pt-3 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('loyalty')}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'loyalty'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Loyalty Points ({loyaltyBalance})</span>
              {loyaltyExpirySummary.expiringSoonPoints > 0 && (
                <span
                  className="ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-400 text-stone-950"
                  title={`${loyaltyExpirySummary.expiringSoonPoints} points older than ${LOYALTY_EXPIRY_MONTHS} months expiring soon`}
                >
                  Expiring
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wishlist')}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'wishlist'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Wishlist ({wishlistProducts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('addresses')}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'addresses'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Saved Addresses ({addresses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              className={`min-h-[44px] sm:min-h-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'subscriptions'
                  ? 'bg-white text-purple-950 shadow-xs'
                  : 'text-purple-200 hover:text-white hover:bg-purple-900/50'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Subscriptions ({subscriptions.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* ================= TAB 1: PROFILE & WALLET ================= */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Wallet & Loyalty Quick Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-[#21093b] text-white rounded-2xl border border-purple-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-800/80 border border-purple-600/60 flex items-center justify-center text-emerald-400 shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-purple-200 font-medium block">
                        Fresh Wallet Credit
                      </span>
                      <span className="text-xl font-bold font-mono tabular-nums text-emerald-300">
                        ₹{currentUser.walletBalance}
                      </span>
                      <p className="text-[10px] text-purple-300 mt-0.5">Available store credit</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-900 shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5 flex-wrap">
                        <span>Loyalty Points</span>
                        {loyaltyExpirySummary.expiringSoonPoints > 0 && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            Expiring soon
                          </span>
                        )}
                      </span>
                      <span className="text-xl font-bold font-mono tabular-nums text-purple-950">
                        {loyaltyBalance} pts
                      </span>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                        = ₹{loyaltyBalance * LOYALTY_POINT_VALUE_INR} checkout discount
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('loyalty')}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-purple-50 text-purple-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <span>History</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {loyaltyExpirySummary.expiringSoonPoints > 0 && (
                <div
                  role="alert"
                  className="p-3.5 sm:p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300">
                          Expiring Soon
                        </span>
                        <h5 className="text-xs font-bold text-amber-950">
                          {loyaltyExpirySummary.expiringSoonPoints} Loyalty{' '}
                          {loyaltyExpirySummary.expiringSoonPoints === 1 ? 'Point' : 'Points'} (worth ₹
                          {loyaltyExpirySummary.expiringSoonValueInr} off)
                        </h5>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Earned over {LOYALTY_EXPIRY_MONTHS} months ago
                        {loyaltyExpirySummary.oldestExpiringDateLabel
                          ? ` (oldest from ${loyaltyExpirySummary.oldestExpiringDateLabel})`
                          : ''}
                        . Redeem them on your next order before they expire.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        if (cart.length > 0) {
                          setIsCheckoutOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      {cart.length > 0
                        ? `Redeem ₹${loyaltyExpirySummary.expiringSoonValueInr}`
                        : 'Shop & Redeem'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('loyalty')}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-950 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Details
                    </button>
                  </div>
                </div>
              )}

              {profileSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Profile and butcher cut preferences updated successfully!</span>
                </div>
              )}

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950/80">
                  Account Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs sm:text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Primary Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs sm:text-sm border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-900 focus:border-purple-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address (Login ID)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full min-h-[44px] sm:min-h-0 px-3 py-2 text-xs sm:text-sm border border-stone-200 rounded-xl bg-stone-50 text-stone-500 cursor-not-allowed"
                    title="Email is your unique account identifier"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">Used for signing in and digital invoices.</p>
                </div>

                {/* Butchery Cut Preferences */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-purple-900" />
                    <span>Default Butchery & Cutting Preference</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      'Small Curry Cut, Descaled',
                      'Large Biryani Cut',
                      'Fillet / Boneless Slices',
                      'Whole Cleaned & Gutted',
                    ].map((cut) => (
                      <button
                        type="button"
                        key={cut}
                        onClick={() => setPreferredCut(cut)}
                        className={`min-h-[44px] sm:min-h-0 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          preferredCut === cut
                            ? 'border-purple-900 bg-stone-100 text-purple-950 font-semibold ring-1 ring-purple-900 shadow-2xs'
                            : 'border-stone-200 text-stone-700 hover:bg-stone-50 text-xs'
                        }`}
                      >
                        <span className="text-[11px] block leading-snug">{cut}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 1B: LOYALTY POINTS TRACKER ================= */}
          {activeTab === 'loyalty' && (
              <div className="space-y-5">
                {/* Balance Hero Card */}
                <div className="p-5 bg-[#21093b] text-white rounded-2xl border border-purple-700/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-purple-800/80 border border-purple-600/60 flex items-center justify-center text-emerald-300 shrink-0">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-purple-200 font-medium block">
                          Available Loyalty Points
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                          <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-300">
                            {loyaltyBalance} pts
                          </span>
                          <span className="text-xs text-purple-200 font-mono tabular-nums">
                            (Worth ₹{loyaltyBalance * LOYALTY_POINT_VALUE_INR} off)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        if (cart.length > 0) {
                          setIsCheckoutOpen(true);
                        }
                      }}
                      className="min-h-[40px] px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      {cart.length > 0 ? 'Redeem at Checkout' : 'Shop to Earn & Redeem'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-purple-800/80 text-xs">
                    <div className="bg-purple-950/60 rounded-xl p-2.5 border border-purple-800/60">
                      <span className="text-[10px] text-purple-300 block">Earn &amp; Redeem Rate</span>
                      <span className="font-mono font-bold text-white tabular-nums mt-0.5 block">
                        {LOYALTY_EARN_RATE_PER_100} {LOYALTY_EARN_RATE_PER_100 === 1 ? 'pt' : 'pts'} / ₹100 · ₹{LOYALTY_POINT_VALUE_INR}/pt
                      </span>
                    </div>
                    <div className="bg-purple-950/60 rounded-xl p-2.5 border border-purple-800/60">
                      <span className="text-[10px] text-purple-300 block">Total Earned</span>
                      <span className="font-mono font-bold text-emerald-300 tabular-nums mt-0.5 block">
                        +{totalLoyaltyEarned} pts
                      </span>
                    </div>
                    <div className="bg-purple-950/60 rounded-xl p-2.5 border border-purple-800/60">
                      <span className="text-[10px] text-purple-300 block">Total Redeemed</span>
                      <span className="font-mono font-bold text-amber-300 tabular-nums mt-0.5 block">
                        -{totalLoyaltyRedeemed} pts
                      </span>
                    </div>
                    <div
                      className={`rounded-xl p-2.5 border ${
                        loyaltyExpirySummary.expiringSoonPoints > 0
                          ? 'bg-amber-950/60 border-amber-500/60'
                          : 'bg-purple-950/60 border-purple-800/60'
                      }`}
                    >
                      <span className="text-[10px] text-purple-300 block">Expiring (12+ mos)</span>
                      <span
                        className={`font-mono font-bold tabular-nums mt-0.5 block ${
                          loyaltyExpirySummary.expiringSoonPoints > 0
                            ? 'text-amber-300'
                            : 'text-stone-300'
                        }`}
                      >
                        {loyaltyExpirySummary.expiringSoonPoints} pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiring Soon Warning Banner */}
                {loyaltyExpirySummary.expiringSoonPoints > 0 && (
                  <div
                    role="alert"
                    className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 border border-amber-300">
                            Expiring Soon
                          </span>
                          <h5 className="text-xs sm:text-sm font-bold text-amber-950">
                            {loyaltyExpirySummary.expiringSoonPoints} pts (worth ₹
                            {loyaltyExpirySummary.expiringSoonValueInr} discount) are older than{' '}
                            {LOYALTY_EXPIRY_MONTHS} months
                          </h5>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed">
                          Earned from {loyaltyExpirySummary.oldestExpiringDateLabel || 'earlier orders'} (
                          {loyaltyExpirySummary.oldestExpiringAgeMonths}+ months ago). Use them on your next order so you don&apos;t lose your savings — oldest points are always redeemed first at checkout.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        if (cart.length > 0) {
                          setIsCheckoutOpen(true);
                        }
                      }}
                      className="min-h-[38px] px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
                    >
                      {cart.length > 0
                        ? `Apply ₹${loyaltyExpirySummary.expiringSoonValueInr} Now`
                        : 'Shop & Redeem Points'}
                    </button>
                  </div>
                )}

                {/* Per-Purchase Points History */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950/80">
                        Points Earned Per Purchase
                      </h4>
                      <p className="text-[11px] text-stone-500">
                        Earn {LOYALTY_EARN_RATE_PER_100} Loyalty{' '}
                        {LOYALTY_EARN_RATE_PER_100 === 1 ? 'Point' : 'Points'} for every ₹100 spent. Redeem 1 pt = ₹{LOYALTY_POINT_VALUE_INR} off at checkout.
                      </p>
                    </div>
                  </div>

                  {loyaltyPurchaseRows.length === 0 && bonusPointsDiff === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-2.5">
                      <Award className="w-8 h-8 text-stone-300 mx-auto" />
                      <h5 className="font-semibold text-stone-800 text-sm">No Purchase Points Yet</h5>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        Place an order to start earning {LOYALTY_EARN_RATE_PER_100}{' '}
                        {LOYALTY_EARN_RATE_PER_100 === 1 ? 'point' : 'points'} per ₹100 spent and track points per order here.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-stone-200 rounded-2xl divide-y divide-stone-200 overflow-hidden bg-white">
                      {loyaltyPurchaseRows.map((row) => {
                        const isCancelled = row.status === 'cancelled';
                        const batchStatus = loyaltyExpirySummary.batchesById[row.orderId];
                        const isRowExpiringSoon = Boolean(batchStatus?.isExpiringSoon);
                        return (
                          <div
                            key={row.orderId}
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                              isRowExpiringSoon
                                ? 'bg-amber-50/45 hover:bg-amber-50/75'
                                : 'hover:bg-stone-50/70'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold font-mono text-stone-900">
                                  #{row.orderId}
                                </span>
                                <span className="text-[11px] text-stone-500">{row.dateLabel}</span>
                                {isCancelled && (
                                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                    Cancelled
                                  </span>
                                )}
                                {isRowExpiringSoon && batchStatus && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                    <span>
                                      Expiring soon · {batchStatus.ageMonths}m old
                                    </span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-600 truncate">{row.summary}</p>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 sm:gap-0.5 shrink-0">
                              <span className="text-xs font-mono font-semibold text-stone-700 tabular-nums">
                                Order ₹{row.amount}
                              </span>
                              <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                                {row.redeemed > 0 && !isCancelled && (
                                  <span className="text-amber-700 font-semibold">
                                    -{row.redeemed} pts (₹{row.discount} off)
                                  </span>
                                )}
                                <span
                                  className={`font-bold ${
                                    isCancelled
                                      ? 'text-stone-400'
                                      : isRowExpiringSoon
                                      ? 'text-amber-800'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {isCancelled ? '0 pts (Reversed)' : `+${row.earned} pts`}
                                  {isRowExpiringSoon &&
                                    batchStatus &&
                                    batchStatus.remainingPoints < row.earned &&
                                    ` (${batchStatus.remainingPoints} left)`}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {bonusPointsDiff > 0 && (() => {
                        const bonusStatus = loyaltyExpirySummary.batchesById['__bonus__'];
                        const isBonusExpiringSoon = Boolean(bonusStatus?.isExpiringSoon);
                        return (
                          <div
                            className={`p-3.5 flex items-center justify-between gap-3 ${
                              isBonusExpiringSoon ? 'bg-amber-50/55' : 'bg-stone-50/80'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-stone-900">
                                  {bonusBatchLabel}
                                </span>
                                {isBonusExpiringSoon && bonusStatus && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                    <Clock className="w-2.5 h-2.5 shrink-0" />
                                    <span>
                                      Expiring soon · {bonusStatus.ageMonths}m old
                                    </span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-stone-500 block">
                                Credited for membership ({currentUser.memberSince}) &amp; prior verified orders
                              </span>
                            </div>
                            <span
                              className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                                isBonusExpiringSoon ? 'text-amber-800' : 'text-emerald-700'
                              }`}
                            >
                              +{bonusPointsDiff} pts
                              {isBonusExpiringSoon &&
                                bonusStatus &&
                                bonusStatus.remainingPoints < bonusPointsDiff &&
                                ` (${bonusStatus.remainingPoints} left)`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
          )}

          {/* ================= TAB 1C: SAVED WISHLIST ================= */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950/80">
                    Saved Favorites for Quick Re-Ordering
                  </h4>
                  <p className="text-xs text-stone-500">
                    Your hearted fish, seafood, chicken, mutton, and egg cuts synced to your account.
                  </p>
                </div>

                {wishlistProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      quickReorderAllWishlist();
                      handleClose();
                    }}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-Order All ({wishlistProducts.length})</span>
                  </button>
                )}
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl space-y-3">
                  <Heart className="w-8 h-8 text-stone-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-stone-700">No saved favorites yet.</p>
                    <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                      Tap the heart icon on any fresh cut in the catalog to save it here for 1-click re-ordering.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Browse Fresh Catalog
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {wishlistProducts.map((product) => {
                    const savedPref = wishlistPreferences[product.id];
                    const fallbackWeight: WeightVariant =
                      product.availableWeights && !product.availableWeights.includes('500g')
                        ? product.availableWeights[0]
                        : '500g';
                    const weight: WeightVariant =
                      savedPref?.weight &&
                      (!product.availableWeights ||
                        product.availableWeights.length === 0 ||
                        product.availableWeights.includes(savedPref.weight))
                        ? savedPref.weight
                        : fallbackWeight;
                    const variant = product.variants[weight];
                    const storeStock = activeStore.inventory[product.id]?.[weight];
                    const isAvailable = storeStock ? storeStock.inStock && storeStock.stockCount > 0 : true;

                    return (
                      <div
                        key={product.id}
                        className="p-3.5 rounded-xl border border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={product.image}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className="w-13 h-13 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleClose();
                                setSelectedProductForDetail(product);
                              }}
                              className="text-xs font-bold text-stone-900 hover:text-purple-900 text-left cursor-pointer truncate block"
                            >
                              {product.name}
                            </button>
                            <div className="text-[11px] text-stone-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="font-mono font-semibold text-stone-800">{weight}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold text-purple-950 tabular-nums">
                                ₹{variant.price}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{product.subcategory}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => toggleWishlist(product.id)}
                            className="min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            aria-label={`Remove ${product.name} from wishlist`}
                            title="Remove from Wishlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                              quickReorderWishlistItem(product.id, weight);
                              handleClose();
                            }}
                            className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              isAvailable
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isAvailable ? 'Quick Re-Order' : 'Out of Stock'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 2: SAVED ADDRESSES ================= */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950/80">
                    Your Delivery Locations
                  </h4>
                  <p className="text-xs text-stone-500">
                    Each address is checked against our strict 4km chill-chain SLA.
                  </p>
                </div>
                {!isAddingAddress && (
                  <button
                    type="button"
                    onClick={handleStartAddAddress}
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {/* Add / Edit Address Form */}
              {isAddingAddress && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3.5 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <h5 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-700" />
                      <span>{editingAddressId ? 'Edit Address' : 'Add New Delivery Address'}</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {addrError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{addrError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveAddress} className="space-y-3">
                    {/* Label selection */}
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Address Label
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {(['Home', 'Work', 'Other'] as const).map((l) => (
                          <button
                            type="button"
                            key={l}
                            onClick={() => setAddrLabel(l)}
                            className={`min-h-[40px] sm:min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              addrLabel === l
                                ? 'bg-purple-900 text-white shadow-2xs'
                                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            {l === 'Home' && <Home className="w-3 h-3" />}
                            {l === 'Work' && <Briefcase className="w-3 h-3" />}
                            {l === 'Other' && <Building className="w-3 h-3" />}
                            <span>{l}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Recipient Name
                        </label>
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="text"
                          required
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Flat / Villa / House No. & Building Name <span className="text-purple-900">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 402, Tower B, Godrej Woodscapes"
                        value={flatBuilding}
                        onChange={(e) => setFlatBuilding(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                        Street / Area / Neighborhood <span className="text-purple-900">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Budigere Cross, Bommenahalli"
                        value={streetArea}
                        onChange={(e) => setStreetArea(e.target.value)}
                        className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                      />
                      {/* Hyperlocal quick chips */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-stone-400">Quick 4km presets:</span>
                        {[
                          'Budigere Cross, Bommenahalli',
                          'Doddabanahalli, Hoskote Rd',
                          'Prestige Tranquility, Budigere',
                          'Brigade Signature Towers, Kattugol',
                        ].map((preset) => (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => setStreetArea(preset)}
                            className="text-[10px] bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            {preset.split(',')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Landmark
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Near Shell bunk"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Pincode
                        </label>
                        <input
                          type="text"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className="w-full min-h-[44px] sm:min-h-0 px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-900 font-mono"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="rounded text-purple-900 focus:ring-purple-900 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-stone-700 font-medium">
                        Set as default address for orders
                      </span>
                    </label>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingAddress(false)}
                        className="min-h-[44px] sm:min-h-0 px-3 py-1.5 border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="min-h-[44px] sm:min-h-0 px-4 py-1.5 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {editingAddressId ? 'Update Address' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Saved Addresses List */}
              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl space-y-2">
                    <MapPin className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="text-xs text-stone-600 font-medium">No saved addresses yet.</p>
                    <p className="text-[11px] text-stone-400">
                      Add your home or office address to enable one-click fresh delivery.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartAddAddress}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Address</span>
                    </button>
                  </div>
                ) : (
                  addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        addr.isDefault
                          ? 'border-purple-900 bg-stone-50 ring-1 ring-purple-900/60 shadow-2xs'
                          : 'border-stone-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              addr.isDefault
                                ? 'bg-purple-900 text-white'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {addr.label === 'Home' && <Home className="w-4 h-4" />}
                            {addr.label === 'Work' && <Briefcase className="w-4 h-4" />}
                            {addr.label !== 'Home' && addr.label !== 'Work' && (
                              <Building className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-stone-900">
                                {addr.label}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.2 rounded-full">
                                  Default
                                </span>
                              )}
                              <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.2 rounded">
                                Within 4km SLA
                              </span>
                            </div>

                            <p className="text-xs text-stone-800 font-medium mt-1">
                              {addr.flatBuilding}, {addr.streetArea}
                            </p>
                            {addr.landmark && (
                              <p className="text-[11px] text-stone-500">
                                Landmark: {addr.landmark}
                              </p>
                            )}
                            <p className="text-[11px] text-stone-500">
                              {addr.city} - {addr.pincode} · Contact: {addr.recipientName} ({addr.recipientPhone})
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultAddress(addr.id)}
                              className="min-h-[38px] sm:min-h-0 text-[11px] text-purple-900 hover:text-purple-950 font-semibold px-2.5 py-1 bg-white hover:bg-stone-100 rounded-md border border-stone-200 transition-colors cursor-pointer"
                              title="Set as active delivery address"
                            >
                              Set Default
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEditAddress(addr)}
                            className="min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md cursor-pointer transition-colors"
                            aria-label="Edit address"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {addresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteSavedAddress(addr.id)}
                              className="min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 flex items-center justify-center p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                              aria-label="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: ORDERS HISTORY ================= */}
          {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950/80">
                    Order History & Live Status
                  </h4>
                  <span className="text-[11px] text-stone-500">
                    Status updates live when updated by Store Team
                  </span>
                </div>

                {customerOrders.length === 0 && currentUser.id !== 'cust-demo-1' ? (
                  <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-2.5">
                    <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center mx-auto">
                      <Package className="w-5 h-5" />
                    </div>
                    <h5 className="font-semibold text-stone-800 text-sm">No Orders Placed Yet</h5>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                      Once you place an order, its status will appear here and update as Admin or Store Incharge processes your cuts and dispatch.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => {
                      const meta = getCustomerOrderStatusMeta(order.status);
                      const isCancelled = order.status === 'cancelled';
                      const earnedPts = getOrderLoyaltyEarned(order);
                      const redeemedPts = getOrderLoyaltyRedeemed(order);
                      const discountAmt = getOrderLoyaltyDiscount(order);

                      return (
                        <div
                          key={order.orderId}
                          className={`p-4 border rounded-2xl space-y-2.5 ${meta.cardBg}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`text-xs font-bold flex items-center gap-1.5 ${meta.titleColor}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                              <span>
                                Order #{order.orderId}
                                {order.placedAt ? ` · ${order.placedAt}` : ''}
                              </span>
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${meta.badgeClass}`}
                            >
                              {order.status === 'out_for_delivery' && (
                                <Truck className="w-3 h-3 shrink-0" />
                              )}
                              {order.status === 'delivered' && (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              )}
                              {order.status === 'cancelled' && (
                                <XCircle className="w-3 h-3 shrink-0" />
                              )}
                              <span>{meta.label}</span>
                            </span>
                          </div>

                          <p className={`text-[11px] font-semibold ${meta.subDetailColor}`}>
                            {meta.subtext}
                            {order.acceptedAt && order.status !== 'confirmed' && !isCancelled
                              ? ` (Accepted at ${order.acceptedAt}${
                                  order.acceptedBy ? ` by ${order.acceptedBy}` : ''
                                })`
                              : ''}
                          </p>

                          {!isCancelled && (
                            <div className="grid grid-cols-5 gap-1 pt-1">
                              {ORDER_PROGRESS_LABELS.map((stageLabel, idx) => {
                                const reached = meta.stepIndex >= idx;
                                const isCurrent = meta.stepIndex === idx;
                                return (
                                  <div key={stageLabel} className="space-y-1">
                                    <div
                                      className={`h-1.5 rounded-full transition-colors ${
                                        reached
                                          ? order.status === 'delivered'
                                            ? 'bg-emerald-600'
                                            : isCurrent
                                            ? 'bg-purple-800'
                                            : 'bg-emerald-500'
                                          : 'bg-stone-200/90'
                                      }`}
                                    />
                                    <div
                                      className={`text-[9px] leading-tight text-center font-medium ${
                                        isCurrent
                                          ? 'text-purple-950 font-bold'
                                          : reached
                                          ? 'text-stone-700'
                                          : 'text-stone-400'
                                      }`}
                                    >
                                      {stageLabel}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {isCancelled && order.cancellationReason && (
                            <p className="text-xs text-rose-800 font-medium">
                              Reason: {order.cancellationReason}
                            </p>
                          )}

                          <p className={`text-xs ${meta.detailColor}`}>
                            Store Hub: <strong>{order.store.name}</strong> ({order.temperatureLog})
                          </p>
                          <div className={`text-[11px] ${meta.subDetailColor} space-y-1`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold">Items:</span>
                              {order.weightUpdatedAt && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                                  Final Weight &amp; Bill Updated ({order.weightUpdatedAt})
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5 pl-1">
                              {order.items.map((i, itemIdx) => {
                                const lineTotal = getEffectiveItemLineTotal(i);
                                const origLine = Math.round(i.unitPrice * i.quantity);
                                return (
                                  <div key={`${i.id}-${itemIdx}`} className="flex items-center justify-between gap-2">
                                    <span>
                                      • {i.product.name} ({i.selectedWeight} × {i.quantity})
                                      {typeof i.finalWeightGrams === 'number' && (
                                        <strong className="ml-1 text-purple-950">
                                          → Final: {formatWeightGrams(i.finalWeightGrams)}
                                        </strong>
                                      )}
                                    </span>
                                    <span className="font-mono shrink-0 font-semibold">
                                      ₹{lineTotal}
                                      {lineTotal !== origLine && (
                                        <span className="ml-1 text-[10px] opacity-60 line-through font-normal">
                                          ₹{origLine}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <p className={`text-[11px] ${meta.subDetailColor}`}>
                            Destination: {order.deliveryAddress}
                          </p>
                          <div
                            className={`flex flex-wrap items-center justify-between gap-2 text-xs pt-1.5 border-t font-semibold ${meta.borderColor} ${meta.titleColor}`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{order.items.length} Chilled Cut{order.items.length > 1 ? 's' : ''}</span>
                              {!isCancelled && earnedPts > 0 && (
                                <span className="font-mono text-[11px] text-emerald-700 tabular-nums">
                                  +{earnedPts} pts earned
                                </span>
                              )}
                              {!isCancelled && redeemedPts > 0 && (
                                <span className="font-mono text-[11px] text-purple-800 tabular-nums">
                                  · {redeemedPts} pts redeemed (-₹{discountAmt})
                                </span>
                              )}
                            </div>
                            <span className="font-mono flex items-center gap-1.5">
                              {typeof order.originalTotal === 'number' &&
                                order.originalTotal !== order.total && (
                                  <span className="text-[11px] opacity-60 line-through font-normal">
                                    Est. ₹{order.originalTotal}
                                  </span>
                                )}
                              <span className={order.weightUpdatedAt ? 'text-purple-950 font-bold' : ''}>
                                {order.weightUpdatedAt ? `Updated Bill: ₹${order.total}` : `₹${order.total}`}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentUser.id === 'cust-demo-1' && (
                  <>
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800">Order #FMS-842109</span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                          Delivered · 10 Nov 2024
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">
                        Rohu Fish (Small Curry Cut) 1kg + Catla Fish (Curry Cut) 1kg
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-stone-200 text-stone-500">
                        <span>Delivered in 28 mins · 0°C to 4°C Chilled</span>
                        <span className="font-mono tabular-nums flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold">
                            +{calculateLoyaltyPointsEarned(620)} pts
                          </span>
                          <span className="font-semibold text-purple-950">₹620 (Paid)</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800">Order #FMS-731902</span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                          Delivered · 03 Nov 2024
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">
                        Fresh Farm Chicken Curry Cut 500g + Seer Fish Slices 500g
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-stone-200 text-stone-500">
                        <span>Delivered in 24 mins · Verified Chilled</span>
                        <span className="font-mono tabular-nums flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold">
                            +{calculateLoyaltyPointsEarned(780)} pts
                          </span>
                          <span className="font-semibold text-purple-950">₹780 (Paid)</span>
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
          )}

          {/* ================= TAB 4: MY SUBSCRIPTIONS ================= */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950/80">
                    Recurring Weekly Deliveries & Subscriptions
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Save 10% on every scheduled delivery. Free insulated cold-chain thermal packaging.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs self-start sm:self-auto">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>10% OFF Locked In</span>
                </span>
              </div>

              {subscriptions.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center mx-auto">
                    <Repeat className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-stone-800 text-sm">No Active Subscriptions Yet</h5>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      Set up recurring weekly deliveries of your household staples like Chicken Curry Cuts, Breast Boneless, Fresh Rohu, Seer Fish, or Salmon and save 10% on every order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Browse Fresh Cuts & Staples
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => {
                    const isActive = sub.status === 'active';
                    return (
                      <div
                        key={sub.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isActive
                            ? 'border-stone-200 bg-white hover:border-purple-300 shadow-2xs'
                            : 'border-stone-200 bg-stone-50/80 opacity-80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={sub.productImage}
                              alt={sub.productName}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="text-xs font-bold text-stone-900">
                                  {sub.productName}
                                </h5>
                                <span className="font-semibold text-[11px] text-stone-800 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                                  {sub.selectedWeight}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isActive
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {isActive ? 'Active' : 'Paused'}
                                </span>
                              </div>

                              <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 font-medium text-purple-950">
                                  <Calendar className="w-3 h-3 text-purple-800" />
                                  <strong className="capitalize">{sub.frequency}</strong> on <strong className="text-purple-900">{sub.deliveryDay}s</strong>
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{sub.deliverySlot}</span>
                              </div>

                              <div className="text-[11px] text-stone-500 mt-0.5">
                                <span>Butchery: <strong className="text-stone-700">{sub.cuttingStyle || 'Standard'}</strong></span>
                                {sub.customNotes && <span> · "{sub.customNotes}"</span>}
                              </div>

                              <p className="text-[11px] text-stone-500 mt-0.5">
                                Delivering to: <span className="text-stone-700">{sub.deliveryAddress}</span>
                              </p>
                            </div>
                          </div>

                          {/* Price & Savings */}
                          <div className="text-right sm:self-center shrink-0">
                            <div className="text-xs">
                              <span className="line-through text-stone-400 font-mono text-[11px] mr-1.5">
                                ₹{sub.originalPrice}
                              </span>
                              <strong className="text-sm font-bold font-mono text-emerald-800">
                                ₹{sub.discountedPrice}
                              </strong>
                              <span className="text-[10px] text-stone-500 block">/ delivery</span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                              Save ₹{sub.savingsPerDelivery} (10% OFF)
                            </span>
                          </div>
                        </div>

                        {/* Subscription Actions Bar */}
                        <div className="mt-3 pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>Next Dispatch: <strong className="text-stone-800">{sub.nextDeliveryDate}</strong></span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => skipNextDelivery(sub.id)}
                              className="min-h-[40px] sm:min-h-0 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-semibold text-[11px] border border-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Skip only the next upcoming weekly delivery"
                            >
                              <FastForward className="w-3 h-3" />
                              <span>Skip Next</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleSubscriptionPause(sub.id)}
                              className={`min-h-[40px] sm:min-h-0 px-2.5 py-1 rounded-md font-semibold text-[11px] border transition-colors cursor-pointer flex items-center gap-1 ${
                                isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                              title={isActive ? 'Pause recurring deliveries' : 'Resume subscription'}
                            >
                              {isActive ? (
                                <>
                                  <Pause className="w-3 h-3" />
                                  <span>Pause</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" />
                                  <span>Resume</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Cancel recurring delivery for ${sub.productName}?`)) {
                                  cancelSubscription(sub.id);
                                }
                              }}
                              className="min-h-[40px] sm:min-h-0 px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md font-semibold text-[11px] transition-colors cursor-pointer"
                              title="Cancel subscription"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                logoutCustomer();
                handleClose();
              }}
              className="min-h-[44px] sm:min-h-0 flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-900 font-semibold cursor-pointer py-1 px-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleClose();
                navigate('/login?switch=1');
              }}
              className="min-h-[44px] sm:min-h-0 text-xs text-purple-900 hover:text-purple-950 font-semibold underline cursor-pointer py-1 px-2"
            >
              Switch / Dual Login
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] sm:min-h-0 px-5 py-2 bg-purple-900 hover:bg-purple-950 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
