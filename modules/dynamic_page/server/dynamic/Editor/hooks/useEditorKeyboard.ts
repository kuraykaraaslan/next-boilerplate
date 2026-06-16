'use client'

import { useEffect } from 'react'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useEditorStore } from '../stores/editorStore'

interface UseEditorKeyboardOptions {
  mode: 'create' | 'edit'
  pageId: string
  router: AppRouterInstance
}

export function useEditorKeyboard({ mode, pageId, router }: UseEditorKeyboardOptions) {
  const undo             = useEditorStore((s) => s.undo)
  const redo             = useEditorStore((s) => s.redo)
  const deleteBlock      = useEditorStore((s) => s.deleteBlock)
  const deleteSelected   = useEditorStore((s) => s.deleteSelected)
  const duplicateBlock   = useEditorStore((s) => s.duplicateBlock)
  const copyBlock        = useEditorStore((s) => s.copyBlock)
  const pasteBlock       = useEditorStore((s) => s.pasteBlock)
  const moveBlock        = useEditorStore((s) => s.moveBlock)
  const setSelectedId    = useEditorStore((s) => s.setSelectedId)
  const selectAll        = useEditorStore((s) => s.selectAll)
  const clearMultiSelect = useEditorStore((s) => s.clearMultiSelect)
  const handleSave       = useEditorStore((s) => s.handleSave)
  const setShowShortcuts = useEditorStore((s) => s.setShowShortcuts)
  const isDirty          = useEditorStore((s) => s.isDirty)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const alt = e.altKey
      const tag = (e.target as HTMLElement).tagName
      const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement).isContentEditable

      if (ctrl) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return }
        if (e.key === '/') { e.preventDefault(); setShowShortcuts(true); return }
        if (!isEditing) {
          if (e.key === 'a') { e.preventDefault(); selectAll(); return }
          if (e.key === 's') { e.preventDefault(); handleSave(mode, pageId, router); return }
          if (e.key === 'd') {
            const id = useEditorStore.getState().selectedId
            if (id) { e.preventDefault(); duplicateBlock(id) }
            return
          }
          if (e.key === 'c') {
            const id = useEditorStore.getState().selectedId
            if (id) { e.preventDefault(); copyBlock(id) }
            return
          }
          if (e.key === 'v') { e.preventDefault(); pasteBlock(); return }
        }
      }

      if (!isEditing) {
        if (e.key === 'Escape') { clearMultiSelect(); setSelectedId(null); return }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const state = useEditorStore.getState()
          if (state.selectedIds.length > 1) { e.preventDefault(); deleteSelected(); return }
          const id = state.selectedId
          if (id) { e.preventDefault(); deleteBlock(id) }
          return
        }
        if (alt && e.key === 'ArrowUp') {
          const id = useEditorStore.getState().selectedId
          if (id) { e.preventDefault(); moveBlock(id, -1) }
          return
        }
        if (alt && e.key === 'ArrowDown') {
          const id = useEditorStore.getState().selectedId
          if (id) { e.preventDefault(); moveBlock(id, 1) }
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, deleteBlock, deleteSelected, duplicateBlock, copyBlock, pasteBlock, moveBlock, setSelectedId, selectAll, clearMultiSelect, handleSave, setShowShortcuts, mode, pageId, router])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
}
