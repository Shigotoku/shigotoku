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
