import type { Metadata } from 'next'
import PublicDynamicPage, { buildPublicPageMetadata } from '@nb/dynamic_page/ui/public-dynamic-page.component'
import { moduleRegistry } from '@nb/common/server/module-registry'
import { DynamicAdminPage } from '@nb/common/ui/dynamic-admin-page.component'

interface Params { tenantId: string; slug: string[] }
interface Props { params: Promise<Params>; searchParams: Promise<{ lang?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { tenantId, slug } = await params
  const { lang } = await searchParams
  const match = moduleRegistry.findPageRoute('/' + slug.join('/'))
  if (match) {
    const name = moduleRegistry.getModule(match.route.moduleId)?.name
    return { title: name ?? 'Page' }
  }
  return buildPublicPageMetadata({ tenantId, slugSegments: slug, lang })
}

// Public tenant catch-all: first resolve a module-owned public page (declared in
// module.json `routes`, e.g. /api-docs); otherwise fall back to rendering a CMS
// dynamic page for the slug.
export default async function Page({ params, searchParams }: Props) {
  const { tenantId, slug } = await params
  const { lang } = await searchParams
  const match = moduleRegistry.findPageRoute('/' + slug.join('/'))
  if (match) {
    return (
      <DynamicAdminPage
        componentId={match.route.componentId}
        tenantId={tenantId}
        params={match.params}
        slug={slug}
      />
    )
  }
  return <PublicDynamicPage tenantId={tenantId} slugSegments={slug} lang={lang} />
}
