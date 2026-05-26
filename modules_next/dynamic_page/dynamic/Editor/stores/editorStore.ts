import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { toast } from '@/modules_next/common/ui/toast.store'
import { getCodeBlock } from '../../utils/BlockRegistry'
import { migrateSections, needsMigration, CURRENT_SCHEMA_VERSION } from '../../migrations'
import type { BlockData } from '../../types'
import type { DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'

export type { DynamicPageBlockRecord }
export type PreviewMode = 'mobile' | 'tablet' | 'desktop'
export const selectSelectedBlock = (s: EditorStore) =>
  s.sections.find((b) => b.id === s.selectedId) ?? null

type Router = { push: (href: string) => void; replace: (href: string) => void }

type TranslationEntry = { title: string; description: string; sections: BlockData[] }

// Editor SEO view-model — mirrors @/modules/seo SeoMeta shape with all fields
// required-but-empty so SeoModal inputs are always controlled.
export type SeoData = {
  title: string
  description: string
  keywords: string[]
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  twitterTitle: string
  twitterDescription: string
  twitterCard: string
  canonicalUrl: string
  noIndex: boolean
}

const DefaultSeoData: SeoData = {
  title: '', description: '', keywords: [],
  ogTitle: '', ogDescription: '', ogImageUrl: '',
  twitterTitle: '', twitterDescription: '', twitterCard: '',
  canonicalUrl: '', noIndex: false,
}

interface EditorStore {
  tenantId: string
  loading: boolean
  saving: boolean
  sections: BlockData[]
  selectedId: string | null
  title: string
  slug: string
  status: string
  description: string
  keywords: string[]
  seoData: SeoData
  backupOpen: boolean
  seoOpen: boolean
  translationOpen: boolean
  isDirty: boolean
  previewMode: PreviewMode
  undoStack: { sections: BlockData[]; selectedId: string | null }[]
  redoStack: { sections: BlockData[]; selectedId: string | null }[]
  pendingDraft: { savedAt: number; title: string; pageId: string } | null
  dirtyLangs: string[]
  pageSchemaVersion: number
  blockDefs: DynamicPageBlockRecord[]
  pageId: string
  activeLang: string
  enSections: BlockData[]
  translationCache: Record<string, TranslationEntry>
  savedLangs: string[]
  showShortcuts: boolean
  clipboard: BlockData | null

  setTenantId: (v: string) => void
  setSelectedId: (id: string | null) => void
  setTitle: (v: string) => void
  setSlug: (v: string) => void
  setStatus: (v: string) => void
  setDescription: (v: string) => void
  setKeywords: (v: string[]) => void
  setSeoField: <K extends keyof SeoData>(key: K, value: SeoData[K]) => void
  setBackupOpen: (v: boolean) => void
  setSeoOpen: (v: boolean) => void
  setTranslationOpen: (v: boolean) => void
  setPreviewMode: (v: PreviewMode) => void
  setShowShortcuts: (v: boolean) => void
  restoreDraft: () => void
  dismissDraft: () => void
  loadBlockDefs: () => Promise<void>
  handleDragEnd: (event: DragEndEvent) => void
  addBlock: (type: string, atIndex?: number) => void
  deleteBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  toggleBlockHidden: (id: string) => void
  updateBlockProps: (id: string, props: Record<string, unknown>) => void
  updateBlockLabel: (id: string, label: string) => void
  moveBlock: (id: string, dir: -1 | 1) => void
  reorderBlocks: (fromId: string, toId: string) => void
  copyBlock: (id: string) => void
  pasteBlock: (atIndex?: number) => void
  snapshotForUndo: () => void
  undo: () => void
  redo: () => void
  loadPage: (pageId: string) => Promise<void>
  handleSave: (mode: 'create' | 'edit', pageId: string, router: Router) => Promise<void>
  reset: () => void
  setActiveLang: (lang: string) => void
  setTranslationTitle: (lang: string, v: string) => void
  setTranslationDescription: (lang: string, v: string) => void
  addTranslation: (lang: string, data: TranslationEntry) => void
  saveTranslation: () => Promise<void>
  deleteTranslation: (lang: string) => Promise<void>
}

const initialState = {
  tenantId: '',
  loading: false,
  saving: false,
  sections: [] as BlockData[],
  selectedId: null as string | null,
  clipboard: null as BlockData | null,
  title: '',
  slug: '',
  status: 'DRAFT',
  description: '',
  keywords: [] as string[],
  seoData: DefaultSeoData,
  backupOpen: false,
  seoOpen: false,
  translationOpen: false,
  isDirty: false,
  previewMode: 'desktop' as PreviewMode,
  undoStack: [] as { sections: BlockData[]; selectedId: string | null }[],
  redoStack: [] as { sections: BlockData[]; selectedId: string | null }[],
  pageId: '',
  activeLang: 'en',
  enSections: [] as BlockData[],
  translationCache: {} as Record<string, TranslationEntry>,
  savedLangs: [] as string[],
  blockDefs: [] as DynamicPageBlockRecord[],
  showShortcuts: false,
  pendingDraft: null as { savedAt: number; title: string; pageId: string } | null,
  dirtyLangs: [] as string[],
  pageSchemaVersion: 2,
}

const draftKey = (id: string) => `dp_editor_draft_${id || 'new'}`

const apiBase = (tenantId: string) => `/tenant/${tenantId}/api/dynamic-pages`

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Request failed')
  return data
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  setTenantId: (v) => set({ tenantId: v }),
  setSelectedId: (id) => set({ selectedId: id }),
  setTitle: (v) => set({ title: v, isDirty: true }),
  setSlug: (v) => set({ slug: v, isDirty: true }),
  setStatus: (v) => set({ status: v, isDirty: true }),
  setDescription: (v) => set({ description: v, isDirty: true }),
  setKeywords: (v) => set({ keywords: v, isDirty: true }),
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

  handleDragEnd: (event) => {
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

  loadPage: async (pageId) => {
    const { tenantId } = get()
    if (pageId === 'create') { set({ loading: false, pageId: '', isDirty: false }); return }
    set({ loading: true, pageId })
    try {
      const [pageData, transData, seoData] = await Promise.all([
        apiFetch(`${apiBase(tenantId)}/${pageId}`),
        apiFetch(`${apiBase(tenantId)}/${pageId}/translations`),
        apiFetch(`/tenant/${tenantId}/api/seo/dynamic_page/${pageId}`).catch(() => ({ seo: null })),
      ])

      const raw = pageData.page
      const rawVersion: number = raw.schemaVersion ?? 1
      const sortedRaw: BlockData[] = Array.isArray(raw.sections)
        ? (raw.sections as BlockData[]).sort((a: BlockData, b: BlockData) => a.order - b.order)
        : []

      const wasMigrated = needsMigration(rawVersion)
      const { sections: migratedSections } = wasMigrated
        ? migrateSections(sortedRaw, rawVersion)
        : { sections: sortedRaw }
      const enSections = migratedSections

      const translationList: Array<{ lang: string; title: string; description: string | null; sections: unknown }> =
        transData.translations ?? []

      const cache: Record<string, TranslationEntry> = {}
      const savedLangs: string[] = []
      for (const t of translationList) {
        const tSections = Array.isArray(t.sections)
          ? (t.sections as BlockData[]).sort((a: BlockData, b: BlockData) => a.order - b.order)
          : []
        cache[t.lang] = { title: t.title, description: t.description ?? '', sections: tSections }
        savedLangs.push(t.lang)
      }

      const seo = seoData?.seo
      const loadedSeoData: SeoData = seo
        ? {
            title:              seo.title ?? '',
            description:        seo.description ?? '',
            keywords:           Array.isArray(seo.keywords) ? seo.keywords : [],
            ogTitle:            seo.ogTitle ?? '',
            ogDescription:      seo.ogDescription ?? '',
            ogImageUrl:         seo.ogImageUrl ?? '',
            twitterTitle:       seo.twitterTitle ?? '',
            twitterDescription: seo.twitterDescription ?? '',
            twitterCard:        seo.twitterCard ?? '',
            canonicalUrl:       seo.canonicalUrl ?? '',
            noIndex:            !!seo.noIndex,
          }
        : DefaultSeoData

      set({
        title: raw.title ?? '',
        slug: raw.slug ?? '',
        status: raw.status ?? 'DRAFT',
        description: raw.description ?? '',
        keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
        seoData: loadedSeoData,
        sections: enSections,
        enSections,
        translationCache: cache,
        savedLangs,
        activeLang: 'en',
        isDirty: wasMigrated,
        dirtyLangs: [],
        pageSchemaVersion: wasMigrated ? CURRENT_SCHEMA_VERSION : rawVersion,
        undoStack: [],
        redoStack: [],
      })

      if (wasMigrated) {
        toast.info(`Page schema upgraded v${rawVersion} → v${CURRENT_SCHEMA_VERSION}. Save to apply.`)
      }

      try {
        const raw2 = typeof window !== 'undefined' ? localStorage.getItem(draftKey(pageId)) : null
        if (raw2) {
          const draft = JSON.parse(raw2)
          if (draft.savedAt) set({ pendingDraft: { savedAt: draft.savedAt, title: draft.title ?? '', pageId } })
        }
      } catch {}
    } catch {
      toast.error('Failed to load page')
    } finally {
      set({ loading: false })
    }
  },

  handleSave: async (mode, pageId, router) => {
    const { tenantId, title, slug, status, description, keywords, seoData, sections, enSections, activeLang, translationCache, dirtyLangs, savedLangs } = get()
    if (!title.trim()) { toast.error('Title is required'); return }

    const enSectionsToSave = activeLang === 'en' ? sections : enSections
    const body = {
      title, slug, status, description, keywords,
      sections: enSectionsToSave.map((s, i) => ({ ...s, order: i })),
    }

    // SEO payload mirrors UpsertSeoDTO; the API drops empty strings via z.literal('').
    const seoBody = {
      title:              seoData.title,
      description:        seoData.description,
      keywords:           seoData.keywords,
      ogTitle:            seoData.ogTitle,
      ogDescription:      seoData.ogDescription,
      ogImageUrl:         seoData.ogImageUrl,
      twitterTitle:       seoData.twitterTitle,
      twitterDescription: seoData.twitterDescription,
      twitterCard:        seoData.twitterCard,
      canonicalUrl:       seoData.canonicalUrl,
      noIndex:            seoData.noIndex,
    }

    set({ saving: true })
    try {
      if (mode === 'create') {
        const res = await apiFetch(`${apiBase(tenantId)}`, {
          method: 'POST',
          body: JSON.stringify(body),
        })
        const newPageId = res.page.dynamicPageId
        await apiFetch(`/tenant/${tenantId}/api/seo/dynamic_page/${newPageId}`, {
          method: 'PUT',
          body: JSON.stringify(seoBody),
        }).catch(() => { /* non-fatal */ })
        toast.success('Page created')
        set({ isDirty: false, dirtyLangs: [] })
        try { if (typeof window !== 'undefined') localStorage.removeItem(draftKey('')) } catch {}
        router.replace(`/tenant/${tenantId}/admin/pages/${newPageId}`)
        return
      }

      const latestCache = { ...translationCache }
      if (activeLang !== 'en' && latestCache[activeLang]) {
        latestCache[activeLang] = { ...latestCache[activeLang], sections: sections.map((s, i) => ({ ...s, order: i })) }
      }

      const translationEntries = Object.entries(latestCache)
        .filter(([lang]) => lang !== 'en')
        .filter(([lang]) => dirtyLangs.includes(lang) || !savedLangs.includes(lang))

      await Promise.all([
        apiFetch(`${apiBase(tenantId)}/${pageId}`, { method: 'PATCH', body: JSON.stringify(body) }),
        apiFetch(`/tenant/${tenantId}/api/seo/dynamic_page/${pageId}`, {
          method: 'PUT',
          body: JSON.stringify(seoBody),
        }).catch(() => { /* non-fatal */ }),
        ...translationEntries
          .filter(([, entry]) => entry.title.trim())
          .map(([lang, entry]) =>
            apiFetch(`${apiBase(tenantId)}/${pageId}/translations`, {
              method: 'POST',
              body: JSON.stringify({
                lang,
                title: entry.title,
                description: entry.description || null,
                sections: entry.sections.map((s, i) => ({ ...s, order: i })),
              }),
            })
          ),
      ])

      const savedTranslationLangs = translationEntries.map(([lang]) => lang)
      try { if (typeof window !== 'undefined') localStorage.removeItem(draftKey(pageId)) } catch {}
      set({
        savedLangs: [...new Set([...get().savedLangs, ...savedTranslationLangs])],
        isDirty: false,
        dirtyLangs: [],
        pendingDraft: null,
      })
      toast.success('Page saved')
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message
      toast.error(msg ?? 'Failed to save page')
    } finally {
      set({ saving: false })
    }
  },

  reset: () => set(initialState),

  setActiveLang: (lang) => {
    const { activeLang, sections, translationCache, enSections } = get()
    const currentEnSections = activeLang === 'en' ? sections : enSections

    if (activeLang !== 'en') {
      const entry = translationCache[activeLang]
      if (entry) set({ translationCache: { ...translationCache, [activeLang]: { ...entry, sections } } })
    }

    if (lang === 'en') {
      set({ activeLang: 'en', sections: currentEnSections, enSections: currentEnSections, selectedId: null })
      return
    }

    const updated = get().translationCache
    const existing = updated[lang]
    const newSections = existing?.sections ?? [...currentEnSections]

    if (!existing) {
      set({
        translationCache: { ...updated, [lang]: { title: get().title, description: get().description, sections: newSections } },
      })
    }

    set({ activeLang: lang, sections: newSections, enSections: currentEnSections, selectedId: null })
  },

  setTranslationTitle: (lang, v) => {
    set((state) => {
      const entry = state.translationCache[lang]
      if (!entry) return {}
      return {
        translationCache: { ...state.translationCache, [lang]: { ...entry, title: v } },
        isDirty: true,
        dirtyLangs: [...new Set([...state.dirtyLangs, lang])],
      }
    })
  },

  setTranslationDescription: (lang, v) => {
    set((state) => {
      const entry = state.translationCache[lang]
      if (!entry) return {}
      return {
        translationCache: { ...state.translationCache, [lang]: { ...entry, description: v } },
        isDirty: true,
        dirtyLangs: [...new Set([...state.dirtyLangs, lang])],
      }
    })
  },

  addTranslation: (lang, data) => {
    set((state) => ({
      translationCache: { ...state.translationCache, [lang]: data },
      savedLangs: [...new Set([...state.savedLangs, lang])],
      dirtyLangs: [...new Set([...state.dirtyLangs, lang])],
    }))
  },

  saveTranslation: async () => {
    const { tenantId, activeLang, pageId, sections, translationCache } = get()
    if (activeLang === 'en' || !pageId) return
    const entry = translationCache[activeLang]
    if (!entry) return
    if (!entry.title.trim()) { toast.error('Translation title is required'); return }
    try {
      await apiFetch(`${apiBase(tenantId)}/${pageId}/translations`, {
        method: 'POST',
        body: JSON.stringify({
          lang: activeLang,
          title: entry.title,
          description: entry.description || null,
          sections: sections.map((s, i) => ({ ...s, order: i })),
        }),
      })
      set((state) => ({
        savedLangs: [...new Set([...state.savedLangs, activeLang])],
        dirtyLangs: state.dirtyLangs.filter((l) => l !== activeLang),
        isDirty: state.dirtyLangs.filter((l) => l !== activeLang).length > 0 || state.isDirty,
      }))
      toast.success(`Translation saved (${activeLang})`)
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? 'Failed to save translation')
    }
  },

  deleteTranslation: async (lang) => {
    const { tenantId, pageId } = get()
    if (!pageId) return
    try {
      await apiFetch(`${apiBase(tenantId)}/${pageId}/translations/${lang}`, { method: 'DELETE' })
      set((state) => ({
        savedLangs: state.savedLangs.filter((l) => l !== lang),
        translationCache: Object.fromEntries(Object.entries(state.translationCache).filter(([l]) => l !== lang)),
        activeLang: state.activeLang === lang ? 'en' : state.activeLang,
        sections: state.activeLang === lang ? state.enSections : state.sections,
      }))
      toast.success(`Translation deleted (${lang})`)
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? 'Failed to delete translation')
    }
  },
}))
