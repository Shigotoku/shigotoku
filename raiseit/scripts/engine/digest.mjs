// 週次ダイジェスト(メール本文)の生成と送信。院長が30秒で読める分量にする。
// 本文は summary.json だけから作る(純関数)。送信は Resend API(他アプリと同じ方式)。
import { pathToFileURL } from 'node:url';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function buildDigest(summary, { appUrl = '' } = {}) {
  const s = summary;
  const n = s.northStar;
  const delta = n.deltaPct == null ? '' : `(前の期間比 ${n.deltaPct > 0 ? '+' : ''}${n.deltaPct}%)`;
  const week = s.thisWeek.map((id) => s.actions.find((a) => a.id === id)).filter(Boolean);
  const subject = `【レイジット】${s.site.name}:${n.label} ${n.cur}件${delta} / 今週やること ${week.length}件`;

  const lines = [
    `${s.site.name} の週次レポート(${s.period.from} 〜 ${s.period.to})`,
    '',
    `■ ${n.label}: ${n.cur}件 ${delta}`,
    `  検索クリック ${s.seo.clicks.toLocaleString('ja-JP')} / セッション ${s.funnel.sessions.toLocaleString('ja-JP')} / AI経由 ${s.ai.sessions}`,
    '',
    '■ 今週やること',
    ...(week.length
      ? week.flatMap((a, i) => [`${i + 1}. ${a.title}`, `   期待効果: ${a.impact.label} / 確度: ${a.confidenceLabel} / 所要: 約${a.effortMin}分`])
      : ['  必須の施策はありません。']),
  ];
  if (s.effects.some((e) => e.verdict !== 'measuring')) {
    lines.push('', '■ 実施した施策の効果(傾向)');
    for (const e of s.effects.filter((x) => x.verdict !== 'measuring').slice(0, 3)) lines.push(`  ${e.date} ${e.note}: ${e.verdict === 'up' ? '増加傾向' : e.verdict === 'down' ? '減少傾向' : e.verdict === 'flat' ? '横ばい' : '判定不能'}`);
  }
  const stale = s.freshness.filter((f) => f.status !== 'ok');
  if (stale.length) lines.push('', `※ データ更新に遅れ: ${stale.map((f) => f.label).join('、')}`);
  if (appUrl) lines.push('', `承認・詳細はこちら: ${appUrl}`);
  lines.push('', '※ 効果は推定です。サイトの変更は自動では行いません。');
  const text = lines.join('\n');

  const html = `<div style="font-family:sans-serif;max-width:560px;line-height:1.6">
<h2 style="margin:0 0 4px">${esc(s.site.name)} 週次レポート</h2>
<div style="color:#64748b;font-size:12px">${esc(s.period.from)} 〜 ${esc(s.period.to)}</div>
<p style="font-size:28px;margin:12px 0 0"><b>${n.cur}件</b> <span style="font-size:13px;color:#64748b">${esc(n.label)} ${esc(delta)}</span></p>
<p style="font-size:13px;color:#475569">検索クリック ${s.seo.clicks.toLocaleString('ja-JP')} / セッション ${s.funnel.sessions.toLocaleString('ja-JP')} / AI経由 ${s.ai.sessions}</p>
<h3>今週やること</h3>
${week.length ? '<ol>' + week.map((a) => `<li><b>${esc(a.title)}</b><br><span style="font-size:12px;color:#64748b">期待効果: ${esc(a.impact.label)} / 確度 ${esc(a.confidenceLabel)} / 約${a.effortMin}分</span></li>`).join('') + '</ol>' : '<p>必須の施策はありません。</p>'}
${appUrl ? `<p><a href="${esc(appUrl)}" style="display:inline-block;background:#0b1320;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">承認・詳細を見る</a></p>` : ''}
<p style="font-size:11px;color:#94a3b8">効果は推定です。サイトの変更は自動では行いません。</p></div>`;
  return { subject, text, html };
}

export async function sendDigest({ to, subject, text, html, apiKey, from }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text().catch(() => '')}`);
}

// プレビュー: node scripts/engine/digest.mjs <summary.json>
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && process.argv[2]) {
  const { readFileSync } = await import('node:fs');
  const d = buildDigest(JSON.parse(readFileSync(process.argv[2], 'utf8')), { appUrl: 'https://example.com' });
  console.log(d.subject + '\n\n' + d.text);
}
