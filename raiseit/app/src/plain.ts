import type { Action } from "./lib";

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

const VERIFY: Record<string, string[]> = {
  計測: ["本番ページのHTMLに計測タグ(G-から始まる測定ID)が出力されていること", "GA4のリアルタイムで、自分でページを開いたアクセスが記録されること"],
  SEO: ["変更後のページをブラウザで開き、表示が崩れていないこと", "公開後、Search Consoleで2〜4週間後に表示回数・クリック率が改善しているか確認(これは私が行います)"],
};

/** AIに貼り付けるプロンプトを作る。HP/LPをAIで作った人が、そのまま制作に使っているAIに貼れる形 */
export function buildAiPrompt(a: Action, siteName: string, date: string): string {
  const p = plainOf(a);
  const lines: string[] = [];
  lines.push("あなたは、私のWebサイト(ホームページ/ランディングページ)の改善を手伝うパートナーです。このサイトはAIを使って作成しました。");
  lines.push("アクセス解析ツール「レイジット」の監視で、改善できる点が見つかりました。下記の内容に沿って、サイトを修正してください。");
  lines.push("");
  lines.push(`# 改善したいこと`);
  lines.push(`${p.headline}(分野: ${p.areaInfo.label})`);
  lines.push("");
  lines.push("# 対象");
  lines.push(`- サイト: ${siteName}`);
  if (a.url) lines.push(`- 対象ページ: ${a.url}`);
  lines.push(`- 計測日: ${date}(レイジットの計測)`);
  lines.push("");
  lines.push("# 何が問題か(やさしい説明)");
  lines.push(p.problem);
  lines.push("");
  lines.push("# 計測で分かっていること");
  for (const w of a.why) lines.push(`- ${w}`);
  if (a.hints?.length) lines.push(`- このページで検索されている言葉の例: ${a.hints.join("、")}`);
  lines.push("");
  lines.push(p.mode === "guide" ? "# 私にやってほしいこと(設定作業のため、手順の案内をお願いします)" : p.mode === "research" ? "# 調べて提案してほしいこと" : "# 直してほしいこと");
  a.how.forEach((h, i) => lines.push(`${i + 1}. ${h}`));
  lines.push("");
  lines.push("# 守ってほしいこと");
  if (p.mode === "code") {
    lines.push("- 指示した箇所以外の見た目・デザイン・文章は変えない。");
    if (a.rule !== "audit.noindex") lines.push("- canonical / noindex / robots.txt / リダイレクトは、指示がない限り変更しない。");
    if (a.risk !== "low") lines.push("- 効果の断定・体験談・「日本一」などの最上級表現、誇大な表現は書かない(医療・健康に関する内容は特に厳守)。");
    lines.push("- 事実が分からない部分は、推測で書かずに私に質問する。");
    lines.push("- 変更は最小限にする。いきなり大きく書き換えない。");
  } else {
    lines.push("- 私はこの分野の初心者です。専門用語には、かんたんな説明を添えてください。");
    lines.push("- 画面名やボタン名を、1手順ずつ具体的に示してください。");
    lines.push("- 設定を変えると過去のデータや動作に影響する場合は、先に注意してください。");
  }
  lines.push("");
  lines.push("# 進め方");
  if (p.mode === "code") {
    lines.push("1. まず、このプロジェクトの中から関係するファイルを探し、原因と変更方針を3行以内で説明してください。");
    lines.push("2. 私が了承したら、最小限の変更で修正してください。");
    lines.push("3. 変更したファイルと変更内容を、一覧で報告してください。");
    lines.push("4. ビルドやテストがあれば実行し、問題がないことを確認してください。");
  } else {
    lines.push("1. まず全体の流れを短く説明してください。");
    lines.push("2. 次に、手順を1つずつ案内してください。私が終わったら次に進みます。");
    lines.push("3. 最後に、うまくいったか確かめる方法を教えてください。");
  }
  lines.push("");
  lines.push("# 終わったあとの確認");
  for (const v of VERIFY[a.category] ?? ["変更後のページをブラウザで開き、表示と動作に問題がないこと"]) lines.push(`- ${v}`);
  lines.push("");
  lines.push("不明な点があれば、推測で進めずに先に質問してください。");
  return lines.join("\n");
}

