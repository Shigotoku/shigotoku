import { describe, expect, it } from "vitest";
import { listEngines, pickDefaultEngine, registerEngine, type AsrEngine } from "./index";

const fake = (id: string, leaves: boolean, supported: boolean): AsrEngine => ({
  id,
  label: id,
  audioLeavesDevice: leaves,
  isSupported: () => supported,
  start: async () => ({ stop: () => undefined }),
});

describe("asr registry", () => {
  it("音声が端末外に出るエンジンは既定に選ばれない", () => {
    registerEngine(fake("cloud", true, true));
    expect(pickDefaultEngine()?.audioLeavesDevice ?? false).toBe(false);
  });
  it("端末内で対応しているエンジンが選ばれる", () => {
    registerEngine(fake("whisper-web", false, true));
    expect(listEngines().some((e) => e.id === "whisper-web")).toBe(true);
    expect(pickDefaultEngine()?.id).toBe("whisper-web");
  });
});
