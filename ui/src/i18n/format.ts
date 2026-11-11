/**
 * Date, time and number formatting for the app.
 *
 * Every visible date, time, number and amount goes through here, so switching the
 * locale switches the formatting too — Vietnamese readers get "12 tháng 11, 2026"
 * and "1.234,5" rather than the American shapes.
 */
import type { Locale } from "./types";

const localeTag = (locale: Locale): string => (locale === "vi" ? "vi-VN" : "en-US");

const cache = new Map<string, Intl.DateTimeFormat>();

function fmt(locale: Locale, options: Intl.DateTimeFormatOptions, key: string): Intl.DateTimeFormat {
  const cacheKey = `${locale}:${key}`;
  let f = cache.get(cacheKey);
  if (!f) {
    f = new Intl.DateTimeFormat(localeTag(locale), options);
    cache.set(cacheKey, f);
  }
  return f;
}

/** "12 tháng 11, 2026" */
export function formatDate(locale: Locale, value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { day: "numeric", month: "long", year: "numeric" }, "dateLong").format(d);
}

/** "12/11/2026" */
export function formatShortDate(locale: Locale, value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { day: "2-digit", month: "2-digit", year: "numeric" }, "dateShort").format(d);
}

/** "12 tháng 11" */
export function formatDayMonth(locale: Locale, value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { day: "numeric", month: "long" }, "dayMonth").format(d);
}

/** "14:05" */
export function formatTime(locale: Locale, value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { hour: "2-digit", minute: "2-digit", hour12: false }, "time").format(d);
}

/** "12 tháng 11, 2026 lúc 14:05" */
export function formatDateTime(locale: Locale, value: Date | string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }, "dateTime").format(d);
}

/** The weekday's short name, e.g. "T2". */
export function formatWeekdayShort(locale: Locale, value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { weekday: "short" }, "weekdayShort").format(d);
}

/** The weekday's full name, e.g. "Thứ Hai". */
export function formatWeekdayLong(locale: Locale, value: Date | string | number | null | undefined): string {
  const d = toDate(value);
  if (!d) return "";
  return fmt(locale, { weekday: "long" }, "weekdayLong").format(d);
}

/** "1.234.567" (vi) or "1,234,567" (en). */
export function formatNumber(locale: Locale, value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat(localeTag(locale), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

/** A compact number for tight spaces: 12,4K / 12.4K. */
export function formatCompact(locale: Locale, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat(localeTag(locale), { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** "$1.23" / "1,23 US$" — money always shows its currency. */
export function formatCurrency(locale: Locale, value: number | null | undefined, currency = "USD"): string {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat(localeTag(locale), { style: "currency", currency, maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
}

/** "3 phút trước" / "3 minutes ago". */
export function formatRelative(locale: Locale, value: Date | string | number | null | undefined, now = Date.now()): string {
  if (value == null || value === "") return "";
  const d = toDate(value);
  if (!d) return "";
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(localeTag(locale), { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 864e5],
    ["month", 30 * 864e5],
    ["week", 7 * 864e5],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
    ["second", 1e3],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, "second");
}

/** "2 giờ 15 phút" / "2h 15m" — a duration, not a clock time. */
export function formatDuration(locale: Locale, seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const nf = (n: number) => formatNumber(locale, n);
  if (locale === "vi") {
    if (h && m) return `${nf(h)} giờ ${nf(m)} phút`;
    if (h) return `${nf(h)} giờ`;
    if (m) return `${nf(m)} phút`;
    return `${nf(sec)} giây`;
  }
  if (h && m) return `${nf(h)}h ${nf(m)}m`;
  if (h) return `${nf(h)}h`;
  if (m) return `${nf(m)}m`;
  return `${nf(sec)}s`;
}

/** "1.2 MB" / "1,2 MB". */
export function formatBytes(locale: Locale, bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = Math.abs(bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const n = i === 0 ? formatNumber(locale, v) : formatNumber(locale, v, v < 10 ? 1 : 0);
  return `${n} ${units[i]}`;
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  if (!s) return null;
  // Preserve local wall time, including seconds, when no timezone was supplied.
  const local = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/.exec(s);
  if (local) {
    const d = new Date(`${local[1]}T${local[2]}:${local[3] ?? "00"}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
