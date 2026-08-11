import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommandPalette from "./CommandPalette";

/** UX-001: キーボードショートカット */
export default function Hotkeys() {
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (typing) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        setHelp((v) => !v);
        return;
      }
      if (e.key === "c") navigate("/capture");
      if (e.key === "i") navigate("/inbox");
      if (e.key === "b") navigate("/board");
      if (e.key === "f") navigate("/fix-packs");
      if (e.key === "m") navigate("/my-feedback");
      if (e.key === "d") navigate("/digest");
      if (e.key === "a") navigate("/ask");
      if (e.key === "r") navigate("/roadmap");
      if (e.key === "e") navigate("/ideas");
      if (e.key === "s") navigate("/settings");
      if (e.key === "l") navigate("/changelog");
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
      }
      if (e.key === "Escape") {
        setPalette(false);
        setHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      {help && (
        <div
          role="dialog"
          aria-label="ショートカットヘルプ"
          className="fixed bottom-4 left-4 z-50 max-w-xs rounded-xl border border-ink/10 bg-white p-4 text-xs shadow-lg"
        >
          <p className="font-semibold">ショートカット</p>
          <ul className="mt-2 space-y-1 text-ink/70">
            <li><kbd>c</kbd> Capture · <kbd>i</kbd> Inbox · <kbd>b</kbd> Board · <kbd>f</kbd> 修正パック</li>
            <li><kbd>m</kbd> My · <kbd>l</kbd> Changelog · <kbd>d</kbd> Digest</li>
            <li><kbd>a</kbd> Ask · <kbd>e</kbd> Ideas · <kbd>r</kbd> Roadmap</li>
            <li><kbd>s</kbd> Settings · <kbd>/</kbd> 検索 · <kbd>?</kbd> ヘルプ</li>
          </ul>
          <button type="button" className="mt-2 text-mint" onClick={() => setHelp(false)}>
            閉じる
          </button>
        </div>
      )}
    </>
  );
}
