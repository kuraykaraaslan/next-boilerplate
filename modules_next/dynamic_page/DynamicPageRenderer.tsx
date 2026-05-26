import type { BlockData, DynamicPageBlockRecord } from './dynamic/types'
import ClientBlockList from './dynamic/partials/ClientBlockList'
import DynamicPageService from '@/modules/dynamic_page/dynamic_page.service'
import { migrateSections } from './dynamic/migrations'

interface Props {
  tenantId: string
  sections: BlockData[]
  schemaVersion?: number
  lang?: string
  translationSections?: BlockData[]
}

export default async function DynamicPageRenderer({ tenantId, sections, schemaVersion, lang, translationSections }: Props) {
  // Fetch DB-defined block templates
  let dbDefs: DynamicPageBlockRecord[] = []
  try {
    dbDefs = await DynamicPageService.listBlocks(tenantId)
  } catch { /* render without DB blocks */ }

  // Apply translation sections if a non-EN language is requested
  const rawSections = lang && lang !== 'en' && translationSections?.length
    ? translationSections
    : sections

  const { sections: migratedSections } = migrateSections(rawSections, schemaVersion ?? 1)

  return <ClientBlockList sections={migratedSections} dbDefs={dbDefs} />
}
