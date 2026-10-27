/** Chrome 拡張のショートカット（manifest commands と一致させる） */
export const EXTENSION_VERSION = "0.4.5";

export type ExtensionShortcut = {
  keys: string;
  keysMac: string;
  labelJa: string;
  labelEn: string;
  hintJa: string;
  hintEn: string;
};

/** Alt+Shift は Chrome / OS の単独 Alt や Ctrl+Shift と競合しにくい */
export const EXTENSION_SHORTCUTS: ExtensionShortcut[] = [
  {
    keys: "Alt + Shift + G",
    keysMac: "⌥ + ⇧ + G",
    labelJa: "全画面",
    labelEn: "Full screen",
    hintJa: "全画面スクショ → 話す → 送信",
    hintEn: "Full screenshot → speak → send",
  },
  {
    keys: "Alt + Shift + R",
    keysMac: "⌥ + ⇧ + R",
    labelJa: "範囲選択",
    labelEn: "Region",
    hintJa: "範囲を選ぶ → 話す → 送信（いちばんよく使う）",
    hintEn: "Select region → speak → send (most used)",
  },
  {
    keys: "Alt + Shift + N",
    keysMac: "⌥ + ⇧ + N",
    labelJa: "コメントのみ",
    labelEn: "Note only",
    hintJa: "スクショなし → 話す → 送信",
    hintEn: "No screenshot → speak → send",
  },
  {
    keys: "Alt + Shift + A",
    keysMac: "⌥ + ⇧ + A",
    labelJa: "詳しく編集",
    labelEn: "Edit",
    hintJa: "範囲選択 → 書き込み・注釈してから送信",
    hintEn: "Region select → annotate, then send",
  },
];
