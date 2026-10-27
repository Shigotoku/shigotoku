import type { Analysis, Severity } from "./types";

export function localTriage(rawText: string, pageUrl?: string): Analysis {
  const text = rawText.toLowerCase();
  let category = "OTHER";
  if (/バグ|エラー|bug|crash|落ち|おかしい|変|ログインできない/.test(text)) category = "BUG";
  else if (/遅い|パフォーマンス|slow|ラグ/.test(text)) category = "PERFORMANCE";
  else if (/文言|タイポ|表記/.test(text)) category = "COPY";
  else if (/欲しい|要望|機能|追加|ダークモード/.test(text)) category = "FEATURE";
  else if (/分かりにくい|使いにく|ux|迷い|保存ボタン/.test(text)) category = "UX";
  else if (/色|余白|レイアウト|見た目|ui/.test(text)) category = "UI";
  else if (/個人情報|漏洩|セキュリティ|security/.test(text)) category = "SECURITY";

  let severity: Severity = "S3";
  if (/落ちる|クラッシュ|ログインできない|漏洩|S0/.test(text) || category === "SECURITY") severity = "S0";
  else if (/バグ|エラー|できない/.test(text)) severity = "S1";
  else if (/分かりにくい|使いにく|遅い/.test(text)) severity = "S2";

  const title = rawText.replace(/\s+/g, " ").trim().slice(0, 48) || "フィードバック";
  return {
    title,
    summary: rawText.slice(0, 140),
    category,
    severity,
    productArea: pageUrl ? safeArea(pageUrl) : "",
    priorityScore: severity === "S0" ? 90 : severity === "S1" ? 70 : severity === "S2" ? 50 : 30,
    priorityReasons: [category, severity],
    confidence: 0.55,
    reproductionSteps: [],
    developerSummary: rawText.slice(0, 200),
    severityReason: `${category} / ${severity}`,
    triageSource: "rules",
    model: "shapeit-rules-v0",
  };
}

function safeArea(url: string) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    return "";
  }
}
