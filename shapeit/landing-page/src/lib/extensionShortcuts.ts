export const EXTENSION_VERSION = "0.4.5";

export const EXTENSION_SHORTCUTS = [
  { keys: "Alt + Shift + G", label: "全画面", hint: "全画面スクショ → 話す → 送信" },
  { keys: "Alt + Shift + R", label: "範囲選択", hint: "範囲を選ぶ → 話す → 送信（おすすめ）" },
  { keys: "Alt + Shift + N", label: "コメントのみ", hint: "スクショなし → 話す → 送信" },
  { keys: "Alt + Shift + A", label: "詳しく編集", hint: "範囲選択 → 書き込み・注釈してから送信" },
] as const;
