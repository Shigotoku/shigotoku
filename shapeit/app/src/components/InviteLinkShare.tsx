import { useState } from "react";
import { t, type Locale } from "../lib/i18n";

type Props = {
  url: string;
  locale: Locale;
  email?: string;
  compact?: boolean;
};

export function InviteLinkShare({ url, locale, email, compact }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`rounded-lg border border-mint/25 bg-mint/5 ${compact ? "p-2" : "p-3"}`}>
      {!compact && (
        <p className="text-[11px] font-semibold text-ink">
          {email
            ? t("org_invite_link_for", locale).replace("{email}", email)
            : t("org_invite_link_title", locale)}
        </p>
      )}
      <p className={`text-[10px] leading-relaxed text-ink/60 ${compact ? "" : "mt-1"}`}>
        {t("org_invite_link_hint", locale)}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          readOnly
          className="min-w-0 flex-1 rounded border border-ink/10 bg-white px-2 py-1.5 font-mono text-[10px] text-ink/80"
          value={url}
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className="shrink-0 rounded bg-mint px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-mint-bright"
          onClick={copy}
        >
          {copied ? t("org_link_copied", locale) : t("org_copy_link", locale)}
        </button>
      </div>
      {!compact && (
        <p className="mt-1.5 text-[10px] text-ink/45">{t("org_invite_link_expiry", locale)}</p>
      )}
    </div>
  );
}
