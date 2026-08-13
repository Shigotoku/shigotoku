import type { FeedbackTimelineStep } from "../lib/feedbackTimeline";

export default function FeedbackTimeline({ steps }: { steps: FeedbackTimelineStep[] }) {
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1 text-[10px]">
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-center gap-1">
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              step.current
                ? "bg-mint text-white"
                : step.done
                  ? "bg-sand text-ink/70"
                  : "border border-dashed border-ink/20 text-ink/40"
            }`}
            title={step.hint}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="text-ink/25" aria-hidden>→</span>}
        </li>
      ))}
    </ol>
  );
}
