import type { PublishMode, ScheduleContentItem } from '../types/schedule';
import type { EffectiveUserSettings } from './personaSettings';
import { credentialsFromSettings } from './xApi';

const AUTO_PUBLISH_MODES: PublishMode[] = ['meta', 'line', 'gbp', 'x_free', 'ayrshare', 'auto'];

export function isAutoPublishMode(mode: PublishMode): boolean {
  return AUTO_PUBLISH_MODES.includes(mode);
}

function resolveAutoMode(settings: EffectiveUserSettings): PublishMode {
  const goal = settings.autoModeGoal ?? 'reach';
  if (goal === 'cv') {
    if (settings.lineChannelAccessToken) return 'line';
    if (settings.metaAccessToken && settings.metaIgUserId) return 'meta';
  } else {
    if (settings.gbpConnected && settings.gbpAccessToken) return 'gbp';
    if (settings.metaAccessToken && settings.metaIgUserId) return 'meta';
    if (settings.lineChannelAccessToken) return 'line';
  }
  if (credentialsFromSettings(settings)) return 'x_free';
  if (process.env.AYRSHARE_API_KEY && settings.ayrshareProfileKey) return 'ayrshare';
  return 'notify';
}

export function assertConnectedForPublishMode(
  settings: EffectiveUserSettings,
  mode: PublishMode,
): string | null {
  const effective = mode === 'auto' ? resolveAutoMode(settings) : mode;
  if (effective === 'notify' || effective === 'approval') return null;

  switch (effective) {
    case 'x_free':
      if (!credentialsFromSettings(settings)) {
        return 'X（Twitter）がこの配信キャラで未連携です。設定の SNS 連携で接続するか、通知モードに変更してください。';
      }
      return null;
    case 'meta':
      if (!settings.metaAccessToken || !settings.metaIgUserId) {
        return 'Instagram / Meta がこの配信キャラで未連携です。';
      }
      return null;
    case 'line':
      if (!settings.lineChannelAccessToken?.trim()) {
        return 'LINE がこの配信キャラで未連携です。';
      }
      return null;
    case 'gbp':
      if (!settings.gbpConnected && !settings.gbpAccessToken?.trim()) {
        return 'Googleビジネスがこの配信キャラで未連携です。';
      }
      return null;
    case 'ayrshare':
      if (!process.env.AYRSHARE_API_KEY || !settings.ayrshareProfileKey) {
        return 'Ayrshare が未設定です。';
      }
      return null;
    default:
      return null;
  }
}

export function describePublishTargets(
  settings: EffectiveUserSettings,
  mode: PublishMode,
  contents: ScheduleContentItem[],
): string[] {
  const effective = mode === 'auto' ? resolveAutoMode(settings) : mode;
  const labels = contents.map((c) => c.label).filter(Boolean);
  const summary = labels.length ? labels.join(' / ') : '投稿';

  switch (effective) {
    case 'x_free': {
      const handle = settings.xUsername?.trim();
      return [`X${handle ? ` @${handle.replace(/^@/, '')}` : ''}`, summary];
    }
    case 'meta':
      return ['Instagram / Meta', summary];
    case 'line':
      return ['LINE公式', summary];
    case 'gbp':
      return [`Googleビジネス${settings.gbpLocationName ? `（${settings.gbpLocationName}）` : ''}`, summary];
    case 'notify':
    case 'approval':
      return [`リマインダー（${summary}）`];
    default:
      return [summary];
  }
}
