import type { StateCreator } from 'zustand'
import { toast } from '@/modules_next/common/ui/toast.store'
import type { EditorStore, TranslationEntry } from '../editor.types'
import { apiBase, apiFetch } from '../editor.types'

export type TranslationSlice = Pick<
  EditorStore,
  | 'setActiveLang' | 'setTranslationTitle' | 'setTranslationDescription'
  | 'addTranslation' | 'saveTranslation' | 'deleteTranslation'
>

export const createTranslationSlice: StateCreator<EditorStore, [], [], TranslationSlice> = (set, get) => ({
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

  addTranslation: (lang, data: TranslationEntry) => {
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
})
