import PersonaSnsOverview from '../../components/PersonaSnsOverview';
import { SNS_PANELS } from './settingsData';
import { useSettings } from './SettingsContext';
import MetaPanel from './panels/MetaPanel';
import XPanel from './panels/XPanel';
import InsightsPanel from './panels/InsightsPanel';
import PublishModePanel from './panels/PublishModePanel';
import AyrsharePanel from './panels/AyrsharePanel';
import SlackPanel from './panels/SlackPanel';
import LinePanel from './panels/LinePanel';
import GbpPanel from './panels/GbpPanel';
import HpbPanel from './panels/HpbPanel';

export default function SnsTab() {
  const { metaConnected, xConnected, activePersona, snsPanel, setSnsPanel } = useSettings();
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="space-y-2">
        {activePersona && (
          <div className="rounded-xl border border-l-4 border-neutral-200 border-l-amber-400 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
            現在の配信キャラ: <strong>{activePersona.name}</strong>
            （{activePersona.type === 'official' ? '公式' : activePersona.type === 'personal' ? '個人' : 'キャラ'}）
            — ここで連携する SNS はこのキャラ専用です。
          </div>
        )}
        <PersonaSnsOverview />
        <div className="flex flex-wrap gap-1.5 lg:flex-col" role="tablist" aria-label="連携するサービス">
          {SNS_PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={snsPanel === p.id}
              onClick={() => setSnsPanel(p.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors lg:rounded-lg ${
                snsPanel === p.id
                  ? 'border-violet-600 bg-violet-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {p.id === 'meta' && (
                <span className={`h-1.5 w-1.5 rounded-full ${metaConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              )}
              {p.id === 'x' && (
                <span className={`h-1.5 w-1.5 rounded-full ${xConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              )}
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div data-sns-panel={snsPanel} className="sns-panels min-w-0 space-y-3">
        <MetaPanel />
        <XPanel />
        <InsightsPanel />
        <PublishModePanel />
        <AyrsharePanel />
        <SlackPanel />
        <LinePanel />
        <GbpPanel />
        <HpbPanel />
      </div>
    </div>
  );
}
