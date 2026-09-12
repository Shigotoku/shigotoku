import { randomBytes } from 'crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { PlanTier, UserSettings } from './firestore';
import { getUserSettings } from './firestore';
import {
  canAddPersona,
  includedPersonasForPlan,
  maxPersonasForPlan,
  personaLimitLabel,
} from './billing';
import { devPersonaLimits, hasDevFullAccess } from './devAccess';
import type {
  PersonaMemberRecord,
  PersonaRecord,
  PersonaRole,
  PersonaSnsSettings,
  PersonaStatus,
  PersonaType,
} from '../types/persona';

export type { PersonaRecord, PersonaType, PersonaRole, PersonaStatus };

const PERSONA_SNS_FIELD_KEYS: (keyof PersonaSnsSettings)[] = [
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
];

export const PERSONA_SETTINGS_ALLOWLIST = [
  ...PERSONA_SNS_FIELD_KEYS,
  'name',
  'slug',
  'type',
  'description',
  'avatarUrl',
  'brandSafetyLevel',
  'status',
] as const;

function db() {
  return getFirestore();
}

function personasCol() {
  return db().collection('personas');
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `persona-${randomBytes(3).toString('hex')}`;
}

function extractSnsFromUser(settings: UserSettings): PersonaSnsSettings {
  const out: PersonaSnsSettings = {};
  for (const key of PERSONA_SNS_FIELD_KEYS) {
    const val = settings[key as keyof UserSettings];
    if (val !== undefined && val !== null && val !== '') {
      (out as Record<string, unknown>)[key] = val;
    }
  }
  return out;
}

export async function getPersona(personaId: string): Promise<PersonaRecord | null> {
  const snap = await personasCol().doc(personaId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<PersonaRecord, 'id'>) };
}

export async function assertPersonaAccess(
  personaId: string,
  uid: string,
  minRole: PersonaRole = 'viewer',
): Promise<PersonaRecord> {
  const persona = await getPersona(personaId);
  if (!persona || persona.status === 'archived') {
    throw new Error('ペルソナが見つかりません');
  }
  const role = await getUserRoleInPersona(personaId, uid);
  if (!role) throw new Error('このペルソナへのアクセス権がありません');
  const rank: Record<PersonaRole, number> = { viewer: 1, editor: 2, approver: 3, owner: 4 };
  if (rank[role] < rank[minRole]) {
    throw new Error('この操作の権限がありません');
  }
  return persona;
}

export async function getUserRoleInPersona(personaId: string, uid: string): Promise<PersonaRole | null> {
  const persona = await getPersona(personaId);
  if (!persona) return null;
  if (persona.ownerId === uid) return 'owner';

  const memberSnap = await personasCol().doc(personaId).collection('members').doc(uid).get();
  if (memberSnap.exists) {
    return memberSnap.data()?.role as PersonaRole;
  }

  if (persona.accountId) {
    const accountMember = await db()
      .collection('accounts')
      .doc(persona.accountId)
      .collection('members')
      .doc(uid)
      .get();
    if (accountMember.exists) return 'editor';
  }

  const settings = await getUserSettings(uid);
  if (settings.personaIds?.includes(personaId)) {
    return persona.ownerId === uid ? 'owner' : 'editor';
  }

  return null;
}

export async function listPersonasForUser(
  uid: string,
  preloadedSettings?: UserSettings,
): Promise<PersonaRecord[]> {
  const settings = preloadedSettings ?? (await getUserSettings(uid));
  const personaIds: string[] = settings.personaIds ?? [];

  if (!personaIds.length) {
    const created = await ensureDefaultPersona(uid, settings);
    return [created];
  }

  const personas = await Promise.all(
    personaIds.map(async (id) => {
      const snap = await personasCol().doc(id).get();
      if (!snap.exists) return null;
      const data = snap.data() as Omit<PersonaRecord, 'id'>;
      if (data.status === 'archived') return null;
      return { id: snap.id, ...data };
    }),
  );
  const active = personas.filter(Boolean) as PersonaRecord[];
  if (!active.length) {
    const created = await ensureDefaultPersona(uid, settings);
    return [created];
  }
  return active;
}

