/** 要素クリックで範囲を指定（Marker.io 型） */
type ElementRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
  selector?: string;
  tagName?: string;
};

function buildSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const tag = el.tagName.toLowerCase();
  const cls = Array.from(el.classList).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join("");
  return cls ? `${tag}${cls}` : tag;
}

function pickElement(): Promise<ElementRect | null> {
  return new Promise((resolve) => {
    const dpr = window.devicePixelRatio || 1;
    const overlay = document.createElement("div");
    overlay.id = "shapeit-element-overlay";
    overlay.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:2147483646;cursor:crosshair;",
    );

    const highlight = document.createElement("div");
    highlight.setAttribute(
      "style",
      "position:fixed;border:2px solid #1f9d8a;background:rgba(31,157,138,0.15);pointer-events:none;display:none;z-index:2147483647;",
    );

    const hint = document.createElement("div");
    hint.textContent = "要素をクリック · Esc でキャンセル";
    hint.setAttribute(
      "style",
      "position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0b1320;color:#f3f6f4;padding:8px 14px;border-radius:999px;font:600 13px system-ui,sans-serif;",
    );

    overlay.append(hint);
    document.documentElement.append(overlay, highlight);

    let hovered: Element | null = null;

    const cleanup = (result: ElementRect | null) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      highlight.remove();
      resolve(result);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      }
    };

    const showHighlight = (el: Element) => {
      const r = el.getBoundingClientRect();
      const pad = 4;
      highlight.style.display = "block";
      highlight.style.left = `${r.left - pad}px`;
      highlight.style.top = `${r.top - pad}px`;
      highlight.style.width = `${r.width + pad * 2}px`;
      highlight.style.height = `${r.height + pad * 2}px`;
    };

    overlay.addEventListener("mousemove", (e) => {
      overlay.style.pointerEvents = "auto";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || el === overlay || el === hint) return;
      hovered = el;
      showHighlight(el);
    });

    overlay.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const el = hovered ?? document.elementFromPoint(e.clientX, e.clientY);
        if (!el) {
          cleanup(null);
          return;
        }
        const r = el.getBoundingClientRect();
        const pad = 4;
        cleanup({
          x: Math.max(0, r.left - pad),
          y: Math.max(0, r.top - pad),
          width: r.width + pad * 2,
          height: r.height + pad * 2,
          devicePixelRatio: dpr,
          selector: buildSelector(el),
          tagName: el.tagName.toLowerCase(),
        });
      },
      true,
    );

    document.addEventListener("keydown", onKey, true);
  });
}

void pickElement().then((rect) => {
  chrome.runtime.sendMessage({
    type: rect ? "SHAPEIT_ELEMENT_DONE" : "SHAPEIT_ELEMENT_CANCEL",
    rect,
  });
});
