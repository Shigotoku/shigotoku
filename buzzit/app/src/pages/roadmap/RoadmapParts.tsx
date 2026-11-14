import { Check } from 'lucide-react';

export function isRecommendedPlatform(
  platformId: string,
  platformName: string,
  primary: string[],
): boolean {
  return primary.some((name) => {
    const n = name.toLowerCase();
    if (platformId === 'gbp' && (n.includes('google') || n.includes('マップ') || n.includes('gbp'))) {
      return true;
    }
    if (platformId === 'youtube-shorts' && (n.includes('youtube') || n.includes('shorts'))) {
      return true;
    }
    if (platformId === 'facebook-threads' && (n.includes('facebook') || n.includes('threads'))) {
      return true;
    }
    return platformName.toLowerCase().includes(n) || n.includes(platformName.toLowerCase().slice(0, 4));
  });
}

export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-neutral-800">{value}</p>
    </div>
  );
}

export function GuideBlock({
  title,
  items,
  accent,
  muted,
}: {
  title: string;
  items: string[];
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`border p-5 ${
        accent
          ? 'border-[#6b4a3a]/25 bg-[#faf6f2]'
          : muted
            ? 'border-neutral-200 bg-neutral-50'
            : 'border-neutral-200 bg-white'
      }`}
    >
      <h4 className="mb-3 text-sm font-bold">{title}</h4>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
