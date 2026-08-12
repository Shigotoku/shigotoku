/**
 * ShapeIt AI Triage — Gemini（キー無し時はルールベース）
 */
import {
  GEMINI_MODEL,
  geminiGenerateContentUrl,
  GEMINI_TRIAGE_MAX_OUTPUT_TOKENS,
} from "../config/gemini";

const GEMINI_URL = geminiGenerateContentUrl();

export interface TriageResult {
  title: string;
  summary: string;
  category: string;
  severity: string;
  productArea: string;
  priorityScore: number;
  priorityReasons: string[];
  confidence: number;
  reproductionSteps: string[];
  developerSummary: string;
  triageSource?: "gemini" | "rules";
  model?: string;
}

const CATEGORIES = [
  "BUG",
  "UX",
  "UI",
  "FEATURE",
  "COPY",
  "PERFORMANCE",
  "SECURITY",
  "DATA",
  "INTEGRATION",
  "OPERATION",
  "IDEA",
  "OTHER",
] as const;

export function ruleBasedTriage(rawText: string, pageUrl?: string): TriageResult {
  const text = rawText.toLowerCase();
  let category = "OTHER";
  if (/バグ|エラー|bug|crash|落ち|おかしい|変/.test(text)) category = "BUG";
  else if (/遅い|パフォーマンス|slow|ラグ/.test(text)) category = "PERFORMANCE";
  else if (/文言|タイポ|表記/.test(text)) category = "COPY";
  else if (/欲しい|要望|機能|追加/.test(text)) category = "FEATURE";
  else if (/分かりにくい|使いにく|ux|迷い/.test(text)) category = "UX";
  else if (/色|余白|レイアウト|見た目|ui/.test(text)) category = "UI";
  else if (/セキュリティ|権限|漏洩/.test(text)) category = "SECURITY";

  let severity = "S3";
  if (/ログインできない|全体停止|課金異常|データ消/.test(text)) severity = "S0";
  else if (/頻発|主要|止ま/.test(text)) severity = "S1";
  else if (category === "BUG" || category === "UX") severity = "S2";

  const severityPts: Record<string, number> = { S0: 30, S1: 24, S2: 14, S3: 6 };
  const priorityScore = Math.min(100, (severityPts[severity] ?? 6) + 20);

  return {
    title: rawText.trim().slice(0, 48).replace(/\s+/g, " ") || "無題のフィードバック",
    summary: rawText.trim().slice(0, 180),
    category,
    severity,
    productArea: pageUrl?.includes("settings") ? "Settings" : "General",
    priorityScore,
    priorityReasons: [`Severity ${severity}`, "Frequency 暫定", pageUrl ? `URL: ${pageUrl}` : "no url"],
    confidence: 0.55,
    reproductionSteps: ["該当画面を開く", "操作を再現する", "差分を確認する"],
    developerSummary: `[${category}/${severity}] ${rawText.trim().slice(0, 120)}`,
    triageSource: "rules",
    model: "shapeit-rules-v0",
  };
}

function clampCategory(v: unknown): string {
  const s = String(v ?? "OTHER").toUpperCase();
  return (CATEGORIES as readonly string[]).includes(s) ? s : "OTHER";
}

function clampSeverity(v: unknown): string {
  const s = String(v ?? "S3").toUpperCase();
  return ["S0", "S1", "S2", "S3"].includes(s) ? s : "S3";
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function triageFeedback(rawText: string, pageUrl?: string): Promise<TriageResult> {
  const fallback = ruleBasedTriage(rawText, pageUrl);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const prompt = `あなたはプロダクトフィードバックのトリアージAIです。次の報告をJSONのみで返してください。
スキーマ:
{"title":"string","summary":"string","category":"BUG|UX|UI|FEATURE|COPY|PERFORMANCE|SECURITY|DATA|INTEGRATION|OPERATION|IDEA|OTHER","severity":"S0|S1|S2|S3","productArea":"string","priorityScore":0-100,"priorityReasons":["string"],"confidence":0-1,"reproductionSteps":["string"],"developerSummary":"string"}
原文を改変して上書きしない。title/summaryは意図を保った要約。
pageUrl: ${pageUrl ?? "(なし)"}
報告:
${rawText}`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: GEMINI_TRIAGE_MAX_OUTPUT_TOKENS,
        },
      }),
    });
    if (!res.ok) {
      console.warn("shapeit triage gemini http", res.status, await res.text().catch(() => ""));
      return fallback;
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) {
      console.warn("shapeit triage gemini empty response");
      return fallback;
    }
    const parsed = JSON.parse(extractJsonText(text)) as Partial<TriageResult>;
    const severity = clampSeverity(parsed.severity);
    const severityPts: Record<string, number> = { S0: 30, S1: 24, S2: 14, S3: 6 };
    const priorityScore = Math.min(
      100,
      Math.max(0, Number(parsed.priorityScore) || (severityPts[severity] ?? 6) + 20),
    );
    return {
      title: String(parsed.title || fallback.title).slice(0, 80),
      summary: String(parsed.summary || fallback.summary).slice(0, 400),
      category: clampCategory(parsed.category),
      severity,
      productArea: String(parsed.productArea || fallback.productArea).slice(0, 64),
      priorityScore,
      priorityReasons: Array.isArray(parsed.priorityReasons)
        ? parsed.priorityReasons.map(String).slice(0, 6)
        : fallback.priorityReasons,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.75)),
      reproductionSteps: Array.isArray(parsed.reproductionSteps)
        ? parsed.reproductionSteps.map(String).slice(0, 8)
        : fallback.reproductionSteps,
      developerSummary: String(parsed.developerSummary || fallback.developerSummary).slice(0, 500),
      triageSource: "gemini",
      model: GEMINI_MODEL,
    };
  } catch (err) {
    console.warn("shapeit triage gemini error", err);
    return fallback;
  }
}
