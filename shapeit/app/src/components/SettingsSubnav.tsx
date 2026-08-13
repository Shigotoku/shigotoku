import { NavLink, useSearchParams } from "react-router-dom";
import { t } from "../lib/i18n";
import { useLocale } from "../lib/useLocale";

const TABS = [
  { to: "/settings?tab=org", key: "settings_tab_org" },
  { to: "/settings?tab=members", key: "settings_tab_members" },
  { to: "/settings?tab=language", key: "settings_tab_language" },
  { to: "/settings?tab=notify", key: "settings_tab_notify" },
  { to: "/settings?tab=privacy", key: "settings_tab_privacy" },
  { to: "/settings?tab=extension", key: "settings_tab_extension" },
  { to: "/settings?tab=data", key: "settings_tab_data" },
  { to: "/settings?tab=admin", key: "settings_tab_admin" },
] as const;

export default function SettingsSubnav() {
  const locale = useLocale();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "org";

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label={t("settings", locale)}>
      {TABS.map((item) => {
        const id = item.to.split("tab=")[1];
        const active = tab === id;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              active ? "bg-mint text-white" : "bg-paper text-ink/70 hover:bg-sand"
            }`}
          >
            {t(item.key, locale)}
          </NavLink>
        );
      })}
    </nav>
  );
}
