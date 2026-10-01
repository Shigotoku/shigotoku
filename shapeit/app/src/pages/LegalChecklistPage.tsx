import { useState } from "react";
import { loadSettings } from "../lib/demoStore";
import { t } from "../lib/i18n";

/** BRAND-003: 商標・ドメイン・SNS チェックリスト（インタラクティブ） */
const DEFAULT = [
  { id: "name", label: "プロダクト名 ShapeIt / シェイプイット の対外表記統一", done: true },
  { id: "domain", label: "ドメイン app.shapeit.shigotoku.com / LP /shapeit/ の確保", done: true },
  { id: "pkg", label: "package / env 識別子 shapeit*", done: true },
  { id: "tm", label: "商標調査（日本・主要市場）", done: false },
  { id: "sns", label: "SNS ハンドル @shapeit 等の空き確認", done: false },
  { id: "dpa", label: "DPA / Privacy ページ公開", done: true },
  { id: "sub", label: "Subprocessors 一覧の維持", done: true },
  { id: "mfa", label: "MFA / セッションタイムアウト方針の文書化", done: false },
  { id: "residency", label: "データレジデンシー（東京 / EU / US）方針", done: false },
];

const KEY = "shapeit:legal-checklist:v1";

export default function LegalChecklistPage() {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as typeof DEFAULT;
    } catch {
      /* ignore */
    }
    return DEFAULT;
  });
  const residency = loadSettings().dataResidency;
  const mfa = loadSettings().mfaRequired;

  const toggle = (id: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setItems(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const done = items.filter((i) => i.done).length;

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint">{t("nav_legal")}</p>
        <h1 className="font-display mt-1 text-3xl font-bold">{t("page_legal")}</h1>
        <p className="mt-2 text-sm text-ink/60">
          外販前の確認リスト（BRAND-003） · {done}/{items.length} · residency={residency} · MFA=
          {mfa ? "ON" : "OFF"}
        </p>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-left text-sm hover:bg-sand/40"
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                  item.done ? "bg-mint" : "bg-ink/30"
                }`}
              >
                {item.done ? "✓" : "·"}
              </span>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
