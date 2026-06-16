'use client'

import { useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Spinner } from '@nb/common/ui/spinner.component'
import Canvas from './canvas.component'
import LeftSidebar from './left-sidebar.component'
import RightSidebar from './right-sidebar.component'
import EditorTopBar from './editor-top-bar.component'
import { useEditorStore } from './stores/editorStore'
import { useEditorDraft } from './hooks/useEditorDraft'
import { useEditorKeyboard } from './hooks/useEditorKeyboard'
import { useEffect } from 'react'

export default function DynamicPageEditor() {
  const params = useParams<{ tenantId: string; pageId: string }>()
  const router = useRouter()
  const tenantId = params?.tenantId ?? ''
  const pageId = params?.pageId ?? 'new'
  const mode = useMemo<'create' | 'edit'>(
    () => (pageId === 'new' ? 'create' : 'edit'),
    [pageId]
  )

  const loading = useEditorStore((s) => s.loading)
  const sections = useEditorStore((s) => s.sections)
  const slug = useEditorStore((s) => s.slug)
  const storeHandleDragEnd = useEditorStore((s) => s.handleDragEnd)
  const addBlock = useEditorStore((s) => s.addBlock)
  const setTenantId = useEditorStore((s) => s.setTenantId)
  const loadPage = useEditorStore((s) => s.loadPage)
  const loadBlockDefs = useEditorStore((s) => s.loadBlockDefs)
  const handleSave = useEditorStore((s) => s.handleSave)
  const reset = useEditorStore((s) => s.reset)

  const [sidebarDrag, setSidebarDrag] = useState<{ type: string; label: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    if (!tenantId) return
    setTenantId(tenantId)
    loadBlockDefs()
    if (mode === 'edit') loadPage(pageId)
    return () => reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, pageId])

  const { draftSavedAt, restoreDraft, discardDraft } = useEditorDraft(pageId)
  useEditorKeyboard({ mode, pageId, router })

  const onDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.fromSidebar) {
      setSidebarDrag({ type: data.blockType, label: data.blockLabel ?? data.blockType })
    }
  }, [])

  const onDragEnd = useCallback((event: DragEndEvent) => {
    setSidebarDrag(null)
    const { active, over } = event

    if (active.data.current?.fromSidebar) {
      if (!over) return
      const overId = String(over.id)
      const blockType = active.data.current.blockType

      if (overId.startsWith('insert-gap-')) {
        const index = parseInt(overId.replace('insert-gap-', ''), 10)
        addBlock(blockType, index)
      } else {
        const blockIndex = sections.findIndex((b) => b.id === overId)
        addBlock(blockType, blockIndex >= 0 ? blockIndex + 1 : undefined)
      }
      return
    }

    storeHandleDragEnd(event)
  }, [sections, addBlock, storeHandleDragEnd])

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--surface-raised)]" style={{ top: '64px' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const previewUrl = `/tenant/${tenantId}/${slug}`
  const cancelUrl = `/tenant/${tenantId}/admin/pages`

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--surface-overlay)]" style={{ top: '64px' }}>
      <EditorTopBar
        onSave={() => handleSave(mode, pageId, router)}
        onCancel={() => router.push(cancelUrl)}
        previewUrl={previewUrl}
      />

      {draftSavedAt && (
        <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          <span className="text-xs text-yellow-500 font-medium">
            Unsaved draft found — last auto-saved at {new Date(draftSavedAt).toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={restoreDraft}
              className="px-3 py-1 text-xs rounded-md bg-yellow-500 text-yellow-900 font-medium hover:opacity-90 transition-opacity"
            >
              Restore
            </button>
            <button
              onClick={discardDraft}
              className="px-3 py-1 text-xs rounded-md bg-[var(--surface-overlay)] text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex flex-1 min-h-0">
          <LeftSidebar />

          <div className="flex-1 overflow-y-auto">
            <SortableContext
              items={sections.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <Canvas />
            </SortableContext>
          </div>

          <RightSidebar />
        </div>

        <DragOverlay dropAnimation={null}>
          {sidebarDrag ? (
            <div className="bg-[var(--surface-base)] rounded-lg shadow-2xl px-4 py-2.5 text-sm font-semibold border border-[var(--primary)]/50 text-[var(--primary)] opacity-90 pointer-events-none select-none">
              + {sidebarDrag.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
