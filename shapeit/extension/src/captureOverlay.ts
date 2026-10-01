/** ページ上に範囲選択 UI を表示（scripting.executeScript で注入） */
type RegionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
};

function selectRegion(): Promise<RegionRect | null> {
  return new Promise((resolve) => {
    const dpr = window.devicePixelRatio || 1;
    const overlay = document.createElement("div");
    overlay.id = "shapeit-region-overlay";
    overlay.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "z-index:2147483646",
        "cursor:crosshair",
        "user-select:none",
        "touch-action:none",
      ].join(";"),
    );

    const shade = document.createElement("div");
    shade.setAttribute(
      "style",
      "position:absolute;inset:0;background:rgba(11,19,32,0.45);pointer-events:none;",
    );

    const box = document.createElement("div");
    box.setAttribute(
      "style",
      [
        "position:absolute",
        "border:2px solid #1f9d8a",
        "background:rgba(31,157,138,0.12)",
        "box-shadow:0 0 0 9999px rgba(11,19,32,0.45)",
        "display:none",
        "pointer-events:none",
      ].join(";"),
    );

    const hint = document.createElement("div");
    hint.textContent = "ドラッグで範囲を選択 → 離して確定 · Esc でキャンセル";
    hint.setAttribute(
      "style",
      [
        "position:fixed",
        "top:16px",
        "left:50%",
        "transform:translateX(-50%)",
        "z-index:2147483647",
        "background:#0b1320",
        "color:#f3f6f4",
        "padding:8px 14px",
        "border-radius:999px",
        "font:600 13px/1.4 'Segoe UI','Noto Sans JP',system-ui,sans-serif",
        "pointer-events:none",
      ].join(";"),
    );

    overlay.append(shade, box, hint);
    document.documentElement.append(overlay);

    let startX = 0;
    let startY = 0;
    let dragging = false;

    const cleanup = (result: RegionRect | null) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve(result);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cleanup(null);
      }
    };

    const updateBox = (x1: number, y1: number, x2: number, y2: number) => {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      box.style.display = width > 2 && height > 2 ? "block" : "none";
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      return { left, top, width, height };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      overlay.setPointerCapture(e.pointerId);
      updateBox(startX, startY, startX, startY);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      updateBox(startX, startY, e.clientX, e.clientY);
      e.preventDefault();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const rect = updateBox(startX, startY, e.clientX, e.clientY);
      if (rect.width < 8 || rect.height < 8) {
        cleanup(null);
        return;
      }
      cleanup({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        devicePixelRatio: dpr,
      });
      e.preventDefault();
    };

    document.addEventListener("keydown", onKey, true);
    overlay.addEventListener("pointerdown", onPointerDown);
    overlay.addEventListener("pointermove", onPointerMove);
    overlay.addEventListener("pointerup", onPointerUp);
    overlay.addEventListener("pointercancel", onPointerUp);
  });
}

void selectRegion().then((rect) => {
  chrome.runtime.sendMessage({
    type: rect ? "SHAPEIT_REGION_DONE" : "SHAPEIT_REGION_CANCEL",
    rect,
  });
});
