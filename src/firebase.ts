import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';

function pickCleanConfigValue(envVal: unknown, fallback: string): string {
  const cleaned = typeof envVal === 'string' ? envVal.trim() : '';
  return cleaned.length > 0 ? cleaned : fallback.trim();
}

const env = import.meta.env;

const firebaseConfig = {
  apiKey: pickCleanConfigValue(
    env.VITE_FIREBASE_API_KEY,
    'AIzaSyDpkW2JyTj_-WHlRbxB0_sG5ytjOFd2gxU'
  ),
  authDomain: pickCleanConfigValue(env.VITE_FIREBASE_AUTH_DOMAIN, 'ateeg-gam.firebaseapp.com'),
  projectId: pickCleanConfigValue(env.VITE_FIREBASE_PROJECT_ID, 'ateeg-gam'),
  storageBucket: pickCleanConfigValue(
    env.VITE_FIREBASE_STORAGE_BUCKET,
    'ateeg-gam.firebasestorage.app'
  ),
  messagingSenderId: pickCleanConfigValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID, '221027412700'),
  appId: pickCleanConfigValue(
    env.VITE_FIREBASE_APP_ID,
    '1:221027412700:web:40691ae26253395830e219'
  ),
};

const customDatabaseId =
  typeof env.VITE_FIREBASE_DATABASE_ID === 'string' ? env.VITE_FIREBASE_DATABASE_ID.trim() : '';

const app = initializeApp(firebaseConfig);
export const db = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(() => {
  // Fallback automatically if strict private browser restricts localStorage
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const POPUP_FALLBACK_ERROR_CODES = new Set([
  'auth/popup-blocked',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
]);

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

export function formatFirebaseAuthError(error: unknown, contextArabic?: string): string {
  const err = error as { code?: unknown; message?: unknown } | null;
  const code = typeof err?.code === 'string' && err.code ? err.code : 'auth/unknown-error';
  const message =
    typeof err?.message === 'string' && err.message
      ? err.message
      : error instanceof Error
      ? error.message
      : String(error);
  const technical = `${code}: ${message}`;
  return contextArabic ? `${contextArabic} (${technical})` : `خطأ المصادقة (${technical})`;
}

/**
 * Captures any returning Google signInWithRedirect session on initial app load
 * BEFORE attaching onAuthStateChanged so the login screen never flashes mistakenly.
 */
export async function resolveGoogleRedirectAuth(): Promise<{
  user: User | null;
  errorMessage: string | null;
}> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return { user: result.user, errorMessage: null };
    }
    return { user: auth.currentUser, errorMessage: null };
  } catch (err) {
    return {
      user: null,
      errorMessage: formatFirebaseAuthError(err, 'تعذر إكمال العودة من مصادقة Google'),
    };
  }
}

/**
 * Google Sign-In:
 * 1. Uses fast signInWithPopup first in standard browsers.
 * 2. Automatically switches to signInWithRedirect in the same click if popup is blocked
 *    or unsupported (auth/popup-blocked, auth/cancelled-popup-request,
 *    auth/operation-not-supported-in-this-environment).
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (popupErr) {
    const code =
      typeof (popupErr as { code?: unknown })?.code === 'string'
        ? (popupErr as { code: string }).code
        : '';

    if (POPUP_FALLBACK_ERROR_CODES.has(code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw popupErr;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Converts any human-friendly room code (Arabic or English) into a deterministic
 * Firestore-safe document ID matching ^[a-zA-Z0-9_\-]+$ (2..40 chars).
 */
export function sanitizeRoomId(rawCode: string): string {
  const trimmed = rawCode.trim();
  const asciiClean = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

  if (asciiClean.length >= 2) {
    return asciiClean.slice(0, 36);
  }

  // Deterministic safe hex hash for Arabic/non-ASCII secret room codes
  let hash = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `room_${hex}`;
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
