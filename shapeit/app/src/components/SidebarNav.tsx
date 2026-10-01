import { NavLink } from "react-router-dom";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { t } from "../lib/i18n";
import { useLocale } from "../lib/useLocale";

const COLLAPSE_KEY = "shapeit:nav:collapsed";

const DEFAULT_COLLAPSED: Record<string, boolean> = {
  planning: true,
  analytics: true,
  account: true,
};

export type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };

export type NavGroup = {
  id: string;
  labelKey?: "nav_group_planning" | "nav_group_analytics" | "nav_group_account";
  collapsible?: boolean;
  items: NavItem[];
};

function readCollapsed(): Record<string, boolean> {
  try {
    const stored = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "{}") as Record<string, boolean>;
    return { ...DEFAULT_COLLAPSED, ...stored };
  } catch {
    return { ...DEFAULT_COLLAPSED };
  }
}

export default function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const locale = useLocale();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed);

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-0.5 px-1.5 pb-1">
      {groups.map((group) => {
        if (group.items.length === 0) return null;
        const collapsible = group.collapsible !== false && Boolean(group.labelKey);
        const isOpen = !collapsible || !collapsed[group.id];
        return (
          <div key={group.id}>
            {collapsible && group.labelKey && (
              <button
                type="button"
                className="flex w-full min-h-[26px] items-center justify-between rounded-md px-1.5 text-[10px] font-semibold text-ink/40 hover:bg-paper"
                onClick={() => toggle(group.id)}
                aria-expanded={isOpen}
              >
                <span className="truncate">{t(group.labelKey, locale)}</span>
                <ChevronDown
                  className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            )}
            {isOpen && (
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `inline-flex min-h-[32px] w-full items-center gap-1.5 rounded-md px-2 text-[13px] font-medium ${
                        isActive ? "bg-sand text-ink" : "text-ink/70 hover:bg-paper hover:text-ink"
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{label}</span>
                    {badge != null && badge > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-white">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
