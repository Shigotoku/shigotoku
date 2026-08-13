import { NavLink } from "react-router-dom";
import { BookOpen, X, type LucideIcon } from "lucide-react";
import { t } from "../lib/i18n";
import { useLocale } from "../lib/useLocale";
import type { NavGroup } from "./SidebarNav";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: NavGroup[];
  companyLabel: string;
  displayName: string;
  guideUrl: string;
  onSettings: () => void;
  onSignOut: () => void;
};

export default function MobileNavDrawer({
  open,
  onClose,
  groups,
  companyLabel,
  displayName,
  guideUrl,
  onSettings,
  onSignOut,
}: Props) {
  const locale = useLocale();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="メニュー">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        aria-label={locale === "ja" ? "閉じる" : "Close"}
        onClick={onClose}
      />
      <div
        className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
          <a
            href={guideUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-mint"
            onClick={onClose}
          >
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
            {t("nav_guide", locale)}
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-paper"
            onClick={onClose}
            aria-label={locale === "ja" ? "閉じる" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-ink/10 px-4 py-3">
          <p className="break-words text-sm font-bold text-ink">{companyLabel}</p>
          <p className="mt-0.5 break-words text-sm text-ink/70">{displayName}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.id} className="mb-4">
                {group.labelKey && (
                  <p className="px-2 text-[10px] font-semibold text-ink/40">
                    {t(group.labelKey, locale)}
                  </p>
                )}
                <div className="mt-1 space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon, badge }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `inline-flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium ${
                          isActive ? "bg-sand text-ink" : "text-ink/70 hover:bg-paper"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{label}</span>
                      {badge != null && badge > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-white">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 border-t border-ink/10 p-3">
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-xl border border-ink/15 text-sm font-semibold"
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            {t("settings", locale)}
          </button>
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-xl bg-ink text-sm font-semibold text-paper"
            onClick={() => {
              onClose();
              onSignOut();
            }}
          >
            {t("logout", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
