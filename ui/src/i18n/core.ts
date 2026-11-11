/**
 * The translation runtime.
 *
 * A small, dependency-free implementation: catalogues are plain objects, the provider
 * holds the current locale, and `useT()` returns a `t(key, params)` function that
 * falls back to English (then to the key itself) so a missing translation never
 * blanks the UI.
 *
 * `t` also interpolates `{name}` placeholders and picks a plural form through the
 * `_one` / `_other` suffix pair, so Vietnamese and English can both be expressed
 * without special-casing inside components.
 */
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolve } from "./resolve";
import { setStaticLocale } from "./static";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Catalog, type Locale } from "./types";

/** Every catalogue merged into one lookup table, per locale. */
export type Catalogs = Record<Locale, Catalog>;

export interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Translate a key, interpolating `{placeholders}` and resolving plurals. */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Read the stored locale, falling back to the browser's, then to the default. */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "vi" || stored === "en") return stored;
  } catch {
    /* private mode */
  }
  const nav = (window.navigator?.language || "").toLowerCase();
  if (nav.startsWith("vi")) return "vi";
  return DEFAULT_LOCALE;
}

export function I18nProvider({
  children,
  catalogs,
  initialLocale,
}: {
  children: ReactNode;
  catalogs: Catalogs;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* private mode */
    }
    document.documentElement.lang = locale;
    setStaticLocale(locale);
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const merged = useMemo(
    () => ({
      vi: catalogs.vi ?? {},
      en: catalogs.en ?? {},
    }),
    [catalogs],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const primary = resolve(merged[locale], key, params);
      if (primary !== null) return primary;
      const fallback = resolve(merged.en, key, params);
      if (fallback !== null) return fallback;
      // Nothing anywhere: show the key so the gap is obvious in the UI.
      return key;
    },
    [merged, locale],
  );

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return createElement(I18nContext.Provider, { value }, children);
}

/** The current locale and a `t` function. Must be used inside `<I18nProvider>`. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Just the `t` function — the common case. */
export function useT(): I18nValue["t"] {
  return useI18n().t;
}

/** The current locale. */
export function useLocale(): Locale {
  return useI18n().locale;
}

/** Switch the locale. */
export function useSetLocale(): (l: Locale) => void {
  return useI18n().setLocale;
}
