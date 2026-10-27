// 問題点 → 「そのままコピペして依頼できる文章」への変換。
// 2種類を作る: vendor(制作会社・担当者にメール/チャットで送る文) / ai(ChatGPT・Cursor等のAIに貼る指示)
// issue = { kind, title, severity('high'|'mid'|'low'), url?, facts[], problem, fixes[], verify[], risk? }

const SEV = { high: '高', mid: '中', low: '低' };

// 共通の守ってほしい条件(医療サイト向け。他業種では差し替える想定)
export const DEFAULT_CONSTRAINTS = [
  'デザイン(見た目・レイアウト・文言)は変えないでください。',
  'canonical / noindex / robots.txt / リダイレクトは変更しないでください。',
  '医療広告ガイドラインに反する表現(体験談・効果の断定・最上級・比較等)を追加しないでください。',
  '本番に反映する前に、プレビュー環境で表示崩れがないことを確認してください。',
];

// PageSpeed の監査項目 → 依頼に書く具体策(初心者でも貼れるよう平易に)
export const PSI_ADVICE = {
  'render-blocking-insight': { problem: '表示をブロックするCSS/JSがあり、画面の表示開始が遅れています。', fixes: ['<head>内の外部CSS/JSを減らす、または defer / async / media="print" onload 方式で非ブロッキングにする', '外部CDNのスクリプト(例: cdn.tailwindcss.com)を使っている場合は、ビルド済みCSSに置き換える'] },
  'image-delivery-insight': { problem: '画像が大きすぎる/最新形式ではないため、読み込みに時間がかかっています。', fixes: ['画像をWebP(またはAVIF)に変換し、表示サイズの2倍以内にリサイズする', 'ファーストビュー以外の画像には loading="lazy" を付ける', 'img に width / height を指定してレイアウトのズレを防ぐ'] },
  'unused-javascript': { problem: '使われていないJavaScriptを読み込んでいます。', fixes: ['ページで使っていないスクリプト・ライブラリを外す', 'タグマネージャーや解析タグは、必要なページだけに限定する'] },
  'unused-css-rules': { problem: '使われていないCSSを読み込んでいます。', fixes: ['未使用CSSを削除する(Tailwind等は使用クラスだけをビルドする)'] },
  'cache-insight': { problem: '画像・CSS・JS等にキャッシュ設定が弱く、再訪問時も毎回ダウンロードされています。', fixes: ['静的ファイル(画像・CSS・JS・フォント)に Cache-Control: public, max-age=31536000, immutable を設定する(ファイル名にハッシュを付ける)', 'HTMLは短いキャッシュ、または no-cache にする'] },
  'lcp-discovery-insight': { problem: '最大表示要素(メイン画像など)の読み込み開始が遅れています。', fixes: ['メイン画像に <link rel="preload" as="image" fetchpriority="high"> を付ける', 'メイン画像をCSSのbackgroundではなく、可能なら<img>で出す(または上記preloadを併用)', 'メイン画像に loading="lazy" を付けない'] },
  'legacy-javascript-insight': { problem: '古いブラウザ向けの不要なJavaScriptが含まれています。', fixes: ['ビルド対象ブラウザを近年のものに限定する(browserslist / target を更新)'] },
  'unminified-css': { problem: 'CSSが圧縮(minify)されていません。', fixes: ['CSSをminifyして配信する'] },
  'unminified-javascript': { problem: 'JavaScriptが圧縮(minify)されていません。', fixes: ['JavaScriptをminifyして配信する'] },
  'network-dependency-tree-insight': { problem: '読み込みが連鎖していて(CSSの中で別ファイルを読む等)、表示が遅れています。', fixes: ['フォントや画像を<head>で直接 preconnect / preload する', '@import でCSSを連鎖読み込みしない'] },
  'font-display-insight': { problem: 'Webフォントの読み込み中に文字が見えない時間があります。', fixes: ['@font-face / Googleフォントに font-display: swap を指定する', 'フォントの太さ・種類を必要最小限にする'] },
  'third-parties-insight': { problem: '外部サービスのスクリプトが表示を遅くしています。', fixes: ['不要な外部スクリプトを削除する', '必要なものは async / defer にし、ページ表示後に読み込む'] },
  'dom-size-insight': { problem: 'ページのHTML要素が多すぎて、描画が重くなっています。', fixes: ['不要な入れ子・非表示要素を削除する', '長いリストは分割して遅延表示する'] },
  'forced-reflow-insight': { problem: 'JavaScriptがレイアウト再計算を何度も強制しています。', fixes: ['要素サイズの読み取りと書き込みを交互に行わないようにまとめる'] },
};

const header = (issue, ctx) => [
  `対象サイト: ${ctx.site}`,
  issue.url ? `対象ページ: ${issue.url}` : null,
  `優先度: ${SEV[issue.severity] ?? '中'}`,
  `出典: レイジット (RaiseIt)(${ctx.date} 時点の計測)`,
].filter(Boolean);

const list = (arr, bullet = '・') => arr.map((x) => `${bullet}${x}`).join('\n');
const numbered = (arr) => arr.map((x, i) => `${i + 1}. ${x}`).join('\n');