/** 複数の改善候補をまとめて、1つのプロンプトにする。サイトを直す作業を先、設定・調査を後にして順に進めてもらう */
export function buildCombinedPrompt(actions: Action[], siteName: string, date: string): string {
  const items = actions.map((a) => ({ a, p: plainOf(a) }));
  const rank = { code: 0, research: 1, guide: 2 } as const;
  items.sort((x, y) => rank[x.p.mode] - rank[y.p.mode]);
  const MODE = { code: "サイトの修正", research: "調査・提案", guide: "管理画面での設定(手順の案内)" } as const;
  const L: string[] = [];
  L.push("あなたは、私のWebサイト(ホームページ/ランディングページ)の改善を手伝うパートナーです。このサイトはAIを使って作成しました。");
  L.push(`アクセス解析ツール「レイジット」の監視で、改善できる点が${items.length}件見つかりました。下記すべてを、順番に対応してください。`);
  L.push("");
  L.push("# 対象");
  L.push(`- サイト: ${siteName}`);
  L.push(`- 計測日: ${date}(レイジットの計測)`);
  L.push("");
  L.push("# 改善項目一覧");
  items.forEach(({ a, p }, i) => {
    L.push("");
    L.push(`## ${i + 1}. ${p.headline}`);
    L.push(`- 分野: ${p.areaInfo.label} / 種類: ${MODE[p.mode]}`);
    if (a.url) L.push(`- 対象ページ: ${a.url}`);
    L.push(`- 何が問題か: ${p.problem}`);
    L.push("- 計測で分かっていること:");
    for (const w of a.why) L.push(`  - ${w}`);
    if (a.hints?.length) L.push(`  - このページで検索されている言葉の例: ${a.hints.join("、")}`);
    L.push("- やってほしいこと:");
    a.how.forEach((h, j) => L.push(`  ${j + 1}) ${h}`));
  });
  L.push("");
  L.push("# 守ってほしいこと(全項目共通)");
  L.push("- 各項目で指示した箇所以外の見た目・デザイン・文章は変えない。");
  if (!items.some(({ a }) => a.rule === "audit.noindex")) L.push("- canonical / noindex / robots.txt / リダイレクトは、指示がない限り変更しない。");
  if (items.some(({ a, p }) => p.mode === "code" && a.risk !== "low")) L.push("- 効果の断定・体験談・「日本一」などの最上級表現、誇大な表現は書かない(医療・健康に関する内容は特に厳守)。");
  L.push("- 事実が分からない部分は、推測で書かずに私に質問する。");
  L.push("- 変更は最小限にする。項目ごとに分けて変更し、混ぜない。");
  if (items.some(({ p }) => p.mode === "guide")) L.push("- 管理画面での設定作業は、私が初心者である前提で、画面名・ボタン名を1手順ずつ案内する。");
  L.push("");
  L.push("# 進め方");
  L.push("1. まず全体を見て、項目ごとの変更方針を短い一覧にして説明してください(関係するファイルも添えて)。");
  L.push("2. 私が了承したら、番号順に1項目ずつ対応してください。1項目終えるごとに、変更したファイルと内容を報告してください。");
  L.push("3. 最後に、ビルドやテストがあれば実行して確認し、全項目の対応結果を表にまとめてください。");
  L.push("");
  L.push("# 終わったあとの確認");
  const verify = new Set<string>();
  for (const { a } of items) for (const v of VERIFY[a.category] ?? ["変更後のページをブラウザで開き、表示と動作に問題がないこと"]) verify.add(v);
  for (const v of verify) L.push(`- ${v}`);
  L.push("");
  L.push("不明な点があれば、推測で進めずに先に質問してください。");
  return L.join("\n");
}
