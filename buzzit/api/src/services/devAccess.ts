import { getAuth } from 'firebase-admin/auth';
import type { PlanTier, UserSettings } from './firestore';
import { getUserSettings } from './firestore';
import { isAdminUid } from '../middleware/admin';

/** 開発・社内検証用: ペルソナ上限（実質無制限） */
export const DEV_PERSONA_MAX = 50;

function devEmailDomains(): string[] {
  const raw = process.env.BUZZIT_DEV_EMAIL_DOMAINS ?? 'meditoku.com';
  return raw.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
}

function extraDevEmails(): string[] {
  const raw = process.env.BUZZIT_DEV_EMAILS ?? '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isDevEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (extraDevEmails().includes(normalized)) return true;
  const at = normalized.lastIndexOf('@');
  if (at < 0) return false;
  const domain = normalized.slice(at + 1);
  return devEmailDomains().includes(domain);
}

export async function getEmailForUid(uid: string): Promise<string | null> {
  try {
    const user = await getAuth().getUser(uid);
    return user.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** メディトク社員・管理者は開発中すべての機能を利用可能 */
export async function hasDevFullAccess(uid: string): Promise<boolean> {
  if (process.env.BUZZIT_DEV_FULL_ACCESS === 'false') return false;
  if (await isAdminUid(uid)) return true;
  const email = await getEmailForUid(uid);
  return isDevEmail(email);
}

export function devEffectivePlan(plan: PlanTier): PlanTier {
  return 'enterprise';
}

export async function getUserSettingsWithDevBoost(uid: string): Promise<UserSettings> {
  const settings = await getUserSettings(uid);
  if (!(await hasDevFullAccess(uid))) return settings;
  return {
    ...settings,
    plan: devEffectivePlan(settings.plan as PlanTier),
    extraSnsAccounts: Math.max(Number(settings.extraSnsAccounts) || 0, 20),
    autoModeEnabled: true,
    insightsEnabled: true,
    xInsightsEnabled: true,
  };
}

export function devPersonaLimits(personaCount: number) {
  return {
    included: 10,
    extraSlots: DEV_PERSONA_MAX - 10,
    max: DEV_PERSONA_MAX,
    canAdd: personaCount < DEV_PERSONA_MAX,
    label: '開発モード（メディトク社内・上限50体）',
    devFullAccess: true,
  };
}
