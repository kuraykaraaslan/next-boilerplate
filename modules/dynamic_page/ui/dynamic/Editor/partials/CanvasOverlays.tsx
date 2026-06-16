'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useDndContext, useDroppable } from '@dnd-kit/core'
import { getCodeBlocks } from '../../utils/BlockRegistry'
import { useEditorStore } from '../stores/editorStore'

// ── Quick Add Popover ─────────────────────────────────────────────────────────

interface QuickAddPopoverProps {
  index: number; x: number; y: number; onClose: () => void
}

export function QuickAddPopover({ index, x, y, onClose }: QuickAddPopoverProps) {
  const addBlock = useEditorStore((s) => s.addBlock)
  const blockDefs = useEditorStore((s) => s.blockDefs)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const popoverW = 208
  const popoverH = 280
  const margin = 8
  const left = Math.min(Math.max(x, margin), window.innerWidth - popoverW - margin)
  const top = Math.min(Math.max(y, margin), window.innerHeight - popoverH - margin)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const allDefs = [...getCodeBlocks(), ...blockDefs]
  const q = search.trim().toLowerCase()
  const filtered = q
    ? allDefs.filter((d) => {
        if (d.label.toLowerCase().includes(q)) return true
        const tags = 'tags' in d ? (d.tags ?? []) : []
        return tags.some((t: string) => t.toLowerCase().includes(q))
      })
    : allDefs

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[var(--surface-base)] border border-[var(--text-primary)]/10 rounded-xl shadow-2xl p-2 w-52"
      style={{ top, left }}
    >
      <input
        ref={inputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search blocks…"
        className="text-xs bg-[var(--surface-raised)] border border-[var(--text-primary)]/10 rounded-lg px-2.5 py-1.5 mb-2 w-full outline-none focus:border-[var(--primary)]/40 text-[var(--text-primary)]"
      />
      <div className="max-h-52 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-center py-2 text-[var(--text-primary)]/30">No blocks found</p>
        ) : (
          filtered.map((def) => (
            <button
              key={def.type}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-primary)] flex items-center gap-1.5"
              onClick={() => { addBlock(def.type, index); onClose() }}
            >
              {'icon' in def && def.icon ? <span>{def.icon as React.ReactNode}</span> : null}
              {def.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ── Block Context Menu ────────────────────────────────────────────────────────

interface BlockContextMenuProps {
  blockId: string; x: number; y: number; onClose: () => void
}

export function BlockContextMenu({ blockId, x, y, onClose }: BlockContextMenuProps) {
  const deleteBlock = useEditorStore((s) => s.deleteBlock)
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock)
  const copyBlock = useEditorStore((s) => s.copyBlock)
  const moveBlock = useEditorStore((s) => s.moveBlock)
  const toggleBlockHidden = useEditorStore((s) => s.toggleBlockHidden)
  const sections = useEditorStore((s) => s.sections)
  const block = sections.find((b) => b.id === blockId)
  const ref = useRef<HTMLDivElement>(null)

  const menuW = 176
  const menuH = 200
  const margin = 8
  const left = Math.min(Math.max(x, margin), window.innerWidth - menuW - margin)
  const top = Math.min(Math.max(y, margin), window.innerHeight - menuH - margin)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const rowCls = 'w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-primary)]'
  const hintCls = 'text-[var(--text-primary)]/25 text-[10px] ml-auto'

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[var(--surface-base)] border border-[var(--text-primary)]/10 rounded-xl shadow-2xl py-1 w-44"
      style={{ top, left }}
    >
      <button className={rowCls} onClick={() => { duplicateBlock(blockId); onClose() }}>Duplicate <span className={hintCls}>Ctrl+D</span></button>
      <button className={rowCls} onClick={() => { copyBlock(blockId); onClose() }}>Copy <span className={hintCls}>Ctrl+C</span></button>
      <button className={rowCls} onClick={() => { toggleBlockHidden(blockId); onClose() }}>{block?.hidden ? 'Show' : 'Hide'}</button>
      <button className={rowCls} onClick={() => { moveBlock(blockId, -1); onClose() }}>Move Up</button>
      <button className={rowCls} onClick={() => { moveBlock(blockId, 1); onClose() }}>Move Down</button>
      <div className="my-1 border-t border-[var(--text-primary)]/10" />
      <button
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)] transition-colors text-red-500"
        onClick={() => { deleteBlock(blockId); onClose() }}
      >
        Delete <span className={hintCls}>⌫</span>
      </button>
    </div>
  )
}

// ── Insert Gap ─────────────────────────────────────────────────────────────────

interface InsertGapProps {
  index: number
  onQuickAdd: (index: number, x: number, y: number) => void
}

export function InsertGap({ index, onQuickAdd }: InsertGapProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `insert-gap-${index}` })
  const { active } = useDndContext()
  const isFromSidebar = active?.data.current?.fromSidebar ?? false
  const [hovered, setHovered] = useState(false)

  if (isFromSidebar) {
    return (
      <div
        ref={setNodeRef}
        className={`mx-3 rounded-lg border-2 border-dashed transition-all duration-150 ${
          isOver ? 'h-10 border-[var(--primary)] bg-[var(--primary)]/10' : 'h-2 border-[var(--text-primary)]/20'
        }`}
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      className="relative h-5 flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <>
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[var(--primary)]/20" />
          <button
            className="absolute z-20 flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--primary)] text-white shadow hover:scale-105 transition-transform select-none"
            onClick={(e) => { e.stopPropagation(); onQuickAdd(index, e.clientX, e.clientY) }}
          >
            +
          </button>
        </>
      )}
    </div>
  )
}

// ── Sidebar Drop Target ────────────────────────────────────────────────────────

export function SidebarDropTarget({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'insert-gap-0' })
  const { active } = useDndContext()
  const isFromSidebar = active?.data.current?.fromSidebar ?? false

  return (
    <div
      ref={setNodeRef}
      className={`min-h-full transition-all duration-150 ${isFromSidebar && isOver ? 'bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/30 ring-inset' : ''}`}
    >
      {children}
    </div>
  )
}
