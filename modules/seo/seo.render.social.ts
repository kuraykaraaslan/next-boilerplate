import type { SeoMeta } from './seo.types';
import { htmlAttr } from './seo.render.escape';
import { localizedCanonical } from './seo.render.hreflang';

/** Per-locale Open Graph meta tags (locale-specific overrides win). */
export function ogTags(meta: SeoMeta, opts?: { locale?: string; ogLocale?: string; url?: string; siteName?: string }): string {
  const loc = opts?.locale ? meta.localized?.[opts.locale] : undefined;
  const title = loc?.ogTitle ?? meta.ogTitle ?? loc?.title ?? meta.title;
  const description = loc?.ogDescription ?? meta.ogDescription ?? loc?.description ?? meta.description;
  const image = loc?.ogImageUrl ?? meta.ogImageUrl;
  const url = opts?.url ?? localizedCanonical(meta, opts?.locale);
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
export function twitterTags(meta: SeoMeta, locale?: string): string {
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
export function validateTwitterCard(meta: SeoMeta): string[] {
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
