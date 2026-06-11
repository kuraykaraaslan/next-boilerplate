import type { StateCreator } from 'zustand'
import { toast } from '@/modules_next/common/ui/toast.store'
import { migrateSections, needsMigration, CURRENT_SCHEMA_VERSION } from '../../../migrations'
import type { BlockData } from '../../../types'
import type { EditorStore, SeoData, TranslationEntry } from '../editor.types'
import { DefaultSeoData, draftKey, apiBase, apiFetch, initialState } from '../editor.types'

export type PersistSlice = Pick<EditorStore, 'loadPage' | 'handleSave' | 'reset'>

export const createPersistSlice: StateCreator<EditorStore, [], [], PersistSlice> = (set, get) => ({
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
    const {
      tenantId, title, slug, status, description, keywords, seoData,
      sections, enSections, activeLang, translationCache, dirtyLangs, savedLangs,
    } = get()
    if (!title.trim()) { toast.error('Title is required'); return }

    const enSectionsToSave = activeLang === 'en' ? sections : enSections
    const body = {
      title, slug, status, description, keywords,
      sections: enSectionsToSave.map((s, i) => ({ ...s, order: i })),
    }

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
})
