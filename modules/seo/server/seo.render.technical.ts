import type { SeoMeta } from './seo.types';
import { htmlAttr } from './seo.render.escape';
import { canonicalTag, hreflangTags, localizedCanonical } from './seo.render.hreflang';
import { ogTags, twitterTags } from './seo.render.social';

/**
 * Generate a `robots.txt` body. `metaRobots` of `noindex`/`none` flips the
 * default to disallow-all. Supports per-crawler rules (e.g. Yandex, Baidu).
 */
export function robotsTxt(opts: {
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
export function gscVerificationTags(tokens: string | string[] | null | undefined): string {
  const list = (Array.isArray(tokens) ? tokens : [tokens])
    .flatMap((t) => (t ? t.split(',') : []))
    .map((t) => t.trim()).filter(Boolean);
  return list.map((t) => `<meta name="google-site-verification" content="${htmlAttr(t)}" />`).join('\n');
}

/** Assemble the full per-locale `<head>` SEO block for an entity. */
export function headTags(meta: SeoMeta, opts?: { locale?: string; ogLocale?: string; siteName?: string; gscTokens?: string | string[] }): string {
  const loc = opts?.locale ? meta.localized?.[opts.locale] : undefined;
  const title = loc?.title ?? meta.title;
  const description = loc?.description ?? meta.description;
  const blocks: string[] = [];
  if (title) blocks.push(`<title>${htmlAttr(title)}</title>`);
  if (description) blocks.push(`<meta name="description" content="${htmlAttr(description)}" />`);
  if (meta.noIndex) blocks.push(`<meta name="robots" content="noindex, nofollow" />`);
  const canonical = canonicalTag(localizedCanonical(meta, opts?.locale));
  if (canonical) blocks.push(canonical);
  const hreflang = hreflangTags(meta.alternates, meta.xDefaultUrl);
  if (hreflang) blocks.push(hreflang);
  blocks.push(ogTags(meta, { locale: opts?.locale, ogLocale: opts?.ogLocale, siteName: opts?.siteName }));
  blocks.push(twitterTags(meta, opts?.locale));
  const gsc = gscVerificationTags(opts?.gscTokens);
  if (gsc) blocks.push(gsc);
  return blocks.filter(Boolean).join('\n');
}
