import { lazy, Suspense } from 'react';
import { Save } from 'lucide-react';
import TeamPage from './TeamPage';
import { SettingsContext } from './settings/SettingsContext';
import { useSettingsState } from './settings/useSettingsState';
import PersonasTab from './settings/PersonasTab';
import SnsTab from './settings/SnsTab';

const BusinessTab = lazy(() => import('./settings/BusinessTab'));
const PlanTab = lazy(() => import('./settings/PlanTab'));
const AdvancedTab = lazy(() => import('./settings/AdvancedTab'));

/** 複数カラムに流し込んで縦スクロールを減らす */
const COLUMNS = 'gap-3 lg:columns-2 2xl:columns-3 [&>*]:mb-3 [&>*]:break-inside-avoid';

export default function SettingsPage() {
  const state = useSettingsState();
  const { message, SETTINGS_TABS, setTab, activeTab, handleSave, saving } = state;

  return (
    <SettingsContext.Provider value={state}>
      <div className="settings-compact flex min-h-0 w-full flex-1 flex-col gap-2">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 pb-1">
          <div className="flex flex-1 flex-wrap gap-1">
            {SETTINGS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-[36px] px-3 text-sm transition-colors ${
                  activeTab === t.id
                    ? 'border-b-2 border-neutral-900 font-semibold text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeTab !== 'staff' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-70"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? '保存中...' : '設定を保存'}
            </button>
          )}
        </div>

        {message && <p className="buzz-alert buzz-alert-info shrink-0 !py-1.5 text-xs">{message}</p>}

        <div className="min-h-0 flex-1 overflow-auto pb-16 lg:pb-0">
          {activeTab === 'staff' && (
            <div className={COLUMNS}>
              <TeamPage embedded />
            </div>
          )}
          {activeTab === 'personas' && <PersonasTab />}
          {activeTab === 'sns' && <SnsTab />}
          <Suspense fallback={<p className="text-sm text-neutral-500">読み込み中…</p>}>
            {activeTab === 'business' && (
              <div className={COLUMNS}>
                <BusinessTab />
              </div>
            )}
            {activeTab === 'plan' && (
              <div className={COLUMNS}>
                <PlanTab />
              </div>
            )}
            {activeTab === 'advanced' && (
              <div className={COLUMNS}>
                <AdvancedTab />
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}
