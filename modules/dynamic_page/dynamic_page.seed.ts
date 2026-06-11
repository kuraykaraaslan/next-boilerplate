import 'reflect-metadata';
import type { FindOptionsWhere } from 'typeorm';
import type { SeedContext } from '@/modules/seed/seed.context';
import { DynamicPage } from './entities/dynamic_page.entity';
import { DynamicPageBlock } from './entities/dynamic_page_block.entity';
import { DynamicPageTranslation } from './entities/dynamic_page_translation.entity';
import { DynamicCollection } from './entities/dynamic_collection.entity';
import { DynamicCollectionItem } from './entities/dynamic_collection_item.entity';

/**
 * Demo-data seed for the `dynamic_page` module (CMS-style page builder).
 *
 * Follows the house rules from `modules/store/store.seed.ts`:
 *  - Everything goes through `ctx.foc(repo, where, create)` keyed on the
 *    entity's @Unique natural key so re-runs reuse rows instead of duplicating.
 *  - Only *valid* enum values: DynamicPageStatus is DRAFT / PUBLISHED / ARCHIVED.
 *  - jsonb columns (`sections`, `metadata`, `schema`, `defaultProps`, …) are
 *    real objects/arrays shaped like the zod schemas in `dynamic_page.types.ts`.
 *  - All three entities carry a `tenantId` column → tenant-scoped `ctx.repo`.
 *  - 2–3 varied rows per entity exercising different statuses, blocks and langs.
 */
