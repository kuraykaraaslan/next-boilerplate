'use client'

import { useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getCodeBlock } from '../../utils/BlockRegistry'
import { useEditorStore } from '../stores/editorStore'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGripVertical, faEye, faEyeSlash, faTrash } from '@fortawesome/free-solid-svg-icons'

interface SortableLayerItemProps {
  block: { id: string; type: string; label?: string; hidden?: boolean; order: number }
  index: number
  isTranslationMode: boolean
  editingId: string | null
  editValue: string
  setEditingId: (id: string | null) => void
  setEditValue: (v: string) => void
}

function SortableLayerItem({ block, index, isTranslationMode, editingId, editValue, setEditingId, setEditValue }: SortableLayerItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `layer-${block.id}` })
  const selectedId       = useEditorStore((s) => s.selectedId)
  const setSelectedId    = useEditorStore((s) => s.setSelectedId)
  const toggleBlockHidden = useEditorStore((s) => s.toggleBlockHidden)
  const deleteBlock      = useEditorStore((s) => s.deleteBlock)
  const updateBlockLabel = useEditorStore((s) => s.updateBlockLabel)
  const blockDefs        = useEditorStore((s) => s.blockDefs)

  const codeDef = getCodeBlock(block.type)
  const dbDef   = blockDefs.find((d) => d.type === block.type)
  const label   = codeDef?.label ?? dbDef?.label ?? block.type
  const isSelected = selectedId === block.id
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        setSelectedId(block.id)
        requestAnimationFrame(() => {
          document.querySelector(`[data-block-id="${block.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      }}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors select-none group ${
        isSelected ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-primary)]/60 hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]'
      } ${block.hidden ? 'opacity-40' : ''}`}
    >
      {!isTranslationMode && (
        <div
          {...attributes}
          {...listeners}
          className="w-4 flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing text-[var(--text-primary)]/20 hover:text-[var(--text-primary)]/50 transition-colors"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <FontAwesomeIcon icon={faGripVertical} className="w-2.5 h-2.5" />
        </div>
      )}
      <span className="text-[10px] text-[var(--text-primary)]/30 w-4 text-right flex-shrink-0 tabular-nums">{index + 1}</span>
      {editingId === block.id ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => { updateBlockLabel(block.id, editValue.trim()); setEditingId(null) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { updateBlockLabel(block.id, editValue.trim()); setEditingId(null) }
            if (e.key === 'Escape') setEditingId(null)
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs font-medium bg-[var(--surface-raised)] border border-[var(--primary)]/40 rounded px-1 py-0 outline-none min-w-0"
        />
      ) : (
        <span
          className="flex-1 text-xs font-medium truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditingId(block.id); setEditValue(block.label || label) }}
          title="Double-click to rename"
        >
          {block.label || label}
        </span>
      )}
      {!isTranslationMode && (
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleBlockHidden(block.id)}
            className="w-5 h-5 flex items-center justify-center text-[11px] rounded hover:bg-[var(--text-primary)]/10 transition-colors"
            title={block.hidden ? 'Show block' : 'Hide block'}
          >
            <FontAwesomeIcon icon={block.hidden ? faEye : faEyeSlash} className="w-3 h-3" />
          </button>
          <button
            onClick={() => deleteBlock(block.id)}
            className="w-5 h-5 flex items-center justify-center text-[11px] rounded text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Delete block"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export function LayersPanel() {
  const sections      = useEditorStore((s) => s.sections)
  const reorderBlocks = useEditorStore((s) => s.reorderBlocks)
  const isTranslationMode = useEditorStore((s) => s.activeLang !== 'en')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  const handleLayerDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromId = (active.id as string).slice('layer-'.length)
    const toId   = (over.id as string).slice('layer-'.length)
    reorderBlocks(fromId, toId)
  }

  if (sorted.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-[var(--text-primary)]/30 text-center leading-relaxed">No blocks yet.<br />Add blocks from the Blocks tab.</p>
      </div>
    )
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleLayerDragEnd}>
      <SortableContext items={sorted.map((b) => `layer-${b.id}`)} strategy={verticalListSortingStrategy}>
        <div className="py-2 px-2 space-y-0.5">
          {sorted.map((block, i) => (
            <SortableLayerItem
              key={block.id}
              block={block}
              index={i}
              isTranslationMode={isTranslationMode}
              editingId={editingId}
              editValue={editValue}
              setEditingId={setEditingId}
              setEditValue={setEditValue}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
