/** モバイル Capture の進捗（スクショ → 話す → 送信） */
export default function MobileCaptureSteps({
  hasShot,
  hasText,
  hasAudio,
}: {
  hasShot: boolean;
  hasText: boolean;
  hasAudio: boolean;
}) {
  const spoke = hasText || hasAudio;
  const steps = [
    { id: "shot", label: "スクショ", done: hasShot },
    { id: "voice", label: "話す", done: spoke },
    { id: "send", label: "送信", done: hasShot && spoke },
  ] as const;

  return (
    <ol className="flex items-center gap-1" aria-label="投稿の手順">
      {steps.map((s, i) => (
        <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1">
          <div
            className={`flex min-h-[36px] w-full items-center justify-center rounded-xl px-1 text-[11px] font-semibold ${
              s.done ? "bg-mint text-white" : "bg-sand text-ink/55"
            }`}
          >
            <span className="mr-1 tabular-nums opacity-80">{i + 1}</span>
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <span className="shrink-0 text-ink/25" aria-hidden>
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
