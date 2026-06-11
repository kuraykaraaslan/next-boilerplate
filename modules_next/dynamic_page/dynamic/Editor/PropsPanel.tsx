'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { BlockData, FieldSchema } from '../types'
import { getCodeBlock } from '../utils/BlockRegistry'
import { useEditorStore } from './stores/editorStore'
import { toast } from '@/modules_next/common/ui/toast.store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy } from '@fortawesome/free-solid-svg-icons'
import { PropFieldRenderer } from './partials/PropFieldRenderer'

interface Props {
  block: BlockData | null
  onChange: (props: Record<string, unknown>) => void
  collapseButton?: React.ReactNode
}

function shouldShow(field: FieldSchema, props: Record<string, unknown>): boolean {
  if (!field.showIf) return true
  return Object.entries(field.showIf).every(([k, v]) =>
    Array.isArray(v) ? v.includes(props[k]) : props[k] === v
  )
}

export default function PropsPanel({ block, onChange, collapseButton }: Props) {
  const [localProps, setLocalProps]     = useState<Record<string, unknown>>({})
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [jsonErrors, setJsonErrors]     = useState<Record<string, boolean>>({})
  const [fieldSearch, setFieldSearch]   = useState('')
  const groupOpenRef  = useRef<Record<string, boolean>>({})
  const localPropsRef = useRef<Record<string, unknown>>({})
  const blockDefs     = useEditorStore((s) => s.blockDefs)
  const tenantId      = useEditorStore((s) => s.tenantId)
  const snapshotForUndo  = useEditorStore((s) => s.snapshotForUndo)
  const updateBlockLabel = useEditorStore((s) => s.updateBlockLabel)
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSnapshotted   = useRef(false)

  useEffect(() => {
    if (!block) return
    const codeDef = getCodeBlock(block.type)
    const dbDef = blockDefs.find((d) => d.type === block.type)
    const defaultProps = codeDef?.defaultProps ?? dbDef?.defaultProps ?? {}
    const schema = codeDef?.schema ?? dbDef?.schema ?? {}
    const nextProps = { ...defaultProps, ...(block.props ?? {}) }
    for (const [key, field] of Object.entries(schema as Record<string, FieldSchema>)) {
      if (nextProps[key] === undefined && (field as FieldSchema).value !== undefined) {
        nextProps[key] = (field as FieldSchema).value
      }
    }
    localPropsRef.current = nextProps
    setLocalProps(nextProps)
    setJsonErrors({})
    setFieldSearch('')
    hasSnapshotted.current = false
  }, [block?.id, block?.type, blockDefs])

  const update = useCallback((key: string, value: unknown) => {
    if (!hasSnapshotted.current) { snapshotForUndo(); hasSnapshotted.current = true }
    const next = { ...localPropsRef.current, [key]: value }
    localPropsRef.current = next
    setLocalProps(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(next), 200)
  }, [onChange, snapshotForUndo])

  const uploadImage = async (key: string, file: File, uploadFolder = 'content') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', uploadFolder)
    setUploadingKey(key)
    try {
      const res = await fetch(`/tenant/${tenantId}/api/storage`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) update(key, data.url)
    } finally {
      setUploadingKey(null)
    }
  }

  const handleJsonChange = (key: string, _raw: string, parsed: unknown | null, hasError: boolean) => {
    setJsonErrors((prev) => ({ ...prev, [key]: hasError }))
    if (!hasError && parsed !== null) {
      update(key, parsed)
    } else {
      setLocalProps((prev) => ({ ...prev, [key]: _raw }))
    }
  }

  if (!block) {
    return (
      <div className="w-72 flex-shrink-0 flex flex-col border-l border-[var(--text-primary)]/10 bg-[var(--surface-raised)]">
        <div className="px-4 py-3 border-b border-[var(--text-primary)]/10 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-[var(--text-primary)]/40">PROPERTIES</p>
          {collapseButton}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-center px-6 text-[var(--text-primary)]/30">
            Click a block on the canvas to edit its properties.
          </p>
        </div>
      </div>
    )
  }

  const codeDef = getCodeBlock(block.type)
  const dbDef = blockDefs.find((d) => d.type === block.type)
  const def = codeDef ?? dbDef
  if (!def) return null

  const schema = (codeDef?.schema ?? dbDef?.schema ?? {}) as Record<string, FieldSchema>
  const defaultProps = codeDef?.defaultProps ?? dbDef?.defaultProps ?? {}

  const visibleEntries = Object.entries(schema)
    .filter(([, f]) => shouldShow(f, localProps))
    .filter(([key, field]) => {
      if (!fieldSearch.trim()) return true
      const q = fieldSearch.toLowerCase()
      return field.label.toLowerCase().includes(q) || key.toLowerCase().includes(q)
    })
  const ungrouped = visibleEntries.filter(([, f]) => !f.group)
  const groupMap = visibleEntries
    .filter(([, f]) => f.group)
    .reduce<Record<string, [string, FieldSchema][]>>((acc, entry) => {
      const g = entry[1].group!
      if (!acc[g]) acc[g] = []
      acc[g].push(entry)
      return acc
    }, {})

  const renderEntry = ([key, field]: [string, FieldSchema]) => (
    <PropFieldRenderer
      key={key}
      fieldKey={key}
      field={field}
      value={localProps[key]}
      defaultValue={defaultProps[key]}
      tenantId={tenantId ?? ''}
      uploadingKey={uploadingKey}
      jsonError={!!jsonErrors[key]}
      onUpdate={update}
      onUpload={uploadImage}
      onJsonChange={handleJsonChange}
    />
  )

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-[var(--text-primary)]/10 overflow-y-auto bg-[var(--surface-raised)]">
      <div className="px-4 py-4 border-b border-[var(--text-primary)]/10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{def.label}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(JSON.stringify(localProps, null, 2)); toast.success('Props copied as JSON') }}
              title="Copy props as JSON"
              className="flex-shrink-0 text-[var(--text-primary)]/25 hover:text-[var(--text-primary)]/60 transition-colors p-0.5 rounded"
            >
              <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
            </button>
          </div>
          <input
            type="text"
            value={block.label ?? ''}
            onChange={(e) => updateBlockLabel(block.id, e.target.value)}
            placeholder="Custom label…"
            className="mt-1 w-full text-xs bg-transparent border-b border-[var(--text-primary)]/10 focus:border-[var(--primary)]/40 outline-none pb-0.5 text-[var(--text-primary)]/60 placeholder:text-[var(--text-primary)]/20 transition-colors"
          />
          <p className="text-xs mt-1.5 text-[var(--text-primary)]/40 leading-snug">{def.description}</p>
        </div>
        {collapseButton}
      </div>

      {Object.keys(schema).length > 4 && (
        <div className="px-4 pt-3 pb-0 border-b border-[var(--text-primary)]/10">
          <input
            type="text"
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            placeholder="Search fields…"
            className="w-full text-xs bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 rounded-md px-2.5 py-1.5 mb-3 text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 focus:outline-none focus:border-[var(--primary)]/40 transition-colors"
          />
        </div>
      )}

      <div className="p-4 space-y-5">
        {ungrouped.map(renderEntry)}
        {Object.entries(groupMap).map(([groupName, entries]) => (
          <details
            key={groupName}
            className="group/group border border-[var(--text-primary)]/10 rounded-lg overflow-hidden"
            open={groupOpenRef.current[groupName] !== false}
            onToggle={(e) => { groupOpenRef.current[groupName] = (e.currentTarget as HTMLDetailsElement).open }}
          >
            <summary className="flex items-center justify-between px-3 py-2 bg-[var(--surface-overlay)]/50 cursor-pointer list-none select-none">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)]/50">{groupName}</span>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-[var(--text-primary)]/30 transition-transform group-open/group:rotate-90">
                <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="p-3 space-y-4 border-t border-[var(--text-primary)]/10">
              {entries.map(renderEntry)}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
