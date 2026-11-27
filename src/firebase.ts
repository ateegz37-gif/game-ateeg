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
import appletFirebaseConfig from '../firebase-applet-config.json';

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || appletFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || appletFirebaseConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || appletFirebaseConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || appletFirebaseConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletFirebaseConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || appletFirebaseConfig.appId,
};

const firestoreDatabaseId =
  env.VITE_FIREBASE_DATABASE_ID || appletFirebaseConfig.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(() => {
  // Some strict private browsers restrict localStorage persistence; Firebase falls back automatically
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const REDIRECT_PENDING_KEY = 'ateeg_google_redirect_pending_v1';
const REDIRECT_COOKIE_FALLBACK_KEY = 'ateeg_google_redirect_cookie_fallback_v1';

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

function setSessionFlag(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore restricted storage
  }
}

function getSessionFlag(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function clearSessionFlag(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore restricted storage
  }
}

/**
 * Checks the returning Google Redirect authentication result BEFORE attaching onAuthStateChanged.
 * Includes automatic smart fallback to signInWithPopup if third-party cookie restrictions drop the redirect state.
 */
export async function resolveGoogleRedirectAuth(): Promise<{
  user: User | null;
  errorMessage: string | null;
}> {
  const pendingTsRaw = getSessionFlag(REDIRECT_PENDING_KEY);
  const hasRecentPendingRedirect =
    pendingTsRaw !== null && Date.now() - Number(pendingTsRaw) < 5 * 60 * 1000;

  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      clearSessionFlag(REDIRECT_PENDING_KEY);
      clearSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY);
      return { user: result.user, errorMessage: null };
    }

    if (hasRecentPendingRedirect && !auth.currentUser) {
      // Redirect returned without a user (commonly caused by third-party cookie blocking / ITP)
      clearSessionFlag(REDIRECT_PENDING_KEY);
      setSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY, '1');
      try {
        const popupCred = await signInWithPopup(auth, googleProvider);
        clearSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY);
        return { user: popupCred.user, errorMessage: null };
      } catch (popupErr) {
        return {
          user: null,
          errorMessage: formatFirebaseAuthError(
            popupErr,
            'تعذر استكمال إعادة التوجيه بسبب قيود ملفات تعريف الارتباط (Third-party cookies)، واضغط زر الدخول مجدداً للمحاولة بالنافذة البديلة'
          ),
        };
      }
    }

    clearSessionFlag(REDIRECT_PENDING_KEY);
    return { user: auth.currentUser, errorMessage: null };
  } catch (redirectErr) {
    clearSessionFlag(REDIRECT_PENDING_KEY);
    setSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY, '1');
    try {
      const popupCred = await signInWithPopup(auth, googleProvider);
      clearSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY);
      return { user: popupCred.user, errorMessage: null };
    } catch (popupErr) {
      const redirectCode =
        typeof (redirectErr as { code?: unknown })?.code === 'string'
          ? (redirectErr as { code: string }).code
          : '';
      const primaryErr = redirectCode ? redirectErr : popupErr;
      return {
        user: null,
        errorMessage: formatFirebaseAuthError(primaryErr, 'فشل إتمام تسجيل الدخول عبر Google'),
      };
    }
  }
}

/**
 * Primary Google Sign-In using signInWithRedirect (mobile & In-App Browser friendly),
 * with automatic fallback to signInWithPopup if redirect fails or third-party cookies blocked a previous redirect.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const shouldPreferPopupFallback = getSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY) === '1';

  if (shouldPreferPopupFallback) {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      clearSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY);
      return cred.user;
    } catch (popupErr) {
      // Clear fallback flag so user can also retry redirect if popup was blocked
      clearSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY);
      throw popupErr;
    }
  }

  try {
    setSessionFlag(REDIRECT_PENDING_KEY, String(Date.now()));
    await signInWithRedirect(auth, googleProvider);
    // Browser will navigate away to Google OAuth
    return null;
  } catch (redirectErr) {
    clearSessionFlag(REDIRECT_PENDING_KEY);
    // Smart fallback to signInWithPopup if redirect is rejected (e.g. iframe / cookie restrictions)
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (popupErr) {
      const errObj = popupErr as { code?: string } | null;
      throw errObj?.code ? popupErr : redirectErr;
    }
  }
}

export async function signOutUser(): Promise<void> {
  clearSessionFlag(REDIRECT_PENDING_KEY);
  clearSessionFlag(REDIRECT_COOKIE_FALLBACK_KEY);
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
