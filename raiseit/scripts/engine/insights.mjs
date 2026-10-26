// レイジット (RaiseIt) インサイトエンジン(純関数)。
// 入力: 取得済みの行データ → 出力: summary.json(管理画面・月次レポートが読む唯一の正本)。
//
// 設計原則(競合調査から):
//  1. 北極星は「PV・順位」ではなく成果(リード/予約)。流入→フォーム開始→成果の漏斗で見る。
//  2. 数字を出すだけでなく「次にやること」を、期待成果(幅つき)・確度・工数・リスク付きで優先順位づけする。
//  3. 推定は前提と幅を必ず示す。確度が低いものは断定しない。「今月はやらない」も明示する。
//  4. データの鮮度と「できないこと」を隠さない。
//  5. 自動変更はしない。承認が要るもの(リスク中以上)は承認区分を付ける。
//
// 注意: GSC のクエリ別行は匿名化クエリが除外され、クリックの一部しか含まない(実測: 約27%)。
//       そのため判断はページ別の実数(gsc-page)で行い、クエリ別は「ヒント表示」にのみ使う。

const DAY = 86400000;
export const addDays = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / DAY);
const sum = (rows, k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const maxDate = (rows) => rows.reduce((m, r) => (r.date > m ? r.date : m), '');

export function pathOf(u) {
  let p = u || '/';
  try {
    p = new URL(u).pathname;
  } catch {
    p = String(u).split('?')[0].split('#')[0] || '/';
  }
  if (!p.startsWith('/')) p = '/' + p;
  if (!/\.[a-z0-9]+$/i.test(p) && !p.endsWith('/')) p += '/';
  return p;
}

/** 順位帯ごとの期待CTR(目安)。業種・地域で差が大きいため「目安」として扱う */
export const expectedCtr = (pos) => (pos <= 3 ? 0.1 : pos <= 7 ? 0.04 : pos <= 10 ? 0.02 : 0.01);

const AI_RE = /(chatgpt|openai|perplexity|gemini|copilot|claude|you\.com|phind|kagi|meta\.ai|grok)/i;
const CV_RE = /(generate_lead|lead|submit|reserve|booking|appointment|contact|inquiry|tel_|phone|call)/i;

export function pickConversion(site, events) {
  const configured = (site.conversionEvents || []).filter(Boolean);
  const primary = site.primaryConversion || null;
  const names = new Map();
  for (const e of events) names.set(e.eventName, (names.get(e.eventName) || 0) + e.count);
  if (primary) return { primary, auto: false, names };
  for (const n of ['generate_lead', 'lead_submit', ...configured]) if (names.get(n)) return { primary: n, auto: false, names };
  const cand = [...names].filter(([k]) => CV_RE.test(k) && !/form_start/.test(k)).sort((a, b) => b[1] - a[1])[0];
  return { primary: cand ? cand[0] : null, auto: true, names };
}

const confLabel = (c) => (c >= 0.7 ? '高' : c >= 0.45 ? '中' : '低');

/**
 * @param input {{site, today, gscPage, gscQuery, ga4src, ga4ev, ga4conv, psi, actions, audit, competitors}}
 * @param opts  {{days?: number}}
 */
export function buildSummary(input, opts = {}) {
  const N = opts.days ?? 28;
  const { site, today } = input;
  const gscPage = input.gscPage ?? [];
  const gscQuery = input.gscQuery ?? [];
  const ga4src = input.ga4src ?? [];
  const ga4ev = input.ga4ev ?? [];
  const ga4conv = input.ga4conv ?? [];
  const psi = input.psi ?? [];
  const actionsLog = input.actions ?? [];

  // ---- 期間(GSC と GA4 の新しい方に合わせず、両方が揃う最新日までで揃える) ----
  const latestGsc = maxDate(gscPage) || maxDate(gscQuery);
  const latestGa4 = maxDate(ga4src) || maxDate(ga4ev);
  const latest = [latestGsc, latestGa4].filter(Boolean).sort()[0] || today;
  const curFrom = addDays(latest, -(N - 1));
  const prevTo = addDays(curFrom, -1);
  const prevFrom = addDays(prevTo, -(N - 1));
  const inCur = (r) => r.date >= curFrom && r.date <= latest;
  const inPrev = (r) => r.date >= prevFrom && r.date <= prevTo;
  const perMonth = 30 / N;

  // ---- 北極星: 成果(リード) ----
  const conv = pickConversion(site, ga4ev);
  const formStartName = site.formStartEvent || 'form_start';
  const evCount = (rows, name) => sum(rows.filter((r) => r.eventName === name), 'count');
  const leadsCur = conv.primary ? evCount(ga4ev.filter(inCur), conv.primary) : 0;
  const leadsPrev = conv.primary ? evCount(ga4ev.filter(inPrev), conv.primary) : 0;
  const formCur = evCount(ga4ev.filter(inCur), formStartName);
  const formPrev = evCount(ga4ev.filter(inPrev), formStartName);

  const weekly = [];
  for (let w = 11; w >= 0; w--) {
    const to = addDays(latest, -7 * w);
    const from = addDays(to, -6);
    const rows = ga4ev.filter((r) => r.date >= from && r.date <= to);
    weekly.push({ from, to, leads: conv.primary ? evCount(rows, conv.primary) : 0 });
  }

  const sessCur = sum(ga4src.filter(inCur), 'sessions');
  const sessPrev = sum(ga4src.filter(inPrev), 'sessions');
  const engCur = sum(ga4src.filter(inCur), 'engagedSessions');
  const keyEventsCur = sum(ga4src.filter(inCur), 'keyEvents');

  const northStar = {
    label: site.industry === 'clinic' ? '新規予約・問い合わせ' : '問い合わせ(リード)',
    event: conv.primary,
    eventAuto: conv.auto,
    cur: leadsCur,
    prev: leadsPrev,
    deltaPct: leadsPrev ? round(((leadsCur - leadsPrev) / leadsPrev) * 100, 0) : null,
    weekly,
    note: conv.primary
      ? `GA4 イベント「${conv.primary}」の件数。${conv.auto ? '自動判定(設定で変更可)。' : ''}`
      : '成果イベントが未検出です。計測の設定が必要です。',
  };
  const funnel = {
    sessions: sessCur,
    sessionsPrev: sessPrev,
    engaged: engCur,
    formStart: formCur,
    formStartPrev: formPrev,
    leads: leadsCur,
    sessionToLeadPct: sessCur ? round((leadsCur / sessCur) * 100, 2) : null,
    formAbandonPct: formCur >= 5 ? round(Math.max(0, 1 - leadsCur / formCur) * 100, 0) : null,
    note: 'フォーム開始と成果は別イベントの件数比(概算)。複数回開始・複数イベント発火で実際の離脱率とは異なる場合があります。',
  };

  // ---- チャネル別(流入と成果) ----
  const convRows = conv.primary ? ga4conv.filter((r) => r.eventName === conv.primary) : [];
  const hasConvBreakdown = convRows.length > 0;
  const chMap = new Map();
  const ch = (k) => {
    if (!chMap.has(k)) chMap.set(k, { channel: k, sessions: 0, prevSessions: 0, leads: 0, prevLeads: 0 });
    return chMap.get(k);
  };
  for (const r of ga4src.filter(inCur)) ch(r.channel).sessions += r.sessions;
  for (const r of ga4src.filter(inPrev)) ch(r.channel).prevSessions += r.sessions;
  for (const r of convRows.filter(inCur)) ch(r.channel).leads += r.count;
  for (const r of convRows.filter(inPrev)) ch(r.channel).prevLeads += r.count;
  const channels = [...chMap.values()]
    .sort((a, b) => b.sessions - a.sessions)
    .map((c) => ({ ...c, cvrPct: c.sessions ? round((c.leads / c.sessions) * 100, 2) : null }));

  const aiSrc = new Map();
  for (const r of ga4src.filter(inCur)) if (AI_RE.test(r.source) || r.channel === 'AI Assistant') aiSrc.set(r.source, (aiSrc.get(r.source) || 0) + r.sessions);
  const aiPrev = sum(ga4src.filter(inPrev).filter((r) => AI_RE.test(r.source) || r.channel === 'AI Assistant'), 'sessions');
  const ai = { sessions: [...aiSrc.values()].reduce((a, b) => a + b, 0), prev: aiPrev, sources: [...aiSrc].map(([source, sessions]) => ({ source, sessions })).sort((a, b) => b.sessions - a.sessions) };

  // ---- 検索(GSC): ページ別の実数を正とする ----
  const gscCur = gscPage.filter(inCur);
  const gscPrev = gscPage.filter(inPrev);
  const totals = (rows) => {
    const imp = sum(rows, 'impressions');
    return { clicks: sum(rows, 'clicks'), impressions: imp, ctrPct: imp ? round((sum(rows, 'clicks') / imp) * 100, 2) : 0, position: imp ? round(rows.reduce((s, r) => s + r.position * r.impressions, 0) / imp, 1) : 0 };
  };
  const seo = { ...totals(gscCur), prev: totals(gscPrev), source: gscPage.length ? 'gsc-page' : 'gsc' };
  const queryClicks = sum(gscQuery.filter(inCur), 'clicks');
  seo.queryCoveragePct = seo.clicks ? round((queryClicks / seo.clicks) * 100, 0) : null;

  const aggPages = (rows) => {
    const m = new Map();
    for (const r of rows) {
      const k = pathOf(r.page);
      const a = m.get(k) || { path: k, clicks: 0, impressions: 0, posW: 0 };
      a.clicks += r.clicks;
      a.impressions += r.impressions;
      a.posW += r.position * r.impressions;
      m.set(k, a);
    }
    for (const a of m.values()) {
      a.ctr = a.impressions ? a.clicks / a.impressions : 0;
      a.position = a.impressions ? a.posW / a.impressions : 0;
    }
    return m;
  };
  const pagesCur = aggPages(gscCur);
  const pagesPrev = aggPages(gscPrev);
  const topQueriesFor = (path) => {
    const m = new Map();
    for (const r of gscQuery.filter(inCur)) if (pathOf(r.page) === path) m.set(r.query, (m.get(r.query) || 0) + r.impressions);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([q]) => q);
  };

  // ---- 検索クリック → 成果 の換算(前提を明示) ----
  const lookbackFrom = addDays(latest, -89);
  const orgSess90 = sum(ga4src.filter((r) => r.date >= lookbackFrom && r.date <= latest && r.channel === 'Organic Search'), 'sessions');
  const orgLeads90 = sum(convRows.filter((r) => r.date >= lookbackFrom && r.date <= latest && r.channel === 'Organic Search'), 'count');
  const gscClicks90 = sum(gscPage.filter((r) => r.date >= lookbackFrom && r.date <= latest), 'clicks');
  const siteCvr90 = (() => {
    const s = sum(ga4src.filter((r) => r.date >= lookbackFrom && r.date <= latest), 'sessions');
    const l = conv.primary ? evCount(ga4ev.filter((r) => r.date >= lookbackFrom && r.date <= latest), conv.primary) : 0;
    return s ? l / s : 0;
  })();
  const organicCvr = hasConvBreakdown && orgSess90 >= 100 ? orgLeads90 / orgSess90 : siteCvr90;
  const clickToSession = gscClicks90 && orgSess90 ? Math.min(1.2, Math.max(0.3, orgSess90 / gscClicks90)) : 0.8;
  const cvrSample = hasConvBreakdown ? orgLeads90 : leadsCur;
  const cvrReliability = Math.min(1, cvrSample / 20); // 成果件数が少ないと換算の信頼度が下がる
  const leadsPerClick = organicCvr * clickToSession;
  const conversion = {
    organicCvrPct: round(organicCvr * 100, 2),
    clickToSessionPct: round(clickToSession * 100, 0),
    leadsPer100Clicks: round(leadsPerClick * 100, 2),
    sampleLeads: cvrSample,
    note: `検索クリック100件あたり約${round(leadsPerClick * 100, 1)}件の成果という換算(直近90日の実績)。成果件数が少ないほど幅が大きくなります。`,
  };
  const leadsFromClicks = (clicksPerMonth) => {
    const mid = clicksPerMonth * leadsPerClick;
    return { low: round(mid * 0.4, 2), mid: round(mid, 2), high: round(mid * 1.6, 2) };
  };

  // ---- アクションキュー ----
  const actions = [];
  const seg = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'root';
  const push = (a) => actions.push({ approval: 'owner', risk: 'mid', ...a });
  const isMedical = site.industry === 'clinic';
  const approvalFor = (risk) => (risk === 'high' ? (isMedical ? 'doctor' : 'owner') : risk === 'mid' ? 'owner' : 'none');

  // 計測: 成果イベントはあるのに GA4 のキーイベントが 0
  if (conv.primary && leadsCur > 0 && keyEventsCur === 0) {
    push({
      id: 'trk-key-event', rule: 'tracking.key-event', category: '計測',
      title: `GA4 で「${conv.primary}」をキーイベントに設定する`,
      why: [`直近${N}日で「${conv.primary}」が${leadsCur}件発生しているのに、GA4 のキーイベントが0件です。`, 'GA4 の標準レポート・Search Console 連携・広告最適化で成果が見えない状態です。'],
      how: ['GA4 管理 → イベント → 「' + conv.primary + '」の「キーイベントとしてマークを付ける」をオンにする。', '設定後は新しいデータからキーイベントとして集計される(過去分は遡及しない)。'],
      impact: { kind: 'foundation', basis: '直接の増加ではなく、以後の効果測定・チャネル別成果の精度を上げる土台' },
      value: 3, confidence: 0.95, effortMin: 10, risk: 'low', approval: 'none',
    });
  }

  // 計測: 表示速度の観測が未開始
  if (!psi.length) {
    push({
      id: 'trk-psi', rule: 'tracking.psi', category: '表示速度',
      title: '表示速度(Core Web Vitals)の定点観測を始める',
      why: ['PageSpeed Insights のデータがまだ保存されていません。', '表示速度は離脱・検索順位の両方に影響するため、変化に気づける状態にします。'],
      how: ['PageSpeed Insights API キー(制限: PageSpeed Insights API のみ)を発行し、Secret Manager に設定する。', '設定後は毎週月曜に自動取得される。'],
      impact: { kind: 'foundation', basis: '悪化の早期検知(直接の件数は見込まない)' },
      value: 0.5, confidence: 0.9, effortMin: 15, risk: 'low', approval: 'none',
    });
  }

  // 計測の乖離: 検索クリックに対し GA4 の自然検索セッションが極端に少ない(同意バナー・タグ未設置・ボット等の疑い)
  {
    const clicksCur = sum(gscPage.filter(inCur), 'clicks');
    const orgSess = sum(ga4src.filter((r) => inCur(r) && r.channel === 'Organic Search'), 'sessions');
    const ratio = clicksCur ? orgSess / clicksCur : null;
    if (clicksCur >= 200 && ratio !== null && ratio < 0.5) {
      push({
        id: 'trk-gap', rule: 'tracking.gap', category: '計測',
        title: `検索クリック${clicksCur}件に対し、GA4 の自然検索セッションは${orgSess}件しかありません`,
        why: [`クリック→セッションの比率が約${round(ratio * 100, 0)}%です(通常は7〜9割程度)。`, '同意バナーでGA4が止まっている、一部ページにタグがない、クリックの一部が計測されない端末・ブラウザ、などが疑われます。', '計測が欠けていると、成果率・チャネル別成果がすべて過小評価になり、施策判断を誤ります。'],
        how: ['同意(Cookie)バナーの設定を確認し、GA4が拒否時にも匿名計測できる設定(同意モード)になっているか確認する。', '詳細データ「ページ別」で、クリックに対し入口セッションが特に少ないページを開き、GA4タグが出力されているか確認する。', 'GA4 リアルタイムで自分のアクセスが記録されるか試す。'],
        impact: { kind: 'foundation', basis: '計測精度の回復(以後の全ての判断の前提)' },
        value: 3, confidence: 0.7, effortMin: 60, risk: 'low', approval: 'none',
      });
    }
  }
  // 競合の定点観測(公開情報の週次スナップショット)
  const cmpRows = input.competitors ?? [];
  const competitors = [...new Set(cmpRows.map((r) => r.id))].map((id) => {
    const rows = cmpRows.filter((r) => r.id === id).sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = rows[rows.length - 1];
    const since = addDays(latest, -(N - 1));
    const seen = new Set();
    const newPages = [];
    for (const r of rows.filter((x) => x.date >= since)) for (const u of r.newUrls ?? []) if (!seen.has(u.url)) { seen.add(u.url); newPages.push({ ...u, date: r.date }); }
    const newCount = rows.filter((x) => x.date >= since).reduce((n, r) => n + (r.newCount ?? 0), 0);
    return {
      id, name: last.name, url: last.url, ok: last.ok !== false, note: last.note ?? '', lastDate: last.date,
      home: last.home ?? null, sitemapCount: last.sitemapCount ?? null,
      sitemapTrend: rows.slice(-12).map((r) => ({ date: r.date, count: r.sitemapCount ?? null })),
      newCount, newPages: newPages.slice(0, 15), removedCount: rows.filter((x) => x.date >= since).reduce((n, r) => n + (r.removedCount ?? 0), 0),
      weeks: rows.length,
    };
  });
  for (const c of competitors.filter((x) => x.newCount >= 3)) {
    push({
      id: `cmp-new-${c.id}`, rule: 'competitor.new-pages', category: '競合',
      title: `競合「${c.name}」が直近${N}日で新規ページを${c.newCount}本公開しています`,
      why: [`サイトマップ上の新規ページ: ${c.newPages.slice(0, 4).map((p) => p.title || pathOf(p.url)).join(' / ')}`, '競合が注力しているテーマの手がかりです(あくまで公開ページの題名からの推測です)。'],
      how: ['新規ページのテーマを確認し、自社に同等のページがあるか、内容が劣っていないかを見る。', '内容の模倣はしない。自社の強み・一次情報で差をつける。'],
      impact: { kind: 'quality', basis: '市場の動きの把握(件数には換算しない)' },
      value: 0.5, confidence: 0.25, effortMin: 30, risk: 'low', approval: 'none',
    });
  }
  // AI 検索
  push({
    id: 'ai-visibility', rule: 'ai.referral', category: 'AI検索',
    title: ai.sessions > 0 ? 'AI検索から来ているページを、引用されやすい構造に整える' : 'AI検索からの流入を計測し、引用されやすい構造を整える',
    why: ai.sessions > 0
      ? [`AIアシスタント経由の訪問が直近${N}日で${ai.sessions}セッションあります(${ai.sources.map((s) => `${s.source} ${s.sessions}`).join('、')})。`, '結論先出し・見出し・事実の明記・更新日を整えると引用されやすくなります(効果は保証されません)。']
      : ['AIアシスタント経由の訪問は検出されていません。', 'GA4 のチャネル定義に AI の流入元が含まれているか確認が必要です。'],
    how: ['AI経由の着地ページを確認し、冒頭に結論、見出しごとに要点、最終更新日を入れる。', '同じ質問を定期的に試し、言及・引用の推移を見る(定点観測は今後の機能)。'],
    impact: { kind: 'visibility', basis: '言及・引用の増加は直接の件数に換算しない(測定が揺れるため)' },
    value: ai.sessions > 0 ? 0.8 : 0.3, confidence: 0.5, effortMin: 60, risk: 'low', approval: 'none',
  });

  // フォーム離脱(UEO)
  if (formCur >= 20 && funnel.formAbandonPct !== null && funnel.formAbandonPct >= 25) {
    const abandoned = Math.max(0, formCur - leadsCur) * perMonth;
    const mid = abandoned * 0.12;
    push({
      id: 'ueo-form', rule: 'ueo.form-abandon', category: 'UEO',
      title: '問い合わせフォームの入力項目・導線を見直す',
      why: [`フォーム開始${formCur}件に対して成果${leadsCur}件(離脱の目安 約${funnel.formAbandonPct}%)。`, '開始した人の一部が最後まで進んでいません。項目数・必須項目・エラー表示が主な原因候補です。'],
      how: ['必須項目を最小限に減らす(氏名・連絡先・用件のみ等)。', 'スマホでの入力しやすさ(入力タイプ・自動補完・エラー文)を確認する。', '見直し後に、フォーム開始→成果の比率を2週間後に比較する。'],
      impact: { kind: 'leads', low: round(mid * 0.4, 2), mid: round(mid, 2), high: round(mid * 1.6, 2), basis: `離脱分の約12%(5〜20%)が完了すると仮定。月あたり換算 離脱${round(abandoned, 1)}件` },
      value: mid, confidence: 0.45, effortMin: 120, risk: 'mid',
    });
  }

  // 低CTR / あと一押し / 急落(ページ別の実数で判断)
  const candidates = [];
  for (const [path, a] of pagesCur) {
    if (a.impressions >= 100 && a.position <= 10 && a.ctr < expectedCtr(a.position) * 0.6) candidates.push({ kind: 'low-ctr', path, a });
    else if (a.impressions >= 100 && a.position > 7.5 && a.position <= 20) candidates.push({ kind: 'striking', path, a });
  }
  const lowCtr = candidates.filter((c) => c.kind === 'low-ctr').map((c) => ({ ...c, lost: c.a.impressions * expectedCtr(c.a.position) - c.a.clicks })).sort((x, y) => y.lost - x.lost).slice(0, 4);
  for (const c of lowCtr) {
    const extraClicks = c.lost * 0.5 * perMonth; // 目安CTRの半分まで改善すると仮定
    const reliability = Math.min(1, c.a.impressions / 600);
    push({
      id: `seo-ctr-${seg(c.path)}`, rule: 'seo.low-ctr', category: 'SEO', url: c.path, hints: topQueriesFor(c.path),
      title: `${c.path} のタイトル・説明文を検索意図に合わせて見直す`,
      why: [`${c.a.position.toFixed(1)}位なのにクリック率${(c.a.ctr * 100).toFixed(1)}%(この順位の目安 約${(expectedCtr(c.a.position) * 100).toFixed(0)}%)。表示${c.a.impressions}回に対しクリック${c.a.clicks}回。`, '順位に見合うクリックを取りこぼしています。'],
      how: ['検索結果での見え方(title・description)を、主な検索意図(下記ヒント)に答える内容に書き換える。', '誇張・最上級表現は使わない。医療情報は医療広告チェックを通す。', '反映後は「施策を記録」し、2週間後にクリック数の変化を確認する。'],
      impact: { kind: 'leads', ...leadsFromClicks(extraClicks), basis: `クリック率が目安の半分まで改善すると仮定(月+${round(extraClicks, 1)}クリック)→検索クリック100件あたり${conversion.leadsPer100Clicks}件の成果で換算` },
      value: leadsFromClicks(extraClicks).mid, confidence: round(0.35 + 0.4 * reliability * (0.4 + 0.6 * cvrReliability), 2), effortMin: 20, risk: 'mid',
    });
  }
  const striking = candidates.filter((c) => c.kind === 'striking').sort((x, y) => y.a.impressions - x.a.impressions).slice(0, 3);
  for (const c of striking) {
    const extraClicks = Math.max(0, c.a.impressions * (0.04 - c.a.ctr)) * 0.3 * perMonth; // 7位相当まで上がる確率を3割と仮定
    push({
      id: `seo-strike-${seg(c.path)}`, rule: 'seo.striking-distance', category: 'SEO', url: c.path, hints: topQueriesFor(c.path),
      title: `${c.path} の見出し・本文を強化し、関連ページから内部リンクを足す`,
      why: [`平均${c.a.position.toFixed(1)}位(表示${c.a.impressions}回)。1ページ目の上位に入れば、クリックが大きく伸びる位置です。`],
      how: ['検索意図に対して足りない見出し・事実・FAQ を本文に追加する(下記ヒントのクエリ)。', '関連する既存ページから、このページへ内部リンクを追加する。', '本文の変更は承認が必要。医療情報は医師の確認と広告チェックを通す。'],
      impact: { kind: 'leads', ...leadsFromClicks(extraClicks), basis: `7位相当まで上がる確率を約30%と仮定(月+${round(extraClicks, 1)}クリック期待)` },
      value: leadsFromClicks(extraClicks).mid, confidence: round(0.3 + 0.2 * Math.min(1, c.a.impressions / 600), 2), effortMin: 90, risk: 'high',
    });
  }
  const drops = [];
  for (const [path, p] of pagesPrev) {
    const c = pagesCur.get(path) || { clicks: 0, impressions: 0, position: 0 };
    if (p.impressions >= 150 && c.impressions < p.impressions * 0.6) drops.push({ path, p, c });
  }
  drops.sort((x, y) => (y.p.impressions - y.c.impressions) - (x.p.impressions - x.c.impressions));
  for (const d of drops.slice(0, 2)) {
    const lostClicks = Math.max(0, d.p.clicks - d.c.clicks) * perMonth;
    push({
      id: `seo-drop-${seg(d.path)}`, rule: 'seo.drop', category: 'SEO', url: d.path,
      title: `${d.path} の表示回数が急に減った原因を確認する`,
      why: [`表示回数 ${d.p.impressions} → ${d.c.impressions}(前の${N}日比)。クリック ${d.p.clicks} → ${d.c.clicks}。`, '原因候補: インデックス状態・順位の低下・季節性・Googleの更新。'],
      how: ['Search Console の URL 検査でインデックス状態を確認する。', '同じ時期に変更した内容(タイトル・本文・リンク)がないか確認する。', '季節性の可能性(前年同時期)も見る。'],
      impact: { kind: 'leads', ...leadsFromClicks(lostClicks * 0.4), basis: `失ったクリック(月${round(lostClicks, 1)})の約4割を取り戻せると仮定。季節要因なら戻らない` },
      value: leadsFromClicks(lostClicks * 0.4).mid, confidence: 0.4, effortMin: 40, risk: 'low', approval: 'none',
    });
  }

  // ページ別CVR(ランディングページ)
  const lp = new Map();
  for (const r of ga4src.filter(inCur)) {
    const k = pathOf(r.landingPage);
    const a = lp.get(k) || { path: k, sessions: 0, leads: 0 };
    a.sessions += r.sessions;
    lp.set(k, a);
  }
  for (const r of convRows.filter(inCur)) {
    const k = pathOf(r.landingPage);
    const a = lp.get(k) || { path: k, sessions: 0, leads: 0 };
    a.leads += r.count;
    lp.set(k, a);
  }
  const landing = [...lp.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 15).map((a) => ({ ...a, cvrPct: a.sessions ? round((a.leads / a.sessions) * 100, 2) : null }));
  const siteCvrCur = sessCur ? leadsCur / sessCur : 0;
  if (hasConvBreakdown && siteCvrCur > 0) {
    const weak = [...lp.values()].filter((a) => a.sessions >= 60 && !/^\/(blog|news|column)\//.test(a.path) && a.leads / a.sessions < siteCvrCur * 0.4).sort((x, y) => y.sessions - x.sessions).slice(0, 2);
    for (const a of weak) {
      const mid = a.sessions * perMonth * (siteCvrCur * 0.6 - a.leads / a.sessions);
      push({
        id: `ueo-lp-${seg(a.path)}`, rule: 'ueo.landing-cvr', category: 'UEO', url: a.path,
        title: `${a.path} から問い合わせへの導線(CTA)を強化する`,
        why: [`このページから入った${a.sessions}セッションのうち、成果は${a.leads}件(${round((a.leads / a.sessions) * 100, 2)}%)。サイト平均${round(siteCvrCur * 100, 2)}%の半分未満です。`],
        how: ['ファーストビューと記事末尾に、次の行動(問い合わせ・資料請求)を置く。', 'ボタン文言を「何が得られるか」が分かる表現にする。', '変更後2週間で、このページの成果率を比較する。'],
        impact: { kind: 'leads', low: round(mid * 0.3, 2), mid: round(mid, 2), high: round(mid * 1.6, 2), basis: `成果率がサイト平均の約60%まで上がると仮定(月+${round(mid, 1)}件)。ページの役割(情報提供のみ)による可能性もあります` },
        value: mid, confidence: 0.35, effortMin: 60, risk: 'mid',
      });
    }
  }

  // 公開ページ監査(読み取り専用クロールの結果)。件数には換算せず「品質・安全」として扱う
  const auditAll = input.audit ?? [];
  const auditDate = auditAll.length ? auditAll.reduce((m, r) => (r.date > m ? r.date : m), '') : null;
  const audit = auditDate ? auditAll.filter((r) => r.date === auditDate) : [];
  const lst = (rows) => rows.slice(0, 5).map((r) => pathOf(r.page)).join('、') + (rows.length > 5 ? ` ほか${rows.length - 5}件` : '');
  if (audit.length) {
    const live = audit.filter((r) => r.blocks?.length);
    if (live.length) {
      push({
        id: 'aud-compliance', rule: 'audit.compliance', category: '医療広告',
        title: `公開中の${live.length}ページに、医療広告で問題になりうる表現が見つかりました`,
        why: live.slice(0, 5).map((r) => `${pathOf(r.page)}: ${r.blocks.map((b) => `「${b.match}」(${b.label})`).join('、')}`),
        how: ['該当箇所を確認し、体験談・効果の断定・最上級表現などは削除または客観的な表現に直す。', '修正文案は「文案チェック」で再確認し、最終判断は人(必要なら医師・専門家)が行う。', 'ルールベースの検出のため誤検知もあります。文脈を見て判断してください。'],
        impact: { kind: 'quality', basis: '行政指導・信頼低下のリスク低減(件数には換算しない)' },
        value: 4, confidence: 0.6, effortMin: 30, risk: 'high',
      });
    }
    const bad = audit.filter((r) => r.status !== 200);
    if (bad.length) {
      push({
        id: 'aud-http', rule: 'audit.http', category: '技術',
        title: `流入のある${bad.length}ページが正常に表示されていません`,
        why: [`取得結果が200以外: ${lst(bad)}`, '検索から来た人が見られない状態の可能性があります(一時的な取得失敗の場合もあります)。'],
        how: ['実際にブラウザで開いて確認する。', 'URLを変えた場合は 301 リダイレクトを設定する。'],
        impact: { kind: 'quality', basis: '流入ページの表示不可は機会損失に直結(件数には換算しない)' },
        value: 3, confidence: 0.7, effortMin: 30, risk: 'low',
      });
    }
    const noidx = audit.filter((r) => /noindex/i.test(`${r.robots ?? ''} ${r.xRobots ?? ''}`));
    if (noidx.length) {
      push({
        id: 'aud-noindex', rule: 'audit.noindex', category: '技術',
        title: `noindex が付いた流入ページが${noidx.length}件あります`,
        why: [lst(noidx), 'noindex は検索結果から外す指示です。意図しない設定なら流入が失われます。'],
        how: ['意図した設定か確認し、意図しない場合は meta robots / X-Robots-Tag を外す。'],
        impact: { kind: 'quality', basis: '検索結果からの除外を防ぐ(件数には換算しない)' },
        value: 3, confidence: 0.8, effortMin: 20, risk: 'mid',
      });
    }
    const html = audit.filter((r) => r.status === 200 && r.title !== undefined);
    const noDesc = html.filter((r) => !r.desc);
    const noH1 = html.filter((r) => r.h1Count !== 1);
    const noCanon = html.filter((r) => !r.canonical);
    const titles = new Map();
    for (const r of html) if (r.title) titles.set(r.title, [...(titles.get(r.title) ?? []), r]);
    const dup = [...titles.values()].filter((v) => v.length > 1).flat();
    const meta = [['説明文(meta description)がない', noDesc], ['h1 が1つではない', noH1], ['canonical がない', noCanon], ['タイトルが他ページと重複', dup]].filter(([, v]) => v.length);
    if (meta.length) {
      push({
        id: 'aud-meta', rule: 'audit.meta', category: '技術',
        title: `ページの基本設定に ${meta.reduce((n, [, v]) => n + v.length, 0)} 件の不備があります`,
        why: meta.map(([l, v]) => `${l}: ${lst(v)}`),
        how: ['各ページのタイトル・説明文・見出し構造・canonical を修正する(テンプレート側で直せる場合が多い)。', '修正後、数週間で表示回数・CTR の変化を確認する。'],
        impact: { kind: 'quality', basis: '検索結果での見え方の改善。効果は小さく不確実(件数には換算しない)' },
        value: 1, confidence: 0.5, effortMin: 60, risk: 'low',
      });
    }
    if (site.industry === 'clinic' && !html.some((r) => (r.jsonldTypes ?? []).some((t) => /MedicalClinic|Physician|MedicalOrganization|LocalBusiness|Hospital/.test(t)))) {
      push({
        id: 'aud-schema-clinic', rule: 'audit.schema', category: 'MEO',
        title: 'クリニックの構造化データ(MedicalClinic)を追加する',
        why: ['監査したページに、医療機関向けの構造化データが見つかりませんでした。', '住所・診療時間・診療科を機械可読にすると、検索・地図・AI検索で正しく扱われやすくなります。'],
        how: ['トップページ等に JSON-LD(MedicalClinic: 名称・住所・電話・診療時間・診療科)を追加する。', 'リッチリザルトテストで検証する。内容は院内の正式情報と一致させる。'],
        impact: { kind: 'quality', basis: '情報の正確な伝達(件数には換算しない)' },
        value: 1.5, confidence: 0.5, effortMin: 60, risk: 'mid',
      });
    }
  }
  // 優先度 = 期待成果 × 確度 ÷ (1 + 工数時間)。リスク高は承認区分を付与
  for (const a of actions) {
    a.approval = a.approval === 'none' ? 'none' : approvalFor(a.risk);
    a.confidenceLabel = confLabel(a.confidence);
    a.priority = round((a.value * a.confidence) / (1 + a.effortMin / 60), 3);
    a.impact.label =
      a.impact.kind === 'leads' ? `月 +${a.impact.low}〜${a.impact.high}件(中央 ${a.impact.mid})` : a.impact.kind === 'foundation' ? '計測の土台(件数の直接増加なし)' : a.impact.kind === 'quality' ? '品質・安全の改善(件数に換算しない)' : '可視性(件数に換算しない)';
  }
  actions.sort((a, b) => b.priority - a.priority);
  const thisWeek = actions.filter((a) => a.confidence >= 0.3).slice(0, 3).map((a) => a.id);
  const skipList = actions
    .filter((a) => !thisWeek.includes(a.id) && ((a.impact.kind === 'leads' && a.impact.mid < 0.3) || (a.risk === 'high' && a.confidence < 0.4)))
    .map((a) => ({ id: a.id, title: a.title, reason: a.impact.kind === 'leads' && a.impact.mid < 0.3 ? `期待成果が月${a.impact.mid}件と小さく、今月は後回しでよい` : '確度が低く本文変更のリスクが高いため、まず他の施策を優先' }));

  // ---- 施策の効果(実施前後。自然変動は除いていない) ----
  const WIN = 14;
  const effects = actionsLog
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 20)
    .map((ac) => {
      const days = diffDays(latest, ac.date);
      const target = ac.url ? pathOf(ac.url) : null;
      const pick = (from, to) => totals(gscPage.filter((r) => r.date >= from && r.date <= to && (!target || pathOf(r.page) === target)));
      const before = pick(addDays(ac.date, -WIN), addDays(ac.date, -1));
      const afterDays = Math.min(WIN, days);
      const after = afterDays > 0 ? pick(ac.date, addDays(ac.date, afterDays - 1)) : null;
      let verdict = 'measuring';
      if (after && days >= WIN && before.clicks >= 10) {
        const ch = (after.clicks - before.clicks) / before.clicks;
        verdict = ch > 0.15 ? 'up' : ch < -0.15 ? 'down' : 'flat';
      } else if (days >= WIN) verdict = 'unknown';
      return { date: ac.date, url: ac.url || null, note: ac.note, days, afterDays, before, after, verdict, caveat: '季節性・他の施策・Googleの更新を除いていません。「傾向」として扱ってください。' };
    });

  // ---- データの鮮度 ----
  const fresh = (id, label, rows, cadence, note) => {
    const d = rows.length ? maxDate(rows) : null;
    const lag = d ? diffDays(today, d) : null;
    return { id, label, latest: d, lagDays: lag, cadence, status: !d ? 'missing' : lag <= 3 ? 'ok' : lag <= 7 ? 'stale' : 'old', note };
  };
  const freshness = [
    fresh('gsc-page', '検索(Search Console)', gscPage, '日次', '仕様上2日前までのデータ'),
    fresh('ga4', 'アクセス・流入(GA4)', ga4src, '日次', '前日までのデータ'),
    fresh('ga4ev', '成果イベント(GA4)', ga4ev, '日次', '前日までのデータ'),
    fresh('ga4conv', 'チャネル別の成果(GA4)', ga4conv, '日次', '前日までのデータ'),
    fresh('psi', '表示速度(PageSpeed)', psi, '週次', 'APIキー未設定の場合は取得されません'),
    fresh('audit', '公開ページ監査', auditAll, '日次', '流入上位ページを読み取り専用で確認'),
  ];

  const limits = [
    '検索クリックは最終的な予約・問い合わせとは別の指標です。成果への換算は実績にもとづく推定で、幅を示しています。',
    `Search Console のクエリ別データは匿名化クエリが除外されます(このサイトではクリックの約${seo.queryCoveragePct ?? '-'}%のみ)。判断はページ別の実数で行っています。`,
    'Google ビジネスプロフィール(MEO)・Instagram・YouTube は未接続です(今後の機能)。X は費用の都合でCSV取り込みのみです。',
    '施策の効果測定は前後比較です。季節性や他の変更を取り除いていないため、断定せず傾向として表示します。',
    '自動でサイトや投稿を書き換えることはしません。すべて人の承認後です。',
  ];

  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    site: { id: site.id, name: site.name, industry: site.industry || '' },
    period: { latest, from: curFrom, to: latest, days: N, prevFrom, prevTo },
    northStar, funnel, channels, ai, seo, conversion, landing,
    competitors,
    audit: { date: auditDate, checked: audit.length, clean: audit.length ? audit.filter((r) => r.status === 200 && !r.blocks?.length).length : 0 },
    actions, thisWeek, skipList, effects, freshness, limits,
    pagesTop: [...pagesCur.values()].sort((a, b) => b.impressions - a.impressions).slice(0, 15).map((a) => ({ path: a.path, clicks: a.clicks, impressions: a.impressions, ctrPct: round(a.ctr * 100, 2), position: round(a.position, 1), prevClicks: pagesPrev.get(a.path)?.clicks ?? 0 })),
  };
}
