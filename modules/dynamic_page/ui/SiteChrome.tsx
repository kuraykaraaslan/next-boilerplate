import type { ReactNode } from 'react'
import DynamicPageService from '@nb/dynamic_page/server/dynamic_page.service'
import ClientBlockList from './dynamic/partials/ClientBlockList'
import { migrateSections } from './dynamic/migrations'
import type { BlockData, DynamicPageBlockRecord } from './dynamic/types'
import type { DynamicPageRecord } from '@nb/dynamic_page/server/dynamic_page.types'

interface Props {
  tenantId: string
  lang?: string
  children: ReactNode
}

async function loadChromePart(
  tenantId: string,
  slug: '__nav' | '__footer',
  lang?: string,
): Promise<{ sections: BlockData[]; schemaVersion: number } | null> {
  let page: DynamicPageRecord
  try {
    page = await DynamicPageService.getPageBySlug(tenantId, slug)
  } catch {
    return null
  }
  if (page.status !== 'PUBLISHED') return null

  let sections = page.sections as BlockData[]
  if (lang && lang !== 'en') {
    try {
      const translations = await DynamicPageService.getTranslations(tenantId, page.dynamicPageId)
      const tr = translations.find((t) => t.lang === lang)
      if (tr?.sections) sections = tr.sections as BlockData[]
    } catch {
      /* fallback to default sections */
    }
  }
  return { sections, schemaVersion: page.schemaVersion }
}

export default async function SiteChrome({ tenantId, lang, children }: Props) {
  const [nav, footer, dbDefs] = await Promise.all([
    loadChromePart(tenantId, '__nav', lang),
    loadChromePart(tenantId, '__footer', lang),
    DynamicPageService.listBlocks(tenantId).catch((): DynamicPageBlockRecord[] => []),
  ])

  const navMigrated = nav ? migrateSections(nav.sections, nav.schemaVersion ?? 1).sections : null
  const footerMigrated = footer ? migrateSections(footer.sections, footer.schemaVersion ?? 1).sections : null

  return (
    <>
      {navMigrated && <ClientBlockList sections={navMigrated} dbDefs={dbDefs} />}
      {children}
      {footerMigrated && <ClientBlockList sections={footerMigrated} dbDefs={dbDefs} />}
    </>
  )
}
