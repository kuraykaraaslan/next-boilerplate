import type { SeoMeta } from './seo.types';
import { htmlAttr } from './seo.render.escape';

/**
 * `<link rel="alternate" hreflang="...">` tags for every locale alternate,
 * plus an optional `x-default` for the language-chooser / default page.
 */
export function hreflangTags(alternates: Record<string, string> | null | undefined, xDefaultUrl?: string | null): string {
  const lines: string[] = [];
  for (const [locale, url] of Object.entries(alternates ?? {})) {
    if (!url) continue;
    lines.push(`<link rel="alternate" hreflang="${htmlAttr(locale)}" href="${htmlAttr(url)}" />`);
  }
  if (xDefaultUrl) {
    lines.push(`<link rel="alternate" hreflang="x-default" href="${htmlAttr(xDefaultUrl)}" />`);
  }
  return lines.join('\n');
}

/** Single canonical link tag. */
export function canonicalTag(url: string | null | undefined): string {
  return url ? `<link rel="canonical" href="${htmlAttr(url)}" />` : '';
}

/**
 * Resolve the canonical URL for a given locale: a locale-specific
 * `localized[locale].canonicalUrl` wins over the base `canonicalUrl`.
 */
export function localizedCanonical(meta: Pick<SeoMeta, 'canonicalUrl' | 'localized'>, locale?: string): string | null {
  const loc = locale ? meta.localized?.[locale]?.canonicalUrl : undefined;
  return loc ?? meta.canonicalUrl ?? null;
}

/** Build a locale → URL alternates map from a base URL + path + locale list. */
export function buildAlternates(baseUrl: string, path: string, locales: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  for (const locale of locales) {
    out[locale] = `${baseUrl.replace(/\/$/, '')}/${locale}${cleanPath}`.replace(/\/$/, '');
  }
  return out;
}
