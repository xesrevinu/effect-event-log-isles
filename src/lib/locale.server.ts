import { getCookie, getRequest } from "@tanstack/react-start/server";
import { localeFromAcceptLanguage, parseLocale, STORAGE_KEY, type Locale } from "@/lib/i18n";

/**
 * Server-only locale for SSR. Cookie (explicit pick) wins, then
 * Accept-Language, then English.
 */
export function localeFromRequest(): Locale {
  try {
    const fromCookie = parseLocale(getCookie(STORAGE_KEY));
    if (fromCookie) return fromCookie;
    const request = getRequest();
    const header = request?.headers.get("accept-language");
    return localeFromAcceptLanguage(header) ?? "en";
  } catch {
    return "en";
  }
}
