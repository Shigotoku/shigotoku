import { describe, expect, it, vi, beforeEach } from "vitest";
import { chromeExtensionSupported, isIos, isStandalonePwa } from "./device";

describe("device", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects iOS from UA", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIos()).toBe(true);
  });

  it("chromeExtensionSupported is false on Android", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn((q: string) => ({
        matches: String(q).includes("max-width"),
        addListener: () => {},
        removeListener: () => {},
      })),
    );
    expect(chromeExtensionSupported()).toBe(false);
  });

  it("isStandalonePwa reads display-mode", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn((q: string) => ({
        matches: String(q).includes("standalone"),
        addListener: () => {},
        removeListener: () => {},
      })),
    );
    expect(isStandalonePwa()).toBe(true);
  });
});
