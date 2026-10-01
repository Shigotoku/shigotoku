import { listIssues, listMyFeedback } from "./demoStore";

export function downloadText(filename: string, body: string, mime = "text/plain") {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson() {
  return JSON.stringify({ feedback: listMyFeedback(), issues: listIssues() }, null, 2);
}

export function exportFeedbackCsv() {
  const rows = [["id", "rawText", "pageUrl", "status"], ...listMyFeedback().map((f) => [f.id, f.rawText, f.pageUrl ?? "", f.triageStatus])];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function exportIssuesCsv() {
  const rows = [["id", "title", "status", "severity"], ...listIssues().map((i) => [i.id, i.title, i.status, i.severity])];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function parseFeedbackCsv(text: string): { rawText: string; pageUrl?: string }[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const out: { rawText: string; pageUrl?: string }[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
    if (cols[1]) out.push({ rawText: cols[1], pageUrl: cols[2] || undefined });
  }
  return out;
}
