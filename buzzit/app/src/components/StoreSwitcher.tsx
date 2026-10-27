import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Store } from 'lucide-react';
import { useStore } from '../store/storeContext';

export default function StoreSwitcher() {
  const { stores, activeStoreId, loading, refreshStores, switchStore } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshStores().catch(() => {});
  }, [refreshStores]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (stores.length <= 1) return null;

  const active = stores.find((s) => s.id === activeStoreId) ?? stores[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[12rem] items-center gap-1.5 truncate rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:border-neutral-300"
      >
        <Store className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{active?.name ?? '店舗'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-neutral-200/80 bg-white py-1 shadow-lg">
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              disabled={loading}
              onClick={async () => {
                await switchStore(store.id);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-xs hover:bg-neutral-50 ${
                store.id === activeStoreId ? 'font-semibold text-neutral-900' : 'text-neutral-600'
              }`}
            >
              {store.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
