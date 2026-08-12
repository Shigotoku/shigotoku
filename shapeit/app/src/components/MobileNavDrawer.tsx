import { NavLink } from "react-router-dom";
import { X, type LucideIcon } from "lucide-react";
import { getLocale, t } from "../lib/i18n";
import type { NavGroup } from "./SidebarNav";

type Props = {
  open: boolean;
  onClose: () => void;
  groups: NavGroup[];
  companyLabel: string;
  displayName: string;
  onSettings: () => void;
  onSignOut: () => void;
};

/** モバイル「その他」ドロワー */
export default function MobileNavDrawer({
  open,
  onClose,
  groups,
  companyLabel,
  displayName,
  onSettings,
  onSignOut,
}: Props) {
  const locale = getLocale();
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
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{companyLabel}</p>
            <p className="truncate text-sm text-ink/70">{displayName}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-paper"
            onClick={onClose}
            aria-label={locale === "ja" ? "閉じる" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.id} className="mb-4">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                  {t(group.labelKey, locale)}
                </p>
                <div className="mt-1 space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => (
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
