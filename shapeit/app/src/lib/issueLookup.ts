import { pageKeyOfIssue } from "./fixPacks";
import { canonicalizePageKey } from "./pageKey";
import type { Feedback, Issue } from "./types";

export function findOpenIssueByPageKey(
  issues: Issue[],
  feedbackById: Map<string, Feedback>,
  pageUrl: string,
): Issue | undefined {
  const key = canonicalizePageKey(pageUrl);
  if (!key) return undefined;
  return issues.find((issue) => {
    if (issue.status === "done" || issue.status === "archived") return false;
    const linked = issue.feedbackIds.map((id) => feedbackById.get(id)).filter(Boolean) as Feedback[];
    return pageKeyOfIssue(issue, linked) === key;
  });
}
