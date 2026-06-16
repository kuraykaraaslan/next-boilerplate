'use client'

import React, { useState, useEffect } from 'react'
import { useEditorStore } from './stores/editorStore'
import { PreviewContext } from '../partials/preview-context.component'
import { SortableBlock } from './partials/canvas-block.component'
import { QuickAddPopover, BlockContextMenu, InsertGap, SidebarDropTarget } from './partials/canvas-overlays.component'
import { saveSection } from '../utils/savedSections'
import { toast } from '@nb/common/ui/toast.store'

const PREVIEW_WIDTHS: Record<string, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
}

export default function Canvas() {
  const sections          = useEditorStore((s) => s.sections)
  const selectedId        = useEditorStore((s) => s.selectedId)
  const selectedIds       = useEditorStore((s) => s.selectedIds)
  const setSelectedId     = useEditorStore((s) => s.setSelectedId)
  const toggleSelectId    = useEditorStore((s) => s.toggleSelectId)
  const clearMultiSelect  = useEditorStore((s) => s.clearMultiSelect)
  const deleteBlock       = useEditorStore((s) => s.deleteBlock)
  const deleteSelected    = useEditorStore((s) => s.deleteSelected)
  const duplicateBlock    = useEditorStore((s) => s.duplicateBlock)
  const toggleBlockHidden = useEditorStore((s) => s.toggleBlockHidden)
  const isTranslationMode = useEditorStore((s) => s.activeLang !== 'en')
  const previewMode       = useEditorStore((s) => s.previewMode)
  const pendingDraft      = useEditorStore((s) => s.pendingDraft)
  const restoreDraft      = useEditorStore((s) => s.restoreDraft)
  const dismissDraft      = useEditorStore((s) => s.dismissDraft)

  const [quickAdd, setQuickAdd]       = useState<{ index: number; x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ blockId: string; x: number; y: number } | null>(null)

  const maxWidth = PREVIEW_WIDTHS[previewMode] ?? '100%'
  const sorted   = [...sections].sort((a, b) => a.order - b.order)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return

      // Escape clears multi-select (or single selection)
      if (e.key === 'Escape') { clearMultiSelect(); return }

      // Delete/Backspace: bulk delete if multi-select active, else single delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTranslationMode) {
        if (selectedIds.length > 1) { e.preventDefault(); deleteSelected(); return }
      }

      if (!selectedId) return

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
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTranslationMode) {
        e.preventDefault()
        deleteBlock(selectedId)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedId, selectedIds, setSelectedId, clearMultiSelect, deleteBlock, deleteSelected, isTranslationMode])

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
                  isMultiSelected={selectedIds.includes(block.id) && selectedIds.length > 1}
                  onSelect={(e) => {
                    if (e.shiftKey && !isTranslationMode) {
                      toggleSelectId(block.id)
                    } else {
                      setSelectedId(block.id)
                    }
                  }}
                  onDoubleClick={() => {
                    setSelectedId(block.id)
                    // Delay until React commits the block selection re-render
                    setTimeout(() => window.dispatchEvent(new CustomEvent('dp-focus-first-field')), 50)
                  }}
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

      {selectedIds.length > 1 && !isTranslationMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[var(--surface-raised)] border border-[var(--text-primary)]/15 shadow-2xl">
          <span className="text-xs font-semibold text-[var(--text-primary)]/60">
            {selectedIds.length} blocks selected
          </span>
          <div className="w-px h-4 bg-[var(--text-primary)]/15" />
          <button
            onClick={() => {
              const name = window.prompt('Save as section — enter a name:')
              if (!name?.trim()) return
              const selected = useEditorStore.getState().sections
                .filter((b) => selectedIds.includes(b.id))
                .sort((a, b) => a.order - b.order)
              saveSection(name.trim(), selected)
              window.dispatchEvent(new Event('dp-sections-updated'))
              clearMultiSelect()
              toast.success(`Section "${name.trim()}" saved`)
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
          >
            Save as section
          </button>
          <button
            onClick={() => deleteSelected()}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            Delete all
          </button>
          <button
            onClick={() => clearMultiSelect()}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg text-[var(--text-primary)]/50 hover:bg-[var(--surface-overlay)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

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
