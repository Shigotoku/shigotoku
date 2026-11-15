import type { Action, SiteFacts } from "./lib";

/** 素人向けの説明と、AIに渡すプロンプトの生成。ルール(a.rule)ごとに「何が悪いか」を平易に言い換える */

export type Area = { key: "seo" | "geo" | "meo" | "sns" | "site"; label: string; hint: string; cls: string };
const AREAS: Record<Area["key"], Area> = {
  seo: { key: "seo", label: "検索(SEO)", hint: "Googleなどの検索で見つけてもらう", cls: "bg-sky-50 text-sky-700" },
  geo: { key: "geo", label: "AI検索(GEO)", hint: "ChatGPT等のAIに紹介してもらう", cls: "bg-violet-50 text-violet-700" },
  meo: { key: "meo", label: "地図(MEO)", hint: "Googleマップで見つけてもらう", cls: "bg-emerald-50 text-emerald-700" },
  sns: { key: "sns", label: "SNS", hint: "SNSから来てもらう", cls: "bg-pink-50 text-pink-700" },
  site: { key: "site", label: "サイトの土台", hint: "計測・表示速度・問い合わせまでの流れ", cls: "bg-slate-100 text-slate-700" },
};

/** AIに頼む作業の種類。code=サイトのファイルを直す / guide=管理画面での設定を案内してもらう / research=調査と提案 */
type Mode = "code" | "guide" | "research";

type Plain = {
  area: Area["key"];
  headline: string; // 一言で「何が悪いか」
  problem: string; // 素人向けの説明
  risk: string; // 放置するとどうなるか
  mode: Mode;
};

const R: Record<string, Plain> = {
  "seo.low-ctr": {
    area: "seo",
    headline: "検索には出ているのに、ほとんどクリックされていません",
    problem: "Google検索の結果にこのページは表示されていますが、検索結果に出る「タイトルと説明文」が魅力的でないため、見た人が素通りしています。お店の看板は出ているのに、入口に人が入ってこない状態です。",
    risk: "せっかく検索で上位にいても、お客さまがライバルのページに行ってしまいます。",
    mode: "code",
  },
  "seo.striking-distance": {
    area: "seo",
    headline: "検索の1ページ目に入れそうなのに、あと一歩届いていません",
    problem: "検索順位が惜しい位置(8〜20位あたり)にいます。ページの中身を少し充実させ、関連ページからリンクを張ると、1ページ目の上位に入れる可能性があります。",
    risk: "2ページ目以降はほとんど見られないため、今のままではアクセスが増えません。",
    mode: "code",
  },
  "seo.drop": {
    area: "seo",
    headline: "このページが検索であまり表示されなくなりました",
    problem: "以前より検索結果に出る回数が大きく減っています。ページの設定ミス、検索から外れた、順位が下がった、季節による変動などが考えられるため、原因の切り分けが必要です。",
    risk: "原因が設定ミスだった場合、気づかないままアクセスが失われ続けます。",
    mode: "research",
  },
  "tracking.key-event": {
    area: "site",
    headline: "「問い合わせ」が成果として数えられていません",
    problem: "問い合わせ自体は発生していますが、アクセス解析(GA4)の側で「これが成果です」という印が付いていません。そのため、どの集客方法が成果につながったかが分析できません。管理画面でスイッチを1つ入れるだけで直ります。",
    risk: "どの施策が効いたか分からないまま、効果のない施策にお金や時間を使い続けることになります。",
    mode: "guide",
  },
  "tracking.psi": {
    area: "site",
    headline: "サイトの表示速度を見張る仕組みが、まだ動いていません",
    problem: "ページが重くなっていないかを自動でチェックする設定が済んでいません。表示が遅いと、お客さまが待ちきれず帰ってしまい、検索順位にも不利になります。",
    risk: "サイトが遅くなっても気づけません。",
    mode: "guide",
  },
  "tracking.gap": {
    area: "site",
    headline: "アクセスの数字が、実際より少なく記録されています",
    problem: "Google検索から実際に来ている人数に比べ、アクセス解析に記録されている人数が極端に少ない状態です。一部のページに計測用のタグが入っていない、またはCookie同意バナーで計測が止まっている可能性があります。",
    risk: "数字が正しくないと、成果の判断を間違えます(本当は効いている施策を『効いていない』と誤解するなど)。",
    mode: "code",
  },
  "ueo.form-abandon": {
    area: "site",
    headline: "問い合わせフォームを開いた人の多くが、送信せずに帰っています",
    problem: "フォームの入力を始めたのに最後まで送られていません。入力項目が多い、必須項目が分かりにくい、スマホで入力しづらい、などが主な原因です。",
    risk: "せっかく問い合わせる気になった人を逃しています。広告や検索で集めた人が無駄になります。",
    mode: "code",
  },
  "ueo.landing-cvr": {
    area: "site",
    headline: "このページに来た人が、問い合わせに進んでいません",
    problem: "このページには人が来ているのに、問い合わせボタンへ進む人がサイト平均よりかなり少ない状態です。「次に何をすればいいか」が見つけにくい可能性があります。",
    risk: "アクセスはあるのに成果が出ない、もったいない状態が続きます。",
    mode: "code",
  },
  "ai.referral": {
    area: "geo",
    headline: "ChatGPTなどのAIに紹介されやすい書き方に整えましょう",
    problem: "最近は、AIに質問して店やサービスを探す人が増えています。AIは「結論が先に書いてある」「事実がはっきり書かれている」「更新日がある」ページを引用しやすい傾向があります。今のページをそのように整えます(効果は保証されません)。",
    risk: "AI経由で探す人に、自社が紹介されにくくなります。",
    mode: "code",
  },
  "competitor.new-pages": {
    area: "seo",
    headline: "競合が新しいページをたくさん公開しています",
    problem: "ライバルが力を入れているテーマの手がかりです。自社に同じテーマのページがあるか、内容で負けていないかを確認します。内容の真似はせず、自社の強みで差をつけます。",
    risk: "ライバルに検索での露出を先に取られる可能性があります。",
    mode: "research",
  },
  "audit.compliance": {
    area: "seo",
    headline: "公開中のページに、医療広告で問題になりうる表現があります",
    problem: "体験談、効果の断定、「最高」「No.1」などの表現は、医療広告ガイドラインで禁止されている場合があります。自動チェックで該当しそうな箇所が見つかりました(誤検知の場合もあります)。",
    risk: "行政指導や信頼低下につながるおそれがあります。",
    mode: "code",
  },
  "audit.http": {
    area: "seo",
    headline: "お客さまが来るページが、正しく表示されていません",
    problem: "検索などから人が来ているページが、エラー(見つからない等)になっている可能性があります。一時的な取得失敗の場合もあるため、まず実際に開いて確認します。",
    risk: "来てくれた人がエラー画面を見て帰ってしまいます。",
    mode: "code",
  },
  "audit.noindex": {
    area: "seo",
    headline: "「検索に表示しないで」という設定が付いているページがあります",
    problem: "noindexという設定が付いていると、そのページはGoogle検索に出てきません。意図して付けたものなら問題ありませんが、うっかり付いている場合は大きな機会損失です。",
    risk: "ページがいつまでも検索に出てきません。",
    mode: "code",
  },
  "audit.meta": {
    area: "seo",
    headline: "ページの基本情報(検索結果に出る説明文など)に抜けがあります",
    problem: "検索結果に表示される説明文が未設定、見出しの付け方が不適切、他のページとタイトルが同じ、などの不備が見つかりました。検索エンジンやAIにページの中身が正しく伝わりにくくなります。",
    risk: "検索結果での見え方が悪くなり、クリックされにくくなります。",
    mode: "code",
  },
  "audit.schema": {
    area: "meo",
    headline: "お店の情報(住所・診療時間など)が、機械に伝わる形で書かれていません",
    problem: "住所・電話・診療時間・診療科などを検索エンジンやAIが読み取れる形式(構造化データ)で入れると、Googleマップや検索、AI検索で正しい情報が表示されやすくなります。",
    risk: "地図やAI検索で、情報が誤って表示されたり、出てこなかったりします。",
    mode: "code",
  },
};

