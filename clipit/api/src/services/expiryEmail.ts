const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.CLIPIT_NOTIFY_FROM ?? 'ClipIt <notify@clipit.shigotoku.com>';

export async function sendExpiryDigestEmail(
  to: string[],
  orgName: string,
  items: Array<{ title: string; message: string }>,
): Promise<boolean> {
  if (!RESEND_API_KEY || to.length === 0 || items.length === 0) return false;

  const listHtml = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px"><strong>${escapeHtml(item.title)}</strong><br/>${escapeHtml(item.message)}</li>`,
    )
    .join('');

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#334155">
      <p>${escapeHtml(orgName)} のマニュアルについて、見直しのお知らせです。</p>
      <ul style="padding-left:1.2em">${listHtml}</ul>
      <p style="font-size:13px;color:#64748b">
        <a href="https://app.clipit.shigotoku.com/dashboard">ClipIt ダッシュボード</a>から内容を確認してください。
      </p>
    </div>
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `[ClipIt] マニュアルの見直しが必要です（${items.length}件）`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('expiryEmail failed:', res.status, body);
    return false;
  }
  return true;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
