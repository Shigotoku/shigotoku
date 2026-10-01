import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectSpeechSupport, getSpeechRecognitionCtor, speechLang } from "./speechRecognition";

describe("speechRecognition", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // reset window speech ctors
    Reflect.deleteProperty(window, "SpeechRecognition");
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
    localStorage.clear();
  });

  it("speechLang follows locale setting", async () => {
    const { saveSettings } = await import("./demoStore");
    saveSettings({ locale: "en" });
    expect(speechLang()).toBe("en-US");
    saveSettings({ locale: "ja" });
    expect(speechLang()).toBe("ja-JP");
  });

  it("detects web-speech when constructor exists", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = class {};
    expect(getSpeechRecognitionCtor()).toBeTruthy();
    expect(detectSpeechSupport()).toBe("web-speech");
  });

  it("prefers keyboard-dictation on iOS standalone PWA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
      standalone: true,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addListener: () => {}, removeListener: () => {} })),
    );
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = class {};
    expect(detectSpeechSupport()).toBe("keyboard-dictation");
  });

  it("falls back to audio-only when no recognition API", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false, addListener: () => {}, removeListener: () => {} })),
    );
    expect(detectSpeechSupport()).toBe("audio-only");
  });
});
