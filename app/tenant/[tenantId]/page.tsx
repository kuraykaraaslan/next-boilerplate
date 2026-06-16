import type { Metadata } from 'next'
import PublicDynamicPage, { buildPublicPageMetadata } from '@nb/dynamic_page/ui/PublicDynamicPage'

interface Params { tenantId: string }
interface Props { params: Promise<Params>; searchParams: Promise<{ lang?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tenantId } = await params
  const { lang } = await searchParams
  return buildPublicPageMetadata({ tenantId, slugSegments: [], lang })
}

export default async function Page({ params, searchParams }: Props) {
  const { tenantId } = await params
  const { lang } = await searchParams
  return <PublicDynamicPage tenantId={tenantId} slugSegments={[]} lang={lang} />
}
