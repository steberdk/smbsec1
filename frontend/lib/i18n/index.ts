/**
 * Lightweight i18n helper for workspace pages.
 *
 * Usage:
 *   const t = useTranslation();          // reads locale from WorkspaceProvider
 *   t("nav.home")                        // => "Home" or "Hjem"
 *
 * Or without React context:
 *   translate("nav.home", "da")          // => "Hjem"
 */

import en from "./en.json";
import da from "./da.json";
import { useWorkspace } from "../hooks/useWorkspace";

export type Locale = "en" | "da";

const messages: Record<Locale, Record<string, string>> = { en, da };

/** Direct translation lookup — no React context needed */
export function translate(key: string, locale: Locale = "en"): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}

/**
 * React hook — reads org locale from WorkspaceProvider.
 * Returns a `t(key)` function bound to the current locale.
 */
export function useTranslation() {
  const { orgData } = useWorkspace();
  const locale = (orgData.org.locale ?? "en") as Locale;

  return function t(key: string): string {
    return translate(key, locale);
  };
}
