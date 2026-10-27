import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Mic,
  Puzzle,
  Sparkles,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { extensionInstallPagePath } from '../lib/extensionBridge';
import { runManualHealthCheck } from '../lib/manualHealthCheck';
import { generateQuizFromSteps } from '../lib/quizGenerator';
import VoiceMemoPanel from './VoiceMemoPanel';
import type { Manual, ManualStep } from '../types';

type Props = {
  manual: Manual;
  steps: ManualStep[];
  extSynced: boolean;
  extInstalled?: boolean | null;
  extMsg?: string;
  polishVoiceWithAi: boolean;
  generateAllWithAi: boolean;
  aiBusy: boolean;
  onExtensionSync: () => void;
  onPolishVoiceChange: (v: boolean) => void;
  onGenerateAllWithAiChange: (v: boolean) => void;
  onAiAll: () => void;
  showExtension?: boolean;
  /** 折りたたみ内に埋め込むときは外側マージンを省略 */
  embedded?: boolean;
};

function ToolboxCard({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="shrink-0 text-primary-600">{icon}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{title}</span>
        {badge}
        <span className="shrink-0 text-slate-400">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && <div className="border-t border-slate-100 px-3 py-2 text-xs">{children}</div>}
    </div>
  );
}

export default function EditToolboxRow({
  manual,
  steps,
  extSynced,
  extInstalled = null,
  extMsg = '',
  polishVoiceWithAi,
  generateAllWithAi,
  aiBusy,
  onExtensionSync,
  onPolishVoiceChange,
  onGenerateAllWithAiChange,
  onAiAll,
  showExtension = true,
  embedded = false,
}: Props) {
  const issues = useMemo(() => runManualHealthCheck(manual, steps), [manual, steps]);
  const alertCount = issues.filter((i) => i.level === 'alert').length;
  const warnCount = issues.filter((i) => i.level === 'warn').length;
  const questions = useMemo(() => generateQuizFromSteps(steps, 5), [steps]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const score = questions.filter((q) => answers[q.id] === q.answer).length;

  return (
    <div className={`flex flex-col gap-2 xl:flex-row ${embedded ? '' : 'mx-6 mb-4'}`}>
      <ToolboxCard
        title="マニュアル健康診断"
        icon={<Stethoscope size={15} />}
        badge={
          <>
            {alertCount > 0 && (
              <span className="rounded-full bg-danger-100 px-1.5 py-0.5 text-[9px] font-bold text-danger-700">
                要確認{alertCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                改善{warnCount}
              </span>
            )}
          </>
        }
      >
        <ul className="max-h-32 space-y-1 overflow-y-auto">
          {issues.slice(0, 6).map((issue, i) => (
            <li key={i} className="text-slate-600">
              · {issue.message}
            </li>
          ))}
        </ul>
      </ToolboxCard>

      {(manual.contentType === 'material' || steps.length >= 2) && (
        <ToolboxCard title={`確認テスト（${questions.length}問）`} icon={<HelpCircle size={15} />}>
          <button
            type="button"
            onClick={() => setQuizOpen((v) => !v)}
            className="mb-2 font-semibold text-primary-700 hover:underline"
          >
            {quizOpen ? 'テストを閉じる' : 'テストを開く'}
          </button>
          {quizOpen && (
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {questions.map((q) => (
                <div key={q.id}>
                  <p className="font-medium text-slate-800">{q.question}</p>
                  <div className="mt-1 space-y-0.5">
                    {q.choices?.map((c) => (
                      <label key={c} className="flex items-center gap-1.5 text-slate-600">
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === c}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: c }))}
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="pt-1 font-semibold text-slate-700">
                正解 {score}/{questions.length}
              </p>
            </div>
          )}
        </ToolboxCard>
      )}

      {showExtension && (
        <ToolboxCard title="Chrome拡張で記録" icon={<Puzzle size={15} />} defaultOpen>
          {extInstalled === false && (
            <p className="mb-2 flex items-start gap-1 text-[11px] text-amber-800">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              拡張未検出 —
              <Link to={extensionInstallPagePath()} className="font-semibold underline">
                インストール手順
              </Link>
            </p>
          )}
          {extMsg && <p className="mb-2 text-[11px] text-primary-800">{extMsg}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExtensionSync}
              className="rounded-lg bg-primary-50 px-2 py-1 font-semibold text-primary-700 hover:bg-primary-100"
            >
              {extSynced ? '連携済み' : '拡張と連携'}
            </button>
            <label className="flex items-center gap-1 text-slate-600" title="音声メモがある手順だけAI整形">
              <input type="checkbox" checked={polishVoiceWithAi} onChange={(e) => onPolishVoiceChange(e.target.checked)} />
              音声をAI整形
            </label>
            <label className="flex items-center gap-1 text-slate-600" title="取り込み時に全手順の説明文をAI生成（月間クォータ消費）">
              <input type="checkbox" checked={generateAllWithAi} onChange={(e) => onGenerateAllWithAiChange(e.target.checked)} />
              取り込み時に全手順AI
            </label>
            <Link to={extensionInstallPagePath()} className="text-primary-600 hover:underline">
              拡張の設定
            </Link>
            <button
              type="button"
              disabled={aiBusy || steps.length === 0}
              onClick={onAiAll}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-500 px-2 py-1 font-semibold text-white disabled:opacity-50"
            >
              {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AIで文案を整える（全手順）
            </button>
          </div>
        </ToolboxCard>
      )}

      <ToolboxCard title="音声メモ" icon={<Mic size={15} />}>
        <VoiceMemoPanel compact />
      </ToolboxCard>
    </div>
  );
}