export function buildInstructions(issue, ctx) {
  const constraints = issue.constraints ?? DEFAULT_CONSTRAINTS;
  const vendor = [
    `【改善のご依頼】${issue.title}`,
    '',
    ...header(issue, ctx),
    '',
    '■ 現状(計測結果)',
    list(issue.facts),
    '',
    '■ 問題点',
    issue.problem,
    '',
    '■ お願いしたい対応',
    numbered(issue.fixes),
    '',
    '■ ご注意いただきたい点',
    list(constraints),
    '',
    '■ 完了の確認方法',
    list(issue.verify),
    '',
    '対応の可否・工数・納期の目安をご連絡ください。ご不明点があれば遠慮なくご質問ください。',
  ].join('\n');

  const ai = [
    `あなたはWebサイトの改善を担当するエンジニアです。次の問題を、既存のコードを調べたうえで修正してください。`,
    '',
    `# 課題: ${issue.title}`,
    ...header(issue, ctx).map((l) => `- ${l}`),
    '',
    '## 現状(計測値)',
    list(issue.facts, '- '),
    '',
    '## 問題',
    issue.problem,
    '',
    '## やってほしいこと',
    numbered(issue.fixes),
    '',
    '## 制約(必ず守る)',
    list(constraints, '- '),
    '',
    '## 進め方',
    '1. まず該当ファイルを探し、原因を特定して、変更方針を短く説明してください(いきなり大きく書き換えない)。',
    '2. 最小限の変更で修正し、変更したファイルと理由を一覧にしてください。',
    '3. ビルド/テストが通ることを確認してください。',
    '4. 次の方法で効果を確認する手順を示してください。',
    list(issue.verify, '   - '),
    '',
    '不明点があれば、推測で進めず先に質問してください。',
  ].join('\n');

  return { vendor, ai };
}

// ---- 各種 issue のファクトリ ----
export function psiIssues(psiRows) {
  const bad = psiRows.filter((r) => !(r.perf >= 90 && r.lcpMs <= 2500));
  const isHome = (r) => { try { return new URL(r.url).pathname === '/'; } catch { return false; } };
  const build = (rows, title, single) => {
    if (!rows.length) return null;
    const advice = [...new Map(rows.flatMap((r) => r.audits ?? []).map((a) => [a.id, a])).values()].map((a) => ({ a, adv: PSI_ADVICE[a.id] })).filter((x) => x.adv).sort((x, y) => y.a.savingsMs - x.a.savingsMs);
    const flags = new Set(rows.flatMap((r) => r.flags ?? []));
    const worst = Math.max(...rows.map((r) => r.lcpMs));
    const facts = single
      ? [`モバイル総合スコア: ${rows[0].perf}/100`, `最大コンテンツの表示(LCP): ${(rows[0].lcpMs / 1000).toFixed(1)}秒(目安: 2.5秒以内)`, `レイアウトのズレ(CLS): ${rows[0].cls}`]
      : rows.map((r) => `${r.url} … スコア${r.perf} / LCP ${(r.lcpMs / 1000).toFixed(1)}秒`);
    facts.push(...advice.map(({ a }) => `${a.title}${a.display ? `(${a.display})` : ''}${a.savingsMs ? ` 約${a.savingsMs}ms短縮見込み` : ''}`));
    const fixes = [];
    if (flags.has('tailwind-cdn')) fixes.push('cdn.tailwindcss.com の読み込みをやめ、使用クラスだけをビルドしたCSSファイルに置き換える(表示ブロックと約120KBの転送が減ります)');
    if (flags.has('external-hero-image')) fixes.push('外部サイト(images.unsplash.com 等)のヒーロー画像を自社サーバーに置き、WebP化・サイズ別に用意して preload する');
    for (const { adv } of advice) for (const f of adv.fixes) if (!fixes.includes(f)) fixes.push(f);
    if (!fixes.length) fixes.push('PageSpeed Insights の「改善できる項目」を上から順に確認し、画像の軽量化と不要なスクリプトの削減を行う');
    // 実際の訪問者の計測(CrUX)が良好なら、ラボ測定の点数が低くても優先度を下げる(測定ツール上の見かけの可能性)
    const fld = rows.find((r) => r.originField)?.originField;
    const fieldGood = !!fld && fld.category === 'FAST' && (fld.lcpMs ?? 0) <= 2500;
    if (fld) facts.push(`実際の訪問者の計測(サイト全体・直近28日): LCP ${fld.lcpMs != null ? (fld.lcpMs / 1000).toFixed(1) + '秒' : '-'} / FCP ${fld.fcpMs != null ? (fld.fcpMs / 1000).toFixed(1) + '秒' : '-'} / 判定 ${fld.category ?? '-'}`);
    let severity = worst > 4000 || Math.min(...rows.map((r) => r.perf)) < 60 ? 'high' : 'mid';
    if (fieldGood) severity = 'low';
    return {
      kind: 'speed', title: fieldGood ? `${title}(実際の訪問者の体験は良好)` : title, severity,
      url: single ? rows[0].url : undefined, facts,
      problem: `スマートフォンでの表示が遅く、離脱や検索順位の低下につながります。${advice[0]?.adv.problem ?? ''}${single ? '' : ' 対象は同じテンプレート(ブログ記事等)を使うページ群のため、テンプレート側を直せば全ページに効きます。'}`,
      fixes,
      verify: ['PageSpeed Insights(https://pagespeed.web.dev/)で対象URLを測定し、モバイル総合スコア90以上・LCP 2.5秒以内を目標にする', '修正前後のスコアと表示を比較して共有する'],
    };
  };
  const home = bad.filter(isHome), others = bad.filter((r) => !isHome(r));
  return [
    ...home.map((r) => build([r], `トップページの表示が遅い(モバイルLCP ${(r.lcpMs / 1000).toFixed(1)}秒)`, true)),
    build(others, `記事ページの表示が遅い(${others.length}ページ・最大LCP ${(Math.max(0, ...others.map((r) => r.lcpMs)) / 1000).toFixed(1)}秒)`, false),
  ].filter(Boolean);
}
export function eventIssues({ keyEventTotal, cvEvents, evSumSize }) {
  const out = [];
  if (!evSumSize) return out;
  if (keyEventTotal === 0 && cvEvents.length) {
    const names = cvEvents.slice(0, 5).map(([k, v]) => `${k}(${v}件)`).join('、');
    out.push({
      kind: 'tracking', title: 'GA4で「成果(キーイベント)」が設定されていない', severity: 'high',
      facts: [`期間内のキーイベント合計: 0件`, `一方で成果らしきイベントは記録されています: ${names}`],
      problem: '予約・問い合わせなどの成果イベントは計測されていますが、GA4上で「キーイベント」に指定されていないため、流入元別の成果が集計できません。',
      fixes: ['GA4の管理画面 → データの表示 → イベント で、上記の成果イベントの「キーイベントとしてマークを付ける」をオンにする(コード変更は不要)', 'キーイベントとして指定するのは、問い合わせ送信完了・予約完了など最終成果のイベントに絞る(form_start などの途中経過は除く)'],
      verify: ['数日後にGA4の「レポート → 集客」でキーイベント数が表示されることを確認する'],
      constraints: ['既存のイベント名は変更しないでください(過去データとの連続性のため)。', 'GA4の権限(編集者以上)が必要です。'],
    });
  } else if (!cvEvents.length) {
    out.push({
      kind: 'tracking', title: '成果(予約・問い合わせ・電話)の計測が見当たらない', severity: 'high',
      facts: ['期間内に、電話・予約・フォーム送信などに該当するイベントが記録されていません'],
      problem: '集客施策の成果(予約・問い合わせ数)を測れないため、どの施策が効いたか判断できません。',
      fixes: ['電話リンク(tel:)のクリック、予約ボタン、問い合わせフォーム送信完了のGA4イベントを設置する(例: tel_click / reserve_click / generate_lead)', 'GA4でこれらを「キーイベント」に指定する'],
      verify: ['GA4のリアルタイムレポートで、実際にクリック/送信してイベントが記録されることを確認する'],
    });
  }
  return out;
}

