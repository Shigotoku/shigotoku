import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'buzzit.pwa.dismiss.v1';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;
    if (isIos) {
      setIosHint(true);
      setVisible(true);
      return;
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-[4.75rem] left-3 right-3 z-[45] rounded-xl border border-neutral-200/80 bg-white p-3 shadow-lg lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-start gap-3">
        <div className="buzz-icon-box !h-9 !w-9 shrink-0">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-neutral-900">ホーム画面に追加</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            {iosHint
              ? 'Safariの共有 →「ホーム画面に追加」で、スマホから素早く開けます。'
              : 'アプリのように開いて、朝の承認を速くできます。'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {deferred && (
              <button
                type="button"
                className="buzz-btn-primary !px-3 !py-1.5 text-xs"
                onClick={async () => {
                  await deferred.prompt();
                  setVisible(false);
                }}
              >
                インストール
              </button>
            )}
            <button
              type="button"
              className="buzz-btn-secondary !px-3 !py-1.5 text-xs"
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, '1');
                setVisible(false);
              }}
            >
              あとで
            </button>
          </div>
        </div>
        <button
          type="button"
          className="buzz-btn-ghost !min-h-[36px] !min-w-[36px] shrink-0 text-neutral-400"
          aria-label="閉じる"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
