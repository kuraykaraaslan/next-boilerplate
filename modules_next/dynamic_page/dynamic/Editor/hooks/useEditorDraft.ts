'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@/modules_next/common/ui/toast.store'
import { useEditorStore } from '../stores/editorStore'

const DRAFT_KEY = (pageId: string) =>
  pageId === 'new' ? 'dynamic_editor_draft_new' : `dynamic_editor_draft_${pageId}`

export function useEditorDraft(pageId: string) {
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loading = useEditorStore((s) => s.loading)
  const sections = useEditorStore((s) => s.sections)
  const isDirty = useEditorStore((s) => s.isDirty)

  useEffect(() => {
    if (loading) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY(pageId))
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed._savedAt) setDraftSavedAt(parsed._savedAt)
    } catch { /* ignore */ }
  }, [loading, pageId])

  useEffect(() => {
    if (!isDirty) {
      try { localStorage.removeItem(DRAFT_KEY(pageId)) } catch { /* ignore */ }
      setDraftSavedAt(null)
      return
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      const s = useEditorStore.getState()
      try {
        localStorage.setItem(DRAFT_KEY(pageId), JSON.stringify({
          _savedAt: Date.now(),
          title: s.title,
          slug: s.slug,
          status: s.status,
          description: s.description,
          keywords: s.keywords,
          seoData: s.seoData,
          sections: s.sections,
          enSections: s.enSections,
          translationCache: s.translationCache,
          savedLangs: s.savedLangs,
        }))
      } catch { /* localStorage might be full */ }
    }, 10_000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [isDirty, sections, pageId])

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(pageId))
      if (!raw) return
      const parsed = JSON.parse(raw)
      useEditorStore.setState({
        title: parsed.title ?? '',
        slug: parsed.slug ?? '',
        status: parsed.status ?? 'DRAFT',
        description: parsed.description ?? '',
        keywords: parsed.keywords ?? [],
        seoData: parsed.seoData,
        sections: (parsed.sections ?? []).map((s: { order: number }, i: number) => ({ ...s, order: i })),
        enSections: (parsed.enSections ?? []).map((s: { order: number }, i: number) => ({ ...s, order: i })),
        translationCache: parsed.translationCache ?? {},
        savedLangs: parsed.savedLangs ?? [],
        isDirty: true,
        selectedId: null,
      })
      setDraftSavedAt(null)
      toast.success('Draft restored')
    } catch {
      toast.error('Failed to restore draft')
    }
  }, [pageId])

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY(pageId)) } catch { /* ignore */ }
    setDraftSavedAt(null)
  }, [pageId])

  return { draftSavedAt, restoreDraft, discardDraft }
}
