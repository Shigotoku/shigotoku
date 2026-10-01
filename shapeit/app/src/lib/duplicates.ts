import type { Feedback, Issue } from "./types";

export interface DupCandidate {
  kind: "issue" | "feedback";
  id: string;
  title: string;
  score: number;
}

function tokens(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n += 1;
  return n / new Set([...a, ...b]).size;
}

export function findDuplicateCandidates(rawText: string, issues: Issue[], feedback: Feedback[]): DupCandidate[] {
  const src = tokens(rawText);
  const out: DupCandidate[] = [];
  for (const i of issues) {
    if (i.status === "archived") continue;
    const score = jaccard(src, tokens(`${i.title} ${i.summary}`));
    if (score >= 0.18) out.push({ kind: "issue", id: i.id, title: i.title, score });
  }
  for (const f of feedback) {
    const score = jaccard(src, tokens(f.rawText));
    if (score >= 0.22) out.push({ kind: "feedback", id: f.id, title: f.analysis?.title || f.rawText.slice(0, 40), score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}
