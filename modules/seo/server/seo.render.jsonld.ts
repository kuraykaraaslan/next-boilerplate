function jsonLdScript(obj: Record<string, unknown>): string {
  // Escape `<` to avoid breaking out of the <script> element.
  const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

export function productJsonLd(input: {
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
  return jsonLdScript(obj);
}

export function itemListJsonLd(items: Array<{ name: string; url: string }>, inLanguage?: string): string {
  return jsonLdScript({
    '@context': 'https://schema.org', '@type': 'ItemList',
    ...(inLanguage ? { inLanguage } : {}),
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, url: it.url,
    })),
  });
}

export function articleJsonLd(input: {
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
  return jsonLdScript(obj);
}

/** `BreadcrumbList` JSON-LD from an ordered list of (name, url) crumbs. */
export function breadcrumbJsonLd(crumbs: Array<{ name: string; url: string }>): string {
  return jsonLdScript({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url,
    })),
  });
}

export function faqJsonLd(faqs: Array<{ question: string; answer: string }>): string {
  return jsonLdScript({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  });
}
