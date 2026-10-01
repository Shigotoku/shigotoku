import type { PersonaRecord } from './api';
import type { SettingsSection } from './settingsUrls';

export type PersonaSnsLink = {
  id: string;
  label: string;
  connected: boolean;
  detail?: string;
  settingsSection: SettingsSection;
};

export function personaSnsLinks(persona: PersonaRecord): PersonaSnsLink[] {
  const xHandle = persona.xUsername?.trim().replace(/^@/, '');
  const gbpLabel = persona.gbpLocationName?.trim();

  return [
    {
      id: 'x',
      label: 'X',
      connected: !!persona.xConnected,
      detail: xHandle ? `@${xHandle}` : undefined,
      settingsSection: 'x',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      connected: !!persona.metaConnected,
      settingsSection: 'meta',
    },
    {
      id: 'line',
      label: 'LINE',
      connected: !!persona.lineConnected,
      settingsSection: 'line',
    },
    {
      id: 'gbp',
      label: 'Google',
      connected: !!persona.gbpConnected,
      detail: gbpLabel || undefined,
      settingsSection: 'gbp',
    },
  ];
}

export function personaTypeLabel(type: PersonaRecord['type']) {
  switch (type) {
    case 'official':
      return '公式';
    case 'personal':
      return '個人';
    default:
      return 'キャラ';
  }
}
