import type { DragEndEvent } from '@dnd-kit/core'
import type { BlockData } from '../../types'
import type { DynamicPageBlockRecord } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.types'
import { DEFAULT_PAGE_LAYOUT } from '@kuraykaraaslan/dynamic_page/server/dynamic_page.types'

export type { DynamicPageBlockRecord }
export type PreviewMode = 'mobile' | 'tablet' | 'desktop'
export type TranslationEntry = { title: string; description: string; sections: BlockData[] }
export type Router = { push: (href: string) => void; replace: (href: string) => void }

export type SeoData = {
  title: string; description: string; keywords: string[];
  ogTitle: string; ogDescription: string; ogImageUrl: string;
  twitterTitle: string; twitterDescription: string; twitterCard: string;
  canonicalUrl: string; noIndex: boolean;
}

export const DefaultSeoData: SeoData = {
  title: '', description: '', keywords: [],
  ogTitle: '', ogDescription: '', ogImageUrl: '',
  twitterTitle: '', twitterDescription: '', twitterCard: '',
  canonicalUrl: '', noIndex: false,
}

export interface EditorStore {
  tenantId: string; loading: boolean; saving: boolean;
  sections: BlockData[]; selectedId: string | null;
  selectedIds: string[];
  title: string; slug: string; status: string; description: string; keywords: string[];
  layout: string | null; pageMetadata: Record<string, unknown> | null;
  seoData: SeoData; backupOpen: boolean; seoOpen: boolean; translationOpen: boolean;
  isDirty: boolean; previewMode: PreviewMode;
  undoStack: { sections: BlockData[]; selectedId: string | null }[];
  redoStack: { sections: BlockData[]; selectedId: string | null }[];
  pendingDraft: { savedAt: number; title: string; pageId: string } | null;
  dirtyLangs: string[]; pageSchemaVersion: number; blockDefs: DynamicPageBlockRecord[];
  pageId: string; activeLang: string; enSections: BlockData[];
  translationCache: Record<string, TranslationEntry>; savedLangs: string[];
  showShortcuts: boolean; clipboard: BlockData | null;

  setTenantId: (v: string) => void
  setSelectedId: (id: string | null) => void
  toggleSelectId: (id: string) => void
  selectAll: () => void
  clearMultiSelect: () => void
  deleteSelected: () => void
  setTitle: (v: string) => void
  setSlug: (v: string) => void
  setStatus: (v: string) => void
  setDescription: (v: string) => void
  setKeywords: (v: string[]) => void
  setLayout: (v: string | null) => void
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
  insertBlocks: (blocks: BlockData[], atIndex?: number) => void
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

export const initialState = {
  tenantId: '', loading: false, saving: false,
  sections: [] as BlockData[], selectedId: null as string | null,
  selectedIds: [] as string[],
  clipboard: null as BlockData | null,
  title: '', slug: '', status: 'DRAFT', description: '', keywords: [] as string[],
  layout: DEFAULT_PAGE_LAYOUT as string | null, pageMetadata: null as Record<string, unknown> | null,
  seoData: DefaultSeoData, backupOpen: false, seoOpen: false, translationOpen: false,
  isDirty: false, previewMode: 'desktop' as PreviewMode,
  undoStack: [] as { sections: BlockData[]; selectedId: string | null }[],
  redoStack: [] as { sections: BlockData[]; selectedId: string | null }[],
  pageId: '', activeLang: 'en',
  enSections: [] as BlockData[], translationCache: {} as Record<string, TranslationEntry>,
  savedLangs: [] as string[], blockDefs: [] as DynamicPageBlockRecord[],
  showShortcuts: false, pendingDraft: null as { savedAt: number; title: string; pageId: string } | null,
  dirtyLangs: [] as string[], pageSchemaVersion: 2,
}

export const draftKey = (id: string) => `dp_editor_draft_${id || 'new'}`
export const apiBase = (tenantId: string) => `/tenant/${tenantId}/api/dynamic-pages`

export async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Request failed')
  return data
}

export const selectSelectedBlock = (s: EditorStore) =>
  s.sections.find((b) => b.id === s.selectedId) ?? null
