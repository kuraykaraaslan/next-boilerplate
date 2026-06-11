'use client'

import React, { memo, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BlockData } from '../../types'
import { getCodeBlock } from '../../utils/BlockRegistry'
import { useEditorStore } from '../stores/editorStore'
import TemplateBlockRenderer from '../../partials/TemplateBlockRenderer'
import { BlockEditorErrorBoundary } from '../../partials/BlockErrorBoundary'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpDown, faEye, faEyeSlash, faClone, faGripVertical, faTrash } from '@fortawesome/free-solid-svg-icons'

function ResizeHandle({ blockId }: { blockId: string }) {
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps)
  const snapshotForUndo = useEditorStore((s) => s.snapshotForUndo)
  const [dragging, setDragging] = useState(false)
  const [liveH, setLiveH] = useState(0)

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    snapshotForUndo()

    const container = (e.currentTarget as HTMLElement).parentElement!
    const startY = e.clientY
    const startH = container.offsetHeight
    setDragging(true)
    setLiveH(startH)

    const onMove = (ev: MouseEvent) => {
      const newH = Math.max(80, startH + (ev.clientY - startY))
      setLiveH(newH)
      const block = useEditorStore.getState().sections.find((b) => b.id === blockId)
      if (block) updateBlockProps(blockId, { ...block.props, blockHeight: Math.round(newH) })
    }
    const onUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-0 left-0 right-0 z-30 h-5 flex items-end justify-center pb-0.5 cursor-ns-resize select-none opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {dragging && <div className="absolute inset-x-0 bottom-2.5 h-0.5 bg-[var(--primary)]/60" />}
      <div className={[
        'relative flex items-center gap-1 px-2 py-0.5 rounded-t text-[10px] font-medium',
        dragging ? 'bg-[var(--primary)] text-white' : 'bg-black/60 text-white/70',
      ].join(' ')}>
        <FontAwesomeIcon icon={faUpDown} className="w-2.5 h-2.5" />
        {dragging ? `${Math.round(liveH)}px` : 'Resize'}
      </div>
    </div>
  )
}

export interface SortableBlockProps {
  block: BlockData
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleHidden: () => void
  onContextMenu: (e: React.MouseEvent, blockId: string) => void
  isTranslationMode?: boolean
}

export const SortableBlock = memo(
  function SortableBlock({ block, isSelected, onSelect, onDelete, onDuplicate, onToggleHidden, onContextMenu, isTranslationMode }: SortableBlockProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
    const blockDefs = useEditorStore((s) => s.blockDefs)

    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
    const codeDef = getCodeBlock(block.type)
    const dbDef = blockDefs.find((d) => d.type === block.type)
    const label = codeDef?.label ?? dbDef?.label ?? block.type

    if (!codeDef && !dbDef) return null

    return (
      <div
        ref={setNodeRef}
        style={style}
        data-block-id={block.id}
        className={`relative group cursor-pointer ${block.hidden ? 'opacity-40' : ''}`}
        onClick={onSelect}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, block.id) }}
      >
        <div
          className="absolute inset-0 z-10 pointer-events-none transition-all"
          style={{
            outline: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
            outlineOffset: '-2px',
          }}
        />
        {block.hidden && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <span className="bg-black/60 text-white/70 text-[10px] font-semibold px-2 py-0.5 rounded">HIDDEN</span>
          </div>
        )}
        <div className={`absolute top-2 right-2 z-20 flex items-center gap-1.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <span className="px-2 py-1 rounded text-xs font-medium bg-black/75 text-white/70">{block.label || label}</span>
          {!isTranslationMode && (
            <>
              <button
                className="px-2 py-1 rounded text-xs font-medium bg-black/75 text-white/70 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); onToggleHidden() }}
                title={block.hidden ? 'Show block' : 'Hide block'}
              >
                <FontAwesomeIcon icon={block.hidden ? faEye : faEyeSlash} className="w-3 h-3" />
              </button>
              <button
                className="px-2 py-1 rounded text-xs font-medium bg-black/75 text-white/70 hover:text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); onDuplicate() }}
                title="Duplicate block"
              >
                <FontAwesomeIcon icon={faClone} className="w-3 h-3" />
              </button>
              <div
                {...attributes}
                {...listeners}
                className="px-2 py-1 rounded text-xs font-medium cursor-grab active:cursor-grabbing bg-black/75 text-white/70"
                onClick={(e) => e.stopPropagation()}
                title="Drag to reorder"
              >
                <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3" />
              </div>
              <button
                className="px-2 py-1 rounded text-xs font-medium bg-red-500/85 text-white"
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                title="Delete block"
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
        <BlockEditorErrorBoundary blockId={block.id} onDelete={onDelete}>
          {codeDef ? (
            <codeDef.Component {...block.props} />
          ) : (
            <TemplateBlockRenderer template={dbDef!.template} props={block.props} />
          )}
        </BlockEditorErrorBoundary>
        {!isTranslationMode && <ResizeHandle blockId={block.id} />}
      </div>
    )
  },
  (prev, next) =>
    prev.block === next.block &&
    prev.isSelected === next.isSelected &&
    prev.isTranslationMode === next.isTranslationMode
)
