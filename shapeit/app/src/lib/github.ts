import { loadSettings } from "./demoStore";
import type { Issue } from "./types";

export function buildGithubIssueMarkdown(issue: Issue, snippets: string[]) {
  return `## ${issue.title}\n\n${issue.summary}\n\n### Reports\n${snippets.map((s) => `- ${s}`).join("\n")}\n`;
}

export function githubNewIssueUrl(repoOrTitle: string, title?: string, body?: string) {
  const repo = title != null ? repoOrTitle : loadSettings().githubRepo;
  const issueTitle = title ?? repoOrTitle;
  const issueBody = body ?? "";
  if (!repo) return "";
  const q = new URLSearchParams({ title: issueTitle, body: issueBody });
  return `https://github.com/${repo}/issues/new?${q.toString()}`;
}
