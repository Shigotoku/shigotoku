/** プロンプトは「テキストのみ」を前提に組み立てる。スライド画像・音声は扱わない。 */

export interface ImproveInput {
  text: string;
  purpose?: string; // 例: 学会発表 / 社内報告 / 面接
  durationMin?: number;
  glossary?: string[]; // 専門用語（誤字・表記ゆれ防止）
}

function glossaryLine(g?: string[]): string {
  const terms = (g ?? []).filter(Boolean).slice(0, 80);
  return terms.length ? `次の専門用語は正しい表記として扱い、変更しないでください: ${terms.join("、")}` : "";
}

export function improvePrompt(i: ImproveInput): string {
  return [
    "あなたはプレゼン原稿の編集者です。音声の文字起こしを、そのまま話せる自然な原稿に直してください。",
    "ルール:",
    "- 意味を変えない。数値・単位・固有名詞・専門用語は勝手に変更しない。",
    "- 誤認識と思われる語は、文脈から確実な場合だけ直し、迷う場合は notes に挙げて本文は変えない。",
    "- 言いよどみ・重複を除き、話し言葉のリズムを残す。",
    i.purpose ? `- 用途: ${i.purpose}` : "",
    i.durationMin ? `- 目標時間: 約${i.durationMin}分（超過しそうなら notes で指摘）` : "",
    glossaryLine(i.glossary),
    "出力は JSON のみ: {\"improved\": string, \"notes\": string[]}",
    "",
    "【文字起こし】",
    i.text,
  ]
    .filter(Boolean)
    .join("\n");
}

export function englishPrompt(i: { text: string; purpose?: string; glossary?: string[] }): string {
  return [
    "あなたは科学・医療分野の発表に詳しい翻訳者です。日本語のプレゼン原稿を、英語で口頭発表するための原稿にしてください。",
    "ルール:",
    "- 声に出して話しやすい短めの文にする。専門用語は国際的に通用する標準表記を使う。",
    "- 数値・単位・固有名詞は保持する。",
    "- 発音しにくい箇所は pronunciationTips にカタカナ等でなく、強勢・区切りの助言として挙げる。",
    i.purpose ? `- 用途: ${i.purpose}` : "",
    glossaryLine(i.glossary),
    "出力は JSON のみ: {\"english\": string, \"pronunciationTips\": string[]}",
    "",
    "【日本語原稿】",
    i.text,
  ]
    .filter(Boolean)
    .join("\n");
}

export function reviewPrompt(i: { text: string; purpose?: string; durationMin?: number }): string {
  return [
    "あなたはプレゼンのコーチです。原稿を評価し、改善点を具体的に挙げてください。",
    i.purpose ? `用途: ${i.purpose}` : "",
    i.durationMin ? `目標時間: 約${i.durationMin}分` : "",
    "出力は JSON のみ: {\"structure\": string[], \"clarity\": string[], \"likelyQuestions\": string[], \"estimatedMinutes\": number}",
    "",
    "【原稿】",
    i.text,
  ]
    .filter(Boolean)
    .join("\n");
}
