import { useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { generateQuizFromSteps } from "../lib/quizGenerator";
import type { ManualStep } from "../types";

export default function StepQuizPanel({ steps }: { steps: ManualStep[] }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const questions = useMemo(() => generateQuizFromSteps(steps, 5), [steps]);

  if (!steps.length) return null;

  const score = questions.filter((q) => answers[q.id] === q.answer).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800"
      >
        <HelpCircle size={16} className="text-primary-600" />
        確認テスト（教育用・{questions.length}問）
      </button>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-slate-800">{q.question}</p>
              <div className="mt-2 space-y-1">
                {q.choices?.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === c}
                      onChange={() => setAnswers((cur) => ({ ...cur, [q.id]: c }))}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(answers).length >= questions.length && (
            <p className="text-sm font-semibold text-primary-700">
              結果: {score} / {questions.length} 問正解
            </p>
          )}
        </div>
      )}
    </div>
  );
}
