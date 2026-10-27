import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wand2, Inbox, CalendarDays, Menu } from 'lucide-react';

export default function MobileBottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const location = useLocation();
  const tabs: Array<{
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    accent?: boolean;
  }> = [
    { to: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
    { to: '/inbox', label: 'ネタ', icon: Inbox },
    { to: '/magic-creator', label: '作る', icon: Wand2, accent: true },
    { to: '/calendar', label: '予約', icon: CalendarDays },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200/80 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="メインナビ"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon, accent }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
          const isAccent = accent && active;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors ${
                active ? 'text-violet-700' : 'text-neutral-500'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isAccent
                    ? 'bg-violet-600 text-white shadow-sm'
                    : active
                      ? 'bg-violet-50'
                      : ''
                }`}
              >
                <Icon className={`h-5 w-5 ${active && !isAccent ? 'stroke-[2.25px]' : ''}`} />
              </span>
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-h-[52px] min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-neutral-500"
          aria-label="その他のメニュー"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full">
            <Menu className="h-5 w-5" />
          </span>
          <span>その他</span>
        </button>
      </div>
    </nav>
  );
}
