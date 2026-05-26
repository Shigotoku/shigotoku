/** LINE Messaging API — 配信・通知（店舗のチャネルトークン使用） */

export async function sendLinePush(
  channelAccessToken: string,
  userId: string,
  text: string,
): Promise<{ success: boolean; message: string }> {
  if (!channelAccessToken) {
    return { success: false, message: 'LINE Channel Access Token 未設定' };
  }

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `LINE push failed: ${err.slice(0, 200)}` };
  }

  return { success: true, message: 'LINE に送信しました' };
}

export async function sendLineBroadcast(
  channelAccessToken: string,
  text: string,
): Promise<{ success: boolean; message: string }> {
  if (!channelAccessToken) {
    return { success: false, message: 'LINE Channel Access Token 未設定' };
  }

  const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `LINE broadcast failed: ${err.slice(0, 200)}` };
  }

  return { success: true, message: 'LINE ブロードキャストを送信しました' };
}

/** LINE Narrowcast — Audience Group 経由のセグメント配信 */
export async function sendLineNarrowcast(
  channelAccessToken: string,
  audienceGroupId: number,
  text: string,
): Promise<{ success: boolean; message: string; requestId?: string }> {
  if (!channelAccessToken) {
    return { success: false, message: 'LINE Channel Access Token 未設定' };
  }
  const res = await fetch('https://api.line.me/v2/bot/message/narrowcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
      recipient: { type: 'audience', audienceGroupId },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `narrowcast failed: ${err.slice(0, 200)}` };
  }
  return {
    success: true,
    message: 'Narrowcast を送信しました',
    requestId: res.headers.get('x-line-request-id') ?? undefined,
  };
}

/** LINE Audience Group — オーディエンス作成（uploadByJson は最小100名） */
export async function createLineAudienceGroup(
  channelAccessToken: string,
  description: string,
  userIds: string[],
): Promise<{ success: boolean; audienceGroupId?: number; message: string }> {
  if (!channelAccessToken) return { success: false, message: 'LINE Channel Access Token 未設定' };
  const res = await fetch('https://api.line.me/v2/bot/audienceGroup/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${channelAccessToken}` },
    body: JSON.stringify({
      description: description.slice(0, 120),
      isIfaAudience: false,
      audiences: userIds.slice(0, 10000).map((id) => ({ id })),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `audienceGroup create failed: ${err.slice(0, 200)}` };
  }
  const json = (await res.json()) as { audienceGroupId?: number };
  return { success: true, audienceGroupId: json.audienceGroupId, message: 'Audience Group を作成しました' };
}

/** LINE Insights — 友だち推移 */
export async function getLineFollowerInsight(
  channelAccessToken: string,
  date: string,
): Promise<{ success: boolean; followers?: number; targetedReaches?: number; message?: string }> {
  if (!channelAccessToken) return { success: false, message: 'LINE Channel Access Token 未設定' };
  const res = await fetch(`https://api.line.me/v2/bot/insight/followers?date=${date}`, {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });
  if (!res.ok) return { success: false, message: 'insight followers failed' };
  const json = (await res.json()) as { followers?: number; targetedReaches?: number };
  return { success: true, followers: json.followers, targetedReaches: json.targetedReaches };
}

/** LINE Insights — 性別・年代分布 */
export async function getLineDemographicInsight(
  channelAccessToken: string,
): Promise<{ success: boolean; available?: boolean; data?: unknown; message?: string }> {
  if (!channelAccessToken) return { success: false, message: 'LINE Channel Access Token 未設定' };
  const res = await fetch('https://api.line.me/v2/bot/insight/demographic', {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });
  if (!res.ok) return { success: false, message: 'insight demographic failed' };
  return { success: true, available: true, data: await res.json() };
}

/** LINE Rich Menu — 作成 */
export async function createLineRichMenu(
  channelAccessToken: string,
  payload: {
    name: string;
    chatBarText: string;
    size: { width: number; height: number };
    areas: Array<{ bounds: { x: number; y: number; width: number; height: number }; action: { type: string; data?: string; uri?: string; label?: string } }>;
  },
): Promise<{ success: boolean; richMenuId?: string; message: string }> {
  if (!channelAccessToken) return { success: false, message: 'LINE Channel Access Token 未設定' };
  const res = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${channelAccessToken}` },
    body: JSON.stringify({
      size: payload.size,
      selected: true,
      name: payload.name,
      chatBarText: payload.chatBarText,
      areas: payload.areas,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { success: false, message: `richmenu create failed: ${err.slice(0, 200)}` };
  }
  const json = (await res.json()) as { richMenuId?: string };
  return { success: true, richMenuId: json.richMenuId, message: 'Rich Menu を作成しました' };
}

export function formatScheduleNotification(
  contents: Array<{ platform: string; label: string; content: string }>,
  scheduledAt: string,
): string {
  const when = new Date(scheduledAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const blocks = contents
    .map((c) => `【${c.label}】\n${c.content.slice(0, 800)}`)
    .join('\n\n---\n\n');

  return `📣 BuzzIt 投稿リマインダー（${when}）\n\n${blocks}\n\n👉 上記をコピーして各SNSアプリから投稿してください。`;
}
