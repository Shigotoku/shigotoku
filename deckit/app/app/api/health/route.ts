import { getDeckitDataMode } from '@/lib/config';
import { adminDb, isFirebaseAdminConfigured } from '@/lib/server/firebase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  let firebaseAdmin = isFirebaseAdminConfigured();
  if (firebaseAdmin) {
    try {
      adminDb();
    } catch {
      firebaseAdmin = false;
    }
  }

  return NextResponse.json({
    ok: true,
    dataMode: getDeckitDataMode(),
    firebaseAdmin,
    ts: new Date().toISOString(),
  });
}
