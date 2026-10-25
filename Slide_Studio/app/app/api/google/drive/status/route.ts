import { COL } from '@/lib/server/deckit-collections';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/server/firebase-admin';
import { jsonError } from '@/lib/server/api-response';
import { isMockDataMode } from '@/lib/config';
import { newRequestId, verifyBearerToken, ApiError } from '@/lib/server/request-auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const requestId = newRequestId();
  try {
    if (isMockDataMode()) {
      return NextResponse.json({
        connected: false,
        message: 'モックモードです。Firebase 接続後に Drive を連携できます。',
        requestId,
      });
    }

    const token = await verifyBearerToken(req.headers.get('authorization'));
    if (!token) throw new ApiError('AUTH', 'ログインが必要です', 401);
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({
        connected: false,
        message: 'サーバー設定が未完了です（Admin SDK）。',
        requestId,
      });
    }

    const snap = await adminDb().collection(COL.googleConnections).doc(token.uid).get();
    const connected = snap.exists && snap.data()?.status === 'connected';

    return NextResponse.json({
      connected,
      message: connected
        ? 'Google Drive に接続済みです。'
        : '未接続です。設定の「Drive を接続」から進めてください。',
      requestId,
    });
  } catch (err) {
    return jsonError(err, requestId);
  }
}
