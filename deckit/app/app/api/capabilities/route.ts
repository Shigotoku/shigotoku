import { mockCapabilities } from '@deckit/domain';
import { COL } from '@/lib/server/deckit-collections';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/server/firebase-admin';
import { isMockDataMode } from '@/lib/config';
import { newRequestId, verifyBearerToken } from '@/lib/server/request-auth';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const requestId = newRequestId();

  if (isMockDataMode()) {
    return NextResponse.json({ capabilities: mockCapabilities, requestId });
  }

  const token = await verifyBearerToken(req.headers.get('authorization'));
  if (!token || !isFirebaseAdminConfigured()) {
    return NextResponse.json({ capabilities: mockCapabilities, requestId });
  }

  const conn = await adminDb().collection(COL.googleConnections).doc(token.uid).get();
  const connected = conn.exists && conn.data()?.status === 'connected';

  return NextResponse.json({
    requestId,
    capabilities: {
      ...mockCapabilities,
      driveFileAccess: connected,
      picker: connected,
      slidesRead: connected,
      slidesWrite: connected,
    },
  });
}
