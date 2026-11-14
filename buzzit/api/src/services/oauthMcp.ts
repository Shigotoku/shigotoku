/**
 * ChatGPT / Claude などの Web 版コネクタ向け OAuth 2.1（PKCE・公開クライアント・動的クライアント登録）。
 * ユーザーはログインして「許可」を押すだけ。発行されるアクセストークンは API キー（bzk_）と同じで、
 * 設定画面の「AI連携」から無効化できる。
 */
import { createHash, randomBytes } from 'node:crypto';
import express, { Router } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { APP_ORIGIN, issueApiKey } from './agentApi';
import { assertPersonaAccess } from './personas';

export const oauthRouter = Router();

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const db = () => getFirestore();

function validRedirect(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

// ---- ディスカバリ ----
const protectedResource = (_req: express.Request, res: express.Response) => {
  res.json({
    resource: `${APP_ORIGIN}/api/v1/agent/mcp`,
    resource_name: 'BuzzIt',
    logo_uri: `${APP_ORIGIN}/icon-256.png`,
    authorization_servers: [APP_ORIGIN],
    bearer_methods_supported: ['header'],
  });
};
oauthRouter.get('/.well-known/oauth-protected-resource', protectedResource);
oauthRouter.get('/.well-known/oauth-protected-resource/*path', protectedResource);

const authServer = (_req: express.Request, res: express.Response) => {
  res.json({
    issuer: APP_ORIGIN,
    authorization_endpoint: `${APP_ORIGIN}/oauth/authorize`,
    token_endpoint: `${APP_ORIGIN}/api/oauth/token`,
    registration_endpoint: `${APP_ORIGIN}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
};
oauthRouter.get('/.well-known/oauth-authorization-server', authServer);
oauthRouter.get('/.well-known/oauth-authorization-server/*path', authServer);

// ---- 動的クライアント登録 ----
oauthRouter.post('/oauth/register', async (req, res) => {
  const body = req.body as { client_name?: string; redirect_uris?: string[] };
  const uris = (body.redirect_uris ?? []).filter((u) => typeof u === 'string');
  if (!uris.length || !uris.every(validRedirect)) {
    res.status(400).json({ error: 'invalid_redirect_uri' });
    return;
  }
  const clientId = `bzc_${randomBytes(16).toString('hex')}`;
  const name = String(body.client_name ?? 'AIアプリ').slice(0, 60);
  await db().collection('oauthClients').doc(clientId).set({
    name,
    redirectUris: uris.slice(0, 5),
    createdAt: FieldValue.serverTimestamp(),
  });
  res.status(201).json({
    client_id: clientId,
    client_name: name,
    redirect_uris: uris.slice(0, 5),
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code'],
    response_types: ['code'],
  });
});

// ---- 同意画面用（ログイン済みユーザー） ----
oauthRouter.get('/v1/oauth/client', requireAuth, async (req: AuthedRequest, res) => {
  const id = String(req.query.client_id ?? '');
  const snap = await db().collection('oauthClients').doc(id).get();
  if (!snap.exists) {
    res.status(404).json({ error: '接続元アプリが見つかりません' });
    return;
  }
  res.json({ name: snap.data()!.name, redirectUris: snap.data()!.redirectUris });
});

oauthRouter.post('/v1/oauth/approve', requireAuth, async (req: AuthedRequest, res) => {
  const b = req.body as {
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    personaId?: string;
  };
  try {
    const snap = await db().collection('oauthClients').doc(String(b.client_id ?? '')).get();
    if (!snap.exists) throw new Error('接続元アプリが見つかりません');
    const uris = snap.data()!.redirectUris as string[];
    if (!b.redirect_uri || !uris.includes(b.redirect_uri)) throw new Error('リダイレクト先が登録されていません');
    if (!b.code_challenge || (b.code_challenge_method ?? 'S256') !== 'S256') throw new Error('PKCE(S256) が必要です');
    if (!b.personaId) throw new Error('配信キャラを選んでください');
    await assertPersonaAccess(b.personaId, req.uid!, 'editor');
    const code = randomBytes(24).toString('hex');
    await db().collection('oauthCodes').doc(sha256(code)).set({
      uid: req.uid,
      personaId: b.personaId,
      clientId: b.client_id,
      clientName: snap.data()!.name,
      redirectUri: b.redirect_uri,
      challenge: b.code_challenge,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const url = new URL(b.redirect_uri);
    url.searchParams.set('code', code);
    if (b.state) url.searchParams.set('state', b.state);
    res.json({ redirect: url.toString() });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : '承認に失敗しました' });
  }
});

// ---- トークン ----
oauthRouter.post(
  '/oauth/token',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const b = req.body as Record<string, string | undefined>;
    const fail = (error: string) => res.status(400).json({ error });
    if (b.grant_type !== 'authorization_code' || !b.code || !b.code_verifier) {
      fail('invalid_request');
      return;
    }
    const ref = db().collection('oauthCodes').doc(sha256(b.code));
    const snap = await ref.get();
    if (!snap.exists) {
      fail('invalid_grant');
      return;
    }
    await ref.delete(); // ワンタイム
    const c = snap.data()!;
    if (c.expiresAt < Date.now() || c.clientId !== b.client_id || c.redirectUri !== b.redirect_uri) {
      fail('invalid_grant');
      return;
    }
    if (b64url(createHash('sha256').update(b.code_verifier).digest()) !== c.challenge) {
      fail('invalid_grant');
      return;
    }
    const { apiKey } = await issueApiKey(c.uid as string, c.personaId as string, `${c.clientName} (OAuth)`);
    res.set('Cache-Control', 'no-store').json({ access_token: apiKey, token_type: 'Bearer' });
  },
);
