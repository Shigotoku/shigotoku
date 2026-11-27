import { COL } from '@/lib/server/wrapit-collections';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/server/firebase-admin';
import { jsonError } from '@/lib/server/api-response';
import { isMockDataMode } from '@/lib/config';
import { newRequestId, verifyBearerToken, ApiError } from '@/lib/server/request-auth';
import {
  DEFAULT_WORKSPACE_TARGET,
  resolveWorkspaceTarget,
  type WorkspaceMode,
  type WorkspaceTarget,
} from '@wrapit/domain';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

/** モックモード用の揮発ストア（開発サーバー再起動で初期化） */
let mockTarget: WorkspaceTarget = DEFAULT_WORKSPACE_TARGET;

function toTarget(data: FirebaseFirestore.DocumentData | undefined): WorkspaceTarget {
  if (data?.workspaceMode === 'shared' && data.sharedFolderId) {
    return { mode: 'shared', folderId: data.sharedFolderId, folderUrl: data.sharedFolderUrl };
  }
  return DEFAULT_WORKSPACE_TARGET;
}

export async function GET(req: Request) {
  const requestId = newRequestId();
  try {
    if (isMockDataMode()) return NextResponse.json({ target: mockTarget, requestId });

    const token = await verifyBearerToken(req.headers.get('authorization'));
    if (!token) throw new ApiError('AUTH', 'ログインが必要です', 401);
    if (!isFirebaseAdminConfigured()) throw new ApiError('INTERNAL', 'Admin SDK 未設定', 503);

    const snap = await adminDb().collection(COL.googleConnections).doc(token.uid).get();
    return NextResponse.json({ target: toTarget(snap.data()), requestId });
  } catch (err) {
    return jsonError(err, requestId);
  }
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    const body = (await req.json().catch(() => ({}))) as { mode?: WorkspaceMode; folder?: string };
    if (body.mode !== 'auto' && body.mode !== 'shared') {
      throw new ApiError('VALIDATION', '保存先の種類が不正です', 400);
    }
    const target = resolveWorkspaceTarget(body.mode, body.folder);
    if (!target) {
      throw new ApiError('VALIDATION', 'Google Drive のフォルダ URL（または ID）を入力してください', 400);
    }

    if (isMockDataMode()) {
      mockTarget = target;
      return NextResponse.json({ target, requestId });
    }

    const token = await verifyBearerToken(req.headers.get('authorization'));
    if (!token) throw new ApiError('AUTH', 'ログインが必要です', 401);
    if (!isFirebaseAdminConfigured()) throw new ApiError('INTERNAL', 'Admin SDK 未設定', 503);

    await adminDb()
      .collection(COL.googleConnections)
      .doc(token.uid)
      .set(
        {
          workspaceMode: target.mode,
          sharedFolderId: target.folderId ?? FieldValue.delete(),
          sharedFolderUrl: target.folderUrl ?? FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return NextResponse.json({ target, requestId });
  } catch (err) {
    return jsonError(err, requestId);
  }
}
