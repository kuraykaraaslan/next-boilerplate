import type { StateCreator } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { toast } from '@/modules_next/common/ui/toast.store'
import { getCodeBlock } from '../../../utils/BlockRegistry'
import type { BlockData } from '../../../types'
import type { EditorStore } from '../editor.types'

export type BlockSlice = Pick<
  EditorStore,
  | 'handleDragEnd' | 'addBlock' | 'deleteBlock' | 'duplicateBlock'
  | 'toggleBlockHidden' | 'updateBlockProps' | 'updateBlockLabel'
  | 'moveBlock' | 'reorderBlocks' | 'copyBlock' | 'pasteBlock'
  | 'snapshotForUndo' | 'undo' | 'redo'
>

export const createBlockSlice: StateCreator<EditorStore, [], [], BlockSlice> = (set, get) => ({
  handleDragEnd: (event: DragEndEvent) => {
    if (get().activeLang !== 'en') return
    const { active, over } = event
    if (!over || active.id === over.id) return
    set((state) => {
      const oldIndex = state.sections.findIndex((b) => b.id === active.id)
      const newIndex = state.sections.findIndex((b) => b.id === over.id)
      return {
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
        redoStack: [],
        isDirty: true,
        sections: arrayMove(state.sections, oldIndex, newIndex).map((b, i) => ({ ...b, order: i })),
      }
    })
  },

  addBlock: (type, atIndex) => {
    if (get().activeLang !== 'en') return
    const codeBlock = getCodeBlock(type)
    const dbBlock = get().blockDefs.find((d) => d.type === type)
    const defaultProps = codeBlock?.defaultProps ?? dbBlock?.defaultProps ?? {}
    const newSection: BlockData = { id: uuidv4(), type, order: 0, props: { ...defaultProps } }
    set((state) => {
      let newSections: BlockData[]
      if (atIndex !== undefined) {
        newSections = [
          ...state.sections.slice(0, atIndex),
          newSection,
          ...state.sections.slice(atIndex),
        ].map((b, i) => ({ ...b, order: i }))
      } else {
        newSections = [...state.sections, { ...newSection, order: state.sections.length }]
      }
      return {
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
        redoStack: [],
        isDirty: true,
        sections: newSections,
        selectedId: newSection.id,
      }
    })
  },

  deleteBlock: (id) => {
    if (get().activeLang !== 'en') return
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
      redoStack: [],
      isDirty: true,
      sections: state.sections.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
  },

  duplicateBlock: (id) => {
    if (get().activeLang !== 'en') return
    set((state) => {
      const original = state.sections.find((b) => b.id === id)
      if (!original) return {}
      const copy: BlockData = { ...original, id: uuidv4(), props: structuredClone(original.props) }
      const insertIdx = state.sections.findIndex((b) => b.id === id) + 1
      const newSections = [
        ...state.sections.slice(0, insertIdx),
        copy,
        ...state.sections.slice(insertIdx),
      ].map((b, i) => ({ ...b, order: i }))
      return {
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
        redoStack: [],
        isDirty: true,
        sections: newSections,
        selectedId: copy.id,
      }
    })
  },

  toggleBlockHidden: (id) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
      redoStack: [],
      isDirty: true,
      sections: state.sections.map((b) => b.id === id ? { ...b, hidden: !b.hidden } : b),
    }))
  },

  updateBlockProps: (id, props) => {
    set((state) => ({
      isDirty: true,
      sections: state.sections.map((b) => (b.id === id ? { ...b, props } : b)),
      dirtyLangs: state.activeLang !== 'en'
        ? [...new Set([...state.dirtyLangs, state.activeLang])]
        : state.dirtyLangs,
    }))
  },

  updateBlockLabel: (id, label) => {
    set((state) => ({
      isDirty: true,
      sections: state.sections.map((b) => b.id === id ? { ...b, label: label || undefined } : b),
    }))
  },

  moveBlock: (id, dir) => {
    if (get().activeLang !== 'en') return
    set((state) => {
      const idx = state.sections.findIndex((b) => b.id === id)
      if (idx < 0) return {}
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= state.sections.length) return {}
      return {
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
        redoStack: [],
        isDirty: true,
        sections: arrayMove(state.sections, idx, newIdx).map((b, i) => ({ ...b, order: i })),
      }
    })
  },

  reorderBlocks: (fromId, toId) => {
    if (get().activeLang !== 'en') return
    set((state) => {
      const oldIndex = state.sections.findIndex((b) => b.id === fromId)
      const newIndex = state.sections.findIndex((b) => b.id === toId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return {}
      return {
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
        redoStack: [],
        isDirty: true,
        sections: arrayMove(state.sections, oldIndex, newIndex).map((b, i) => ({ ...b, order: i })),
      }
    })
  },

  copyBlock: (id) => {
    const block = get().sections.find((b) => b.id === id)
    if (!block) return
    set({ clipboard: { ...block } })
    toast.success('Block copied')
  },

  pasteBlock: (atIndex) => {
    if (get().activeLang !== 'en') return
    const { clipboard } = get()
    if (!clipboard) return
    const newBlock: BlockData = { ...clipboard, id: uuidv4() }
    set((state) => {
      const insertAt = atIndex ?? (
        state.selectedId
          ? (state.sections.findIndex((b) => b.id === state.selectedId) + 1)
          : state.sections.length
      )
      const newSections = [
        ...state.sections.slice(0, insertAt),
        { ...newBlock, order: insertAt },
        ...state.sections.slice(insertAt),
      ].map((b, i) => ({ ...b, order: i }))
      return {
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
        redoStack: [],
        isDirty: true,
        sections: newSections,
        selectedId: newBlock.id,
      }
    })
  },

  snapshotForUndo: () => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
      redoStack: [],
    }))
  },

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return {}
      const prev = state.undoStack[state.undoStack.length - 1]
      return {
        sections: prev.sections,
        selectedId: prev.selectedId,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
      }
    })
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return {}
      const next = state.redoStack[state.redoStack.length - 1]
      return {
        sections: next.sections,
        selectedId: next.selectedId,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack.slice(-49), { sections: state.sections, selectedId: state.selectedId }],
      }
    })
  },
})
