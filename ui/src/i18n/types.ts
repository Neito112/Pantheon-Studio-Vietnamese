/**
 * The translation catalogue, split by domain.
 *
 * English is the source of truth: `en/<domain>.ts` declares every key with its English
 * text, and `vi/<domain>.ts` holds the Vietnamese. A Vietnamese catalogue may be
 * incomplete — a missing key falls back to English, so a half-finished translation
 * never shows a blank.
 *
 * Domains map to folders of the app so one person (or one agent) can own a domain
 * end to end without anyone else touching the same files.
 */

/** The shape of one domain's English catalogue. */
export type Catalog = Record<string, string>;

/** Every key the app can ask for, merged from the English domains. */
export type TranslationKey = string;

export type Locale = "en" | "vi";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
];

export const LOCALE_STORAGE_KEY = "pantheon:locale";
export const DEFAULT_LOCALE: Locale = "vi";
