import { COL } from '@/lib/server/deckit-collections';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/server/firebase-admin';
import { jsonError } from '@/lib/server/api-response';
import { isMockDataMode } from '@/lib/config';
import { newRequestId, verifyBearerToken, ApiError } from '@/lib/server/request-auth';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

/**
 * Phase C: 本番は OAuth コード交換 + refresh token を Secret Manager に保存。
 * 現時点は接続フローのプレースホルダ（手動で connected を立てる前段）。
 */
export async function POST(req: Request) {
  const requestId = newRequestId();
  try {
    if (isMockDataMode()) {
      return NextResponse.json({
        ok: true,
        message: 'モック: Drive 接続はスキップされました。',
        requestId,
      });
    }

    const token = await verifyBearerToken(req.headers.get('authorization'));
    if (!token) throw new ApiError('AUTH', 'ログインが必要です', 401);
    if (!isFirebaseAdminConfigured()) {
      throw new ApiError('INTERNAL', 'Admin SDK 未設定', 503);
    }

    const body = (await req.json().catch(() => ({}))) as { authorizationCode?: string };
    if (!body.authorizationCode) {
      throw new ApiError(
        'PERMISSION',
        'OAuth 認可コードがありません。クライアント側 Picker/OAuth 実装後に送信してください。',
        400,
      );
    }

    await adminDb()
      .collection(COL.googleConnections)
      .doc(token.uid)
      .set(
        {
          status: 'connected',
          scopes: ['https://www.googleapis.com/auth/drive.file'],
          updatedAt: FieldValue.serverTimestamp(),
          placeholder: true,
        },
        { merge: true },
      );

    return NextResponse.json({
      ok: true,
      message: '接続状態を保存しました（トークン交換は Phase C-2 で実装）。',
      requestId,
    });
  } catch (err) {
    return jsonError(err, requestId);
  }
}
