import { describe, expect, it } from "vitest";
import { cleanSegment, finalizeText, joinSegment, removeJapaneseSpaces } from "./format";

describe("format", () => {
  it("日本語の空白を除去し英数字の空白は残す", () => {
    expect(removeJapaneseSpaces("量子 力学 の Bell Labs")).toBe("量子力学のBell Labs");
  });
  it("言いよどみを除く", () => {
    expect(cleanSegment("えっと結果は有意です")).toBe("結果は有意です");
  });
  it("専門用語を補正する", () => {
    expect(cleanSegment("超電導の話です", "science")).toContain("超伝導");
  });
  it("文を連結し句点を付ける", () => {
    expect(joinSegment("結果は有意です", "次に考察です")).toBe("結果は有意です。次に考察です");
    expect(finalizeText("考察は以上です")).toBe("考察は以上です。");
  });
  it("言い直しは明示的な訂正語のときだけ数値を置換", () => {
    expect(cleanSegment("50mg、いや100mgを投与")).toContain("50mg");
    expect(cleanSegment("50mg、違う、100mgを投与")).toBe("100mgを投与");
  });
});

