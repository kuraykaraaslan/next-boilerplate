'use client'

import React, { useState, useEffect } from 'react'
import { useEditorStore } from './stores/editorStore'
import { PreviewContext } from '../partials/PreviewContext'
import { SortableBlock } from './partials/CanvasBlock'
import { QuickAddPopover, BlockContextMenu, InsertGap, SidebarDropTarget } from './partials/CanvasOverlays'

const PREVIEW_WIDTHS: Record<string, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
}

export default function Canvas() {
  const sections         = useEditorStore((s) => s.sections)
  const selectedId       = useEditorStore((s) => s.selectedId)
  const setSelectedId    = useEditorStore((s) => s.setSelectedId)
  const deleteBlock      = useEditorStore((s) => s.deleteBlock)
  const duplicateBlock   = useEditorStore((s) => s.duplicateBlock)
  const toggleBlockHidden = useEditorStore((s) => s.toggleBlockHidden)
  const isTranslationMode = useEditorStore((s) => s.activeLang !== 'en')
  const previewMode      = useEditorStore((s) => s.previewMode)
  const pendingDraft     = useEditorStore((s) => s.pendingDraft)
  const restoreDraft     = useEditorStore((s) => s.restoreDraft)
  const dismissDraft     = useEditorStore((s) => s.dismissDraft)

  const [quickAdd, setQuickAdd]       = useState<{ index: number; x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ blockId: string; x: number; y: number } | null>(null)

  const maxWidth = PREVIEW_WIDTHS[previewMode] ?? '100%'
  const sorted   = [...sections].sort((a, b) => a.order - b.order)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const cur = useEditorStore.getState()
        const sortedNow = [...cur.sections].sort((a, b) => a.order - b.order)
        const idx = sortedNow.findIndex((b) => b.id === selectedId)
        const nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1
        if (nextIdx >= 0 && nextIdx < sortedNow.length) {
          const nextId = sortedNow[nextIdx].id
          setSelectedId(nextId)
          requestAnimationFrame(() => {
            document.querySelector(`[data-block-id="${nextId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTranslationMode) {
        e.preventDefault()
        deleteBlock(selectedId)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedId, setSelectedId, deleteBlock, isTranslationMode])

  const draftBanner = pendingDraft ? (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-yellow-500/90 px-4 py-2 text-xs text-yellow-900 backdrop-blur-sm">
      <span>
        Unsaved draft from{' '}
        <span className="font-semibold">{new Date(pendingDraft.savedAt).toLocaleTimeString()}</span>
        {pendingDraft.title ? ` — "${pendingDraft.title}"` : ''}
      </span>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={restoreDraft} className="font-semibold underline underline-offset-2">Restore</button>
        <button onClick={dismissDraft} className="opacity-70 hover:opacity-100 transition-opacity">Dismiss</button>
      </div>
    </div>
  ) : null

  if (sections.length === 0) {
    return (
      <>
        {draftBanner}
        <SidebarDropTarget>
          <div className="flex flex-col items-center justify-center py-40 gap-3">
            <div className="text-4xl opacity-20">+</div>
            <p className="text-sm text-[var(--text-primary)]/30">Add blocks from the left panel to build your page.</p>
          </div>
        </SidebarDropTarget>
      </>
    )
  }

  const isConstrained = previewMode !== 'desktop'

  return (
    <>
      {draftBanner}
      <PreviewContext.Provider value={previewMode}>
        <div className={`transition-colors duration-300 ${isConstrained ? 'min-h-full bg-[var(--surface-overlay)]/70 py-6' : ''}`}>
          <div
            className={`transition-all duration-300 ${isConstrained ? 'mx-auto shadow-2xl ring-1 ring-[var(--text-primary)]/10 bg-[var(--surface-base)]' : ''}`}
            style={{ maxWidth, width: '100%' }}
          >
            <InsertGap index={0} onQuickAdd={(idx, x, y) => setQuickAdd({ index: idx, x, y })} />
            {sorted.map((block, i) => (
              <React.Fragment key={block.id}>
                <SortableBlock
                  block={block}
                  isSelected={selectedId === block.id}
                  onSelect={() => setSelectedId(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onToggleHidden={() => toggleBlockHidden(block.id)}
                  onContextMenu={(e, id) => setContextMenu({ blockId: id, x: e.clientX, y: e.clientY })}
                  isTranslationMode={isTranslationMode}
                />
                <InsertGap index={i + 1} onQuickAdd={(idx, x, y) => setQuickAdd({ index: idx, x, y })} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </PreviewContext.Provider>

      {quickAdd && (
        <QuickAddPopover
          index={quickAdd.index}
          x={quickAdd.x}
          y={quickAdd.y}
          onClose={() => setQuickAdd(null)}
        />
      )}
      {contextMenu && (
        <BlockContextMenu
          blockId={contextMenu.blockId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
