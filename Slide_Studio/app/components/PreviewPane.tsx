'use client';

import { useStudio } from '@/lib/studio-context';

export function PreviewPane() {
  const {
    previewOpen,
    deck,
    selectedSlideIndex,
    setSelectedSlideIndex,
    activeProject,
    touchAction,
  } = useStudio();

  if (!previewOpen) return null;

  const slide = deck?.slides[selectedSlideIndex];

  return (
    <aside
      data-testid="preview-pane"
      className="flex h-full flex-col border-l border-[var(--line)] bg-[var(--panel)]"
      style={{ width: 'var(--preview-w)' }}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 text-xs font-medium">
        <span>プレビュー / 過去のスライド</span>
        <button
          type="button"
          className="text-[var(--accent)] disabled:opacity-40"
          disabled={!deck}
          data-testid="add-reference-btn"
          onClick={() => touchAction('お手本への追加（モック）')}
        >
          お手本に追加
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          className="flex w-16 shrink-0 flex-col gap-2 overflow-y-auto border-r border-[var(--line)] p-2"
          data-testid="slide-thumbs"
        >
          {deck?.slides.map((s) => (
            <button
              key={s.index}
              type="button"
              data-testid={`slide-thumb-${s.index}`}
              className={`aspect-video w-full rounded border text-[9px] leading-tight ${
                selectedSlideIndex === s.index
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--line)] bg-white'
              }`}
              onClick={() => setSelectedSlideIndex(s.index)}
            >
              {s.index + 1}
            </button>
          ))}
          {!deck && (
            <div className="text-[10px] text-[var(--muted)]">スライドなし</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <div
            data-testid="preview-frame"
            className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4 text-center"
          >
            {slide ? (
              <>
                <div className="text-lg font-semibold">{slide.title}</div>
                {slide.subtitle ? (
                  <div className="mt-2 text-sm text-[var(--muted)]">{slide.subtitle}</div>
                ) : null}
                <div className="mt-4 text-xs text-[var(--muted)]">
                  {activeProject?.name ?? 'プロジェクト'} — v{deck?.version}
                </div>
              </>
            ) : (
              <>
                <b>ここに完成スライドを表示します</b>
                <ol className="mt-2 list-decimal text-left text-xs text-[var(--muted)]">
                  <li>プロジェクトを作成</li>
                  <li>元資料を追加</li>
                  <li>構成を作成</li>
                  <li>Slides を生成</li>
                </ol>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