const BY_CATEGORY: Record<string, Plain["area"]> = { SEO: "seo", AI検索: "geo", MEO: "meo", SNS: "sns" };

export function plainOf(a: Action): Plain & { areaInfo: Area } {
  const p: Plain = R[a.rule] ?? {
    area: BY_CATEGORY[a.category] ?? "site",
    headline: a.title,
    problem: a.why.join(" "),
    risk: "放置すると、機会損失につながる可能性があります。",
    mode: "code",
  };
  return { ...p, areaInfo: AREAS[p.area] };
}

export const CONFIDENCE_HELP = "この改善で効果が出る見込みの確かさ(データがどれだけ揃っているか)";
export const RISK_HELP = "直すときに、見た目や表現を壊してしまうリスク。「中」以上は本文などを変えるので、必ず人が確認してください";

/** プロンプトに自動で添える、サイトの情報(レイジットが公開ページを調べて埋める。ユーザーの入力は不要) */
export type PromptCtx = { siteName: string; date: string; facts?: SiteFacts | null; topPages?: string[] };

const isNotSet = (u?: string) => !!u && /\(not set\)/i.test(u);
const shortUrl = (u: string) => { try { return new URL(u).pathname; } catch { return u; } };

function factsLines(ctx: PromptCtx): string[] {
  const f = ctx.facts;
  const L = [`- サイト名: ${ctx.siteName}(計測日 ${ctx.date})`];
  if (!f || !f.checked) return [...L, "- 作り方・計測タグ・フォーム: 自動で調べられませんでした。コードを見て自分で判断してください。"];
  L.push(`- 作り方: ${f.framework ?? "不明(コードを見て判断)"}`);
  L.push(`- Cookie同意バナー: ${f.cmp ?? "見つかりませんでした(なしとして進める)"}${f.cmp ? (f.consentMode ? "(拒否時の匿名計測の設定あり)" : "(拒否時の匿名計測の設定は見つからず)") : ""}`);
  L.push(`- 計測タグ(GA4): ${f.ga4Ids.length ? f.ga4Ids.join("、") : f.gtmIds.length ? `GTM経由(${f.gtmIds.join("、")})` : "見つかりませんでした"}`);
  if (f.forms.length) for (const fm of f.forms.slice(0, 3)) L.push(`- フォーム: ${shortUrl(fm.page)} … 入力欄${fm.fieldCount}個(必須${fm.requiredCount}個)`);
  return L;
}

