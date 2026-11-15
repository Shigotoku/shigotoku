import { jsonError } from '@/lib/server/api-response';
import { createProject, assertOrgMember } from '@/lib/server/projects-service';
import { ensureUserProvisioned } from '@/lib/server/provisioning';
import { isMockDataMode } from '@/lib/config';
import { newRequestId, verifyBearerToken, ApiError } from '@/lib/server/request-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') ?? newRequestId();
  try {
    if (isMockDataMode()) {
      const body = (await req.json()) as { name?: string };
      const name = body.name?.trim();
      if (!name) throw new ApiError('GENERATION_INVALID', '名前を入力してください', 400);
      return NextResponse.json(
        { id: `proj-${Date.now()}`, name },
        { headers: { 'x-request-id': requestId } },
      );
    }

    const token = await verifyBearerToken(req.headers.get('authorization'));
    if (!token) throw new ApiError('AUTH', 'ログインが必要です', 401);

    const body = (await req.json()) as { name?: string; styleId?: string };
    const name = body.name?.trim();
    if (!name) throw new ApiError('GENERATION_INVALID', '名前を入力してください', 400);

    const { organizationId, userId } = await ensureUserProvisioned(token);
    await assertOrgMember(organizationId, userId);

    const project = await createProject({
      organizationId,
      ownerUserId: userId,
      name,
      styleId: body.styleId,
    });

    return NextResponse.json(project, { headers: { 'x-request-id': requestId } });
  } catch (err) {
    return jsonError(err, requestId);
  }
}
