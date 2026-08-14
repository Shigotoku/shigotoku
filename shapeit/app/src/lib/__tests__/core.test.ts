import { describe, expect, it } from "vitest";
import { localTriage } from "../triage";
import { findDuplicateCandidates } from "../duplicates";
import { maskPii } from "../privacy";
import { buildFixPackPrompt, buildFixWithAiPrompt } from "../fixAgent";
import { buildFixPacks, splitPackIntoClusters } from "../fixPacks";
import { canonicalizePageKey } from "../pageKey";
import { computeDigestFromData } from "../digest";
import { detectLanguage } from "../i18nText";
import type { Feedback, Issue } from "../types";

describe("localTriage", () => {
  it("classifies bugs", () => {
    const a = localTriage("ログイン画面でバグが出てアプリが落ちる");
    expect(a.category).toBe("BUG");
    expect(a.severityReason).toBeTruthy();
    expect(a.model).toBe("local-rules");
  });

  it("marks security higher", () => {
    const a = localTriage("個人情報の漏洩リスクがある");
    expect(a.category).toBe("SECURITY");
  });

  it("keeps high severity for critical crashes", () => {
    const a = localTriage("本番で決済が全滅してクラッシュしデータが消える緊急バグ");
    expect(["S0", "S1", "S2"]).toContain(a.severity);
  });
});

describe("duplicates", () => {
  it("finds similar issues", () => {
    const issues: Issue[] = [
      {
        id: "1",
        title: "保存ボタンが分かりにくい",
        summary: "設定画面の保存",
        category: "UX",
        severity: "S2",
        priorityScore: 50,
        status: "todo",
        productArea: "Settings",
        feedbackIds: [],
        createdAt: "",
        updatedAt: "",
      },
    ];
    const dups = findDuplicateCandidates("保存ボタンが分かりにくい 設定画面", issues, []);
    expect(dups.length).toBeGreaterThan(0);
    expect(dups[0].kind).toBe("issue");
  });
});

describe("privacy mask", () => {
  it("masks email", () => {
    const { text, hits } = maskPii("連絡先は test@example.com です");
    expect(hits).toContain("email");
    expect(text).toContain("[EMAIL]");
    expect(text).not.toContain("test@example.com");
  });
});

describe("i18n detect", () => {
  it("detects japanese", () => {
    expect(detectLanguage("これは日本語のフィードバックです")).toBe("ja");
  });
});

describe("fixAgent", () => {
  it("builds prompt with human review note", () => {
    const issue: Issue = {
      id: "i1",
      title: "Crash",
      summary: "app dies",
      category: "BUG",
      severity: "S0",
      priorityScore: 90,
      status: "todo",
      productArea: "Checkout",
      feedbackIds: [],
      createdAt: "",
      updatedAt: "",
    };
    const p = buildFixWithAiPrompt(issue, []);
    expect(p).toContain("Human review");
    expect(p).toContain("Crash");
  });
});

describe("fixPacks", () => {
  it("groups open issues by canonical URL", () => {
    expect(canonicalizePageKey("https://app.example.com/settings?utm_source=x")).toBe(
      "https://app.example.com/settings",
    );

    const issues: Issue[] = [
      {
        id: "a",
        title: "保存が不明",
        summary: "save unclear",
        category: "UX",
        severity: "S2",
        priorityScore: 40,
        status: "todo",
        productArea: "Settings",
        feedbackIds: ["f1"],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "b",
        title: "文言ミス",
        summary: "copy typo",
        category: "COPY",
        severity: "S3",
        priorityScore: 20,
        status: "todo",
        productArea: "Settings",
        feedbackIds: ["f2"],
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "c",
        title: "別画面",
        summary: "other",
        category: "BUG",
        severity: "S1",
        priorityScore: 70,
        status: "todo",
        productArea: "Billing",
        feedbackIds: ["f3"],
        createdAt: "",
        updatedAt: "",
      },
    ];
    const feedback: Feedback[] = [
      {
        id: "f1",
        rawText: "保存ボタンが分からない",
        pageUrl: "https://app.example.com/settings?utm_source=mail",
        createdAt: "",
        authorName: "A",
        triageStatus: "accepted",
      },
      {
        id: "f2",
        rawText: "タイトルの誤字",
        pageUrl: "https://app.example.com/settings",
        createdAt: "",
        authorName: "B",
        triageStatus: "accepted",
      },
      {
        id: "f3",
        rawText: "請求が落ちる",
        pageUrl: "https://app.example.com/billing",
        createdAt: "",
        authorName: "C",
        triageStatus: "accepted",
      },
    ];
    const packs = buildFixPacks(issues, feedback);
    expect(packs).toHaveLength(2);
    const settings = packs.find((p) => p.label.includes("/settings"));
    expect(settings?.openIssueCount).toBe(2);
    const prompt = buildFixPackPrompt(settings!);
    expect(prompt).toContain("Fix Pack");
    expect(prompt).toContain("保存が不明");
    expect(prompt).toContain("文言ミス");

    const clusters = splitPackIntoClusters(settings!);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters.map((c) => c.label).join(" ")).toMatch(/使いやすさ|文言/);
  });
});

describe("digest", () => {
  it("counts pending and critical from remote-shaped data", () => {
    const d = computeDigestFromData(
      [
        {
          id: "f1",
          rawText: "x",
          createdAt: new Date().toISOString(),
          authorName: "A",
          triageStatus: "pending",
          autoTriaged: true,
        },
      ],
      [
        {
          id: "i1",
          title: "Crit",
          summary: "",
          category: "BUG",
          severity: "S0",
          priorityScore: 90,
          status: "todo",
          productArea: "X",
          feedbackIds: ["f1", "f2"],
          createdAt: "",
          updatedAt: "",
        },
      ],
      [],
    );
    expect(d.pendingTriage).toBe(1);
    expect(d.criticalCount).toBe(1);
    expect(d.surging[0]?.id).toBe("i1");
  });
});
