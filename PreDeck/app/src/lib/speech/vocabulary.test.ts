import { describe, expect, it } from "vitest";
import { applyMedicalTermCorrections, setUserDictionary } from "./index";

describe("vocabulary", () => {
  it("科学用語の誤認識を補正する", () => {
    expect(applyMedicalTermCorrections("超電導の話", "science")).toBe("超伝導の話");
  });
  it("医療用語を補正する", () => {
    expect(applyMedicalTermCorrections("優位差が出た", "medical")).toBe("有意差が出た");
  });
  it("ユーザー辞書が優先される", () => {
    setUserDictionary([{ term: "ペロブスカイト太陽電池", aliases: ["ぺろぶすかいとたいようでんち"] }]);
    expect(applyMedicalTermCorrections("ぺろぶすかいとたいようでんち", "academic")).toBe("ペロブスカイト太陽電池");
    setUserDictionary([]);
  });
});
