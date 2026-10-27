import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
  type UserCredential,
} from "firebase/auth";

const SHAPEIT_FIREBASE_DEFAULTS = {
  apiKey: "AIzaSyCTwpIDqlFesxKzrwszEp4l-LRzHaUZRBw",
  authDomain: "shigotoku-shapeit-prod.firebaseapp.com",
  projectId: "shigotoku-shapeit-prod",
  storageBucket: "shigotoku-shapeit-prod.firebasestorage.app",
  messagingSenderId: "379009375324",
  appId: "1:379009375324:web:bfeb626a2e22a4dd1e5a99",
} as const;

function envOrDefault(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

const firebaseConfig = {
  apiKey: envOrDefault(import.meta.env.VITE_FIREBASE_API_KEY, SHAPEIT_FIREBASE_DEFAULTS.apiKey),
  authDomain: envOrDefault(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, SHAPEIT_FIREBASE_DEFAULTS.authDomain),
  projectId: envOrDefault(import.meta.env.VITE_FIREBASE_PROJECT_ID, SHAPEIT_FIREBASE_DEFAULTS.projectId),
  storageBucket: envOrDefault(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, SHAPEIT_FIREBASE_DEFAULTS.storageBucket),
  messagingSenderId: envOrDefault(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    SHAPEIT_FIREBASE_DEFAULTS.messagingSenderId,
  ),
  appId: envOrDefault(import.meta.env.VITE_FIREBASE_APP_ID, SHAPEIT_FIREBASE_DEFAULTS.appId),
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

let redirectResultPromise: Promise<UserCredential | null> | null = null;

export function resolveGoogleRedirect() {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth);
  }
  return redirectResultPromise;
}

export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function linkGoogleToCurrentUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("ログインが必要です");
  return linkWithPopup(user, googleProvider);
}

export function authProviderLabels(user: User | null): string[] {
  if (!user) return [];
  const labels: string[] = [];
  for (const p of user.providerData) {
    if (p.providerId === "google.com") labels.push("Google");
    if (p.providerId === "password") labels.push("メール/パスワード");
  }
  return labels.length ? labels : ["メール/パスワード"];
}

export function hasGoogleLinked(user: User | null): boolean {
  return Boolean(user?.providerData.some((p) => p.providerId === "google.com"));
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

export async function updateUserDisplayName(name: string) {
  const user = auth.currentUser;
  if (!user) return;
  await updateProfile(user, { displayName: name.trim() });
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/unauthorized-domain":
      return "このドメインが Firebase に未登録です。Console → Authentication → Authorized domains を確認してください。";
    case "auth/operation-not-allowed":
      return "メール/パスワードログインが無効です。Firebase Console で有効化してください。";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません。";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/email-already-in-use":
      return "このメールアドレスは既に登録されています。ログインするか、招待リンクから参加してください。";
    case "auth/credential-already-in-use":
      return "この Google アカウントは別の ShapeIt アカウントで使われています。普段使う Google で新規登録するか、管理者に招待してもらってください。";
    case "auth/provider-already-linked":
      return "Google はすでにこのアカウントに連携済みです。";
    case "auth/account-exists-with-different-credential":
      return "同じメールが別の方法で登録されています。登録時と同じ方法（メールまたは Google）でログインしてください。";
    case "auth/weak-password":
      return "パスワードは6文字以上で設定してください。";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく待ってから再度お試しください。";
    case "permission-denied":
      return "保存の権限がありません。ページを再読み込みして再度お試しください。";
    default:
      return (err as Error)?.message ?? "認証エラーが発生しました";
  }
}
