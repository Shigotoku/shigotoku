import { getBootstrap } from '@/lib/server/bootstrap-service';
import { jsonError } from '@/lib/server/api-response';
import { newRequestId, verifyBearerToken, ApiError } from '@/lib/server/request-auth';
import { isMockDataMode } from '@/lib/config';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') ?? newRequestId();
  try {
    const token = await verifyBearerToken(req.headers.get('authorization'));
    if (!isMockDataMode() && !token) {
      throw new ApiError('AUTH', 'ログインが必要です', 401);
    }
    const payload = await getBootstrap(requestId, token);
    return NextResponse.json(payload, { headers: { 'x-request-id': requestId } });
  } catch (err) {
    return jsonError(err, requestId);
  }
}
