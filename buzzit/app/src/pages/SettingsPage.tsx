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

export default function SettingsPage() {
  const state = useSettingsState();
  const { message, SETTINGS_TABS, setTab, activeTab, handleSave, saving } = state;

  return (
    <SettingsContext.Provider value={state}>
    <div className="buzz-page-narrow">
      {message && <p className="buzz-alert buzz-alert-info">{message}</p>}

      <div className="flex flex-wrap gap-1 border-b border-neutral-200 pb-1">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[40px] px-3 text-sm transition-colors ${
              activeTab === t.id
                ? 'border-b-2 border-neutral-900 font-semibold text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>


      {activeTab === 'staff' && <TeamPage embedded />}
      {activeTab === 'personas' && <PersonasTab />}
      {activeTab === 'sns' && <SnsTab />}
      <Suspense fallback={<p className="text-sm text-neutral-500">読み込み中…</p>}>
        {activeTab === 'business' && <BusinessTab />}
        {activeTab === 'plan' && <PlanTab />}
        {activeTab === 'advanced' && <AdvancedTab />}
      </Suspense>

      {activeTab !== 'staff' && (
      <button type="button" onClick={handleSave} disabled={saving} className="buzz-btn-primary disabled:opacity-70">
        <Save className="h-4 w-4" />
        {saving ? '保存中...' : '設定を保存'}
      </button>
      )}
    </div>
    </SettingsContext.Provider>
  );
}