export async function ensureDefaultPersona(
  uid: string,
  preloadedSettings?: UserSettings,
): Promise<PersonaRecord> {
  const settings = preloadedSettings ?? (await getUserSettings(uid));
  const existingIds = settings.personaIds ?? [];

  if (existingIds.length > 0) {
    const first = await getPersona(existingIds[0]);
    if (first && first.status !== 'archived') return first;
  }

  const displayName = settings.displayName?.trim();
  const name = displayName ? `${displayName}（メイン）` : 'メインキャラ';
  const sns = extractSnsFromUser(settings);

  const personaRef = personasCol().doc();
  const persona: Omit<PersonaRecord, 'id'> = {
    name,
    slug: slugify(name),
    type: 'official',
    description: '',
    brandSafetyLevel: settings.industry === 'medical' ? 'medical' : 'standard',
    ownerId: uid,
    ...(settings.accountId ? { accountId: settings.accountId } : {}),
    status: 'active',
    createdAt: new Date().toISOString(),
    ...sns,
  };

  const batch = db().batch();
  batch.set(personaRef, persona);
  batch.set(personaRef.collection('members').doc(uid), {
    userId: uid,
    role: 'owner',
    email: settings.email,
    displayName: settings.displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(uid), {
    personaIds: FieldValue.arrayUnion(personaRef.id),
    activePersonaId: personaRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  await logPersonaAudit(personaRef.id, uid, 'persona.created', `デフォルトペルソナ「${name}」を作成`);

  return { id: personaRef.id, ...persona };
}

export async function resolveActivePersonaId(
  uid: string,
  settings?: UserSettings,
): Promise<string> {
  const s = settings ?? (await getUserSettings(uid));
  if (s.activePersonaId) {
    const role = await getUserRoleInPersona(s.activePersonaId, uid);
    if (role) return s.activePersonaId;
  }
  const personas = await listPersonasForUser(uid, s);
  const id = personas[0]?.id;
  if (!id) {
    const created = await ensureDefaultPersona(uid, s);
    return created.id;
  }
  if (s.activePersonaId !== id) {
    await setActivePersona(uid, id);
  }
  return id;
}

export async function createPersona(
  uid: string,
  input: {
    name: string;
    type?: PersonaType;
    description?: string;
    avatarUrl?: string;
    brandProfile?: string;
    brandSafetyLevel?: 'medical' | 'standard';
  },
): Promise<PersonaRecord> {
  const name = input.name.trim();
  if (!name) throw new Error('ペルソナ名が必要です');

  const settings = await getUserSettings(uid);
  const personas = await listPersonasForUser(uid, settings);
  const extraSlots = Math.max(0, Number(settings.extraSnsAccounts) || 0);
  const devAccess = await hasDevFullAccess(uid);

  if (!devAccess && !canAddPersona(settings.plan as PlanTier, personas.length, extraSlots)) {
    const included = includedPersonasForPlan(settings.plan as PlanTier);
    throw new Error(
      `ペルソナ上限に達しています（プラン込み ${included}体 + 追加枠 ${extraSlots}体）。設定の「配信キャラ」タブで確認するか、プランタブで追加枠を購入してください。`,
    );
  }
  if (devAccess && personas.length >= devPersonaLimits(personas.length).max) {
    throw new Error('開発モードのペルソナ上限（50体）に達しています');
  }

  const personaRef = personasCol().doc();
  const persona: Omit<PersonaRecord, 'id'> = {
    name,
    slug: slugify(name),
    type: input.type ?? 'character',
    description: input.description?.trim() ?? '',
    avatarUrl: input.avatarUrl,
    brandProfile: input.brandProfile?.trim() ?? '',
    brandSafetyLevel: input.brandSafetyLevel ?? 'standard',
    ownerId: uid,
    ...(settings.accountId ? { accountId: settings.accountId } : {}),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  const batch = db().batch();
  batch.set(personaRef, persona);
  batch.set(personaRef.collection('members').doc(uid), {
    userId: uid,
    role: 'owner',
    email: settings.email,
    displayName: settings.displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(uid), {
    personaIds: FieldValue.arrayUnion(personaRef.id),
    activePersonaId: personaRef.id,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();

  await logPersonaAudit(personaRef.id, uid, 'persona.created', `ペルソナ「${name}」を作成`);

  return { id: personaRef.id, ...persona };
}

export async function updatePersona(
  personaId: string,
  uid: string,
  patch: Partial<PersonaRecord> & { xDisconnect?: boolean },
): Promise<PersonaRecord> {
  await assertPersonaAccess(personaId, uid, 'editor');

  const safe: Record<string, unknown> = {};
  for (const key of PERSONA_SETTINGS_ALLOWLIST) {
    if (key in patch && patch[key as keyof typeof patch] !== undefined) {
      safe[key] = patch[key as keyof typeof patch];
    }
  }

  if (patch.xDisconnect === true) {
    safe.xApiKey = '';
    safe.xApiSecret = '';
    safe.xAccessToken = '';
    safe.xAccessSecret = '';
    safe.xUsername = '';
  }

  for (const key of ['xApiKey', 'xApiSecret', 'xAccessToken', 'xAccessSecret'] as const) {
    if (key in safe && String(safe[key] ?? '').trim() === '') {
      delete safe[key];
    }
  }

  if ('name' in safe && typeof safe.name === 'string') {
    const trimmed = safe.name.trim();
    if (!trimmed) throw new Error('ペルソナ名が必要です');
    safe.name = trimmed;
  }

  await personasCol().doc(personaId).set(
    { ...safe, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  await logPersonaAudit(personaId, uid, 'persona.updated', Object.keys(safe).join(','));

  const updated = await getPersona(personaId);
  if (!updated) throw new Error('ペルソナの更新に失敗しました');
  return updated;
}

export async function setActivePersona(uid: string, personaId: string): Promise<void> {
  await assertPersonaAccess(personaId, uid, 'viewer');
  await db().collection('users').doc(uid).set(
    { activePersonaId: personaId, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function archivePersona(personaId: string, uid: string): Promise<void> {
  const persona = await assertPersonaAccess(personaId, uid, 'owner');
  const settings = await getUserSettings(uid);
  const personas = await listPersonasForUser(uid, settings);
  const active = personas.filter((p) => p.id !== personaId);
  if (!active.length) {
    throw new Error('最後のペルソナは削除できません');
  }

  await personasCol().doc(personaId).update({
    status: 'archived',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const nextActive = settings.activePersonaId === personaId ? active[0].id : settings.activePersonaId;
  await db().collection('users').doc(uid).set({
    personaIds: FieldValue.arrayRemove(personaId),
    activePersonaId: nextActive ?? active[0].id,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await logPersonaAudit(personaId, uid, 'persona.archived', persona.name);
}

export async function listPersonaMembers(personaId: string): Promise<PersonaMemberRecord[]> {
  const snap = await personasCol().doc(personaId).collection('members').get();
  return snap.docs.map((d) => ({
    userId: d.id,
    ...(d.data() as Omit<PersonaMemberRecord, 'userId'>),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? d.data().createdAt ?? '',
  }));
}

export async function setPersonaMemberRole(
  personaId: string,
  targetUid: string,
  role: Exclude<PersonaRole, 'owner'>,
  actorUid: string,
): Promise<void> {
  await assertPersonaAccess(personaId, actorUid, 'owner');
  const targetRole = await getUserRoleInPersona(personaId, targetUid);
  if (!targetRole || targetRole === 'owner') {
    throw new Error('メンバーが見つかりません');
  }
  await personasCol().doc(personaId).collection('members').doc(targetUid).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await logPersonaAudit(personaId, actorUid, 'persona.member.role', `${targetUid} → ${role}`);
}

export async function addPersonaMember(
  personaId: string,
  targetUid: string,
  role: Exclude<PersonaRole, 'owner'>,
  actorUid: string,
): Promise<void> {
  await assertPersonaAccess(personaId, actorUid, 'owner');
  const targetSettings = await getUserSettings(targetUid);
  const batch = db().batch();
  batch.set(personasCol().doc(personaId).collection('members').doc(targetUid), {
    userId: targetUid,
    role,
    email: targetSettings.email,
    displayName: targetSettings.displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db().collection('users').doc(targetUid), {
    personaIds: FieldValue.arrayUnion(personaId),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  await logPersonaAudit(personaId, actorUid, 'persona.member.add', `${targetUid} (${role})`);
}

export async function removePersonaMember(
  personaId: string,
  targetUid: string,
  actorUid: string,
): Promise<void> {
  await assertPersonaAccess(personaId, actorUid, 'owner');
  if (targetUid === actorUid) throw new Error('自分自身は削除できません');
  const targetRole = await getUserRoleInPersona(personaId, targetUid);
  if (targetRole === 'owner') throw new Error('オーナーは削除できません');

  const batch = db().batch();
  batch.delete(personasCol().doc(personaId).collection('members').doc(targetUid));
  batch.set(db().collection('users').doc(targetUid), {
    personaIds: FieldValue.arrayRemove(personaId),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  await logPersonaAudit(personaId, actorUid, 'persona.member.remove', targetUid);
}

export async function logPersonaAudit(
  personaId: string,
  actorUid: string,
  action: string,
  detail?: string,
): Promise<void> {
  await personasCol().doc(personaId).collection('auditLogs').add({
    personaId,
    actorUid,
    action,
    detail: detail ?? '',
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listPersonaAuditLogs(personaId: string, limit = 50) {
  const snap = await personasCol()
    .doc(personaId)
    .collection('auditLogs')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    personaId,
    actorUid: d.data().actorUid as string,
    action: d.data().action as string,
    detail: d.data().detail as string | undefined,
    createdAt: d.data().createdAt?.toDate?.()?.toISOString?.() ?? '',
  }));
}

export function personaRequiresApproval(persona: PersonaRecord): boolean {
  return persona.type === 'official';
}

const PERSONA_SECRET_KEYS = [
  'xApiKey', 'xApiSecret', 'xAccessToken', 'xAccessSecret',
  'metaAccessToken', 'metaPageAccessToken',
  'lineChannelSecret', 'lineChannelAccessToken',
  'gbpAccessToken', 'gbpRefreshToken',
] as const;

export async function resolvePersonaLimits(
  uid: string,
  options: { settings?: UserSettings; personaCount?: number } = {},
) {
  const settings = options.settings ?? (await getUserSettings(uid));
  const personas = options.personaCount ?? (await listPersonasForUser(uid, settings)).length;
  const extraSlots = Math.max(0, Number(settings.extraSnsAccounts) || 0);
  if (await hasDevFullAccess(uid)) {
    return devPersonaLimits(personas);
  }
  return {
    included: includedPersonasForPlan(settings.plan as PlanTier),
    extraSlots,
    max: maxPersonasForPlan(settings.plan as PlanTier, extraSlots),
    canAdd: canAddPersona(settings.plan as PlanTier, personas, extraSlots),
    label: personaLimitLabel(settings.plan as PlanTier, extraSlots),
    devFullAccess: false,
  };
}

export function safePersonaForClient(persona: PersonaRecord) {
  const safe = { ...persona } as Record<string, unknown>;
  for (const key of PERSONA_SECRET_KEYS) {
    if (safe[key]) safe[key] = '***';
  }
  const metaConnected = !!(persona.metaAccessToken && persona.metaIgUserId);
  const xConnected = !!(
    persona.xApiKey && persona.xApiSecret && persona.xAccessToken && persona.xAccessSecret
  );
  return {
    ...safe,
    metaConnected,
    xConnected,
    requiresApproval: personaRequiresApproval(persona),
  };
}
