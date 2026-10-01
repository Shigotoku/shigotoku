import type { TemplateCategory } from '../services/templateTypes';

const THEME: Record<TemplateCategory, { bg: string; panel: string; accent: string; label: string }> = {
  clinic: { bg: '#f0f9ff', panel: '#e0f2fe', accent: '#0284c7', label: 'クリニック画面' },
  education: { bg: '#fffbeb', panel: '#fef3c7', accent: '#d97706', label: '教材・授業' },
  smb: { bg: '#f8fafc', panel: '#f1f5f9', accent: '#475569', label: '社内システム' },
  web: { bg: '#f5f3ff', panel: '#ede9fe', accent: '#7c3aed', label: 'Web画面' },
  hospitality: { bg: '#fff7ed', panel: '#ffedd5', accent: '#ea580c', label: '店舗・POS' },
  general: { bg: '#f0fdf4', panel: '#dcfce7', accent: '#16a34a', label: '業務画面' },
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** テンプレート用の完成イメージプレースホルダー（差し替え前でもプレビューが埋まる） */
export function templatePlaceholderUrl(
  category: TemplateCategory,
  stepIndex: number,
  stepTitle: string,
  manualTitle: string,
): string {
  const t = THEME[category];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <rect width="800" height="500" fill="${t.bg}"/>
  <rect x="24" y="24" width="752" height="452" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <circle cx="52" cy="52" r="6" fill="#f87171"/><circle cx="72" cy="52" r="6" fill="#fbbf24"/><circle cx="92" cy="52" r="6" fill="#4ade80"/>
  <text x="120" y="58" font-family="sans-serif" font-size="14" fill="#64748b">${esc(manualTitle)}</text>
  <rect x="48" y="80" width="704" height="360" rx="12" fill="${t.panel}"/>
  <rect x="68" y="100" width="200" height="28" rx="6" fill="${t.accent}" opacity="0.15"/>
  <text x="80" y="120" font-family="sans-serif" font-size="13" font-weight="bold" fill="${t.accent}">${esc(t.label)}</text>
  <circle cx="120" cy="200" r="28" fill="#ffffff" stroke="${t.accent}" stroke-width="4"/>
  <text x="120" y="208" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="${t.accent}">${stepIndex}</text>
  <text x="170" y="195" font-family="sans-serif" font-size="20" font-weight="bold" fill="#1e293b">${esc(stepTitle)}</text>
  <rect x="68" y="240" width="664" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="88" y="275" font-family="sans-serif" font-size="14" fill="#64748b">実際の画面スクショに差し替えてください</text>
  <text x="88" y="305" font-family="sans-serif" font-size="12" fill="#94a3b8">（テンプレート付属の説明文はそのまま使えます）</text>
  <rect x="68" y="380" width="180" height="36" rx="8" fill="${t.accent}"/>
  <text x="158" y="403" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">操作イメージ</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
