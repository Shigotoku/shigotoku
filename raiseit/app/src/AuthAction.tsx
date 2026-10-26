import { useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "./lib";

// パスワード設定メールのリンク先(Firebase 標準ハンドラの代わりに自前で処理する)
export default function AuthAction() {
  const q = new URLSearchParams(window.location.search);
  const mode = q.get("mode");
  const code = q.get("oobCode") ?? "";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"checking" | "form" | "done" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (mode !== "resetPassword" || !code) return setState("invalid");
    verifyPasswordResetCode(auth, code).then((e) => { setEmail(e); setState("form"); }).catch(() => setState("invalid"));
  }, [mode, code]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg("8文字以上で入力してください。");
    try {
      await confirmPasswordReset(auth, code, pw);
      setState("done");
    } catch {
      setMsg("設定できませんでした。リンクの有効期限が切れた可能性があります。もう一度メールを送ってください。");
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="text-2xl font-bold">レイジット</div>
        {state === "checking" && <p className="text-slate-500">確認中…</p>}
        {state === "invalid" && (
          <>
            <p>このリンクは無効か、有効期限が切れています。</p>
            <a className="text-mint underline" href="/">ログイン画面でもう一度メールを送る</a>
          </>
        )}
        {state === "form" && (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-slate-600">{email} の新しいパスワードを設定します。</p>
            <input className="w-full border rounded-lg p-3" type="password" autoComplete="new-password" placeholder="新しいパスワード(8文字以上)" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button className="w-full rounded-lg bg-ink text-white py-3 font-semibold">設定する</button>
            {msg && <p className="text-sm text-rose-600">{msg}</p>}
          </form>
        )}
        {state === "done" && (
          <>
            <p>パスワードを設定しました。</p>
            <a className="block text-center rounded-lg bg-ink text-white py-3 font-semibold" href="/">ログインへ</a>
          </>
        )}
      </div>
    </div>
  );
}
