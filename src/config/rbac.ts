export type AppRole = 'customer' | 'admin' | 'store_incharge';

export type AdminNavSection =
  | 'customer_orders'
  | 'realtime_stock'
  | 'subscriptions'
  | 'reports'
  | 'store_incharges'
  | 'waste_log'
  | 'features'
  | 'system_specs';

export interface RolePermissionConfig {
  role: AppRole;
  label: string;
  canAccessAdminPortal: boolean;
  allowedSections: AdminNavSection[];
  canManageInventory: boolean;
  canManageOrders: boolean;
  canManageSubscriptions: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewWasteLog: boolean;
  canViewSystemSpecs: boolean;
}

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissionConfig> = {
  admin: {
    role: 'admin',
    label: 'Admin',
    canAccessAdminPortal: true,
    allowedSections: [
      'customer_orders',
      'realtime_stock',
      'subscriptions',
      'reports',
      'store_incharges',
      'waste_log',
      'features',
      'system_specs',
    ],
    canManageInventory: true,
    canManageOrders: true,
    canManageSubscriptions: true,
    canViewReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewWasteLog: true,
    canViewSystemSpecs: true,
  },
  store_incharge: {
    role: 'store_incharge',
    label: 'Store Incharge',
    canAccessAdminPortal: true,
    allowedSections: ['realtime_stock', 'customer_orders', 'subscriptions'],
    canManageInventory: true,
    canManageOrders: true,
    canManageSubscriptions: true,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewWasteLog: false,
    canViewSystemSpecs: false,
  },
  customer: {
    role: 'customer',
    label: 'Customer',
    canAccessAdminPortal: false,
    allowedSections: [],
    canManageInventory: false,
    canManageOrders: false,
    canManageSubscriptions: false,
    canViewReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewWasteLog: false,
    canViewSystemSpecs: false,
  },
};

export const ADMIN_SECTION_TO_PATH: Record<AdminNavSection, string> = {
  customer_orders: '/admin/orders',
  realtime_stock: '/admin/inventory',
  subscriptions: '/admin/subscriptions',
  reports: '/admin/reports',
  store_incharges: '/admin/users',
  waste_log: '/admin/waste',
  features: '/admin/settings',
  system_specs: '/admin/specs',
};

export const ADMIN_PATH_ALIASES: Record<string, AdminNavSection> = {
  '/admin/dashboard': 'realtime_stock',
  '/admin/inventory': 'realtime_stock',
  '/admin/orders': 'customer_orders',
  '/admin/subscriptions': 'subscriptions',
  '/admin/reports': 'reports',
  '/admin/users': 'store_incharges',
  '/admin/incharges': 'store_incharges',
  '/admin/waste': 'waste_log',
  '/admin/settings': 'features',
  '/admin/features': 'features',
  '/admin/specs': 'system_specs',
};

export function normalizeAppRole(role?: string | null): AppRole {
  if (!role) return 'customer';
  const clean = role.trim().toLowerCase();
  if (
    clean === 'admin' ||
    clean === 'store operations manager' ||
    clean === 'root admin' ||
    clean === 'corporate admin'
  ) {
    return 'admin';
  }
  if (
    clean === 'store_incharge' ||
    clean === 'store incharge' ||
    clean === 'store admin' ||
    clean === 'staff'
  ) {
    return 'store_incharge';
  }
  return 'customer';
}

export function canAccessAdminSection(role: AppRole, section: AdminNavSection): boolean {
  return ROLE_PERMISSIONS[role].allowedSections.includes(section);
}

export function getSectionFromAdminPath(pathname: string): AdminNavSection | null {
  const normalized = pathname.replace(/\/+$/, '') || '/admin/dashboard';
  if (normalized === '/admin') return 'realtime_stock';
  return ADMIN_PATH_ALIASES[normalized] || null;
}

export function getPathForAdminSection(section: AdminNavSection): string {
  return ADMIN_SECTION_TO_PATH[section];
}

export function canAccessAdminRoute(
  role: AppRole,
  pathname: string
): { allowed: boolean; section: AdminNavSection | null; isKnownRoute: boolean } {
  if (!ROLE_PERMISSIONS[role].canAccessAdminPortal) {
    return { allowed: false, section: null, isKnownRoute: Boolean(getSectionFromAdminPath(pathname)) };
  }
  const section = getSectionFromAdminPath(pathname);
  if (!section) {
    return { allowed: false, section: null, isKnownRoute: false };
  }
  return {
    allowed: canAccessAdminSection(role, section),
    section,
    isKnownRoute: true,
  };
}
