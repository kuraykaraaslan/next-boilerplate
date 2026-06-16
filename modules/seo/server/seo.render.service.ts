import type { SeoMeta } from './seo.types';
import { xmlEscape } from './seo.render.escape';
import { hreflangTags, canonicalTag, localizedCanonical, buildAlternates } from './seo.render.hreflang';
import {
  sitemapXml, sitemapIndexXml, chunkSitemap, needsSitemapIndex,
  type SitemapImage, type SitemapUrlEntry,
} from './seo.render.sitemap';
import {
  productJsonLd, itemListJsonLd, articleJsonLd, breadcrumbJsonLd, faqJsonLd,
} from './seo.render.jsonld';
import { ogTags, twitterTags, validateTwitterCard } from './seo.render.social';
import { robotsTxt, gscVerificationTags, headTags } from './seo.render.technical';

export { xmlEscape };
export type { SitemapImage, SitemapUrlEntry };

/**
 * Pure SEO output generators — real, standards-compliant strings (no mocks).
 * The implementation is split across focused modules (`seo.render.hreflang`,
 * `.sitemap`, `.jsonld`, `.social`, `.technical`, plus the `seo.render.escape`
 * helper); this class preserves the single `SeoRenderService.*` entry point.
 */
export default class SeoRenderService {
  static hreflangTags(alternates: Record<string, string> | null | undefined, xDefaultUrl?: string | null): string {
    return hreflangTags(alternates, xDefaultUrl);
  }

  static canonicalTag(url: string | null | undefined): string {
    return canonicalTag(url);
  }

  static localizedCanonical(meta: Pick<SeoMeta, 'canonicalUrl' | 'localized'>, locale?: string): string | null {
    return localizedCanonical(meta, locale);
  }

  static buildAlternates(baseUrl: string, path: string, locales: string[]): Record<string, string> {
    return buildAlternates(baseUrl, path, locales);
  }

  static sitemapXml(entries: SitemapUrlEntry[]): string {
    return sitemapXml(entries);
  }

  static sitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string | Date }>): string {
    return sitemapIndexXml(sitemaps);
  }

  static chunkSitemap(entries: SitemapUrlEntry[], max?: number): SitemapUrlEntry[][] {
    return chunkSitemap(entries, max);
  }

  static needsSitemapIndex(urlCount: number, max?: number): boolean {
    return needsSitemapIndex(urlCount, max);
  }

  static productJsonLd(input: Parameters<typeof productJsonLd>[0]): string {
    return productJsonLd(input);
  }

  static itemListJsonLd(items: Array<{ name: string; url: string }>, inLanguage?: string): string {
    return itemListJsonLd(items, inLanguage);
  }

  static articleJsonLd(input: Parameters<typeof articleJsonLd>[0]): string {
    return articleJsonLd(input);
  }

  static breadcrumbJsonLd(crumbs: Array<{ name: string; url: string }>): string {
    return breadcrumbJsonLd(crumbs);
  }

  static faqJsonLd(faqs: Array<{ question: string; answer: string }>): string {
    return faqJsonLd(faqs);
  }

  static ogTags(meta: SeoMeta, opts?: { locale?: string; ogLocale?: string; url?: string; siteName?: string }): string {
    return ogTags(meta, opts);
  }

  static twitterTags(meta: SeoMeta, locale?: string): string {
    return twitterTags(meta, locale);
  }

  static validateTwitterCard(meta: SeoMeta): string[] {
    return validateTwitterCard(meta);
  }

  static robotsTxt(opts: Parameters<typeof robotsTxt>[0]): string {
    return robotsTxt(opts);
  }

  static gscVerificationTags(tokens: string | string[] | null | undefined): string {
    return gscVerificationTags(tokens);
  }

  static headTags(meta: SeoMeta, opts?: { locale?: string; ogLocale?: string; siteName?: string; gscTokens?: string | string[] }): string {
    return headTags(meta, opts);
  }
}
