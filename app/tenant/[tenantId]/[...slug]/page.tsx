import type { Metadata } from 'next'
import PublicDynamicPage, { buildPublicPageMetadata } from '@/modules_next/dynamic_page/PublicDynamicPage'

interface Params { tenantId: string; slug: string[] }
interface Props { params: Promise<Params>; searchParams: Promise<{ lang?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tenantId, slug } = await params
  const { lang } = await searchParams
  return buildPublicPageMetadata({ tenantId, slugSegments: slug, lang })
}

export default async function Page({ params, searchParams }: Props) {
  const { tenantId, slug } = await params
  const { lang } = await searchParams
  return <PublicDynamicPage tenantId={tenantId} slugSegments={slug} lang={lang} />
}
