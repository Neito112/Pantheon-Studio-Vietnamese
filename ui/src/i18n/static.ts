/**
 * Translation outside React.
 *
 * Module-level data (furniture names, character groups, pane descriptors) is built
 * before any component renders, so it cannot use the `useT` hook. These helpers let
 * such code ask for a translated string anyway: the current locale is read from the
 * module-level store the provider updates.
 *
 * Prefer `useT()` inside components. Use these only where a hook is impossible.
 */
import { resolve } from "./resolve";
import { en } from "./locales/en";
import { vi } from "./locales/vi";
import { DEFAULT_LOCALE, type Locale } from "./types";

const catalogs = { en, vi } as const;

let current: Locale = DEFAULT_LOCALE;
const listeners = new Set<(l: Locale) => void>();

/** Called by the provider whenever the locale changes. */
export function setStaticLocale(locale: Locale): void {
  if (current === locale) return;
  current = locale;
  for (const fn of listeners) fn(locale);
}

/** Subscribe to locale changes (for code that caches a translated string). */
export function onLocaleChange(fn: (l: Locale) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The locale in effect right now. */
export function staticLocale(): Locale {
  return current;
}

/** Translate a key outside React. Falls back to English, then to the key. */
export function translate(key: string, params?: Record<string, string | number>): string {
  const hit = resolve(catalogs[current], key, params);
  if (hit !== null) return hit;
  const fallback = resolve(catalogs.en, key, params);
  return fallback ?? key;
}
