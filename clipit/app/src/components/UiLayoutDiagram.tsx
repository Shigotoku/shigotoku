import type { ReactNode } from 'react';
import type { UiLayoutId } from '../lib/uiLayoutTemplates';

type Props = {
  layoutId: UiLayoutId;
  className?: string;
  selected?: boolean;
};

/** UI レイアウトの簡易模式図（SVG） */
export default function UiLayoutDiagram({ layoutId, className = '', selected = false }: Props) {
  const stroke = selected ? '#ea580c' : '#94a3b8';
  const fillImg = selected ? '#fed7aa' : '#e2e8f0';
  const fillText = selected ? '#fff7ed' : '#f8fafc';
  const fillNote = selected ? '#fef3c7' : '#fef9c3';
  const fillSummary = selected ? '#ffedd5' : '#f1f5f9';

  const w = 120;
  const h = 72;

  const img = (x: number, y: number, iw: number, ih: number) => (
    <rect x={x} y={y} width={iw} height={ih} rx={3} fill={fillImg} stroke={stroke} strokeWidth={1.2} />
  );
  const txt = (x: number, y: number, tw: number, th: number, lines = 2) => (
    <g>
      <rect x={x} y={y} width={tw} height={th} rx={2} fill={fillText} stroke={stroke} strokeWidth={0.8} opacity={0.9} />
      {Array.from({ length: lines }).map((_, i) => (
        <line
          key={i}
          x1={x + 4}
          y1={y + 8 + i * 7}
          x2={x + tw - (i === lines - 1 ? 12 : 4)}
          y2={y + 8 + i * 7}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.5}
        />
      ))}
    </g>
  );
  const note = (x: number, y: number, nw: number) => (
    <rect x={x} y={y} width={nw} height={10} rx={2} fill={fillNote} stroke="#f59e0b" strokeWidth={0.8} />
  );

  let content: ReactNode;

  switch (layoutId) {
    case 'standard-vertical':
      content = (
        <>
          {img(20, 6, 80, 28)}
          {txt(20, 40, 80, 24, 3)}
        </>
      );
      break;
    case 'image-left':
      content = (
        <>
          {img(6, 14, 38, 44)}
          {txt(50, 14, 64, 44, 4)}
        </>
      );
      break;
    case 'image-right':
      content = (
        <>
          {txt(6, 14, 64, 44, 4)}
          {img(76, 14, 38, 44)}
        </>
      );
      break;
    case 'compact':
      content = (
        <>
          {img(28, 8, 64, 22)}
          {txt(20, 36, 80, 16, 2)}
          {txt(20, 56, 80, 12, 1)}
        </>
      );
      break;
    case 'notes-focus':
      content = (
        <>
          {img(16, 4, 88, 26)}
          {txt(16, 34, 88, 18, 2)}
          {note(16, 56, 88)}
        </>
      );
      break;
    case 'summary-top':
      content = (
        <>
          <rect x={12} y={4} width={96} height={14} rx={2} fill={fillSummary} stroke={stroke} strokeWidth={0.8} />
          <line x1={16} y1={11} x2={80} y2={11} stroke={stroke} strokeWidth={1} opacity={0.4} />
          {img(20, 22, 80, 22)}
          {txt(20, 48, 80, 20, 2)}
        </>
      );
      break;
    default:
      content = null;
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`block w-full ${className}`}
      aria-hidden
      role="img"
    >
      <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={6} fill="white" stroke={stroke} strokeWidth={0.6} opacity={0.6} />
      {content}
    </svg>
  );
}
