import { initializeApp, getApps } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';

/** shigotoku-prod Web アプリ（公開設定。deploy/build.config.mjs と同一） */
const PROD_FIREBASE = {
  apiKey: 'AIzaSyAMxl7Co5d5Kj52qt_Gh716Tob80f3qUTE',
  authDomain: 'shigotoku-prod.firebaseapp.com',
  projectId: 'shigotoku-prod',
  storageBucket: 'shigotoku-prod.firebasestorage.app',
  messagingSenderId: '750163975008',
  appId: '1:750163975008:web:d494d629951bfb05311c05',
} as const;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || PROD_FIREBASE.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || PROD_FIREBASE.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || PROD_FIREBASE.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || PROD_FIREBASE.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || PROD_FIREBASE.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || PROD_FIREBASE.appId,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);

let appInstance: ReturnType<typeof initializeApp> | undefined;
let authInstance: ReturnType<typeof getAuth> | undefined;

function getFirebaseApp() {
  if (!isFirebaseConfigured) return undefined;
  if (!appInstance) {
    appInstance = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return appInstance;
}

/** getAuth は popup/redirect 用 resolver を含む。initializeAuth 単体だと auth/argument-error になる */
export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error('Firebase Web アプリが未設定です');
  }
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth = getFirebaseAuth();
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
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    throw err;
  }
}

export async function signInDemo() {
  return signInAnonymously(auth);
}

export async function signInWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  displayName?: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName?.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return cred;
}

export async function resetPasswordEmail(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'ドメイン app.buzzit.shigotoku.com が Firebase に未登録です。Console → Authentication → Settings → Authorized domains から追加してください。';
    case 'auth/operation-not-allowed':
      return 'メール/パスワードログインが無効です。Firebase Console → Authentication → Sign-in method で有効化してください。';
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
    case 'auth/popup-blocked':
    case 'auth/cancelled-popup-request':
      return 'ログインがブロックされました。もう一度お試しください。';
    default:
      return (err as Error)?.message ?? 'ログインに失敗しました';
  }
}
