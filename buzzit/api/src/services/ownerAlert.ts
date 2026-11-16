/**
 * 自動投稿がうまくいかなかったとき、登録メールアドレスへ知らせる。
 * - メール送信が未設定(RESEND_API_KEY なし)なら何もしない(投稿処理には影響しない)
 * - 通知が連発しないよう、同じユーザーには3時間に1通まで
 * - ユーザー文書に failureEmailEnabled=false があれば送らない(設定画面のオン/オフは未実装)
 */
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { isMailConfigured, sendTransactionalEmail } from './mail';

const MIN_INTERVAL_MS = 3 * 60 * 60 * 1000;
const APP_URL = 'https://app.buzzit.shigotoku.com';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

export async function alertOwnerByEmail(
  uid: string,
  input: { title: string; detail: string; linkPath?: string },
): Promise<void> {
  try {
    if (!isMailConfigured()) return;
    const db = getFirestore();
    const userSnap = await db.collection('users').doc(uid).get();
    const user = userSnap.data() ?? {};
    if (user.failureEmailEnabled === false) return;

    const throttleRef = db.doc(`users/${uid}/prefs/failureMail`);
    const last = Number((await throttleRef.get()).data()?.at ?? 0);
    if (Date.now() - last < MIN_INTERVAL_MS) return;

    let to = typeof user.email === 'string' ? user.email : '';
    if (!to) to = (await getAuth().getUser(uid)).email ?? '';
    if (!to) return;

    // 送信前に記録して、失敗しても連続送信にならないようにする
    await throttleRef.set({ at: Date.now() });

    const link = `${APP_URL}${input.linkPath ?? '/calendar'}`;
    const text = [
      input.title,
      '',
      input.detail.slice(0, 500),
      '',
      `確認はこちら: ${link}`,
      '',
      '※ 同じ内容のメールは3時間に1通までにまとめています。',
    ].join('\n');
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#171717">
        <h1 style="font-size:18px;margin:0 0 12px">${esc(input.title)}</h1>
        <p style="font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(input.detail.slice(0, 500))}</p>
        <p style="margin:20px 0"><a href="${link}" style="display:inline-block;background:#171717;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">BuzzIt で確認する</a></p>
        <p style="font-size:12px;color:#737373">同じ内容のメールは3時間に1通までにまとめています。</p>
      </div>`;
    await sendTransactionalEmail({ to, subject: `【BuzzIt】${input.title}`, html, text });
  } catch (err) {
    console.error('alertOwnerByEmail failed', uid, err instanceof Error ? err.message : err);
  }
}
