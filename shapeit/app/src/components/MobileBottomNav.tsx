import { NavLink } from "react-router-dom";
import { Inbox, Kanban, Menu, MessageSquarePlus, UserRound } from "lucide-react";
import { t } from "../lib/i18n";
import { useLocale } from "../lib/useLocale";
import { canCapture, canTriage, type AppRole } from "../lib/roles";

type Props = {
  role: AppRole;
  onOpenMore: () => void;
};

/** モバイル用ボトムタブ（CAP-012 / MOB-001） */
export default function MobileBottomNav({ role, onOpenMore }: Props) {
  const locale = useLocale();
  const tabs = [
    canCapture(role) && {
      to: "/capture",
      label: t("nav_capture", locale),
      icon: MessageSquarePlus,
      end: false,
    },
    canTriage(role) && {
      to: "/inbox",
      label: t("nav_inbox", locale),
      icon: Inbox,
      end: false,
    },
    {
      to: "/board",
      label: t("nav_board", locale),
      icon: Kanban,
      end: false,
    },
    {
      to: "/my-feedback",
      label: locale === "ja" ? "自分" : "My",
      icon: UserRound,
      end: false,
    },
  ].filter(Boolean) as { to: string; label: string; icon: typeof Inbox; end: boolean }[];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      aria-label={locale === "ja" ? "メインナビ" : "Main navigation"}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold ${
                isActive ? "text-mint" : "text-ink/45"
              }`
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold text-ink/45"
          onClick={onOpenMore}
        >
          <Menu className="h-5 w-5" aria-hidden />
          <span>{locale === "ja" ? "その他" : "More"}</span>
        </button>
      </div>
    </nav>
  );
}
