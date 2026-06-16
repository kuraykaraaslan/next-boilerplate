import type { StateCreator } from 'zustand'
import type { EditorStore } from '../editor.types'
import { DefaultSeoData, draftKey, apiBase, apiFetch } from '../editor.types'

export type UiSlice = Pick<
  EditorStore,
  | 'setTenantId' | 'setSelectedId' | 'setTitle' | 'setSlug' | 'setStatus'
  | 'setDescription' | 'setKeywords' | 'setLayout' | 'setSeoField'
  | 'setBackupOpen' | 'setSeoOpen' | 'setTranslationOpen'
  | 'setPreviewMode' | 'setShowShortcuts'
  | 'restoreDraft' | 'dismissDraft' | 'loadBlockDefs'
  | 'toggleSelectId' | 'selectAll' | 'clearMultiSelect'
>

export const createUiSlice: StateCreator<EditorStore, [], [], UiSlice> = (set, get) => ({
  setTenantId: (v) => set({ tenantId: v }),
  setSelectedId: (id) => set({ selectedId: id, selectedIds: [] }),
  toggleSelectId: (id) => set((state) => {
    const isIn = state.selectedIds.includes(id)
    const next = isIn ? state.selectedIds.filter((s) => s !== id) : [...state.selectedIds, id]
    return { selectedIds: next, selectedId: next[next.length - 1] ?? null }
  }),
  selectAll: () => set((state) => ({
    selectedIds: state.sections.map((b) => b.id),
    selectedId: state.sections[0]?.id ?? null,
  })),
  clearMultiSelect: () => set({ selectedIds: [], selectedId: null }),
  setTitle: (v) => set({ title: v, isDirty: true }),
  setSlug: (v) => set({ slug: v, isDirty: true }),
  setStatus: (v) => set({ status: v, isDirty: true }),
  setDescription: (v) => set({ description: v, isDirty: true }),
  setKeywords: (v) => set({ keywords: v, isDirty: true }),
  setLayout: (v) => set({ layout: v, isDirty: true }),
  setSeoField: (key, value) => set((state) => ({ seoData: { ...state.seoData, [key]: value }, isDirty: true })),
  setBackupOpen: (v) => set({ backupOpen: v }),
  setSeoOpen: (v) => set({ seoOpen: v }),
  setTranslationOpen: (v) => set({ translationOpen: v }),
  setPreviewMode: (v) => set({ previewMode: v }),
  setShowShortcuts: (v) => set({ showShortcuts: v }),

  restoreDraft: () => {
    const { pageId } = get()
    const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey(pageId)) : null
    if (!raw) { set({ pendingDraft: null }); return }
    try {
      const draft = JSON.parse(raw)
      set({
        title: draft.title ?? '',
        slug: draft.slug ?? '',
        description: draft.description ?? '',
        keywords: Array.isArray(draft.keywords) ? draft.keywords : [],
        seoData: draft.seoData ?? DefaultSeoData,
        sections: Array.isArray(draft.sections) ? draft.sections : [],
        enSections: Array.isArray(draft.sections) ? draft.sections : [],
        isDirty: true,
        pendingDraft: null,
        undoStack: [],
        redoStack: [],
      })
    } catch {
      set({ pendingDraft: null })
    }
  },

  dismissDraft: () => {
    const { pageId } = get()
    try { if (typeof window !== 'undefined') localStorage.removeItem(draftKey(pageId)) } catch {}
    set({ pendingDraft: null })
  },

  loadBlockDefs: async () => {
    const { tenantId } = get()
    if (!tenantId) return
    try {
      const data = await apiFetch(`${apiBase(tenantId)}/block-definitions`)
      const dbOnly = (data.blocks ?? []).filter((b: { source?: string }) => b.source !== 'code')
      set({ blockDefs: dbOnly })
    } catch {
      // silently fail — editor still works with code blocks
    }
  },
})