export async function seedDynamicPage(ctx: SeedContext): Promise<void> {
  const { tenantId, foc, refs } = ctx;

  // ── Block library (reusable block definitions shown in the page editor) ─────
  // Unique key is (tenantId, type). Mix system + tenant blocks and categories.
  type BlockDef = {
    type: string;
    label: string;
    category: string;
    description?: string;
    schema: object;
    defaultProps: object;
    template: string;
    script?: string;
    isSystem: boolean;
  };
  const blockDefs: BlockDef[] = [
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
  const blocks: Record<string, DynamicPageBlock> = {};
  for (const def of blockDefs) {
    blocks[def.type] = await foc(ctx.repo<DynamicPageBlock>(DynamicPageBlock),
      { tenantId, type: def.type } as FindOptionsWhere<DynamicPageBlock>,
      { tenantId, ...def },
    );
  }

  // ── Pages (published home / published about / draft landing) ────────────────
  // Unique key is (tenantId, slug). `sections` follow BlockDataSchema shape:
  //   { id, type, order, props, hidden?, label?, className? }
  type SectionDef = {
    id: string;
    type: string;
    order: number;
    props: Record<string, unknown>;
    hidden?: boolean;
    label?: string;
    className?: string;
  };

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

  const home = await foc(ctx.repo<DynamicPage>(DynamicPage),
    { tenantId, slug: 'home' } as FindOptionsWhere<DynamicPage>,
    {
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
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  );

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

  const about = await foc(ctx.repo<DynamicPage>(DynamicPage),
    { tenantId, slug: 'about' } as FindOptionsWhere<DynamicPage>,
    {
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
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  );

  // A nested-slug draft page (no metadata, ARCHIVED-adjacent draft) to vary status.
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

  const promo = await foc(ctx.repo<DynamicPage>(DynamicPage),
    { tenantId, slug: 'campaigns/summer-sale' } as FindOptionsWhere<DynamicPage>,
    {
      tenantId,
      slug: 'campaigns/summer-sale',
      title: 'Summer Sale',
      description: 'Draft landing page for the upcoming summer campaign.',
      keywords: ['sale', 'promo', 'summer'],
      sections: promoSections,
      status: 'DRAFT',
      schemaVersion: 2,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  );

  // An archived legacy page (third status value) keyed on its own slug.
  await foc(ctx.repo<DynamicPage>(DynamicPage),
    { tenantId, slug: 'legacy-terms' } as FindOptionsWhere<DynamicPage>,
    {
      tenantId,
      slug: 'legacy-terms',
      title: 'Legacy Terms (Archived)',
      description: 'Superseded terms page kept for reference.',
      keywords: ['terms', 'legacy'],
      sections: [
        {
          id: 'legacy-body',
          type: 'rich-text',
          order: 0,
          props: { html: '<p>These terms have been superseded. See the current Terms page.</p>' },
        },
      ] as SectionDef[],
      status: 'ARCHIVED',
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    },
  );

  // ── Translations (per-page localized content) ───────────────────────────────
  // Unique key is (dynamicPageId, lang). Translate home (tr) and about (de).
  const homeTrSections: SectionDef[] = [
    {
      id: 'home-hero',
      type: 'hero',
      order: 0,
      props: {
        heading: 'Boilerplate ile daha hızlı geliştirin',
        subheading: 'Her şeyi içeren çok kiracılı bir Next.js başlangıç kiti.',
        ctaLabel: 'Başla',
        ctaHref: '/auth/register',
        background: 'https://picsum.photos/seed/home-hero/1600/600',
      },
    },
    {
      id: 'home-intro',
      type: 'rich-text',
      order: 1,
      className: 'container',
      props: {
        html: '<h2>Neden bizi seçmelisiniz</h2><p>Altyapıyla değil, ürünle ilgilenin. Kiracılık, faturalandırma ve kimlik doğrulama hazır.</p>',
      },
    },
  ];

  const translationDefs: Array<{ page: DynamicPage; lang: string; title: string; description?: string; sections: SectionDef[] }> = [
    {
      page: home,
      lang: 'tr',
      title: 'Ana Sayfa',
      description: 'Demo kiracı vitrini için açılış sayfası.',
      sections: homeTrSections,
    },
    {
      page: home,
      lang: 'de',
      title: 'Startseite',
      description: 'Die Landingpage für den Demo-Mandanten.',
      sections: [
        {
          id: 'home-hero',
          type: 'hero',
          order: 0,
          props: {
            heading: 'Schneller entwickeln mit unserem Boilerplate',
            subheading: 'Ein mandantenfähiges Next.js-Starterkit mit allem Drum und Dran.',
            ctaLabel: 'Loslegen',
            ctaHref: '/auth/register',
          },
        },
      ],
    },
    {
      page: about,
      lang: 'tr',
      title: 'Hakkımızda',
      description: 'Biz kimiz ve neye inanıyoruz.',
      sections: [
        {
          id: 'about-title',
          type: 'rich-text',
          order: 0,
          props: { html: '<h1>Hakkımızda</h1><p>Yolunuzdan çekilen araçlar geliştiren küçük bir ekibiz.</p>' },
        },
      ],
    },
  ];

  for (const def of translationDefs) {
    await foc(ctx.repo<DynamicPageTranslation>(DynamicPageTranslation),
      { tenantId, dynamicPageId: def.page.dynamicPageId, lang: def.lang } as FindOptionsWhere<DynamicPageTranslation>,
      {
        tenantId,
        dynamicPageId: def.page.dynamicPageId,
        lang: def.lang,
        title: def.title,
        description: def.description,
        sections: def.sections,
      },
    );
  }

  // ── Collections (Wix-style CMS data tables) ────────────────────────────────

  const postsCollection = await foc(ctx.repo<DynamicCollection>(DynamicCollection),
    { tenantId, slug: 'posts' } as FindOptionsWhere<DynamicCollection>,
    {
      tenantId,
      slug: 'posts',
      label: 'Blog Posts',
      description: 'Articles displayed by the Blog List block.',
      fields: [
        { name: 'title', type: 'text', label: 'Title', required: true },
        { name: 'excerpt', type: 'text', label: 'Excerpt', required: false },
        { name: 'coverImage', type: 'image', label: 'Cover Image', required: false },
        { name: 'publishedAt', type: 'date', label: 'Published At', required: false },
        { name: 'author', type: 'text', label: 'Author', required: false },
      ],
      isSystem: false,
    },
  );

  const leadsCollection = await foc(ctx.repo<DynamicCollection>(DynamicCollection),
    { tenantId, slug: 'leads' } as FindOptionsWhere<DynamicCollection>,
    {
      tenantId,
      slug: 'leads',
      label: 'Lead Form Submissions',
      description: 'Contact form submissions collected by the Lead Form block.',
      fields: [
        { name: 'name', type: 'text', label: 'Full Name', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'phone', type: 'text', label: 'Phone', required: false },
        { name: 'message', type: 'richtext', label: 'Message', required: false },
      ],
      isSystem: false,
    },
  );

  // Sample posts — only seed if the collection has no items yet (idempotent)
  const itemRepo = ctx.repo<DynamicCollectionItem>(DynamicCollectionItem);
  const existingCount = await itemRepo.count({ where: { tenantId, collectionId: postsCollection.collectionId } });
  if (existingCount === 0) {
    for (const post of [
      { title: 'Getting Started with Next.js', excerpt: 'A beginner guide to Next.js App Router.', author: 'Alice', publishedAt: '2026-03-01' },
      { title: 'Multi-Tenant Architecture Explained', excerpt: 'How to isolate tenant data with TypeORM.', author: 'Bob', publishedAt: '2026-04-15' },
      { title: 'Scaling with Redis and BullMQ', excerpt: 'Background jobs and caching patterns.', author: 'Alice', publishedAt: '2026-05-10' },
    ]) {
      await itemRepo.save(itemRepo.create({ tenantId, collectionId: postsCollection.collectionId, data: post }));
    }
  }

  // ── Data-driven block definitions ────────────────────────────────────────────

  // Blog List block: fetches posts collection via its server handler
  await foc(ctx.repo<DynamicPageBlock>(DynamicPageBlock),
    { tenantId, type: 'blog-list' } as FindOptionsWhere<DynamicPageBlock>,
    {
      tenantId,
      type: 'blog-list',
      label: 'Blog List',
      category: 'Content',
      description: 'Renders paginated posts from the "posts" collection.',
      schema: {
        properties: {
          limit: { type: 'number', title: 'Posts per page' },
          heading: { type: 'string', title: 'Section heading' },
        },
      },
      defaultProps: { limit: 6, heading: 'Latest Posts' },
      template: '<section class="blog-list"><h2>{{heading}}</h2><div id="blog-list-{{blockId}}"><p>Loading...</p></div></section>',
      script: [
        '(function() {',
        '  var ctx = window.__blockCtx && window.__blockCtx["blog-list"];',
        '  if (!ctx) return;',
        '  var container = document.getElementById("blog-list-{{blockId}}");',
        '  if (!container) return;',
        '  ctx.fetch("?limit={{limit}}")',
        '    .then(function(r) { return r.json(); })',
        '    .then(function(res) {',
        '      var items = (res.items || []);',
        '      container.innerHTML = items.map(function(i) {',
        '        return "<article><h3>" + (i.data.title || "") + "</h3><p>" + (i.data.excerpt || "") + "</p></article>";',
        '      }).join("") || "<p>No posts yet.</p>";',
        '    })',
        '    .catch(function() { container.innerHTML = "<p>Failed to load posts.</p>"; });',
        '})();',
      ].join('\n'),
      serverHandler: [
        'async function handler({ method, query, db, respond }) {',
        '  if (method !== "GET") return respond({ message: "Method not allowed" }, 405);',
        '  const limit = parseInt(query.limit || "6", 10);',
        '  const page = parseInt(query.page || "0", 10);',
        '  const result = await db.collection("posts").find({ limit, page, sort: "-createdAt" });',
        '  return respond(result);',
        '}',
      ].join('\n'),
      allowedCollections: ['posts'],
      isSystem: false,
    },
  );

  // Lead Form block: saves submissions to the "leads" collection via its server handler
  await foc(ctx.repo<DynamicPageBlock>(DynamicPageBlock),
    { tenantId, type: 'lead-form' } as FindOptionsWhere<DynamicPageBlock>,
    {
      tenantId,
      type: 'lead-form',
      label: 'Lead Form',
      category: 'Marketing',
      description: 'Contact form that saves submissions to the "leads" collection.',
      schema: {
        properties: {
          heading: { type: 'string', title: 'Form heading' },
          submitLabel: { type: 'string', title: 'Submit button label' },
        },
      },
      defaultProps: { heading: 'Get in touch', submitLabel: 'Send message' },
      template: [
        '<section class="lead-form">',
        '  <h2>{{heading}}</h2>',
        '  <form id="lead-form-{{blockId}}">',
        '    <input name="name" placeholder="Full name" required />',
        '    <input name="email" type="email" placeholder="Email" required />',
        '    <input name="phone" placeholder="Phone (optional)" />',
        '    <textarea name="message" placeholder="Message"></textarea>',
        '    <button type="submit">{{submitLabel}}</button>',
        '    <p class="lead-form-status"></p>',
        '  </form>',
        '</section>',
      ].join('\n'),
      script: [
        '(function() {',
        '  var ctx = window.__blockCtx && window.__blockCtx["lead-form"];',
        '  if (!ctx) return;',
        '  var form = document.getElementById("lead-form-{{blockId}}");',
        '  if (!form) return;',
        '  form.addEventListener("submit", function(e) {',
        '    e.preventDefault();',
        '    var data = Object.fromEntries(new FormData(form));',
        '    ctx.fetch("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: data }) })',
        '      .then(function(r) { return r.json(); })',
        '      .then(function() {',
        '        form.querySelector(".lead-form-status").textContent = "Thank you! We will be in touch.";',
        '        form.reset();',
        '      })',
        '      .catch(function() {',
        '        form.querySelector(".lead-form-status").textContent = "Something went wrong. Please try again.";',
        '      });',
        '  });',
        '})();',
      ].join('\n'),
      serverHandler: [
        'async function handler({ method, body, db, respond }) {',
        '  if (method !== "POST") return respond({ message: "Method not allowed" }, 405);',
        '  if (!body || !body.data) return respond({ message: "Missing data" }, 400);',
        '  var data = body.data;',
        '  if (!data.name || !data.email) return respond({ message: "name and email are required" }, 400);',
        '  var item = await db.collection("leads").create({ name: data.name, email: data.email, phone: data.phone || null, message: data.message || null });',
        '  return respond({ item }, 201);',
        '}',
      ].join('\n'),
      allowedCollections: ['leads'],
      isSystem: false,
    },
  );

  // ── Publish references other modules may consume ────────────────────────────
  refs.dynamicPageId = home.dynamicPageId;
  refs.dynamicPageBlockId = blocks['hero']?.blockId;
  refs.dynamicCollectionId = postsCollection.collectionId;

  ctx.log(
    `dynamic_page: 5 blocks, 4 pages, 3 translations, 2 collections (posts/${postsCollection.collectionId}, leads/${leadsCollection.collectionId}), 3 sample posts for ${tenantId}`,
  );

  // touch unused bindings
  void promo;
  void leadsCollection;
}
