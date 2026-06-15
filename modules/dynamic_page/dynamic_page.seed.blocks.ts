import type { BlockDef } from './dynamic_page.seed.types';

// ── Block library (reusable block definitions shown in the page editor) ─────
// Unique key is (tenantId, type). Mix system + tenant blocks and categories.
export const baseBlockDefs: BlockDef[] = [
  {
    type: 'hero',
    label: 'Hero Banner',
    category: 'Layout',
    description: 'Full-width hero with headline, subtitle and a call-to-action button.',
    schema: {
      properties: {
        heading: { type: 'string', title: 'Heading' },
        subheading: { type: 'string', title: 'Subheading' },
        ctaLabel: { type: 'string', title: 'Button label' },
        ctaHref: { type: 'string', title: 'Button link' },
        background: { type: 'string', title: 'Background image URL' },
      },
      required: ['heading'],
    },
    defaultProps: {
      heading: 'Welcome to our store',
      subheading: 'Everything you need, all in one place.',
      ctaLabel: 'Shop now',
      ctaHref: '/products',
      background: 'https://picsum.photos/seed/hero/1600/600',
    },
    template:
      '<section class="hero" style="background-image:url({{background}})"><h1>{{heading}}</h1><p>{{subheading}}</p><a href="{{ctaHref}}">{{ctaLabel}}</a></section>',
    isSystem: true,
  },
  {
    type: 'rich-text',
    label: 'Rich Text',
    category: 'Content',
    description: 'A block of formatted prose rendered from HTML.',
    schema: {
      properties: {
        html: { type: 'string', title: 'HTML content', format: 'richtext' },
      },
      required: ['html'],
    },
    defaultProps: {
      html: '<p>Edit me — this is a rich-text block.</p>',
    },
    template: '<div class="prose">{{{html}}}</div>',
    isSystem: true,
  },
  {
    type: 'cta-banner',
    label: 'Call To Action',
    category: 'Marketing',
    description: 'A compact promotional banner with a single action button.',
    schema: {
      properties: {
        text: { type: 'string', title: 'Text' },
        buttonLabel: { type: 'string', title: 'Button label' },
        buttonHref: { type: 'string', title: 'Button link' },
        variant: { type: 'string', enum: ['primary', 'secondary', 'ghost'], title: 'Style' },
      },
      required: ['text', 'buttonLabel'],
    },
    defaultProps: {
      text: 'Ready to get started?',
      buttonLabel: 'Sign up',
      buttonHref: '/auth/register',
      variant: 'primary',
    },
    template:
      '<div class="cta cta--{{variant}}"><span>{{text}}</span><a href="{{buttonHref}}">{{buttonLabel}}</a></div>',
    script: 'document.querySelectorAll(".cta a").forEach((el) => el.addEventListener("click", () => window.dataLayer?.push({ event: "cta_click" })));',
    isSystem: false,
  },
];
