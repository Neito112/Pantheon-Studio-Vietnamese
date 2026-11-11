/**
 * Key resolution: interpolation and plurals, with no React and no locale state.
 */
import type { Catalog } from "./types";

/**
 * Interpolate `{name}` placeholders. A missing value leaves the placeholder as it
 * is, so a mistake is visible rather than silently blank.
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const v = params[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

/**
 * Resolve one key in one catalogue.
 *
 * Plural keys: a `count` parameter picks `key_one` for exactly one and `key_other`
 * otherwise. Vietnamese has one form, so its catalogue simply omits the `_one`
 * variant and `_other` is used for every count.
 */
export function resolve(catalog: Catalog, key: string, params?: Record<string, string | number>): string | null {
  const direct = catalog[key];
  if (direct !== undefined) return interpolate(direct, params);

  if (params && typeof params.count === "number") {
    const one = catalog[`${key}_one`];
    const other = catalog[`${key}_other`];
    const chosen = params.count === 1 ? one ?? other : other ?? one;
    if (chosen !== undefined) return interpolate(chosen, params);
  }
  return null;
}

/** Merge the catalogues of one locale into a single lookup table. */
export function mergeCatalogs(domains: Record<string, Catalog>): Catalog {
  const out: Catalog = {};
  for (const domain of Object.values(domains)) Object.assign(out, domain);
  return out;
}
