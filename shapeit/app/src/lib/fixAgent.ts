import type { FixPack } from "./fixPacks";
import { buildScreenshotUrlList, collectPackScreenshots } from "./packScreenshots";
import type { Feedback, Issue } from "./types";
export function buildFixPackPrompt(pack: FixPack, opts?: { clusterLabel?: string }) {
  const lines = [
    `# Fix Pack: ${pack.label}`,
    opts?.clusterLabel ? `Cluster: ${opts.clusterLabel}` : "",
    `URL: ${pack.sampleUrl}`,
    "",
    "## Issues",
    ...pack.items.map(
      (item, i) =>
        `${i + 1}. [${item.issue.severity}] ${item.issue.title}\n   ${item.issue.summary}\n   報告: ${item.feedbacks[0]?.rawText ?? ""}`,
    ),
    "",
  ];
  const shots = collectPackScreenshots(pack);
  if (shots.length) {
    lines.push("## Screenshots", buildScreenshotUrlList(shots), "");
  }
  lines.push("Human Review 必須。機微情報は残さないこと。");
  return lines.filter(Boolean).join("\n");
}

export function buildFixWithAiPrompt(issue: Issue, feedbacks: Feedback[]) {
  return `次の Issue を修正してください。Human Review 必須。\n\n# ${issue.title}\n${issue.summary}\n\n## 報告\n${feedbacks.map((f) => f.rawText).join("\n---\n")}`;
}

export function buildPackDoneSummary(pack: FixPack, count: number) {
  return `${pack.label} の ${count} 件を Done にしました。投稿者へ確認依頼を送ります。`;
}