export function seoTodoIssues(todos) {
  const map = {
    '低CTR': { title: (t) => `検索で表示されるのにクリックされない(${t.q})`, problem: '検索結果には出ていますが、タイトル・説明文が検索意図に合っておらず、クリックされていません。', fixes: (t) => [`titleタグに「${t.q}」を自然に含め、読者の悩み・得られる内容が一目で分かる表現に直す(全角30字前後)`, 'meta description を、このページで分かること・対象者を含む120字前後の文章に書き直す', '誇大表現(日本一・必ず 等)は使わない'] },
    '順位あと一押し': { title: (t) => `あと少しで上位表示できる(${t.q})`, problem: '検索順位が惜しい位置(8〜20位)にあり、内容の補強で上位に入れる可能性があります。', fixes: (t) => [`「${t.q}」に関する見出し(h2/h3)を追加し、読者の疑問に答える本文を補強する`, '関連する他の記事・サービスページから、このページへ内部リンクを2〜3本追加する', '最終更新日を更新し、古くなった情報(制度・日付)を最新に直す'] },
    '急落': { title: () => '検索での表示回数が急に減っている', problem: '直近の期間で、検索での表示回数が大きく減っています。', fixes: () => ['Search Consoleの「URL検査」で、インデックス登録されているか・エラーがないか確認する', 'ページ内容や公開状態(noindex・リダイレクト・404)が意図せず変わっていないか確認する', '内容が古い場合は最新情報に更新する'] },
  };
  return todos.map((t) => {
    const m = map[t.type]; if (!m) return null;
    return { kind: 'seo', title: m.title(t), severity: t.type === '急落' ? 'high' : 'mid', url: t.page, facts: [t.text], problem: m.problem, fixes: m.fixes(t), verify: ['Search Consoleで2〜4週間後に、対象ページの表示回数・クリック率・平均掲載順位が改善しているか確認する'] };
  }).filter(Boolean);
}
