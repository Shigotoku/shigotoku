import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Compass, Sparkles } from 'lucide-react';
import { BRAND_NAME } from '../constants/brand';
import { industryTemplates, type IndustryId } from '../data/industryTemplates';
import { getPlatformCompanion, platformCompanions } from '../data/platformCompanions';
import {
  ONBOARDING_GOALS,
  completeOnboarding,
  loadOnboarding,
  type OnboardingGoal,
} from '../lib/onboarding';

const steps = ['ようこそ', '業種', '目的', '媒体', '次の一手'] as const;

function defaultPlatformForGoal(goal: OnboardingGoal, industryId: IndustryId): string {
  const industry = industryTemplates.find((t) => t.id === industryId);
  if (goal === 'repeat') return 'line';
  if (goal === 'aware') return 'tiktok';
  if (goal === 'hire') return 'x';
  const name = industry?.primaryPlatforms[0] ?? 'Instagram';
  const found = platformCompanions.find(
    (p) => p.name.includes(name) || name.includes(p.name.split(' ')[0] ?? ''),
  );
  return found?.id ?? 'instagram';
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const existing = loadOnboarding();
  const [step, setStep] = useState(0);
  const [industryId, setIndustryId] = useState<IndustryId>(existing.industryId ?? 'beauty');
  const [goal, setGoal] = useState<OnboardingGoal>(existing.goal ?? 'new');
  const [platformId, setPlatformId] = useState(
    existing.primaryPlatform ?? defaultPlatformForGoal('new', 'beauty'),
  );

  const companion = getPlatformCompanion(platformId) ?? platformCompanions[0];
  const industry = industryTemplates.find((t) => t.id === industryId)!;

  const recommendedPlatforms = useMemo(() => {
    const ids = new Set<string>();
    ids.add(defaultPlatformForGoal(goal, industryId));
    if (goal === 'new' || goal === 'repeat') ids.add('line');
    return platformCompanions.filter((p) => ids.has(p.id) || industry.primaryPlatforms.some((n) => p.name.includes(n.split('（')[0]!)));
  }, [goal, industryId, industry.primaryPlatforms]);

  const finish = (skipped: boolean) => {
    completeOnboarding({
      industryId,
      goal,
      primaryPlatform: platformId,
      skipped,
    });
    if (skipped) {
      navigate('/dashboard', { replace: true });
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-[#f5f4f0] text-neutral-900">
      <header className="border-b border-neutral-200 bg-[#f5f4f0]/95 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="buzz-logo-mark text-sm">B</span>
            <span className="font-display text-lg font-bold">{BRAND_NAME}</span>
          </div>
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-sm text-neutral-500 underline-offset-2 hover:underline"
          >
            あとで設定する
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 flex gap-1">
          {steps.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1 ${i <= step ? 'bg-neutral-900' : 'bg-neutral-200'}`}
              />
              <p
                className={`mt-2 hidden text-[10px] font-semibold tracking-wider uppercase sm:block ${
                  i <= step ? 'text-neutral-800' : 'text-neutral-400'
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {step === 0 && (
          <section className="space-y-6">
            <p className="buzz-section-label flex items-center gap-2">
              <Compass className="h-3.5 w-3.5" />
              Welcome
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-buzz-title)]">
              何から始めればいいか、一緒に決めましょう
            </h1>
            <p className="text-base leading-relaxed text-neutral-600">
              約2分です。業種と目的を聞くだけで、公式登録リンク・初投稿・BuzzIt連携までの順番が決まります。
              あとからいつでも変更できます。
            </p>
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                '公式SNSの登録ページへ迷わず誘導',
                '最初の投稿ネタまで具体化',
                '連携が終わるまでダッシュボードで進捗表示',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  {t}
                </li>
              ))}
            </ul>
            <button type="button" className="buzz-btn-primary" onClick={() => setStep(1)}>
              はじめる
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-bold">お店の業種はどれに近いですか？</h1>
            <p className="text-sm text-neutral-600">近いものを選ぶと、投稿ネタと導線が具体になります。</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {industryTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setIndustryId(t.id);
                    setPlatformId(defaultPlatformForGoal(goal, t.id));
                  }}
                  className={`border p-4 text-left transition-colors ${
                    industryId === t.id
                      ? 'border-neutral-900 bg-white'
                      : 'border-neutral-200 bg-white/70 hover:border-neutral-400'
                  }`}
                >
                  <p className="font-semibold">{t.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">{t.blurb}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="buzz-btn-secondary" onClick={() => setStep(0)}>
                戻る
              </button>
              <button type="button" className="buzz-btn-primary" onClick={() => setStep(2)}>
                次へ
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-bold">いま一番の目的は？</h1>
            <p className="text-sm text-neutral-600">KPIは1つに絞ると続きやすいです。</p>
            <div className="space-y-2">
              {ONBOARDING_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGoal(g.id);
                    setPlatformId(defaultPlatformForGoal(g.id, industryId));
                  }}
                  className={`w-full border p-4 text-left ${
                    goal === g.id
                      ? 'border-neutral-900 bg-white'
                      : 'border-neutral-200 bg-white/70 hover:border-neutral-400'
                  }`}
                >
                  <p className="font-semibold">{g.label}</p>
                  <p className="mt-1 text-xs text-neutral-500">{g.hint}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="buzz-btn-secondary" onClick={() => setStep(1)}>
                戻る
              </button>
              <button type="button" className="buzz-btn-primary" onClick={() => setStep(3)}>
                次へ
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-bold">最初に集中する媒体は？</h1>
            <p className="text-sm text-neutral-600">
              {industry.label} × 目的に合わせておすすめを付けています。まずは1つで十分です。
            </p>
            <div className="space-y-2">
              {(recommendedPlatforms.length ? recommendedPlatforms : platformCompanions).map((p) => {
                const recommended = recommendedPlatforms.some((r) => r.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatformId(p.id)}
                    className={`w-full border p-4 text-left ${
                      platformId === p.id
                        ? 'border-neutral-900 bg-white'
                        : 'border-neutral-200 bg-white/70 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{p.name}</p>
                      {recommended && (
                        <span className="text-[10px] font-semibold tracking-wider text-[#6b4a3a] uppercase">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{p.priorityNote}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500">その他の媒体</p>
            <div className="flex flex-wrap gap-2">
              {platformCompanions
                .filter((p) => !recommendedPlatforms.some((r) => r.id === p.id))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatformId(p.id)}
                    className={`border px-3 py-2 text-xs ${
                      platformId === p.id
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="buzz-btn-secondary" onClick={() => setStep(2)}>
                戻る
              </button>
              <button type="button" className="buzz-btn-primary" onClick={() => setStep(4)}>
                次へ
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-bold">準備ができました。次はこれだけ。</h1>
            <p className="text-sm text-neutral-600">
              {companion.name} を主戦場に、公式登録 → BuzzIt連携 → 初投稿の順で進みます。
            </p>

            <ol className="space-y-3">
              <li className="border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">1</p>
                <p className="mt-1 font-semibold">公式サイトでアカウント登録</p>
                <p className="mt-1 text-sm text-neutral-600">{companion.priorityNote}</p>
                <a
                  href={companion.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="buzz-btn-secondary mt-3"
                >
                  {companion.signupLabel}
                </a>
              </li>
              <li className="border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">2</p>
                <p className="mt-1 font-semibold">BuzzItに連携する</p>
                <p className="mt-1 text-sm text-neutral-600">
                  Meta / LINE のトークンを設定すると、予約投稿と診断が進みます。
                </p>
                <Link to="/settings" className="buzz-btn-secondary mt-3" onClick={() => finish(false)}>
                  設定を開く
                </Link>
              </li>
              <li className="border border-[#6b4a3a]/25 bg-[#faf6f2] p-4">
                <p className="text-xs font-semibold tracking-wider text-[#6b4a3a] uppercase">3</p>
                <p className="mt-1 font-semibold">最初の投稿ネタ</p>
                <p className="mt-1 text-sm text-neutral-800">{companion.firstPostIdea.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{companion.firstPostIdea.hook}</p>
                <Link
                  to="/magic-creator"
                  className="buzz-btn-primary mt-3"
                  onClick={() => finish(false)}
                >
                  <Sparkles className="h-4 w-4" />
                  台本を作って完了
                </Link>
              </li>
            </ol>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="buzz-btn-secondary" onClick={() => setStep(3)}>
                戻る
              </button>
              <button type="button" className="buzz-btn-primary" onClick={() => finish(false)}>
                ダッシュボードへ進む
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/roadmap"
                className="buzz-btn-ghost"
                onClick={() => finish(false)}
              >
                伴走ガイドを見る
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
