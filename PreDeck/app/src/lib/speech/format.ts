/**
 * 音声認識結果の整形（ちょこっとワークス textPostprocess.ts から、発表向けに必要な部分を移植）
 *
 * 取り込んだ: 日本語の空白除去 / 言いよどみ除去 / 読み上げ句読点 / 読点の推測 / 文中の句点 /
 *             言い直し（rephrase）/ 文の連結 / 文末の仕上げ
 * 取り込まなかった: 診療向けの読み仮名・薬剤名・病名補正、血圧・体温整形、音声コマンド
 *             （発表用途では不要、かつ大きな辞書データを含むため）
 */
import { inferCommas } from "./punctInfer";
import { applyRephrase } from "./rephrase";
import { applyMedicalTermCorrections } from "./medicalTermPostProcess";
import type { SpeechVocabulary } from "./vocabulary";

const JA = "[\\u3000-\\u303F\\u3040-\\u30FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uFF00-\\uFFEF]";
const JA_SPACE_AFTER = new RegExp(`(?<=${JA})[\\s\\u3000]+`, "g");
const JA_SPACE_BEFORE = new RegExp(`[\\s\\u3000]+(?=${JA})`, "g");

/** 日本語の前後の空白を除去（英数字どうしの空白は残す） */
export function removeJapaneseSpaces(text: string): string {
  return text.replace(JA_SPACE_AFTER, "").replace(JA_SPACE_BEFORE, "");
}

const FILLERS = /(?:えーっと|えっと|えーと|えぇと|あのー+|あのぅ|あのう|そのー+|うーん+|んーと|えー+|あー+)/g;

export function removeFillers(text: string): string {
  return text.replace(FILLERS, "").replace(/、{2,}/g, "、").replace(/^[、。]+/, "");
}

export function applySpokenPunctuation(text: string): string {
  return text
    .replace(/句点/g, "。")
    .replace(/読点/g, "、")
    .replace(/(?:改行|新しい行|あたらしいぎょう)/g, "\n");
}

const END_MARK = /[。！？!?、\n]$/;
const QUESTION_END = /(?:ですか|ますか|ませんか|でしょうか|ですかね|でしたか|ましたか)$/;
const SENTENCE_END =
  /(?:です|ます|でした|ました|ません|ませんでした|ください|でしょう|ましょう|ですね|ますね|ですよ|ますよ|ありません|ない|した|している|していた|である|だ)$/;

function endMarkFor(text: string): "？" | "。" | "" {
  if (QUESTION_END.test(text)) return "？";
  if (SENTENCE_END.test(text)) return "。";
  return "";
}

const CONTINUES = "がのかけしとてねよでにはもをらばどなわぜ";
const QUESTION_INNER = new RegExp(`(ですか|ますか|ましたか|ませんか|でしたか|でしょうか)(?![${CONTINUES}。、！？\\n])(?=.)`, "g");
const SENTENCE_INNER = new RegExp(
  `(ですね|ますね|ですよ|ますよ|ませんでした|でした|ました|ません|ましょう|ください|です|ます)(?![${CONTINUES}。、！？\\n])(?=.)`,
  "g",
);

export function insertInnerPunctuation(text: string): string {
  return text.replace(QUESTION_INNER, "$1？").replace(SENTENCE_INNER, "$1。");
}

/** 1 発話分の認識結果を整形（日本語用） */
export function cleanSegment(raw: string, vocabulary?: SpeechVocabulary): string {
  let t = applySpokenPunctuation(removeJapaneseSpaces(raw));
  if (vocabulary) t = applyMedicalTermCorrections(t, vocabulary);
  t = removeFillers(t).trim();
  t = applyRephrase(t, true); // 数値・左右は明示的な訂正語のときだけ
  t = inferCommas(t);
  return insertInnerPunctuation(t);
}

/** 既存テキストに発話を追記（文末なら「。」「？」、そうでなければ「、」） */
export function joinSegment(base: string, seg: string): string {
  if (!seg) return base;
  if (!base) return seg;
  if (END_MARK.test(base) || /^[。、！？\n]/.test(seg)) return `${base}${seg}`;
  return `${base}${endMarkFor(base) || "、"}${seg}`;
}

/** 仕上げ（文末表現がはっきりしているときだけ句点を付ける） */
export function finalizeText(text: string): string {
  const t = text.trim();
  if (!t || END_MARK.test(t)) return t;
  return `${t}${endMarkFor(t)}`;
}
