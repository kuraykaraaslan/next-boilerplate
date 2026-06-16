import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import DynamicPageService from '@nb/dynamic_page/server/dynamic_page.service'
import { SeoService } from '@nb/seo/server'
import DynamicPageRenderer from './dynamic-page-renderer.component'
import SiteChrome from './site-chrome.component'
import TenantWelcome from './tenant-welcome.component'
import type { BlockData } from './dynamic/types'
import type { DynamicPageRecord } from '@nb/dynamic_page/server/dynamic_page.types'
import { resolvePageLayout } from '@nb/dynamic_page/server/dynamic_page.types'

export const MAX_SLUG_DEPTH = 4

interface PublicPageInput {
  tenantId: string
  slugSegments?: string[]
  lang?: string
}

function isReservedPath(segments: string[] | undefined): boolean {
  return (segments ?? []).some((seg) => seg.startsWith('__'))
}

function joinSlug(segments: string[] | undefined): string {
  return (segments ?? []).join('/')
}

// React `cache()` dedupes these within a single request render pass:
// generateMetadata() and the page component both resolve the same slug +
// translations, so without this they'd each hit the service (and Redis) twice.
const loadPage = cache(async (tenantId: string, slugPath: string): Promise<DynamicPageRecord | null> => {
  try {
    return await DynamicPageService.getPageBySlug(tenantId, slugPath)
  } catch {
    return null
  }
})

const loadTranslations = cache((tenantId: string, pageId: string) =>
  DynamicPageService.getTranslations(tenantId, pageId),
)

async function resolveTranslation(
  page: DynamicPageRecord,
  tenantId: string,
  lang?: string,
): Promise<{ title: string; description?: string; sections?: BlockData[] }> {
  const base = { title: page.title, description: page.description ?? undefined }
  if (!lang || lang === 'en') return base
  try {
    const translations = await loadTranslations(tenantId, page.dynamicPageId)
    const tr = translations.find((t) => t.lang === lang)
    return {
      title: tr?.title ?? page.title,
      description: tr?.description ?? page.description ?? undefined,
      sections: tr?.sections as BlockData[] | undefined,
    }
  } catch {
    return base
  }
}

export async function buildPublicPageMetadata({ tenantId, slugSegments, lang }: PublicPageInput): Promise<Metadata> {
  if (isReservedPath(slugSegments) || (slugSegments?.length ?? 0) > MAX_SLUG_DEPTH) return {}

  const page = await loadPage(tenantId, joinSlug(slugSegments))
  if (!page || page.status !== 'PUBLISHED') return {}

  const tr = await resolveTranslation(page, tenantId, lang)
  const seo = await SeoService.get(tenantId, 'dynamic_page', page.dynamicPageId).catch(() => null)

  const metaTitle = seo?.title || tr.title
  const metaDescription = seo?.description || tr.description

  return {
    title: seo?.ogTitle || metaTitle,
    description: seo?.ogDescription || metaDescription,
    keywords: (seo?.keywords?.length ? seo.keywords : page.keywords),
    openGraph: {
      title: seo?.ogTitle || metaTitle,
      description: seo?.ogDescription || metaDescription,
      images: seo?.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
    },
    twitter: {
      card: (seo?.twitterCard as 'summary_large_image' | undefined) ?? 'summary_large_image',
      title: seo?.twitterTitle || metaTitle,
      description: seo?.twitterDescription || metaDescription,
    },
    robots: seo?.noIndex ? 'noindex' : undefined,
    alternates: seo?.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
  }
}

export default async function PublicDynamicPage({ tenantId, slugSegments, lang }: PublicPageInput) {
  if (isReservedPath(slugSegments) || (slugSegments?.length ?? 0) > MAX_SLUG_DEPTH) notFound()

  const page = await loadPage(tenantId, joinSlug(slugSegments))
  if (!page || page.status !== 'PUBLISHED') {
    // The tenant root ("/") must NEVER 404 — when no published page is set as
    // the home, fall back to the welcome hero (still wrapped in nav/footer
    // chrome if the tenant has configured one). Deeper unmatched paths 404.
    if ((slugSegments?.length ?? 0) === 0) {
      return (
        <SiteChrome tenantId={tenantId} lang={lang} layout={null}>
          <TenantWelcome tenantId={tenantId} />
        </SiteChrome>
      )
    }
    notFound()
  }

  const now = new Date()
  const meta = (page.metadata ?? {}) as Record<string, string>
  if (meta.startDate && new Date(meta.startDate) > now) notFound()
  if (meta.endDate && new Date(meta.endDate) < now) notFound()

  const tr = await resolveTranslation(page, tenantId, lang)

  return (
    <SiteChrome tenantId={tenantId} lang={lang} layout={resolvePageLayout(page.metadata)}>
      <DynamicPageRenderer
        tenantId={tenantId}
        sections={page.sections as BlockData[]}
        schemaVersion={page.schemaVersion}
        lang={lang}
        translationSections={tr.sections}
      />
    </SiteChrome>
  )
}
