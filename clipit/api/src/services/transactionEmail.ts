const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.CLIPIT_NOTIFY_FROM ?? 'ClipIt <notify@clipit.shigotoku.com>';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendShareConfirmationEmail(
  to: string[],
  input: { orgName: string; manualTitle: string; shareUrl: string; message?: string },
): Promise<boolean> {
  if (!RESEND_API_KEY || to.length === 0) return false;

  const extra = input.message
    ? `<p style="margin:12px 0;padding:12px;background:#f8fafc;border-radius:8px">${escapeHtml(input.message)}</p>`
    : '';

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#334155;max-width:560px">
      <p>${escapeHtml(input.orgName)} から、マニュアルの確認依頼が届いています。</p>
      <p style="font-size:18px;font-weight:bold;color:#0f172a">「${escapeHtml(input.manualTitle)}」</p>
      ${extra}
      <p>内容を確認し、ページ下部の「確認しました」を押してください（ログイン不要です）。</p>
      <p style="margin:20px 0">
        <a href="${escapeHtml(input.shareUrl)}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
          マニュアルを開く
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;word-break:break-all">${escapeHtml(input.shareUrl)}</p>
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
      subject: `[ClipIt] マニュアル「${input.manualTitle}」の確認をお願いします`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('shareConfirmationEmail failed:', res.status, body);
    return false;
  }
  return true;
}
