import { useState, useRef } from "react";
import {
  Settings,
  User,
  Building2,
  Shield,
  Bell,
  Save,
  Check,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Camera,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import {
  useCompanyStore,
  MEDICAL_FIELD_LABELS,
  type MedicalField,
} from "../../store/company";
import { isFirebaseConfigured, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, loading: authLoading, isDemo } = useAuthStore();
  const { company, updateCompany, updateCompanyInDB } = useCompanyStore();

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("画像ファイルは2MB以下にしてください");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルのみアップロードできます");
      return;
    }

    setAvatarUploading(true);
    setError("");

    try {
      if (isFirebaseConfigured && user) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `runwith/avatars/${user.id}.${ext}`;
        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, file, { contentType: file.type });
        const publicUrl = `${await getDownloadURL(storageRef)}?t=${Date.now()}`;
        setAvatarUrl(publicUrl);
        await updateProfile({ avatarUrl: publicUrl });
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setAvatarUrl(dataUrl);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setError(err?.message || "アップロードに失敗しました");
    } finally {
      setAvatarUploading(false);
    }
  };
  const [medicalMode, setMedicalMode] = useState(company?.isMedicalMode ?? false);
  const [medicalFields, setMedicalFields] = useState<MedicalField[]>(
    company?.medicalFields ?? []
  );

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleSave = async () => {
    setError("");
    try {
      if (isDemo || !isFirebaseConfigured) {
        updateCompany({ isMedicalMode: medicalMode, medicalFields });
      } else {
        const profileUpdates: { name?: string; avatarUrl?: string } = {};
        if (profileName !== user?.name) profileUpdates.name = profileName;
        if (avatarUrl !== user?.avatarUrl) profileUpdates.avatarUrl = avatarUrl;
        if (Object.keys(profileUpdates).length > 0) {
          await updateProfile(profileUpdates);
        }
        await updateCompanyInDB({ isMedicalMode: medicalMode, medicalFields });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || "保存に失敗しました");
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("パスワードは8文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("パスワードが一致しません");
      return;
    }
    try {
      await updatePassword(newPassword);
      setPasswordSaved(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err?.message || "パスワード変更に失敗しました");
    }
  };

  const toggleField = (field: MedicalField) => {
    setMedicalFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="mt-1 text-slate-500">
          アカウントと会社の設定を管理します
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">
                アカウント情報
              </h2>
            </div>
            <div className="space-y-4">
              {/* アバター */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="アバター"
                      className="h-20 w-20 rounded-full object-cover border-2 border-slate-200"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700 border-2 border-slate-200">
                      {profileName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-slate-200 text-slate-500 hover:text-primary-600 hover:border-primary-300 transition-colors shadow-sm"
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">プロフィール画像</p>
                  <p className="text-xs text-slate-400 mt-0.5">JPG, PNG（2MB以下）</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    画像を変更
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  お名前
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  メールアドレス
                </label>
                <input
                  type="email"
                  defaultValue={user?.email || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  メールアドレスの変更はサポートにお問い合わせください
                </p>
              </div>
            </div>
          </div>

          {isFirebaseConfigured && !isDemo && (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-slate-600" />
                  <h2 className="text-base font-bold text-slate-900">
                    パスワード変更
                  </h2>
                </div>
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  {showPasswordSection ? "閉じる" : "変更する"}
                </button>
              </div>

              {showPasswordSection && (
                <div className="space-y-4">
                  {passwordError && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="text-sm text-red-700">{passwordError}</p>
                    </div>
                  )}
                  {passwordSaved && (
                    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <p className="text-sm text-green-700">
                        パスワードを変更しました
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      新しいパスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8文字以上"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      パスワード確認
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="もう一度入力"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    disabled={authLoading}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-700 disabled:opacity-50"
                  >
                    {authLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "パスワードを変更"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="text-base font-bold text-slate-900">会社情報</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  会社名
                </label>
                <input
                  type="text"
                  defaultValue={company?.name || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  業種
                </label>
                <input
                  type="text"
                  defaultValue={company?.industry || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  代表者
                </label>
                <input
                  type="text"
                  defaultValue={company?.representativeName || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  資本金
                </label>
                <input
                  type="text"
                  defaultValue={company?.capitalAmount?.toLocaleString() || ""}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                医療モード
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              医療スタートアップ向けの専門機能を有効にします。薬機法ナビゲーターや臨床研究ロードマップなどが利用可能になります。
            </p>
            <label className="flex cursor-pointer items-center gap-3">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={medicalMode}
                  onChange={(e) => setMedicalMode(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-500" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {medicalMode ? "有効" : "無効"}
              </span>
            </label>

            {medicalMode && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  専門分野を選択
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(MEDICAL_FIELD_LABELS) as [
                      MedicalField,
                      string
                    ][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleField(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        medicalFields.includes(key)
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="sticky top-24 space-y-4">
            <button
              onClick={handleSave}
              disabled={authLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 disabled:opacity-50"
            >
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "保存しました" : "変更を保存"}
            </button>

            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">通知設定</h3>
              </div>
              <div className="space-y-3">
                {[
                  "補助金の新着情報",
                  "申請期限リマインダー",
                  "チームの更新通知",
                ].map((item) => (
                  <label
                    key={item}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-slate-600">{item}</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded accent-primary-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
