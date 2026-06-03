type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
};

/** 公開前フェイルセーフ（要件 Gemini 提案①） */
export default function PublishSafetyCheck({ checked, onChange, compact }: Props) {
  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 ${compact ? 'p-4' : 'p-5'}`}>
      <p className="text-sm font-bold text-amber-900">公開前の確認（必須）</p>
      {!compact && (
        <p className="mt-2 text-sm text-amber-800">
          氏名・患者ID・電話番号・メールアドレスなど、個人を特定できる情報は隠しましたか？
          編集画面の「マスキング」で黒塗り・モザイクできます。
        </p>
      )}
      <label className={`flex items-start gap-2 text-sm font-medium text-amber-900 ${compact ? 'mt-2' : 'mt-4'}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 rounded"
        />
        <span>個人情報の隠し忘れがないことを確認しました</span>
      </label>
    </div>
  );
}
