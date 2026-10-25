import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, ArrowRight, Check } from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';
import BrandMark from '../components/BrandMark';
import { setupAccount } from '../lib/api';

type AccountType = 'individual' | 'business';

export default function AccountSetupPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyTaxId, setCompanyTaxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!accountType) return;
    if (accountType === 'business' && !companyName.trim()) {
      setError('会社名を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await setupAccount({
        accountType,
        companyName: accountType === 'business' ? companyName.trim() : undefined,
        companyTaxId: accountType === 'business' ? companyTaxId.trim() : undefined,
      });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アカウントの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="buzz-auth-page min-h-dvh">
      <header className="border-b border-neutral-200/80 bg-white/80 px-4 py-4 backdrop-blur-sm md:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <BrandMark className="buzz-logo-mark" size={28} />
          <span className="font-display text-lg font-bold">{BRAND_NAME}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <p className="buzz-section-label mb-3">はじめに</p>
        <h1 className="font-display text-2xl font-bold md:text-3xl">アカウントの種類を選んでください</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          課金・メンバー管理の単位になります。後から変更は管理者へご相談ください。
        </p>

        {error && <p className="buzz-alert buzz-alert-error mt-6">{error}</p>}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setAccountType('individual')}
            className={`buzz-card text-left p-6 transition ring-2 ${
              accountType === 'individual' ? 'ring-violet-600' : 'ring-transparent hover:ring-neutral-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <User className="h-8 w-8 text-neutral-700" />
              {accountType === 'individual' && <Check className="h-5 w-5 text-violet-600" />}
            </div>
            <h2 className="mt-4 text-lg font-bold">個人で利用</h2>
            <p className="mt-2 text-sm text-neutral-600">
              個人オーナー・一人店向け。アカウントは1つまで作成できます。
            </p>
            <ul className="mt-4 space-y-1 text-xs text-neutral-500">
              <li>・ログインユーザー1名</li>
              <li>・店舗スタッフ招待はプラン上限内</li>
            </ul>
          </button>

          <button
            type="button"
            onClick={() => setAccountType('business')}
            className={`buzz-card text-left p-6 transition ring-2 ${
              accountType === 'business' ? 'ring-violet-600' : 'ring-transparent hover:ring-neutral-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <Building2 className="h-8 w-8 text-neutral-700" />
              {accountType === 'business' && <Check className="h-5 w-5 text-violet-600" />}
            </div>
            <h2 className="mt-4 text-lg font-bold">法人・会社で利用</h2>
            <p className="mt-2 text-sm text-neutral-600">
              会社名義で運用。同じ会社のメンバーがデータを共有し、共同で操作できます。
            </p>
            <ul className="mt-4 space-y-1 text-xs text-neutral-500">
              <li>・会社メンバーを追加可能</li>
              <li>・追加ユーザーは月額 +¥1,980/人（予定）</li>
              <li>・複数店舗の一元管理に向く</li>
            </ul>
          </button>
        </div>

        {accountType === 'business' && (
          <div className="buzz-card-pad mt-8 space-y-4">
            <div>
              <label htmlFor="companyName" className="buzz-label">会社名（必須）</label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="buzz-input"
                placeholder="例: メディトク株式会社"
              />
            </div>
            <div>
              <label htmlFor="companyTaxId" className="buzz-label">インボイス登録番号（任意）</label>
              <input
                id="companyTaxId"
                type="text"
                value={companyTaxId}
                onChange={(e) => setCompanyTaxId(e.target.value)}
                className="buzz-input"
                placeholder="T1234567890123"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!accountType || submitting}
          onClick={handleSubmit}
          className="buzz-btn-accent mt-8 w-full py-3.5"
        >
          {submitting ? '作成中...' : 'この内容で進む'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="mt-4 text-center text-xs text-neutral-500">
          現在はモニター期間のため、登録直後は課金されません。
        </p>
      </main>
    </div>
  );
}
