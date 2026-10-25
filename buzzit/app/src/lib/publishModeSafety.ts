import type { PersonaRecord, PublishMode } from './api';

const AUTO_MODES: PublishMode[] = ['meta', 'line', 'gbp', 'x_free', 'ayrshare', 'auto'];

export function isAutoPublishMode(mode: PublishMode | undefined): boolean {
  return mode != null && AUTO_MODES.includes(mode);
}

export function clientPublishModeBlocked(persona: PersonaRecord | null, mode: PublishMode | undefined): string | null {
  if (!persona || !mode || !isAutoPublishMode(mode)) return null;
  if (mode === 'x_free' || mode === 'auto') {
    if (!persona.xConnected) return 'X がこの配信キャラで未連携です。';
  }
  if (mode === 'meta' || mode === 'auto') {
    if (!persona.metaConnected && mode === 'meta') return 'Instagram / Meta が未連携です。';
  }
  if (mode === 'line') {
    if (!persona.lineConnected) return 'LINE が未連携です。';
  }
  if (mode === 'gbp') {
    if (!persona.gbpConnected) return 'Googleビジネスが未連携です。';
  }
  return null;
}
