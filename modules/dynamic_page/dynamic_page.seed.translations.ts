import type { SectionDef } from './dynamic_page.seed.types';
import type { DynamicPage } from './entities/dynamic_page.entity';

// ── Translations (per-page localized content) ───────────────────────────────
// Unique key is (dynamicPageId, lang). Translate home (tr + de) and about (tr).

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

export interface TranslationSeedRow {
  dynamicPageId: string;
  lang: string;
  title: string;
  description?: string;
  sections: SectionDef[];
}

/** Build per-page translation seed rows, keyed on the persisted page ids. */
export function buildTranslationSeedRows(home: DynamicPage, about: DynamicPage): TranslationSeedRow[] {
  return [
    {
      dynamicPageId: home.dynamicPageId,
      lang: 'tr',
      title: 'Ana Sayfa',
      description: 'Demo kiracı vitrini için açılış sayfası.',
      sections: homeTrSections,
    },
    {
      dynamicPageId: home.dynamicPageId,
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
      dynamicPageId: about.dynamicPageId,
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
}
