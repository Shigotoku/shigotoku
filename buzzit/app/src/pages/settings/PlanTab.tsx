import { Check } from 'lucide-react';
import PersonaQuickGuide from '../../components/PersonaQuickGuide';
import { lineCrmPlans, fullStackPlans } from './settingsData';
import { useSettings } from './SettingsContext';


export default function PlanTab() {
  const { plan, setPlan } = useSettings();
  return (
    <>
      <section className="buzz-card-pad pb-0">
        <PersonaQuickGuide />
      </section>
      <section className="buzz-card-pad">
        <h3 className="mb-2 text-lg font-bold">LINE CRM プラン（Lステップ代替）</h3>
        <p className="mb-4 text-sm text-neutral-600">
          SNS 不要の店舗向け。LINE 公式の請求は各店舗への直接請求のまま。BuzzIt は CRM ツール代のみ。
          <a
            href="https://shigotoku.com/buzzit/#line-simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-medium text-neutral-900 underline"
          >
            試算ツール
          </a>
        </p>
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {lineCrmPlans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`border p-5 text-left transition-colors ${
                plan === p.id
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold">{p.name}</span>
                <span className={`text-sm ${plan === p.id ? 'text-neutral-300' : 'text-neutral-600'}`}>{p.price}</span>
              </div>
              {p.promo && (
                <p className={`mb-2 text-xs ${plan === p.id ? 'text-neutral-400' : 'text-green-700'}`}>{p.promo}</p>
              )}
              <p className={`mb-3 text-[10px] uppercase tracking-wider ${plan === p.id ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {p.tagline}
              </p>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${plan === p.id ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    <Check className={`h-3.5 w-3.5 shrink-0 ${plan === p.id ? 'text-white' : 'text-neutral-800'}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <h3 className="mb-2 text-lg font-bold">BuzzIt フルスタック</h3>
        <p className="mb-6 text-sm text-neutral-600">
          年払いで2ヶ月分無料。Growth OS は AI-BOUZ + AI-LINE + Lステップの 3本契約相当の機能を ¥24,800 に集約。
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fullStackPlans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlan(p.id)}
              className={`border p-5 text-left transition-colors ${
                plan === p.id
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-400'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-bold">{p.name}</span>
                <span className="text-sm text-neutral-600">{p.price}</span>
              </div>
              <p className="mb-3 text-[10px] uppercase tracking-wider text-neutral-500">{p.tagline}</p>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                    <Check className="h-3.5 w-3.5 shrink-0 text-neutral-800" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
