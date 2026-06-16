import type { SectionDef } from './dynamic_page.seed.types';

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Pages (published home / published about / draft landing / archived) ─────
// Unique key is (tenantId, slug). `sections` follow BlockDataSchema shape:
//   { id, type, order, props, hidden?, label?, className? }

const homeSections: SectionDef[] = [
  {
    id: 'home-hero',
    type: 'hero',
    order: 0,
    label: 'Hero',
    props: {
      heading: 'Build faster with our boilerplate',
      subheading: 'A multi-tenant Next.js starter with batteries included.',
      ctaLabel: 'Get started',
      ctaHref: '/auth/register',
      background: 'https://picsum.photos/seed/home-hero/1600/600',
    },
  },
  {
    id: 'home-intro',
    type: 'rich-text',
    order: 1,
    label: 'Intro',
    className: 'container',
    props: {
      html: '<h2>Why teams choose us</h2><p>Ship products, not plumbing. Tenancy, billing and auth are already wired.</p>',
    },
  },
  {
    id: 'home-cta',
    type: 'cta-banner',
    order: 2,
    props: {
      text: 'Start your free trial today',
      buttonLabel: 'Create account',
      buttonHref: '/auth/register',
      variant: 'primary',
    },
  },
];

const aboutSections: SectionDef[] = [
  {
    id: 'about-title',
    type: 'rich-text',
    order: 0,
    label: 'About copy',
    props: {
      html: '<h1>About us</h1><p>We are a small team building tools that get out of your way.</p>',
    },
  },
  {
    id: 'about-hidden-draft',
    type: 'cta-banner',
    order: 1,
    hidden: true,
    label: 'Hidden CTA (work in progress)',
    props: {
      text: 'Join the team',
      buttonLabel: 'See open roles',
      buttonHref: '/careers',
      variant: 'ghost',
    },
  },
];

const promoSections: SectionDef[] = [
  {
    id: 'promo-hero',
    type: 'hero',
    order: 0,
    props: {
      heading: 'Summer sale — up to 40% off',
      subheading: 'Limited time only.',
      ctaLabel: 'Shop the sale',
      ctaHref: '/products?on_sale=1',
      background: 'https://picsum.photos/seed/promo/1600/600',
    },
  },
];

const legacySections: SectionDef[] = [
  {
    id: 'legacy-body',
    type: 'rich-text',
    order: 0,
    props: { html: '<p>These terms have been superseded. See the current Terms page.</p>' },
  },
];

export interface PageSeedRow {
  slug: string;
  create: Record<string, unknown>;
}

/** Build the page seed payloads for a tenant (createdAt is relative to now). */
export function buildPageSeedRows(tenantId: string): PageSeedRow[] {
  return [
    {
      slug: 'home',
      create: {
        tenantId,
        slug: 'home',
        title: 'Home',
        description: 'The landing page for the demo tenant storefront.',
        keywords: ['home', 'landing', 'demo', 'boilerplate'],
        sections: homeSections,
        metadata: {
          ogTitle: 'Home — Demo Tenant',
          ogDescription: 'A multi-tenant Next.js starter with batteries included.',
          ogImage: 'https://picsum.photos/seed/home-og/1200/630',
          twitterCard: 'summary_large_image',
          canonical: 'https://demo.example.com/',
          robots: 'index,follow',
        },
        status: 'PUBLISHED',
        schemaVersion: 2,
        createdAt: new Date(Date.now() - 14 * DAY_MS),
      },
    },
    {
      slug: 'about',
      create: {
        tenantId,
        slug: 'about',
        title: 'About',
        description: 'Who we are and what we believe.',
        keywords: ['about', 'company', 'team'],
        sections: aboutSections,
        metadata: {
          ogTitle: 'About — Demo Tenant',
          robots: 'index,follow',
        },
        status: 'PUBLISHED',
        schemaVersion: 2,
        createdAt: new Date(Date.now() - 10 * DAY_MS),
      },
    },
    {
      slug: 'campaigns/summer-sale',
      create: {
        tenantId,
        slug: 'campaigns/summer-sale',
        title: 'Summer Sale',
        description: 'Draft landing page for the upcoming summer campaign.',
        keywords: ['sale', 'promo', 'summer'],
        sections: promoSections,
        status: 'DRAFT',
        schemaVersion: 2,
        createdAt: new Date(Date.now() - 2 * DAY_MS),
      },
    },
    {
      slug: 'legacy-terms',
      create: {
        tenantId,
        slug: 'legacy-terms',
        title: 'Legacy Terms (Archived)',
        description: 'Superseded terms page kept for reference.',
        keywords: ['terms', 'legacy'],
        sections: legacySections,
        status: 'ARCHIVED',
        schemaVersion: 1,
        createdAt: new Date(Date.now() - 120 * DAY_MS),
      },
    },
  ];
}
