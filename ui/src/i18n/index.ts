/**
 * The app's translation entry point: the catalogues, the provider and the hooks.
 *
 * Import `useT` from here, not from `core`, so the catalogues are wired once.
 */
export { I18nProvider, useI18n, useT, useLocale, useSetLocale, detectLocale } from "./core";
export { translate, staticLocale, onLocaleChange } from "./static";
export { LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from "./types";
export {
  formatDate,
  formatShortDate,
  formatDayMonth,
  formatTime,
  formatDateTime,
  formatWeekdayShort,
  formatWeekdayLong,
  formatNumber,
  formatCompact,
  formatCurrency,
  formatRelative,
  formatDuration,
  formatBytes,
} from "./format";
export { en } from "./locales/en";
export { vi } from "./locales/vi";
