import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'purukumar16@gmail.com';

export interface StoreAdminGoogleConfig {
  email: string;
  storeId: string;
  storeName: string;
  shortLabel: string;
  defaultName: string;
}

export const STORE_ADMIN_GOOGLE_ACCOUNTS: Record<string, StoreAdminGoogleConfig> = {
  'fthisirihub@gmail.com': {
    email: 'fthisirihub@gmail.com',
    storeId: 'store_isiri_hub',
    storeName: 'FreshToHome Retails ISIRI HUB',
    shortLabel: 'ISIRI HUB',
    defaultName: 'ISIRI HUB Store Admin',
  },
  'fthgramiq@gmail.com': {
    email: 'fthgramiq@gmail.com',
    storeId: 'store_gramiq_hypermart',
    storeName: 'FreshToHome Retails Gramiq Hypermart',
    shortLabel: 'Gramiq Hypermart',
    defaultName: 'Gramiq Hypermart Store Admin',
  },
};

export function getStoreAdminConfigForEmail(
  email: string | null | undefined
): StoreAdminGoogleConfig | null {
  if (!email) return null;
  return STORE_ADMIN_GOOGLE_ACCOUNTS[email.trim().toLowerCase()] || null;
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();
