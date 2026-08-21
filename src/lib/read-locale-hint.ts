import { createServerFn } from "@tanstack/react-start";
import type { Locale } from "@/lib/i18n";

export const readLocaleHint = createServerFn({ method: "GET" }).handler(
  async (): Promise<Locale> => {
    const { localeFromRequest } = await import("./locale.server");
    return localeFromRequest();
  },
);
