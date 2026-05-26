import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import DynamicPageService from '@/modules/dynamic_page/dynamic_page.service'
import DynamicPageRenderer from '@/modules_next/dynamic_page/DynamicPageRenderer'
import type { BlockData } from '@/modules_next/dynamic_page/dynamic/types'

interface Params { tenantId: string }
interface Props { params: Promise<Params>; searchParams: Promise<{ lang?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tenantId } = await params
  const { lang } = await searchParams
  try {
    const page = await DynamicPageService.getPageBySlug(tenantId, '')
    if (page.status !== 'PUBLISHED') return {}

    let title = page.title
    let description: string | undefined = page.description ?? undefined
    if (lang && lang !== 'en') {
      const translations = await DynamicPageService.getTranslations(tenantId, page.dynamicPageId)
      const tr = translations.find((t) => t.lang === lang)
      if (tr?.title) title = tr.title
      if (tr?.description) description = tr.description
    }

    const meta = page.metadata as Record<string, string> | undefined
    return {
      title: meta?.ogTitle || title,
      description: meta?.ogDescription || description,
      keywords: page.keywords,
      openGraph: {
        title: meta?.ogTitle || title,
        description: meta?.ogDescription || description,
        images: meta?.ogImage ? [{ url: meta.ogImage }] : undefined,
      },
      twitter: {
        card: (meta?.twitterCard as 'summary_large_image' | undefined) ?? 'summary_large_image',
        title: meta?.twitterTitle || title,
        description: meta?.twitterDescription || description,
      },
      robots: meta?.robots || undefined,
      alternates: meta?.canonical ? { canonical: meta.canonical } : undefined,
    }
  } catch {
    return {}
  }
}

export default async function TenantHomePage({ params, searchParams }: Props) {
  const { tenantId } = await params
  const { lang } = await searchParams

  let page
  try {
    page = await DynamicPageService.getPageBySlug(tenantId, '')
  } catch {
    notFound()
  }

  if (page.status !== 'PUBLISHED') notFound()

  const now = new Date()
  const sd = (page.metadata as Record<string, string> | undefined)?.startDate
  const ed = (page.metadata as Record<string, string> | undefined)?.endDate
  if (sd && new Date(sd) > now) notFound()
  if (ed && new Date(ed) < now) notFound()

  let translationSections: BlockData[] | undefined
  if (lang && lang !== 'en') {
    try {
      const translations = await DynamicPageService.getTranslations(tenantId, page.dynamicPageId)
      const tr = translations.find((t) => t.lang === lang)
      if (tr?.sections) translationSections = tr.sections as BlockData[]
    } catch { /* fallback to EN */ }
  }

  return (
    <DynamicPageRenderer
      tenantId={tenantId}
      sections={page.sections as BlockData[]}
      schemaVersion={page.schemaVersion}
      lang={lang}
      translationSections={translationSections}
    />
  )
}