/** 項目ごとの短い依頼文。url が実在しない(not set)ときは、アクセスの多いページを自動で候補にする */
function itemLines(a: Action, ctx: PromptCtx, head = ""): string[] {
  const L: string[] = [];
  L.push(`${head}${plainOf(a).headline}`);
  if (a.url && !isNotSet(a.url)) L.push(`- 対象ページ: ${a.url}`);
  else if (a.url) L.push(`- 対象ページ: 特定できませんでした。${ctx.topPages?.length ? `アクセスの多い ${ctx.topPages.slice(0, 3).join(" / ")} から、問い合わせへの案内が弱いものを選んで直す。` : "トップや主なLPの、問い合わせへの案内を直す。"}`);
  // データは多くても2件、検索キーワードは先頭3つまでにして短くする
  for (const w of a.why.slice(0, 2)) L.push(`- データ: ${w}`);
  if (a.hints?.length) L.push(`- 検索されている言葉: ${a.hints.slice(0, 3).join("、")}`);
  L.push("- やること:");
  a.how.forEach((h, i) => L.push(`  ${i + 1}) ${h}`));
  return L;
}

const HEAD = [
  "あなたは私のWebサイト改善の担当者です。私は初心者で、質問されても答えられません。",
  "",
  "# ルール",
  "- 質問や確認はしない。自分で調べて判断し、最後まで修正する。迷ったら、変更が小さく元に戻せる方を選ぶ。",
  "- 専門用語は使わない。使うときは一言で説明する。",
  "- 指示した所以外は変えない。canonical・noindex・robots.txt・リダイレクトは触らない。",
  "- 効果の断定・体験談・最上級表現は書かない。ページにない事実は書かない(医療・健康は特に厳守)。",
];

const TAIL_CODE = [
  "# 終わったら",
  "ビルドやテストがあれば実行し、エラーは自分で直す。そのあと、次の形で短く報告する(専門用語なし)。",
  "- 直した所: ページ名と、何を変えたかを一言で",
  "- 私が確認すること: 「はい/いいえ」で答えられるものだけ、最大3つ",
];

const TAIL_GUIDE = [
  "# 終わったら",
  "質問せず、最初から最後までの手順を一度にまとめて案内する。画面名・ボタン名を1手順ずつ書き、私が上から順に進められるようにする。",
  "最後に、うまくいったか確かめる方法を書く。私の環境が分からない所は、よくあるケースで書き、違う場合の分岐も添える。",
];

/** AIに貼り付けるプロンプトを1件分作る。HP/LPをAIで作った人が、そのまま制作に使っているAIに貼れる形 */
export function buildAiPrompt(a: Action, ctx: PromptCtx): string {
  const p = plainOf(a);
  const guide = p.mode !== "code";
  return [
    ...HEAD,
    ...(guide ? ["- 管理画面の作業は、画面名・ボタン名を1手順ずつ具体的に示す。設定で過去のデータや動作に影響する場合は、先に注意する。"] : []),
    "",
    "# サイトの情報(レイジットが自動で調べました。聞き返さないでください)",
    ...factsLines(ctx),
    "",
    `# ${guide ? "お願いしたいこと" : "直してほしいこと"}`,
    ...itemLines(a, ctx),
    "",
    ...(guide ? TAIL_GUIDE : TAIL_CODE),
  ].join("\n");
}

/** 複数の改善候補をまとめて、1つのプロンプトにする。サイトを直す作業を先、設定・調査を後にして順に進めてもらう */
export function buildCombinedPrompt(actions: Action[], ctx: PromptCtx): string {
  const items = actions.map((a) => ({ a, p: plainOf(a) }));
  const rank = { code: 0, research: 1, guide: 2 } as const;
  items.sort((x, y) => rank[x.p.mode] - rank[y.p.mode]);
  const L: string[] = [...HEAD];
  if (items.some(({ p }) => p.mode !== "code")) L.push("- 管理画面の作業は、画面名・ボタン名を1手順ずつ具体的に示す。");
  L.push("- 項目ごとに分けて変更し、混ぜない。番号順に最後まで一度に進める。", "", "# サイトの情報(レイジットが自動で調べました。聞き返さないでください)", ...factsLines(ctx), "", `# 直してほしいこと(${items.length}件)`);
  items.forEach(({ a, p }, i) => {
    L.push("", ...itemLines(a, ctx, `## ${i + 1}. `));
    if (p.mode !== "code") L.push("- これは管理画面での作業です。手順の案内として書いてください。");
  });
  L.push("", ...(items.every(({ p }) => p.mode !== "code") ? TAIL_GUIDE : TAIL_CODE));
  return L.join("\n");
}
