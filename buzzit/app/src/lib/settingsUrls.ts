/** 設定画面のタブ・SNS連携セクションへのディープリンク */

export type SettingsTab = 'business' | 'sns' | 'staff' | 'plan' | 'advanced';

export type SettingsSection =
  | 'meta'
  | 'x'
  | 'insights'
  | 'publish-mode'
  | 'ayrshare'
  | 'slack'
  | 'line'
  | 'gbp'
  | 'hpb';

const SECTION_TAB: Record<SettingsSection, SettingsTab> = {
  meta: 'sns',
  x: 'sns',
  insights: 'sns',
  'publish-mode': 'sns',
  ayrshare: 'sns',
  slack: 'sns',
  line: 'sns',
  gbp: 'sns',
  hpb: 'sns',
};

const VALID_SECTIONS = new Set<string>(Object.keys(SECTION_TAB));

export function isSettingsSection(value: string | null): value is SettingsSection {
  return value !== null && VALID_SECTIONS.has(value);
}

export function sectionTab(section: SettingsSection): SettingsTab {
  return SECTION_TAB[section];
}

export function settingsPath(opts?: { tab?: SettingsTab; section?: SettingsSection }): string {
  const params = new URLSearchParams();
  if (opts?.section) {
    params.set('tab', SECTION_TAB[opts.section]);
    params.set('section', opts.section);
  } else if (opts?.tab) {
    params.set('tab', opts.tab);
  }
  const q = params.toString();
  return q ? `/settings?${q}` : '/settings';
}

/** オンボーディング等の媒体ID → 設定のSNS連携セクション */
export function platformSettingsPath(platformId: string): string {
  switch (platformId) {
    case 'x':
      return settingsPath({ section: 'x' });
    case 'instagram':
    case 'facebook-threads':
      return settingsPath({ section: 'meta' });
    case 'line':
      return settingsPath({ section: 'line' });
    case 'gbp':
      return settingsPath({ section: 'gbp' });
    case 'tiktok':
    case 'youtube-shorts':
      return settingsPath({ section: 'publish-mode' });
    default:
      return settingsPath({ tab: 'sns' });
  }
}
