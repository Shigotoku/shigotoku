import { buildTocItems } from '../lib/manualToc';
import type { ManualStep } from '../types';

type Props = {
  steps: ManualStep[];
};

export default function ManualTableOfContents({ steps }: Props) {
  const items = buildTocItems(steps);
  if (!items.length) return null;

  return (
    <nav className="mb-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
      <h2 className="text-sm font-bold text-slate-800">目次</h2>
      <ol className="mt-3 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.anchor}>
            <a href={`#${item.anchor}`} className="font-medium text-primary-700 hover:underline">
              {item.order}. {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
