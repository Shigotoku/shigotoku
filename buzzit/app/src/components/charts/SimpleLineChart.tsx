type Point = { date: string; value: number };

type Props = {
  data: Point[];
  height?: number;
  color?: string;
  label?: string;
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SimpleLineChart({
  data,
  height = 120,
  color = '#171717',
  label = '????????',
}: Props) {
  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const width = 320;
  const padX = 4;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  if (data.length === 0) {
    return <p className="py-6 text-center text-xs text-neutral-500">?????????</p>;
  }

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(1, data.length - 1)) * innerW;
    const y = padY + innerH - (d.value / max) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padY + innerH} L ${points[0].x.toFixed(1)} ${padY + innerH} Z`;

  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  const mid = data[Math.floor(data.length / 2)]?.date;

  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-neutral-500">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineFill)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points
          .filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2))
          .map((p) => (
            <circle key={p.date} cx={p.x} cy={p.y} r="3" fill={color} />
          ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
        <span>{first ? formatShortDate(first) : ''}</span>
        <span>{mid ? formatShortDate(mid) : ''}</span>
        <span>{last ? formatShortDate(last) : ''}</span>
      </div>
    </div>
  );
}
