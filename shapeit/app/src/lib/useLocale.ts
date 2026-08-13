import { useEffect, useState } from "react";
import { getLocale, type Locale } from "./i18n";

export function useLocale(): Locale {
  const [locale, setLocaleState] = useState(getLocale);
  useEffect(() => {
    const onLocale = () => setLocaleState(getLocale());
    window.addEventListener("shapeit-locale", onLocale);
    return () => window.removeEventListener("shapeit-locale", onLocale);
  }, []);
  return locale;
}
