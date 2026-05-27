import { useEffect, useMemo, useState } from 'react';
import {
  calcCostComparison,
  calcSegmentComparison,
  describeLineAccountCost,
  formatYen,
  LINE_PRICE_PER_MSG,
  MESSAGE_PRESETS,
} from '../lib/lineCostCalc';
import type { LineCostEstimate } from '../lib/api';

interface LineCostComparisonProps {
  /** API から取得した推定値（友だち数ベース）。未指定時は 10,000 通を初期値に */
  estimate?: LineCostEstimate | null;
  showSegment?: boolean;
}

export default function LineCostComparison({ estimate, showSegment = true }: LineCostComparisonProps) {
  const defaultMessages = estimate?.monthlyMessages ?? estimate?.estimatedRecipients ?? 10000;
  const [monthlyMessages, setMonthlyMessages] = useState(defaultMessages);
  const pricePerMessage = estimate?.pricePerMessage ?? LINE_PRICE_PER_MSG;

  useEffect(() => {
    if (estimate?.monthlyMessages ?? estimate?.estimatedRecipients) {
      setMonthlyMessages(estimate.monthlyMessages ?? estimate.estimatedRecipients);
    }
  }, [estimate?.monthlyMessages, estimate?.estimatedRecipients]);

  const comparison = useMemo(
    () => calcCostComparison(monthlyMessages, pricePerMessage),
    [monthlyMessages, pricePerMessage],
  );
  const lineDesc = useMemo(
    () => describeLineAccountCost(comparison.line, pricePerMessage),
    [comparison.line, pricePerMessage],
  );
  const segment = useMemo(
    () => (showSegment ? calcSegmentComparison(monthlyMessages, 0.4, pricePerMessage) : null),
    [monthlyMessages, pricePerMessage, showSegment],
  );

  const presetRows = useMemo(
    () => MESSAGE_PRESETS.map((n) => calcCostComparison(n, pricePerMessage)),
    [pricePerMessage],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
            月間配信通数
          </span>
          <input
            type="number"
            min={0}
            step={500}
            value={monthlyMessages}
            onChange={(e) => setMonthlyMessages(Math.max(0, Number(e.target.value) || 0))}
            className="buzz-input w-full"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {MESSAGE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setMonthlyMessages(preset)}
              className={`border px-3 py-2 text-xs ${
                monthlyMessages === preset
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
              }`}
            >
              {preset.toLocaleString()}通
            </button>
          ))}
        </div>
      </div>

      <div className="border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          LINE公式アカウント料金（各店舗への直接請求）
        </p>
        <p className="mt-2 text-sm font-medium text-neutral-900">{lineDesc.planNote}</p>
        <ul className="mt-2 space-y-1 text-sm text-neutral-600">
          <li>{lineDesc.baseNote}</li>
          {lineDesc.messageNote && <li>{lineDesc.messageNote}</li>}
          <li className="font-bold text-neutral-900">
            LINE公式 合計 {formatYen(comparison.line.lineTotal)} / 月
          </li>
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          Lステップ・BuzzIt どちらを使っても LINE公式料金は同じです（BuzzIt は上乗せしません）。
        </p>
      </div>

      <div className="overflow-x-auto border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-semibold">項目</th>
              <th className="px-4 py-3 font-semibold">LINE公式</th>
              <th className="px-4 py-3 font-semibold">Lステップ</th>
              <th className="px-4 py-3 font-semibold">LINE CRM Pro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            <tr>
              <td className="px-4 py-3 text-neutral-600">プラン基本料</td>
              <td className="px-4 py-3">{formatYen(comparison.line.baseFee)}</td>
              <td className="px-4 py-3 text-neutral-400">—</td>
              <td className="px-4 py-3 text-neutral-400">—</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-neutral-600">
                追加配信料
                <span className="mt-0.5 block text-xs text-neutral-400">
                  {comparison.line.overageMessages > 0
                    ? `${comparison.line.overageMessages.toLocaleString()}通 × ¥${pricePerMessage}`
                    : '超過なし（ライト枠内）'}
                </span>
              </td>
              <td className="px-4 py-3">{formatYen(comparison.line.messageFee)}</td>
              <td className="px-4 py-3 text-neutral-400">—</td>
              <td className="px-4 py-3 text-neutral-400">—</td>
            </tr>
            <tr className="bg-neutral-100">
              <td className="px-4 py-3 font-medium text-neutral-700">LINE公式 小計</td>
              <td className="px-4 py-3 font-bold">{formatYen(comparison.line.lineTotal)}</td>
              <td className="px-4 py-3 font-bold">{formatYen(comparison.line.lineTotal)}</td>
              <td className="px-4 py-3 font-bold">{formatYen(comparison.line.lineTotal)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-neutral-600">CRMツール利用料</td>
              <td className="px-4 py-3 text-neutral-400">—</td>
              <td className="px-4 py-3">{formatYen(comparison.lstepStandard.toolFee)}</td>
              <td className="px-4 py-3">{formatYen(comparison.lineCrmPro.toolFee)}</td>
            </tr>
            <tr className="bg-neutral-900 text-white">
              <td className="px-4 py-3 font-bold">月間合計</td>
              <td className="px-4 py-3 text-neutral-400">—</td>
              <td className="px-4 py-3 font-bold">{formatYen(comparison.lstepStandard.total)}</td>
              <td className="px-4 py-3 font-bold">{formatYen(comparison.lineCrmPro.total)}</td>
            </tr>
            <tr className="bg-neutral-50">
              <td className="px-4 py-3 font-medium text-neutral-700">LINE CRM Pro での削減</td>
              <td colSpan={3} className="px-4 py-3 font-bold text-green-700">
                {comparison.savingsLineCrmVsLstepStandard >= 0 ? '−' : '+'}
                {formatYen(Math.abs(comparison.savingsLineCrmVsLstepStandard))}
                / 月（年間 {formatYen(Math.abs(comparison.savingsLineCrmVsLstepStandard) * 12)}）
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {segment && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">一斉配信（{monthlyMessages.toLocaleString()}通）</p>
            <p className="mt-1 text-xs text-neutral-600">
              LINE公式 {formatYen(segment.fullBroadcast.line.lineTotal)}
            </p>
            <p className="text-xs text-neutral-400">
              Lステップ合計 {formatYen(segment.fullBroadcast.lstepStandard.total)}
            </p>
            <p className="text-xs text-neutral-400">
              BuzzIt合計 {formatYen(segment.fullBroadcast.lineCrmPro.total)}
            </p>
          </div>
          <div className="border border-neutral-900 bg-neutral-900 p-4 text-white">
            <p className="text-xs text-neutral-300">
              セグメント配信（{segment.segmentMessages.toLocaleString()}通・40%）
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              LINE公式 {formatYen(segment.segment.line.lineTotal)}
            </p>
            <p className="buzz-stat-value buzz-stat-value--light mt-1 text-xl">
              {formatYen(segment.segment.lineCrmPro.total)}
            </p>
            <p className="mt-1 text-xs text-neutral-300">LINE CRM Pro 合計（LINE + CRM）</p>
          </div>
          <div className="border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs text-neutral-500">セグメント vs Lステップ一斉</p>
            <p className="buzz-stat-value mt-1 text-xl">
              −{formatYen(segment.fullBroadcast.lstepStandard.total - segment.segment.lineCrmPro.total)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">/ 月の削減余地</p>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          通数別クイック比較
        </p>
        <div className="overflow-x-auto border border-neutral-200">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-3 py-2">月間通数</th>
                <th className="px-3 py-2">LINE公式</th>
                <th className="px-3 py-2">Lステップ CRM</th>
                <th className="px-3 py-2">BuzzIt CRM</th>
                <th className="px-3 py-2">L合計</th>
                <th className="px-3 py-2">BuzzIt合計</th>
                <th className="px-3 py-2">差額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {presetRows.map((row) => (
                <tr
                  key={row.monthlyMessages}
                  className={row.monthlyMessages === monthlyMessages ? 'bg-neutral-50' : undefined}
                >
                  <td className="px-3 py-2 font-medium">{row.monthlyMessages.toLocaleString()}通</td>
                  <td className="px-3 py-2">{formatYen(row.line.lineTotal)}</td>
                  <td className="px-3 py-2">{formatYen(row.lstepStandard.toolFee)}</td>
                  <td className="px-3 py-2">{formatYen(row.lineCrmPro.toolFee)}</td>
                  <td className="px-3 py-2">{formatYen(row.lstepStandard.total)}</td>
                  <td className="px-3 py-2 font-medium">{formatYen(row.lineCrmPro.total)}</td>
                  <td className="px-3 py-2 font-medium text-green-700">
                    −{formatYen(row.savingsLineCrmVsLstepStandard)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
