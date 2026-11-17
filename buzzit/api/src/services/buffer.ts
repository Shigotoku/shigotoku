/**
 * Buffer 経由で X に投稿する(Buffer の個人用 API キー・無料プランで利用可)。
 * BuzzIt が投稿時刻に Buffer へ「約2分後に公開」で渡す方式なので、
 * Free プランの「予約は同時に10件まで」の制限に当たらない。
 * 1投稿 = API 1リクエスト(Free は1チャンネルあたり 30日で 1,000 リクエスト)。
 * 参考: https://developers.buffer.com/
 */
const ENDPOINT = 'https://api.buffer.com';

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
  organizationId: string;
}

export function bufferConnected(settings: { bufferApiKey?: string; bufferChannelId?: string }): boolean {
  return !!(settings.bufferApiKey?.trim() && settings.bufferChannelId?.trim());
}

async function gql<T>(apiKey: string, query: string): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let json: { data?: T; errors?: Array<{ message?: string }> } = {};
  try { json = JSON.parse(text); } catch { /* HTML 等 */ }
  if (res.status === 401 || res.status === 403) throw new Error('Buffer の API キーが正しくありません');
  if (res.status === 429) throw new Error('Buffer の API 利用上限に達しました。時間をおいて再試行してください');
  if (!res.ok) throw new Error(`Buffer API エラー (${res.status})`);
  if (json.errors?.length) throw new Error(`Buffer: ${json.errors[0]?.message ?? '不明なエラー'}`);
  if (!json.data) throw new Error('Buffer から想定外の応答がありました');
  return json.data;
}

/** API キーで見える全チャンネル(接続済みの X など)を返す */
export async function listBufferChannels(apiKey: string): Promise<BufferChannel[]> {
  const orgs = await gql<{ account: { organizations: Array<{ id: string; name?: string }> } }>(
    apiKey,
    'query { account { organizations { id name } } }',
  );
  const out: BufferChannel[] = [];
  for (const org of orgs.account.organizations) {
    const r = await gql<{ channels: Array<{ id: string; name?: string; displayName?: string; service?: string }> }>(
      apiKey,
      `query { channels(input: { organizationId: ${JSON.stringify(org.id)} }) { id name displayName service } }`,
    );
    for (const c of r.channels) {
      out.push({
        id: c.id,
        name: c.displayName || c.name || c.id,
        service: String(c.service ?? ''),
        organizationId: org.id,
      });
    }
  }
  return out;
}

const VIDEO_RE = /\.(mp4|mov|webm|m4v)(\?|$)/i;

/** 約2分後に公開する予約として Buffer に登録する */
export async function postViaBuffer(
  settings: { bufferApiKey?: string; bufferChannelId?: string },
  text: string,
  mediaUrls?: string[],
): Promise<{ success: boolean; message: string; postId?: string }> {
  if (!bufferConnected(settings)) return { success: false, message: 'Buffer が未連携です' };
  try {
    const dueAt = new Date(Date.now() + 2 * 60_000).toISOString();
    const assets = (mediaUrls ?? []).slice(0, 4).map((u) =>
      VIDEO_RE.test(u) ? `{ video: { url: ${JSON.stringify(u)} } }` : `{ image: { url: ${JSON.stringify(u)} } }`,
    );
    const q = `mutation {
      createPost(input: {
        text: ${JSON.stringify(text)}
        channelId: ${JSON.stringify(settings.bufferChannelId)}
        schedulingType: automatic
        mode: customScheduled
        dueAt: ${JSON.stringify(dueAt)}
        ${assets.length ? `assets: [${assets.join(', ')}]` : ''}
      }) {
        ... on PostActionSuccess { post { id dueAt } }
        ... on MutationError { message }
      }
    }`;
    const data = await gql<{ createPost: { post?: { id: string }; message?: string } }>(settings.bufferApiKey!, q);
    if (data.createPost.post?.id) {
      return { success: true, message: 'Buffer に登録しました(約2分後にXへ投稿されます)', postId: data.createPost.post.id };
    }
    return { success: false, message: `Buffer: ${data.createPost.message ?? '登録できませんでした'}` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Buffer への登録に失敗しました' };
  }
}
