import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { afterEach, describe, expect, it, vi as mock } from "vitest";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { stateLook } from "../studio/look";
import { detectLocale, I18nProvider, useT } from "./core";
import { formatCurrency, formatDate, formatDuration, formatNumber, formatRelative } from "./format";
import { en } from "./locales/en";
import { vi } from "./locales/vi";
import { interpolate, resolve } from "./resolve";
import { onLocaleChange, setStaticLocale, translate } from "./static";
import { DEFAULT_LOCALE, type Locale } from "./types";

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), "..");
const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = pathResolve(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
  });
}

afterEach(() => {
  mock.unstubAllGlobals();
  setStaticLocale(DEFAULT_LOCALE);
});

describe("translation catalogue contracts", () => {
  it("provides Vietnamese for every English key, preserving interpolation tokens", () => {
    const problems: string[] = [];
    for (const [key, text] of Object.entries(en)) {
      const translated = vi[key] ?? (key.endsWith("_one") ? vi[key.replace(/_one$/, "_other")] : undefined);
      if (!translated?.trim()) problems.push(`${key}: missing Vietnamese`);
      else if (JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(translated))) problems.push(`${key}: placeholder mismatch`);
    }
    expect(problems).toEqual([]);
  });

  it("keeps catalogue keys unique across domains", () => {
    for (const locale of ["en", "vi"]) {
      const keys = new Set<string>();
      const duplicates: string[] = [];
      for (const path of sourceFiles(pathResolve(root, "i18n/locales", locale))) {
        const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
        const visit = (node: ts.Node) => {
          if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) {
            const key = node.name.text;
            if (keys.has(key)) duplicates.push(key);
            keys.add(key);
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
      expect(duplicates, locale).toEqual([]);
    }
  });

  it("resolves literal UI translation calls and supplies their placeholders", () => {
    const problems: string[] = [];
    for (const path of sourceFiles(root).filter((p) => !p.includes("locales"))) {
      const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["t", "translate"].includes(node.expression.text)) {
          const [key, params] = node.arguments;
          if (key && ts.isStringLiteral(key)) {
            const text = en[key.text] ?? en[`${key.text}_other`];
            if (text === undefined) problems.push(`${path}: unknown ${key.text}`);
            else if (!params || ts.isObjectLiteralExpression(params)) {
              const names = params ? params.properties.map((p) => p.name && ts.isIdentifier(p.name) ? p.name.text : "") : [];
              for (const name of placeholders(text)) if (!names.includes(name)) problems.push(`${path}: ${key.text} needs ${name}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(problems).toEqual([]);
  });
});

describe("language selection and translation rendering", () => {
  it("changes state labels without changing their colours, animations or attention flags", () => {
    for (const status of ["working", "awaiting_approval", "error", "retrying", "cooling_down", "queued", "idle"] as const) {
      const english = stateLook(status, undefined, (key) => en[key]);
      const vietnamese = stateLook(status, undefined, (key) => vi[key]);
      expect(vietnamese.label).not.toBe(english.label);
      expect({ ...vietnamese, label: "" }).toEqual({ ...english, label: "" });
    }
  });

  it.each(["en", "vi"] as const)("renders the provider, language picker and plural text in %s", (locale) => {
    function Probe() {
      const t = useT();
      return createElement("p", null, t("org.agentCount", { count: 2 }));
    }
    const html = renderToStaticMarkup(createElement(I18nProvider, { catalogs: { en, vi }, initialLocale: locale, children: [createElement(LanguageSwitcher, { key: "picker" }), createElement(Probe, { key: "probe" })] }));
    expect(html).toContain(locale === "vi" ? "Tiếng Việt" : "English");
    expect(html).toContain(locale === "vi" ? "2 agent" : "2 agents");
    expect(html).not.toContain("org.agentCount");
  });

  it("honours the saved choice over the browser language and tolerates blocked storage", () => {
    mock.stubGlobal("window", { localStorage: { getItem: () => "en" }, navigator: { language: "vi-VN" } });
    expect(detectLocale()).toBe("en");
    mock.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); } }, navigator: { language: "vi-VN" } });
    expect(detectLocale()).toBe("vi");
  });

  it("switches translations outside React and notifies only on changes", () => {
    setStaticLocale("en");
    const listener = mock.fn();
    const off = onLocaleChange(listener);
    try {
      expect(translate("common.save")).toBe("Save");
      setStaticLocale("vi");
      setStaticLocale("vi");
      expect(translate("common.save")).toBe("Lưu");
      expect(listener).toHaveBeenCalledTimes(1);
    } finally { off(); }
  });

  it("handles Vietnamese plurals, English plurals, interpolation and missing keys", () => {
    for (const count of [0, 1, 2]) expect(resolve(vi, "org.agentCount", { count })).toBe(`${count} agent`);
    expect(resolve(en, "org.agentCount", { count: 1 })).toBe("1 agent");
    expect(resolve(en, "org.agentCount", { count: 2 })).toBe("2 agents");
    expect(interpolate("{name}: {count}", { name: "Nova", count: 0 })).toBe("Nova: 0");
    expect(interpolate("{{secret:NAME}} --flag {prompt}", { prompt: "hello" })).toBe("{{secret:NAME}} --flag hello");
    expect(translate("missing.key")).toBe("missing.key");
  });

  it("formats dates, numbers, currency and durations for the selected locale", () => {
    expect(formatNumber("vi", 1234.5, 1)).toBe("1.234,5");
    expect(formatNumber("en", 1234.5, 1)).toBe("1,234.5");
    expect(formatDate("vi", new Date(2026, 10, 11))).toContain("tháng 11");
    expect(formatDate("en", new Date(2026, 10, 11))).toContain("November");
    for (const locale of ["en", "vi"] as Locale[]) {
      expect(formatCurrency(locale, 1.5)).toBe(new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(1.5));
      expect(formatDate(locale, "invalid")).toBe("");
    }
    expect(formatDuration("vi", 65)).toBe("1 phút");
    expect(formatDuration("en", 65)).toBe("1m");
  });

  it("preserves seconds in local timestamps when formatting relative time", () => {
    const now = new Date(2026, 10, 11, 14, 6, 0).getTime();
    expect(formatRelative("en", "2026-11-11T14:05:59", now)).toBe("1 second ago");
    expect(formatRelative("vi", "2026-11-11 14:05:59", now)).toBe("1 giây trước");
  });
});
