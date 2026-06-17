'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { BlockDefinition, DynamicPageBlockRecord } from '../../types'
import { getCodeBlocks } from '../../utils/BlockRegistry'
import { useEditorStore } from '../stores/editorStore'
import TemplateBlockRenderer from '../../partials/template-block-renderer.component'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faTrash } from '@fortawesome/free-solid-svg-icons'
import { getSavedSections, deleteSavedSection, hydrateSavedSection, type SavedSection } from '../../utils/savedSections'
import { toast } from '@kuraykaraaslan/common/ui/toast.store'

export type AnyBlockDef = BlockDefinition | DynamicPageBlockRecord

const CATEGORY_ORDER = ['System', 'Custom', 'General', 'Hero', 'Content', 'CTA']
const RECENTLY_USED_KEY = 'dynamic_editor_recently_used'
const MAX_RECENT = 5
const PREVIEW_WIDTH = 320
const INNER_WIDTH = 1280
const SCALE = PREVIEW_WIDTH / INNER_WIDTH
const PREVIEW_HEIGHT = 220

export function BlockPreview({ def, anchorY, sidebarRight }: { def: AnyBlockDef; anchorY: number; sidebarRight: number }) {
  const maxTop = window.innerHeight - PREVIEW_HEIGHT - 8
  const top = Math.min(Math.max(anchorY, 8), maxTop)
  const inner = 'Component' in def
    ? <def.Component {...def.defaultProps} />
    : <TemplateBlockRenderer template={def.template} props={def.defaultProps} />
  return (
    <div
      className="pointer-events-none bg-[var(--surface-base)]/90 backdrop-blur-sm"
      style={{ position: 'fixed', top, left: sidebarRight + 8, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, zIndex: 50, borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' }}
    >
      <div style={{ width: INNER_WIDTH, transformOrigin: 'top left', transform: `scale(${SCALE})`, pointerEvents: 'none', userSelect: 'none' }}>
        {inner}
      </div>
      <div className="text-[var(--primary)]" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 7px', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>
        {def.label}
      </div>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5 text-[var(--text-primary)]/30 transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
}

function DraggableBlockButton({ def, onAdd, onMouseEnter, onMouseLeave, isHovered }: {
  def: AnyBlockDef
  onAdd: () => void
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void
  onMouseLeave: () => void
  isHovered: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${def.type}`,
    data: { fromSidebar: true, blockType: def.type, blockLabel: def.label },
  })
  const isCustom = def.category === 'Custom'
  const icon = 'icon' in def ? def.icon : undefined

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onAdd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
      className={`w-full text-left p-2.5 rounded-lg transition-all hover:scale-[1.02] border cursor-grab active:cursor-grabbing select-none ${
        isCustom ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20' : 'bg-[var(--surface-overlay)] border-[var(--text-primary)]/10'
      } ${isHovered ? 'border-[var(--primary)]/50' : ''}`}
    >
      <div className={`flex items-center gap-1.5 text-sm font-medium mb-0.5 ${isCustom ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
        {icon && <span className="text-base leading-none">{icon as string}</span>}
        {def.label}
      </div>
      <div className="text-xs leading-snug text-[var(--text-primary)]/40">{'description' in def ? def.description : ''}</div>
    </button>
  )
}

interface BlockPaletteProps {
  search: string
  onSearchChange: (v: string) => void
  hovered: { def: AnyBlockDef; y: number } | null
  onMouseEnter: (def: AnyBlockDef, e: React.MouseEvent<HTMLButtonElement>) => void
  onMouseLeave: () => void
  recentlyUsed: string[]
  open: Record<string, boolean>
  onToggleCategory: (cat: string) => void
}

export function BlockPalette({ search, onSearchChange, hovered, onMouseEnter, onMouseLeave, recentlyUsed, open, onToggleCategory }: BlockPaletteProps) {
  const rawAddBlock    = useEditorStore((s) => s.addBlock)
  const insertBlocks   = useEditorStore((s) => s.insertBlocks)
  const blockDefs      = useEditorStore((s) => s.blockDefs)
  const [savedSections, setSavedSections] = useState<SavedSection[]>([])

  useEffect(() => {
    setSavedSections(getSavedSections())
    const refresh = () => setSavedSections(getSavedSections())
    window.addEventListener('storage', refresh)
    window.addEventListener('dp-sections-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('dp-sections-updated', refresh)
    }
  }, [])

  const allDefs: AnyBlockDef[] = useMemo(() => [...getCodeBlocks(), ...blockDefs], [blockDefs])

  const addBlock = useCallback((type: string) => {
    rawAddBlock(type)
    setTimeout(() => {
      const newId = useEditorStore.getState().selectedId
      if (newId) document.querySelector(`[data-block-id="${newId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 60)
    try {
      const prev = JSON.parse(localStorage.getItem(RECENTLY_USED_KEY) ?? '[]') as string[]
      localStorage.setItem(RECENTLY_USED_KEY, JSON.stringify([type, ...prev.filter((t) => t !== type)].slice(0, MAX_RECENT)))
    } catch { /* ignore */ }
  }, [rawAddBlock])

  const grouped = allDefs.reduce<Record<string, AnyBlockDef[]>>((acc, def) => {
    const cat = def.category ?? 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(def)
    return acc
  }, {})

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  const searchTrimmed = search.trim()
  const isSearchActive = searchTrimmed.length > 0
  const filteredDefs = isSearchActive
    ? allDefs.filter((def) => {
        const q = searchTrimmed.toLowerCase()
        if (def.label.toLowerCase().includes(q)) return true
        const tags = 'tags' in def ? (def.tags ?? []) : []
        return tags.some((t: string) => t.toLowerCase().includes(q))
      })
    : []

  const recentDefs = recentlyUsed
    .map((type) => allDefs.find((d) => d.type === type))
    .filter(Boolean) as AnyBlockDef[]

  return (
    <>
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search blocks…"
            className="w-full text-xs bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 rounded-md px-2.5 py-1.5 pr-6 text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:outline-none focus:border-[var(--primary)]/40 transition-colors"
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-1.5 text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] transition-colors leading-none" title="Clear">×</button>
          )}
        </div>
      </div>

      <div className="py-2 flex-1">
        {isSearchActive ? (
          filteredDefs.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-[var(--text-primary)]/30">No blocks found</p>
            </div>
          ) : (
            <div className="px-3 pb-2 space-y-1.5">
              {filteredDefs.map((def) => (
                <DraggableBlockButton key={def.type} def={def} onAdd={() => addBlock(def.type)}
                  onMouseEnter={(e) => onMouseEnter(def, e)} onMouseLeave={onMouseLeave} isHovered={hovered?.def.type === def.type} />
              ))}
            </div>
          )
        ) : (
          <>
            {recentDefs.length > 0 && (
              <div className="mb-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-primary)]/30">Recently Used</p>
                <div className="px-3 pb-2 space-y-1.5">
                  {recentDefs.map((def) => (
                    <DraggableBlockButton key={`recent-${def.type}`} def={def} onAdd={() => addBlock(def.type)}
                      onMouseEnter={(e) => onMouseEnter(def, e)} onMouseLeave={onMouseLeave} isHovered={hovered?.def.type === def.type} />
                  ))}
                </div>
              </div>
            )}

            {savedSections.length > 0 && (
              <div className="mb-1">
                <button
                  onClick={() => onToggleCategory('__saved')}
                  className="w-full flex items-center justify-between px-4 py-2 transition-colors text-[var(--text-primary)]/50"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest">Saved Sections</span>
                  <Chevron open={open['__saved'] ?? true} />
                </button>
                {(open['__saved'] ?? true) && (
                  <div className="px-3 pb-2 space-y-1.5">
                    {savedSections.map((sec) => (
                      <div key={sec.id} className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const blocks = hydrateSavedSection(sec)
                            insertBlocks(blocks)
                            setTimeout(() => {
                              if (blocks[0]) document.querySelector(`[data-block-id="${blocks[0].id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                            }, 60)
                          }}
                          className="flex-1 text-left p-2.5 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:border-[var(--primary)]/50 transition-all"
                        >
                          <div className="text-sm font-medium text-[var(--primary)]">{sec.name}</div>
                          <div className="text-xs text-[var(--text-primary)]/40">
                            {sec.blocks.length} block{sec.blocks.length !== 1 ? 's' : ''}
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm(`Delete saved section "${sec.name}"?`)) return
                            deleteSavedSection(sec.id)
                            setSavedSections(getSavedSections())
                            toast.success('Section deleted')
                          }}
                          className="p-1.5 rounded-md text-[var(--text-primary)]/30 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete saved section"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {orderedCategories.map((cat) => (
              <div key={cat}>
                <button
                  onClick={() => onToggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-2 transition-colors text-[var(--text-primary)]/50"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest">{cat}</span>
                  <Chevron open={open[cat] ?? true} />
                </button>
                {(open[cat] ?? true) && (
                  <div className="px-3 pb-2 space-y-1.5">
                    {grouped[cat].map((def) => (
                      <DraggableBlockButton key={def.type} def={def} onAdd={() => addBlock(def.type)}
                        onMouseEnter={(e) => onMouseEnter(def, e)} onMouseLeave={onMouseLeave} isHovered={hovered?.def.type === def.type} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}

export { RECENTLY_USED_KEY, MAX_RECENT }
