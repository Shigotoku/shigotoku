/**
 * トランザクションメール（Resend API / 将来 SMTP 拡張可）
 */
const FROM_EMAIL =
  process.env.BUZZIT_NOTIFY_FROM ?? process.env.MAIL_FROM ?? 'BuzzIt <notify@buzzit.shigotoku.com>';

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('メール送信が未設定です（RESEND_API_KEY）');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, ''),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`メール送信に失敗しました (${res.status}): ${body}`);
  }
}

export function buildAccountInviteEmail(input: {
  companyName: string;
  inviterName?: string;
  roleLabel: string;
  inviteUrl: string;
  expiresAt: string;
}): { subject: string; html: string; text: string } {
  const expires = new Date(input.expiresAt).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subject = `【BuzzIt】${input.companyName} への招待`;
  const text = [
    `${input.companyName} の BuzzIt ワークスペースに招待されました。`,
    input.inviterName ? `招待者: ${input.inviterName}` : '',
    `権限: ${input.roleLabel}`,
    '',
    `以下のリンクから参加してください（有効期限: ${expires}）`,
    input.inviteUrl,
    '',
    '※ 招待されたメールアドレスでログイン・新規登録してください。',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#171717">
      <p style="font-size:14px;color:#525252">BuzzIt からの招待</p>
      <h1 style="font-size:20px;margin:0 0 12px">${input.companyName} に参加する</h1>
      <p style="font-size:14px;line-height:1.6">
        ${input.inviterName ? `<strong>${input.inviterName}</strong> さんが、` : ''}
        あなたを <strong>${input.companyName}</strong> のメンバー（${input.roleLabel}）として招待しました。
      </p>
      <p style="margin:24px 0">
        <a href="${input.inviteUrl}" style="display:inline-block;background:#171717;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600;border-radius:6px">
          招待を承認する
        </a>
      </p>
      <p style="font-size:12px;color:#737373">有効期限: ${expires}</p>
      <p style="font-size:12px;color:#737373">リンクが開けない場合: ${input.inviteUrl}</p>
      <p style="font-size:12px;color:#a3a3a3;margin-top:24px">※ 招待メール宛先と同じアドレスでログイン・新規登録してください。</p>
    </div>
  `;

  return { subject, html, text };
}
