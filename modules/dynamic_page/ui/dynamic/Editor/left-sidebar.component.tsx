'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { getCodeBlocks } from '../utils/BlockRegistry'
import { useEditorStore } from './stores/editorStore'
import { BlockPalette, BlockPreview, RECENTLY_USED_KEY, MAX_RECENT, type AnyBlockDef } from './partials/block-palette.component'
import { LayersPanel } from './partials/layers-panel.component'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons'

export default function LeftSidebar() {
  const isTranslationMode = useEditorStore((s) => s.activeLang !== 'en')
  const blockDefs = useEditorStore((s) => s.blockDefs)
  const sections  = useEditorStore((s) => s.sections)
  const sidebarRef    = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hovered, setHovered]       = useState<{ def: AnyBlockDef; y: number } | null>(null)
  const [collapsed, setCollapsed]   = useState(false)
  const [search, setSearch]         = useState('')
  const [activeTab, setActiveTab]   = useState<'blocks' | 'layers'>('blocks')
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])

  const allDefs: AnyBlockDef[] = useMemo(() => [...getCodeBlocks(), ...blockDefs], [blockDefs])
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const cats = [...new Set(allDefs.map((d) => d.category ?? 'Other'))]
    return Object.fromEntries(cats.map((c) => [c, true]))
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_USED_KEY)
      if (raw) setRecentlyUsed(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const handleMouseEnter = useCallback((def: AnyBlockDef, e: React.MouseEvent<HTMLButtonElement>) => {
    const y = e.currentTarget.getBoundingClientRect().top
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setHovered({ def, y }), 150)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null }
    setHovered(null)
  }, [])

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v)
    setRecentlyUsed((prev) => {
      // keep in sync after add; re-read from localStorage
      try { return JSON.parse(localStorage.getItem(RECENTLY_USED_KEY) ?? JSON.stringify(prev)) }
      catch { return prev }
    })
  }, [])

  const sidebarRight = sidebarRef.current?.getBoundingClientRect().right ?? 240

  if (collapsed) {
    return (
      <div className="w-10 flex-shrink-0 flex flex-col border-r border-[var(--text-primary)]/10 bg-[var(--surface-raised)] items-center py-3 gap-3">
        <button onClick={() => setCollapsed(false)} title="Expand blocks panel" className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-primary)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
          <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 flex items-center">
          <span className="text-[9px] font-semibold tracking-widest text-[var(--text-primary)]/25 uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Blocks</span>
        </div>
      </div>
    )
  }

  if (isTranslationMode) {
    return (
      <div className="w-60 flex-shrink-0 flex flex-col border-r border-[var(--text-primary)]/10 bg-[var(--surface-raised)]">
        <div className="px-4 py-3 border-b border-[var(--text-primary)]/10 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-[var(--text-primary)]/40">BLOCKS</p>
          <button onClick={() => setCollapsed(true)} title="Collapse" className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-primary)]/30 hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
            <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[var(--text-primary)]/30 text-center leading-relaxed">
            Block structure is locked in translation mode.<br />Only text content can be edited.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={sidebarRef} className="w-60 flex-shrink-0 flex flex-col border-r border-[var(--text-primary)]/10 overflow-y-auto bg-[var(--surface-raised)]">
      <div className="px-4 py-3 border-b border-[var(--text-primary)]/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 bg-[var(--surface-overlay)] rounded-md p-0.5">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeTab === 'blocks' ? 'bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70'}`}
          >Blocks</button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${activeTab === 'layers' ? 'bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/70'}`}
          >
            Layers
            {sections.length > 0 && (
              <span className={`text-[9px] tabular-nums px-1 rounded-full bg-[var(--text-primary)]/10 ${activeTab === 'layers' ? 'text-[var(--text-primary)]/60' : 'text-[var(--text-primary)]/30'}`}>
                {sections.length}
              </span>
            )}
          </button>
        </div>
        <button onClick={() => setCollapsed(true)} title="Collapse panel" className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-primary)]/30 hover:text-[var(--text-primary)] hover:bg-[var(--surface-overlay)] transition-colors">
          <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
        </button>
      </div>

      {activeTab === 'layers' && <LayersPanel />}

      {activeTab === 'blocks' && (
        <BlockPalette
          search={search}
          onSearchChange={handleSearchChange}
          hovered={hovered}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          recentlyUsed={recentlyUsed}
          open={open}
          onToggleCategory={(cat) => setOpen((prev) => ({ ...prev, [cat]: !prev[cat] }))}
        />
      )}

      {hovered && activeTab === 'blocks' && (
        <BlockPreview def={hovered.def} anchorY={hovered.y} sidebarRight={sidebarRight} />
      )}
    </div>
  )
}
