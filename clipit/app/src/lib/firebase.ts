import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
  type UserCredential,
} from 'firebase/auth';

/** 本番既定値（deploy/build.config.mjs の CLIPIT_FIREBASE と同一） */
const CLIPIT_FIREBASE_DEFAULTS = {
  apiKey: 'AIzaSyApVwjoPSTnnciLZ30xm6g5xjF4T_10BvQ',
  authDomain: 'shigotoku-clipit-prod-ad9ee.firebaseapp.com',
  projectId: 'shigotoku-clipit-prod-ad9ee',
  storageBucket: 'shigotoku-clipit-prod-ad9ee.firebasestorage.app',
  messagingSenderId: '40045424162',
  appId: '1:40045424162:web:ecae24ef2b4ae6b211e47b',
} as const;

function envOrDefault(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

const firebaseConfig = {
  apiKey: envOrDefault(import.meta.env.VITE_FIREBASE_API_KEY, CLIPIT_FIREBASE_DEFAULTS.apiKey),
  authDomain: envOrDefault(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, CLIPIT_FIREBASE_DEFAULTS.authDomain),
  projectId: envOrDefault(import.meta.env.VITE_FIREBASE_PROJECT_ID, CLIPIT_FIREBASE_DEFAULTS.projectId),
  storageBucket: envOrDefault(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, CLIPIT_FIREBASE_DEFAULTS.storageBucket),
  messagingSenderId: envOrDefault(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    CLIPIT_FIREBASE_DEFAULTS.messagingSenderId,
  ),
  appId: envOrDefault(import.meta.env.VITE_FIREBASE_APP_ID, CLIPIT_FIREBASE_DEFAULTS.appId),
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let redirectResultPromise: Promise<UserCredential | null> | null = null;

/** Google リダイレクト結果（Strict Mode 二重呼び出し防止） */
export function resolveGoogleRedirect() {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth);
  }
  return redirectResultPromise;
}

/** Google ログイン: ポップアップ優先、ブロック時はリダイレクト */
export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export type { User };

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function signOutUser() {
  await firebaseSignOut(auth);
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'ドメイン app.clipit.shigotoku.com が Firebase に未登録です。Console → Authentication → Authorized domains から追加してください。';
    case 'auth/operation-not-allowed':
      return 'メール/パスワードログインが無効です。Firebase Console で有効化してください。';
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'メールアドレスまたはパスワードが正しくありません。';
    case 'auth/email-already-in-use':
      return 'このメールアドレスは既に登録されています。';
    case 'auth/weak-password':
      return 'パスワードは6文字以上で設定してください。';
    case 'auth/too-many-requests':
      return '試行回数が多すぎます。しばらく待ってから再度お試しください。';
    default:
      return (err as Error)?.message ?? '認証エラーが発生しました';
  }
}
