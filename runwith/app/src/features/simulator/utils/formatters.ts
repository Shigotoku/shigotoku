// ========== 通貨フォーマット ==========
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 100_000_000) {
      return `${(value / 100_000_000).toFixed(1)}億円`;
    }
    if (Math.abs(value) >= 10_000) {
      return `${(value / 10_000).toFixed(0)}万円`;
    }
  }
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value);
}

// ========== パーセンテージ ==========
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ========== 数値のコンパクト表示 ==========
export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`;
    if (Math.abs(value) >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
  }
  return new Intl.NumberFormat('ja-JP').format(value);
}

// ========== 倍率 ==========
export function formatMultiple(value: number): string {
  return `${value.toFixed(1)}x`;
}

// ========== 月数 ==========
export function formatMonths(value: number): string {
  if (value >= 999) return '∞';
  return `${value.toFixed(0)}ヶ月`;
}

// ========== グレードの色 ==========
export function gradeColor(grade: string): string {
  const map: Record<string, string> = {
    A: 'text-emerald-400',
    B: 'text-blue-400',
    C: 'text-yellow-400',
    D: 'text-orange-400',
    E: 'text-red-400',
  };
  return map[grade] || 'text-slate-400';
}

export function gradeBgColor(grade: string): string {
  const map: Record<string, string> = {
    A: 'bg-emerald-500/20 border-emerald-500/30',
    B: 'bg-blue-500/20 border-blue-500/30',
    C: 'bg-yellow-500/20 border-yellow-500/30',
    D: 'bg-orange-500/20 border-orange-500/30',
    E: 'bg-red-500/20 border-red-500/30',
  };
  return map[grade] || 'bg-slate-500/20 border-slate-500/30';
}
