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
    <div className="fixed bottom-3 left-3 right-3 z-[60] border border-neutral-300 bg-white p-3 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">ホーム画面に追加</p>
          <p className="mt-1 text-xs text-neutral-600">
            {iosHint
              ? 'Safariの共有ボタン →「ホーム画面に追加」で、店長スマホから親指承認しやすくなります。'
              : 'アプリのように開いて、朝の承認を速くできます。'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {deferred && (
              <button
                type="button"
                className="buzz-btn-primary px-3 py-1.5 text-xs"
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
              className="border border-neutral-300 px-3 py-1.5 text-xs"
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
          className="min-h-[44px] min-w-[44px] text-neutral-500"
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
