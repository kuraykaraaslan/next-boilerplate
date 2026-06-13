import type { SeoMeta } from './seo.types';

/**
 * Pure SEO output generators — real, standards-compliant strings (no mocks).
 * The persistence service (seo.service) and route layer feed these with real
 * tenant data; every method here produces output you can ship verbatim into a
 * page <head>, a sitemap response, or a robots.txt response.
 */

// XML-escape text node / attribute values.
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Sitemap types ────────────────────────────────────────────────────────────

export interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string | Date;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  /** hreflang alternates for this URL (locale → url). */
  alternates?: Record<string, string>;
  xDefault?: string;
  images?: SitemapImage[];
}

const MAX_URLS_PER_SITEMAP = 45000; // under Google's 50,000 hard limit

export default class SeoRenderService {

  // ── International / hreflang ───────────────────────────────────────────────

  /**
   * `<link rel="alternate" hreflang="...">` tags for every locale alternate,
   * plus an optional `x-default` for the language-chooser / default page.
   */
  static hreflangTags(alternates: Record<string, string> | null | undefined, xDefaultUrl?: string | null): string {
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
  static canonicalTag(url: string | null | undefined): string {
    return url ? `<link rel="canonical" href="${htmlAttr(url)}" />` : '';
  }

  /**
   * Resolve the canonical URL for a given locale: a locale-specific
   * `localized[locale].canonicalUrl` wins over the base `canonicalUrl`.
   */
  static localizedCanonical(meta: Pick<SeoMeta, 'canonicalUrl' | 'localized'>, locale?: string): string | null {
    const loc = locale ? meta.localized?.[locale]?.canonicalUrl : undefined;
    return loc ?? meta.canonicalUrl ?? null;
  }

  /** Build a locale → URL alternates map from a base URL + path + locale list. */
  static buildAlternates(baseUrl: string, path: string, locales: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    for (const locale of locales) {
      out[locale] = `${baseUrl.replace(/\/$/, '')}/${locale}${cleanPath}`.replace(/\/$/, '');
    }
    return out;
  }

  // ── Sitemaps ───────────────────────────────────────────────────────────────

  private static lastmod(value?: string | Date): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  /** A single `<urlset>` sitemap with xhtml hreflang + image extensions. */
  static sitemapXml(entries: SitemapUrlEntry[]): string {
    const urls = entries.map((e) => {
      const parts: string[] = [`    <loc>${xmlEscape(e.loc)}</loc>`];
      const lm = this.lastmod(e.lastmod);
      if (lm) parts.push(`    <lastmod>${lm}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (typeof e.priority === 'number') parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      for (const [locale, url] of Object.entries(e.alternates ?? {})) {
        parts.push(`    <xhtml:link rel="alternate" hreflang="${xmlEscape(locale)}" href="${xmlEscape(url)}" />`);
      }
      if (e.xDefault) {
        parts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(e.xDefault)}" />`);
      }
      for (const img of e.images ?? []) {
        const imgParts = [`      <image:loc>${xmlEscape(img.loc)}</image:loc>`];
        if (img.title) imgParts.push(`      <image:title>${xmlEscape(img.title)}</image:title>`);
        if (img.caption) imgParts.push(`      <image:caption>${xmlEscape(img.caption)}</image:caption>`);
        parts.push(`    <image:image>\n${imgParts.join('\n')}\n    </image:image>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
      `xmlns:xhtml="http://www.w3.org/1999/xhtml" ` +
      `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
      `${urls.join('\n')}\n</urlset>\n`;
  }

  /** A `<sitemapindex>` referencing page-level sitemap files. */
  static sitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string | Date }>): string {
    const items = sitemaps.map((s) => {
      const lm = this.lastmod(s.lastmod);
      return `  <sitemap>\n    <loc>${xmlEscape(s.loc)}</loc>${lm ? `\n    <lastmod>${lm}</lastmod>` : ''}\n  </sitemap>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${items.join('\n')}\n</sitemapindex>\n`;
  }

  /** Split a large URL list into sitemap-sized chunks (≤ 45k URLs each). */
  static chunkSitemap(entries: SitemapUrlEntry[], max = MAX_URLS_PER_SITEMAP): SitemapUrlEntry[][] {
    const chunks: SitemapUrlEntry[][] = [];
    for (let i = 0; i < entries.length; i += max) chunks.push(entries.slice(i, i + max));
    return chunks.length > 0 ? chunks : [[]];
  }

  /** True when a flat sitemap would exceed limits and an index is required. */
  static needsSitemapIndex(urlCount: number, max = MAX_URLS_PER_SITEMAP): boolean {
    return urlCount > max;
  }

  // ── Structured data (Schema.org / JSON-LD) ─────────────────────────────────

  private static jsonLdScript(obj: Record<string, unknown>): string {
    // Escape `<` to avoid breaking out of the <script> element.
    const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">\n${json}\n</script>`;
  }

  static productJsonLd(input: {
    name: string; description?: string; image?: string | string[]; sku?: string; brand?: string;
    price?: number; priceCurrency?: string; availability?: string; url?: string; inLanguage?: string;
    ratingValue?: number; reviewCount?: number;
  }): string {
    const obj: Record<string, unknown> = {
      '@context': 'https://schema.org', '@type': 'Product', name: input.name,
    };
    if (input.inLanguage) obj.inLanguage = input.inLanguage;
    if (input.description) obj.description = input.description;
    if (input.image) obj.image = input.image;
    if (input.sku) obj.sku = input.sku;
    if (input.brand) obj.brand = { '@type': 'Brand', name: input.brand };
    if (typeof input.price === 'number' && input.priceCurrency) {
      obj.offers = {
        '@type': 'Offer', price: input.price.toFixed(2), priceCurrency: input.priceCurrency,
        availability: `https://schema.org/${input.availability ?? 'InStock'}`,
        ...(input.url ? { url: input.url } : {}),
      };
    }
    if (typeof input.ratingValue === 'number' && typeof input.reviewCount === 'number' && input.reviewCount > 0) {
      obj.aggregateRating = { '@type': 'AggregateRating', ratingValue: input.ratingValue, reviewCount: input.reviewCount };
    }
    return this.jsonLdScript(obj);
  }

  static itemListJsonLd(items: Array<{ name: string; url: string }>, inLanguage?: string): string {
    return this.jsonLdScript({
      '@context': 'https://schema.org', '@type': 'ItemList',
      ...(inLanguage ? { inLanguage } : {}),
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: it.name, url: it.url,
      })),
    });
  }

  static articleJsonLd(input: {
    headline: string; description?: string; image?: string; author?: string;
    datePublished?: string | Date; dateModified?: string | Date; url?: string; inLanguage?: string;
  }): string {
    const obj: Record<string, unknown> = {
      '@context': 'https://schema.org', '@type': 'Article', headline: input.headline,
    };
    if (input.inLanguage) obj.inLanguage = input.inLanguage;
    if (input.description) obj.description = input.description;
    if (input.image) obj.image = input.image;
    if (input.author) obj.author = { '@type': 'Person', name: input.author };
    if (input.datePublished) obj.datePublished = new Date(input.datePublished).toISOString();
    if (input.dateModified) obj.dateModified = new Date(input.dateModified).toISOString();
    if (input.url) obj.mainEntityOfPage = { '@type': 'WebPage', '@id': input.url };
    return this.jsonLdScript(obj);
  }

  /** `BreadcrumbList` JSON-LD from an ordered list of (name, url) crumbs. */
  static breadcrumbJsonLd(crumbs: Array<{ name: string; url: string }>): string {
    return this.jsonLdScript({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem', position: i + 1, name: c.name, item: c.url,
      })),
    });
  }

  static faqJsonLd(faqs: Array<{ question: string; answer: string }>): string {
    return this.jsonLdScript({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question', name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  // ── Open Graph / Twitter ───────────────────────────────────────────────────

  /** Per-locale Open Graph meta tags (locale-specific overrides win). */
  static ogTags(meta: SeoMeta, opts?: { locale?: string; ogLocale?: string; url?: string; siteName?: string }): string {
    const loc = opts?.locale ? meta.localized?.[opts.locale] : undefined;
    const title = loc?.ogTitle ?? meta.ogTitle ?? loc?.title ?? meta.title;
    const description = loc?.ogDescription ?? meta.ogDescription ?? loc?.description ?? meta.description;
    const image = loc?.ogImageUrl ?? meta.ogImageUrl;
    const url = opts?.url ?? this.localizedCanonical(meta, opts?.locale);
    const tags: string[] = [`<meta property="og:type" content="website" />`];
    if (title) tags.push(`<meta property="og:title" content="${htmlAttr(title)}" />`);
    if (description) tags.push(`<meta property="og:description" content="${htmlAttr(description)}" />`);
    if (image) tags.push(`<meta property="og:image" content="${htmlAttr(image)}" />`);
    if (url) tags.push(`<meta property="og:url" content="${htmlAttr(url)}" />`);
    if (opts?.siteName) tags.push(`<meta property="og:site_name" content="${htmlAttr(opts.siteName)}" />`);
    if (opts?.ogLocale) tags.push(`<meta property="og:locale" content="${htmlAttr(opts.ogLocale)}" />`);
    return tags.join('\n');
  }

  /** Twitter/X card meta tags using per-locale overrides where present. */
  static twitterTags(meta: SeoMeta, locale?: string): string {
    const loc = locale ? meta.localized?.[locale] : undefined;
    const card = meta.twitterCard || 'summary';
    const title = loc?.twitterTitle ?? meta.twitterTitle ?? loc?.title ?? meta.title;
    const description = loc?.twitterDescription ?? meta.twitterDescription ?? loc?.description ?? meta.description;
    const image = loc?.ogImageUrl ?? meta.ogImageUrl;
    const tags = [`<meta name="twitter:card" content="${htmlAttr(card)}" />`];
    if (title) tags.push(`<meta name="twitter:title" content="${htmlAttr(title)}" />`);
    if (description) tags.push(`<meta name="twitter:description" content="${htmlAttr(description)}" />`);
    if (image) tags.push(`<meta name="twitter:image" content="${htmlAttr(image)}" />`);
    return tags.join('\n');
  }

  /**
   * Validate a Twitter card configuration against its required fields. Returns
   * a list of human-readable issues; an empty list means the card is valid.
   */
  static validateTwitterCard(meta: SeoMeta): string[] {
    const issues: string[] = [];
    const valid = ['summary', 'summary_large_image', 'app', 'player'];
    const card = meta.twitterCard || 'summary';
    if (!valid.includes(card)) {
      issues.push(`Invalid twitter:card type "${card}" (expected one of ${valid.join(', ')})`);
      return issues;
    }
    const title = meta.twitterTitle ?? meta.title;
    const description = meta.twitterDescription ?? meta.description;
    if (!title) issues.push('twitter:title is required');
    if (card === 'summary_large_image') {
      if (!description) issues.push('summary_large_image requires twitter:description');
      if (!meta.ogImageUrl) issues.push('summary_large_image requires an image (ogImageUrl)');
    }
    if (card === 'player' && !meta.ogImageUrl) issues.push('player card requires an image');
    return issues;
  }

  // ── Technical SEO ──────────────────────────────────────────────────────────

  /**
   * Generate a `robots.txt` body. `metaRobots` of `noindex`/`none` flips the
   * default to disallow-all. Supports per-crawler rules (e.g. Yandex, Baidu).
   */
  static robotsTxt(opts: {
    sitemapUrl?: string | null;
    disallow?: string[];
    allow?: string[];
    metaRobots?: string | null;
    crawlerRules?: Array<{ userAgent: string; disallow?: string[]; allow?: string[] }>;
    host?: string | null;
  }): string {
    const blocked = /noindex|none/i.test(opts.metaRobots ?? '');
    const lines: string[] = ['User-agent: *'];
    if (blocked) {
      lines.push('Disallow: /');
    } else {
      for (const a of opts.allow ?? []) lines.push(`Allow: ${a}`);
      const disallow = opts.disallow ?? ['/admin', '/api', '/auth'];
      for (const d of disallow) lines.push(`Disallow: ${d}`);
    }
    for (const rule of opts.crawlerRules ?? []) {
      lines.push('', `User-agent: ${rule.userAgent}`);
      for (const a of rule.allow ?? []) lines.push(`Allow: ${a}`);
      for (const d of rule.disallow ?? []) lines.push(`Disallow: ${d}`);
    }
    if (opts.host) lines.push('', `Host: ${opts.host}`);
    if (opts.sitemapUrl) lines.push('', `Sitemap: ${opts.sitemapUrl}`);
    return lines.join('\n') + '\n';
  }

  /**
   * Google Search Console verification meta tag(s). Accepts one or many tokens
   * (multi-property tenants run one token per regional domain).
   */
  static gscVerificationTags(tokens: string | string[] | null | undefined): string {
    const list = (Array.isArray(tokens) ? tokens : [tokens])
      .flatMap((t) => (t ? t.split(',') : []))
      .map((t) => t.trim()).filter(Boolean);
    return list.map((t) => `<meta name="google-site-verification" content="${htmlAttr(t)}" />`).join('\n');
  }

  /** Assemble the full per-locale `<head>` SEO block for an entity. */
  static headTags(meta: SeoMeta, opts?: { locale?: string; ogLocale?: string; siteName?: string; gscTokens?: string | string[] }): string {
    const loc = opts?.locale ? meta.localized?.[opts.locale] : undefined;
    const title = loc?.title ?? meta.title;
    const description = loc?.description ?? meta.description;
    const blocks: string[] = [];
    if (title) blocks.push(`<title>${htmlAttr(title)}</title>`);
    if (description) blocks.push(`<meta name="description" content="${htmlAttr(description)}" />`);
    if (meta.noIndex) blocks.push(`<meta name="robots" content="noindex, nofollow" />`);
    const canonical = this.canonicalTag(this.localizedCanonical(meta, opts?.locale));
    if (canonical) blocks.push(canonical);
    const hreflang = this.hreflangTags(meta.alternates, meta.xDefaultUrl);
    if (hreflang) blocks.push(hreflang);
    blocks.push(this.ogTags(meta, { locale: opts?.locale, ogLocale: opts?.ogLocale, siteName: opts?.siteName }));
    blocks.push(this.twitterTags(meta, opts?.locale));
    const gsc = this.gscVerificationTags(opts?.gscTokens);
    if (gsc) blocks.push(gsc);
    return blocks.filter(Boolean).join('\n');
  }
}
