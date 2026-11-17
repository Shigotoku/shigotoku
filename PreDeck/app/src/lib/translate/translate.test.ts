import { describe, expect, it } from "vitest";
import { buildMessages, cleanOutput, isLoopbackUrl } from "./localEngine";
import { createSimulTranslator } from "./simul";
import type { TranslateEngine } from "./types";

describe("localEngine helpers", () => {
  it("ループバック以外の URL を拒否する", () => {
    expect(isLoopbackUrl("http://127.0.0.1:11434/v1")).toBe(true);
    expect(isLoopbackUrl("http://localhost:8000/v1")).toBe(true);
    expect(isLoopbackUrl("https://example.com/v1")).toBe(false);
    expect(isLoopbackUrl("not a url")).toBe(false);
  });
  it("前置きと引用符を除去する", () => {
    expect(cleanOutput('EN: "Hello."')).toBe("Hello.");
  });
  it("文脈と用語集をプロンプトに含める", () => {
    const m = buildMessages("次です。", [{ ja: "前です。", en: "Previous." }], ["perovskite"]);
    expect(m[0].content).toContain("perovskite");
    expect(m[1].content).toContain("JA: 前です。");
  });
});

describe("createSimulTranslator", () => {
  it("入力順を保って訳し、直近の文脈を渡す", async () => {
    const seen: number[] = [];
    const engine: TranslateEngine = {
      id: "fake",
      label: "fake",
      textLeavesDevice: false,
      async translate(text, ctx) {
        seen.push(ctx.length);
        await new Promise((r) => setTimeout(r, text === "一" ? 20 : 0));
        return `en:${text}`;
      },
    };
    const out: string[] = [];
    const s = createSimulTranslator({ engine, onTranslated: (p) => out.push(p.en), onError: () => undefined, contextSize: 1 });
    s.enqueue("一");
    s.enqueue("二");
    s.enqueue("  ");
    await s.flush();
    expect(out).toEqual(["en:一", "en:二"]);
    expect(seen).toEqual([0, 1]);
  });
  it("エラーを通知して後続を続ける", async () => {
    let n = 0;
    const engine: TranslateEngine = {
      id: "f",
      label: "f",
      textLeavesDevice: false,
      async translate(t) {
        if (n++ === 0) throw new Error("boom");
        return t;
      },
    };
    const errs: string[] = [];
    const out: string[] = [];
    const s = createSimulTranslator({ engine, onTranslated: (p) => out.push(p.en), onError: (m) => errs.push(m) });
    s.enqueue("a");
    s.enqueue("b");
    await s.flush();
    expect(errs).toEqual(["boom"]);
    expect(out).toEqual(["b"]);
  });
});
