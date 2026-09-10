type Point = { label: string; value: number; color?: string };

type Props = {
  data: Point[];
  height?: number;
  formatValue?: (n: number) => string;
};

const DEFAULT_COLORS = ['#171717', '#E1306C', '#06C755', '#1877F2', '#F77737'];

export default function SimpleBarChart({ data, height = 140, formatValue }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());

  if (data.length === 0) {
    return <p className="py-6 text-center text-xs text-neutral-500">?????????</p>;
  }

  return (
    <div className="flex items-end justify-between gap-2" style={{ height }} aria-hidden>
      {data.map((d, i) => {
        const pct = Math.max(4, (d.value / max) * 100);
        const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        return (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium tabular-nums text-neutral-600">{fmt(d.value)}</span>
            <div
              className="w-full max-w-[48px] rounded-t transition-all"
              style={{ height: `${pct}%`, backgroundColor: color, minHeight: d.value > 0 ? 4 : 0 }}
            />
            <span className="w-full truncate text-center text-[10px] text-neutral-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
