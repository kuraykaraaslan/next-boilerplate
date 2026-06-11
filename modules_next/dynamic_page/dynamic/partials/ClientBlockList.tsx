'use client'

import { Suspense } from 'react'
import type { BlockData, DynamicPageBlockRecord } from '../types'
import { getCodeBlock } from '../utils/BlockRegistry'
import { BlockRenderErrorBoundary } from './BlockErrorBoundary'
import TemplateBlockRenderer from './TemplateBlockRenderer'
import BlockSkeleton from './BlockSkeleton'

interface Props {
  sections: BlockData[]
  dbDefs: DynamicPageBlockRecord[]
  tenantId?: string
}

function ClientBlock({ block, dbDefs, tenantId }: { block: BlockData; dbDefs: DynamicPageBlockRecord[]; tenantId?: string }) {
  const codeDef = getCodeBlock(block.type)
  if (codeDef) {
    const { Component } = codeDef
    return (
      <BlockRenderErrorBoundary blockType={block.type}>
        <Component {...block.props} __blockId={block.id} />
      </BlockRenderErrorBoundary>
    )
  }
  const dbDef = dbDefs.find((d) => d.type === block.type)
  if (!dbDef) return null
  return (
    <BlockRenderErrorBoundary blockType={block.type}>
      <TemplateBlockRenderer
        template={dbDef.template}
        props={block.props}
        script={dbDef.script ?? undefined}
        blockType={block.type}
        tenantId={tenantId}
      />
    </BlockRenderErrorBoundary>
  )
}

export default function ClientBlockList({ sections, dbDefs, tenantId }: Props) {
  const sorted = [...sections]
    .sort((a, b) => a.order - b.order)
    .filter((block) => block.hidden !== true)

  return (
    <div className="bg-[var(--surface-base)]">
      {sorted.map((block) =>
        block.type === 'popup-modal' ? (
          <ClientBlock key={block.id} block={block} dbDefs={dbDefs} tenantId={tenantId} />
        ) : (
          <div key={block.id} className={block.className} data-block-type={block.type}>
            <Suspense fallback={<BlockSkeleton height={300} />}>
              <ClientBlock block={block} dbDefs={dbDefs} tenantId={tenantId} />
            </Suspense>
          </div>
        )
      )}
    </div>
  )
}
