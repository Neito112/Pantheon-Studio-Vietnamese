"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, useI18n, type Locale } from "@/i18n";

/**
 * The language switcher: a small menu of the locales the app ships with.
 *
 * The choice is remembered on this machine and applied at once — every string and
 * every date and number re-renders in the new language.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("common.language")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-line-2 bg-panel-2 px-2 py-1.5 text-xs text-ink-2 transition-colors hover:bg-line hover:text-ink cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
        </svg>
        <span className="whitespace-nowrap">{current.label}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-line-2 bg-surface py-1 shadow-xl"
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              role="menuitem"
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                l.code === locale ? "bg-panel-2 text-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
              }`}
            >
              <span>{l.label}</span>
              {l.code === locale && <span className="text-[10px] text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
