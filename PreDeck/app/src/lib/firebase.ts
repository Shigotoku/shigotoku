import { initializeApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";

// 専用プロジェクト（shigotoku-predeck-prod）の公開用設定。環境変数で与える。
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/** 未設定なら Firebase を初期化せず、ログイン不要の機能（PDF・録音・文字起こし）だけ動かす */
export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.appId && cfg.projectId);

const app = isFirebaseConfigured ? (getApps()[0] ?? initializeApp(cfg)) : null;
const auth = app ? getAuth(app) : null;

const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });

export function onAuthChanged(cb: (u: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error("Firebase が未設定です");
  try {
    await signInWithPopup(auth, google);
  } catch (e) {
    const code = (e as { code?: string }).code;
    // ポップアップが使えない環境（COOP など）はリダイレクト方式にする
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") await signInWithRedirect(auth, google);
    else throw e;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!auth) throw new Error("Firebase が未設定です");
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  if (!auth) throw new Error("Firebase が未設定です");
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error("Firebase が未設定です");
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOut(): Promise<void> {
  if (auth) await fbSignOut(auth);
}

export async function getIdToken(): Promise<string | null> {
  return auth?.currentUser ? auth.currentUser.getIdToken() : null;
}

export function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code === "auth/unauthorized-domain") return "このドメインが Firebase に未登録です（Authentication → 承認済みドメイン）。";
  if (code === "auth/operation-not-allowed") return "このログイン方法が無効です。Firebase Console で有効化してください。";
  if (code === "auth/invalid-email") return "メールアドレスの形式が正しくありません。";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
    return "メールアドレスまたはパスワードが正しくありません。";
  if (code === "auth/email-already-in-use") return "このメールアドレスは既に登録されています。ログインしてください。";
  if (code === "auth/weak-password") return "パスワードは 6 文字以上で設定してください。";
  if (code === "auth/too-many-requests") return "試行回数が多すぎます。しばらく待ってからお試しください。";
  if (code === "auth/account-exists-with-different-credential")
    return "同じメールが別の方法で登録されています。登録時と同じ方法でログインしてください。";
  return (err as Error)?.message ?? "ログインに失敗しました";
}

export type { User };
