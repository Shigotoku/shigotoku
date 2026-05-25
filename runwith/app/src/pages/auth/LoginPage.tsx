import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useCompanyStore } from "../../store/company";
import { isFirebaseConfigured } from "../../lib/firebase";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, loading, startDemo } = useAuthStore();
  const { company, setCompany } = useCompanyStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isFirebaseConfigured) {
      startDemo({
        id: "user-1",
        email: email || "demo@example.com",
        name: name || "デモユーザー",
      });
      if (!company) {
        navigate("/company/setup");
      } else {
        navigate(from);
      }
      return;
    }

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("お名前を入力してください");
          return;
        }
        if (password.length < 8) {
          setError("パスワードは8文字以上で入力してください");
          return;
        }
        const result = await signUp(email, password, name);
        if (result.needsEmailVerification) {
          setSuccess(
            "確認メールを送信しました。メール内のリンクをクリックしてからログインしてください。届かない場合は迷惑メールフォルダもご確認ください。"
          );
        } else {
          navigate("/company/setup");
        }
      } else {
        await signIn(email, password);
        if (!company) {
          navigate("/company/setup");
        } else {
          navigate(from);
        }
      }
    } catch (err: any) {
      const msg = err?.message || "エラーが発生しました";
      if (msg.includes("Invalid login")) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else if (msg.includes("already registered")) {
        setError("このメールアドレスは既に登録されています");
      } else if (msg.includes("Email not confirmed")) {
        setError("メールアドレスが未確認です。確認メールをご確認ください");
      } else {
        setError(msg);
      }
    }
  };

  const handleDemo = () => {
    startDemo({
      id: "demo-1",
      email: "demo@runwith.shigotoku.com",
      name: "田中太郎",
    });
    setCompany({
      id: "company-1",
      name: "株式会社シゴトク",
      nameKana: "カブシキガイシャシゴトク",
      industry: "IT・テクノロジー",
      phase: "seed",
      isMedicalMode: true,
      medicalFields: ["digital_health", "medical_ai"],
      foundedDate: "2025-04-01",
      postalCode: "100-0001",
      address: "東京都千代田区千代田1-1",
      representativeName: "田中太郎",
      capitalAmount: 5000000,
      employeeCount: 3,
      description: "スタートアップ支援プラットフォームの開発",
    });
    navigate("/dashboard");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
          <img src="/icon.png" alt="ランウィズ" className="h-14 w-14 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isSignUp ? "アカウント作成" : "ログイン"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isSignUp
            ? "無料でスタートアップの第一歩を"
            : "お帰りなさい。続きから始めましょう。"}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                お名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="田中太郎"
                className="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-4 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                パスワード
              </label>
              {!isSignUp && (
                <Link
                  to="/auth/reset-password"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  パスワードを忘れた方
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={isSignUp ? 8 : undefined}
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm transition-all focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {isSignUp && (
              <p className="mt-1 text-xs text-slate-400">8文字以上</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? "アカウントを作成" : "ログイン"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">または</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          onClick={handleDemo}
          className="w-full rounded-xl border-2 border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-primary-300 hover:bg-primary-50"
        >
          デモアカウントで体験する
        </button>

        <p className="mt-5 text-center text-sm text-slate-500">
          {isSignUp ? "既にアカウントをお持ちですか？" : "アカウントをお持ちでないですか？"}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setSuccess("");
            }}
            className="ml-1 font-semibold text-primary-600 hover:text-primary-700"
          >
            {isSignUp ? "ログイン" : "無料で作成"}
          </button>
        </p>
      </div>
    </div>
  );
}
