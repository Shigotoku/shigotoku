import type { UserSettings } from './firestore';
import { getUserSettings } from './firestore';
import type { PersonaRecord } from '../types/persona';
import {
  getPersona,
  resolveActivePersonaId,
} from './personas';

/** ペルソナの SNS 設定を UserSettings 型にマージした実効設定 */
export type EffectiveUserSettings = UserSettings & {
  activePersonaId: string;
  activePersonaName?: string;
  activePersonaType?: PersonaRecord['type'];
};

const PERSONA_OVERRIDE_KEYS = [
  'brandProfile',
  'defaultPublishMode',
  'ayrshareProfileKey',
  'lineChannelSecret',
  'lineChannelAccessToken',
  'lineAdminUserId',
  'lineDestinationId',
  'metaAccessToken',
  'metaPageAccessToken',
  'metaIgUserId',
  'metaPageId',
  'metaTokenExpiresAt',
  'xApiKey',
  'xApiSecret',
  'xAccessToken',
  'xAccessSecret',
  'xUsername',
  'xApiPostsMonthKey',
  'xApiPostsThisMonth',
  'gbpConnected',
  'gbpLocationName',
  'gbpAccessToken',
  'gbpRefreshToken',
  'gbpTokenExpiresAt',
  'gbpAccountName',
  'gbpLocationId',
  'gbpLocationResourceName',
  'insightsEnabled',
  'xInsightsEnabled',
  'insightsLastSyncedAt',
] as const;

export function mergePersonaIntoSettings(
  user: UserSettings,
  persona: PersonaRecord,
): EffectiveUserSettings {
  const merged: EffectiveUserSettings = {
    ...user,
    activePersonaId: persona.id,
    activePersonaName: persona.name,
    activePersonaType: persona.type,
  };

  for (const key of PERSONA_OVERRIDE_KEYS) {
    const val = persona[key as keyof PersonaRecord];
    if (val !== undefined && val !== null && val !== '') {
      (merged as unknown as Record<string, unknown>)[key] = val;
    }
  }

  return merged;
}

export async function getEffectiveSettings(
  uid: string,
  personaId?: string,
): Promise<EffectiveUserSettings> {
  const user = await getUserSettings(uid);
  const pid = personaId ?? await resolveActivePersonaId(uid, user);
  const persona = await getPersona(pid);
  if (!persona) {
    const { ensureDefaultPersona } = await import('./personas');
    const created = await ensureDefaultPersona(uid, user);
    return mergePersonaIntoSettings(user, created);
  }
  return mergePersonaIntoSettings(user, persona);
}
