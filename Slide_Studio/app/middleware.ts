import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** カスタムドメイン確定後、CANONICAL_REDIRECT_RUN_APP=true で *.run.app を正規ホストへ */
const CANONICAL_HOST =
  process.env.CANONICAL_HOST ?? 'app.deckit.shigotoku.com';
const REDIRECT_RUN_APP = process.env.CANONICAL_REDIRECT_RUN_APP === 'true';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0] ?? '';
  if (
    !REDIRECT_RUN_APP ||
    !host.endsWith('.run.app') ||
    host === CANONICAL_HOST
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  url.hostname = CANONICAL_HOST;
  url.port = '';
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
