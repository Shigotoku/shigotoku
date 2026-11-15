import { buildMockBootstrap, mockCapabilities } from '@deckit/domain';
import { isMockDataMode } from '@/lib/config';
import { ensureUserProvisioned } from '@/lib/server/provisioning';
import { COL } from '@/lib/server/deckit-collections';
import { adminDb } from '@/lib/server/firebase-admin';
import type { BootstrapPayload, Capabilities, Project, ReferenceItem, Style } from '@deckit/domain';
import type { DecodedIdToken } from 'firebase-admin/auth';

function capabilitiesFromConnection(connected: boolean): Capabilities {
  return {
    ...mockCapabilities,
    driveFileAccess: connected,
    picker: connected,
    slidesRead: connected,
    slidesWrite: connected,
  };
}

async function loadOrgData(organizationId: string, userId: string) {
  const db = adminDb();

  const [orgSnap, projectsSnap, stylesSnap, refsSnap, connSnap] = await Promise.all([
    db.collection(COL.organizations).doc(organizationId).get(),
    db
      .collection(COL.projects)
      .where('organizationId', '==', organizationId)
      .orderBy('updatedAt', 'desc')
      .limit(30)
      .get(),
    db.collection(COL.styles).where('organizationId', '==', organizationId).limit(50).get(),
    db.collection(COL.references).where('organizationId', '==', organizationId).limit(30).get(),
    db.collection(COL.googleConnections).doc(userId).get(),
  ]);

  const projects: Project[] = projectsSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      organizationId: x.organizationId as string,
      name: x.name as string,
      styleId: x.styleId as string | undefined,
      status: (x.status as Project['status']) ?? 'draft',
      driveFolderId: x.driveFolderId as string | undefined,
      driveUrl: x.driveUrl as string | undefined,
      updatedAt: x.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
    };
  });

  const styles: Style[] = stylesSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      organizationId: x.organizationId as string,
      kind: x.kind as Style['kind'],
      name: x.name as string,
      description: x.description as string | undefined,
      purpose: x.purpose as string | undefined,
      audience: x.audience as string | undefined,
      driveUrl: x.driveUrl as string | undefined,
    };
  });

  const references: ReferenceItem[] = refsSnap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      name: x.fileName as string,
      reason: x.reason as string | undefined,
      approved: Boolean(x.approved),
      driveUrl: x.driveUrl as string | undefined,
    };
  });

  const connected = connSnap.exists && connSnap.data()?.status === 'connected';

  const org = orgSnap.data();
  const warnings: string[] = [];
  if (!connected) {
    warnings.push('Google Drive は未接続です。設定から接続できます。');
  }

  return {
    projects,
    styles,
    references,
    capabilities: capabilitiesFromConnection(connected),
    organization: {
      id: organizationId,
      name: (org?.name as string) ?? 'Organization',
      type: (org?.type as 'personal' | 'company') ?? 'personal',
      plan: (org?.plan as 'free' | 'pro' | 'team') ?? 'free',
    },
    warnings,
  };
}

export async function getBootstrap(
  requestId: string,
  token: DecodedIdToken | null,
): Promise<BootstrapPayload> {
  if (isMockDataMode()) {
    const payload = buildMockBootstrap();
    return { ...payload, requestId };
  }

  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const provisioned = await ensureUserProvisioned(token);
  const loaded = await loadOrgData(provisioned.organizationId, token.uid);

  const activeProjectId = loaded.projects[0]?.id ?? null;
  const activeStyleId =
    loaded.styles.find((s) => s.kind === 'company')?.id ??
    loaded.styles[0]?.id ??
    null;

  return {
    requestId,
    capabilities: loaded.capabilities,
    user: {
      id: token.uid,
      email: token.email ?? '',
      displayName: token.name ?? token.email ?? '',
      photoUrl: token.picture,
    },
    organization: loaded.organization,
    driveNavigation: null,
    projects: loaded.projects,
    styles: loaded.styles,
    references: loaded.references,
    activeProjectId,
    activeStyleId,
    warnings: loaded.warnings,
  };
}
