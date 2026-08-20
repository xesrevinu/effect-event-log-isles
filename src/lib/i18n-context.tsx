import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readStoredLocale,
  translate,
  writeStoredLocale,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function langTag(locale: Locale) {
  return locale === "zh" ? "zh-Hans" : "en";
}

export function I18nProvider({
  hint,
  children,
}: {
  hint: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(hint);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== hint) {
      setLocaleState(stored);
      return;
    }
    writeStoredLocale(hint);
  }, [hint]);

  useEffect(() => {
    writeStoredLocale(locale);
    document.documentElement.lang = langTag(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
