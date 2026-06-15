import { xmlEscape } from './seo.render.escape';

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

export const MAX_URLS_PER_SITEMAP = 45000; // under Google's 50,000 hard limit

function lastmod(value?: string | Date): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** A single `<urlset>` sitemap with xhtml hreflang + image extensions. */
export function sitemapXml(entries: SitemapUrlEntry[]): string {
  const urls = entries.map((e) => {
    const parts: string[] = [`    <loc>${xmlEscape(e.loc)}</loc>`];
    const lm = lastmod(e.lastmod);
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
export function sitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string | Date }>): string {
  const items = sitemaps.map((s) => {
    const lm = lastmod(s.lastmod);
    return `  <sitemap>\n    <loc>${xmlEscape(s.loc)}</loc>${lm ? `\n    <lastmod>${lm}</lastmod>` : ''}\n  </sitemap>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items.join('\n')}\n</sitemapindex>\n`;
}

/** Split a large URL list into sitemap-sized chunks (≤ 45k URLs each). */
export function chunkSitemap(entries: SitemapUrlEntry[], max = MAX_URLS_PER_SITEMAP): SitemapUrlEntry[][] {
  const chunks: SitemapUrlEntry[][] = [];
  for (let i = 0; i < entries.length; i += max) chunks.push(entries.slice(i, i + max));
  return chunks.length > 0 ? chunks : [[]];
}

/** True when a flat sitemap would exceed limits and an index is required. */
export function needsSitemapIndex(urlCount: number, max = MAX_URLS_PER_SITEMAP): boolean {
  return urlCount > max;
}
