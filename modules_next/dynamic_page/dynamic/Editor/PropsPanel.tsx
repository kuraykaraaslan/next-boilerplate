'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { BlockData, FieldSchema, FieldOption } from '../types'
import { getCodeBlock } from '../utils/BlockRegistry'
import { useEditorStore } from './stores/editorStore'
import RepeaterField from './RepeaterField'
import { toast } from '@/modules_next/common/ui/toast.store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRotateLeft, faXmark, faTrash, faCopy } from '@fortawesome/free-solid-svg-icons'

interface Props {
  block: BlockData | null
  onChange: (props: Record<string, unknown>) => void
  collapseButton?: React.ReactNode
}

const optVal = (o: FieldOption): string => (typeof o === 'string' ? o : o.value)
const optLabel = (o: FieldOption): string => (typeof o === 'string' ? o : o.label)

function shouldShow(field: FieldSchema, props: Record<string, unknown>): boolean {
  if (!field.showIf) return true
  return Object.entries(field.showIf).every(([k, v]) =>
    Array.isArray(v) ? v.includes(props[k]) : props[k] === v
  )
}

export default function PropsPanel({ block, onChange, collapseButton }: Props) {
  const [localProps, setLocalProps] = useState<Record<string, unknown>>({})
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [jsonErrors, setJsonErrors] = useState<Record<string, boolean>>({})
  const [fieldSearch, setFieldSearch] = useState('')
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const groupOpenRef = useRef<Record<string, boolean>>({})
  const localPropsRef = useRef<Record<string, unknown>>({})
  const blockDefs = useEditorStore((s) => s.blockDefs)
  const tenantId = useEditorStore((s) => s.tenantId)
  const snapshotForUndo = useEditorStore((s) => s.snapshotForUndo)
  const updateBlockLabel = useEditorStore((s) => s.updateBlockLabel)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSnapshotted = useRef(false)

  useEffect(() => {
    if (!block) return

    const codeDef = getCodeBlock(block.type)
    const dbDef = blockDefs.find((d) => d.type === block.type)
    const defaultProps = codeDef?.defaultProps ?? dbDef?.defaultProps ?? {}
    const schema = codeDef?.schema ?? dbDef?.schema ?? {}
    const nextProps = { ...defaultProps, ...(block.props ?? {}) }

    for (const [key, field] of Object.entries(schema as Record<string, FieldSchema>)) {
      if (nextProps[key] === undefined && field.value !== undefined) {
        nextProps[key] = field.value
      }
    }

    localPropsRef.current = nextProps
    setLocalProps(nextProps)
    setJsonErrors({})
    setFieldSearch('')
    hasSnapshotted.current = false
  }, [block?.id, block?.type, blockDefs])

  const update = useCallback((key: string, value: unknown) => {
    if (!hasSnapshotted.current) {
      snapshotForUndo()
      hasSnapshotted.current = true
    }
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

  const inputCls = 'w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10'

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

  const renderField = (key: string, field: FieldSchema) => (
    <div key={key}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-[var(--text-primary)]/55 flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
          {defaultProps[key] !== undefined &&
            localProps[key] !== undefined &&
            JSON.stringify(localProps[key]) !== JSON.stringify(defaultProps[key]) && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" title="Modified from default" />
            )}
        </label>
        {defaultProps[key] !== undefined && (
          <button
            onClick={() => update(key, defaultProps[key])}
            title="Reset to default"
            className="text-[10px] text-[var(--text-primary)]/25 hover:text-[var(--text-primary)]/60 transition-colors px-1 rounded"
          >
            <FontAwesomeIcon icon={faArrowRotateLeft} className="w-3 h-3" />
          </button>
        )}
      </div>

      {field.type === 'text' && (
        <input
          type="text"
          value={(localProps[key] as string) ?? (field.value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => update(key, e.target.value)}
          className={inputCls}
        />
      )}

      {field.type === 'url' && (
        <input
          type="url"
          value={(localProps[key] as string) ?? (field.value as string) ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => update(key, e.target.value)}
          className={inputCls}
        />
      )}

      {field.type === 'datetime' && (
        <input
          type="datetime-local"
          value={(localProps[key] as string) ?? (field.value as string) ?? ''}
          onChange={(e) => update(key, e.target.value)}
          className={inputCls}
        />
      )}

      {field.type === 'img' && (
        <div className="space-y-3">
          <div
            className="relative"
            onDragOver={(e) => { e.preventDefault(); setDragOverKey(key) }}
            onDragLeave={() => setDragOverKey(null)}
            onDrop={async (e) => {
              e.preventDefault()
              setDragOverKey(null)
              const file = e.dataTransfer.files?.[0]
              if (file && file.type.startsWith('image/')) {
                await uploadImage(key, file, field.uploadFolder || 'content')
              }
            }}
          >
            {typeof localProps[key] === 'string' && (localProps[key] as string) ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localProps[key] as string}
                  alt={field.label}
                  className={`w-full h-32 object-cover rounded-md border transition-colors ${dragOverKey === key ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-[var(--text-primary)]/10'}`}
                />
                {dragOverKey === key && (
                  <div className="absolute inset-0 rounded-md bg-[var(--primary)]/10 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-medium text-[var(--primary)]">Drop to replace</span>
                  </div>
                )}
                <button
                  onClick={() => update(key, '')}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-red-500/80 hover:text-white transition-colors text-xs"
                  title="Remove image"
                ><FontAwesomeIcon icon={faTrash} className="w-3 h-3" /></button>
              </div>
            ) : (
              <div className={`w-full h-32 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${dragOverKey === key ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--text-primary)]/10'}`}>
                {dragOverKey === key ? (
                  <span className="text-xs font-medium text-[var(--primary)]">Drop image here</span>
                ) : (
                  <>
                    <span className="text-xs text-center px-3 text-[var(--text-primary)]/35">No image selected</span>
                    <span className="text-[10px] text-[var(--text-primary)]/25">Drag & drop or use below</span>
                  </>
                )}
              </div>
            )}
          </div>

          <input
            type="text"
            value={(localProps[key] as string) ?? (field.value as string) ?? ''}
            placeholder={field.placeholder || 'Paste image URL or upload a file'}
            onChange={(e) => update(key, e.target.value)}
            className={inputCls}
          />

          <input
            type="file"
            accept={field.accept || 'image/*'}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              await uploadImage(key, file, field.uploadFolder || 'content')
              e.currentTarget.value = ''
            }}
            className={inputCls}
          />

          <p className="text-[11px] text-[var(--text-primary)]/35">
            {uploadingKey === key ? 'Uploading...' : 'Upload a file or paste a URL.'}
          </p>
        </div>
      )}

      {field.type === 'textarea' && (
        <textarea
          value={(localProps[key] as string) ?? (field.value as string) ?? ''}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => update(key, e.target.value)}
          className={`${inputCls} resize-none`}
        />
      )}

      {field.type === 'rich-text' && (
        <textarea
          value={(localProps[key] as string) ?? ''}
          placeholder={field.placeholder || 'Enter HTML content…'}
          rows={6}
          onChange={(e) => update(key, e.target.value)}
          className={`${inputCls} resize-none font-mono text-xs`}
        />
      )}

      {field.type === 'color' && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={(localProps[key] as string) || '#000000'}
            onChange={(e) => update(key, e.target.value)}
            className="w-9 h-8 rounded cursor-pointer border-0 p-0.5 bg-transparent"
          />
          <input
            type="text"
            value={(localProps[key] as string) ?? ''}
            onChange={(e) => update(key, e.target.value)}
            className={`flex-1 ${inputCls}`}
          />
          {(localProps[key] as string) && (
            <button
              onClick={() => update(key, '')}
              className="text-xs px-2 py-1 rounded text-[var(--text-primary)]/40 hover:text-red-500 transition-colors"
              title="Clear color"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {field.type === 'boolean' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={(localProps[key] as boolean) ?? (field.value as boolean) ?? false}
            onChange={(e) => update(key, e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--primary)]"
          />
          <span className="text-sm text-[var(--text-primary)]/60">{field.placeholder || 'Enabled'}</span>
        </label>
      )}

      {field.type === 'number' && (
        field.min !== undefined && field.max !== undefined ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={(localProps[key] as number) ?? (field.value as number) ?? 0}
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                onChange={(e) => update(key, Number(e.target.value))}
                className="flex-1 accent-[var(--primary)] h-1.5 cursor-pointer"
              />
              <input
                type="number"
                value={(localProps[key] as number) ?? (field.value as number) ?? 0}
                min={field.min}
                max={field.max}
                step={field.step}
                onChange={(e) => update(key, Number(e.target.value))}
                onBlur={(e) => {
                  let v = Number(e.target.value)
                  if (field.min !== undefined) v = Math.max(v, field.min)
                  if (field.max !== undefined) v = Math.min(v, field.max)
                  update(key, v)
                }}
                className="w-16 px-2 py-1.5 rounded-md text-xs text-center bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>
        ) : (
          <input
            type="number"
            value={(localProps[key] as number) ?? (field.value as number) ?? 0}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => update(key, Number(e.target.value))}
            onBlur={(e) => {
              let v = Number(e.target.value)
              if (field.min !== undefined) v = Math.max(v, field.min)
              if (field.max !== undefined) v = Math.min(v, field.max)
              update(key, v)
            }}
            className={inputCls}
          />
        )
      )}

      {field.type === 'select' && (
        <select
          value={(localProps[key] as string) ?? (field.value as string) ?? ''}
          onChange={(e) => update(key, e.target.value)}
          className={inputCls}
        >
          {field.options?.map((opt) => (
            <option key={optVal(opt)} value={optVal(opt)}>
              {optLabel(opt)}
            </option>
          ))}
        </select>
      )}

      {field.type === 'multi-select' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(Array.isArray(localProps[key]) ? (localProps[key] as string[]) : []).map((val) => (
              <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                {val}
                <button
                  onClick={() => update(key, (localProps[key] as string[]).filter((v) => v !== val))}
                  className="hover:text-red-500 transition-colors leading-none"
                ><FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          {field.options && field.options.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return
                const current = Array.isArray(localProps[key]) ? (localProps[key] as string[]) : []
                if (!current.includes(e.target.value)) update(key, [...current, e.target.value])
                e.target.value = ''
              }}
              className={inputCls}
            >
              <option value="">Add option…</option>
              {field.options.map((opt) => {
                const v = optVal(opt)
                const l = optLabel(opt)
                const current = Array.isArray(localProps[key]) ? (localProps[key] as string[]) : []
                if (current.includes(v)) return null
                return <option key={v} value={v}>{l}</option>
              })}
            </select>
          ) : (
            <input
              type="text"
              placeholder={field.placeholder || 'Type and press Enter…'}
              className={inputCls}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const val = e.currentTarget.value.trim()
                if (!val) return
                const current = Array.isArray(localProps[key]) ? (localProps[key] as string[]) : []
                if (!current.includes(val)) update(key, [...current, val])
                e.currentTarget.value = ''
              }}
            />
          )}
        </div>
      )}

      {field.type === 'json' && (
        <div className="space-y-1">
          <textarea
            value={
              typeof localProps[key] === 'string'
                ? (localProps[key] as string)
                : JSON.stringify(localProps[key], null, 2)
            }
            placeholder={field.placeholder}
            rows={8}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                update(key, parsed)
                setJsonErrors((prev) => ({ ...prev, [key]: false }))
              } catch {
                setJsonErrors((prev) => ({ ...prev, [key]: true }))
                setLocalProps((prev) => ({ ...prev, [key]: e.target.value }))
              }
            }}
            className={`${inputCls} resize-none font-mono text-xs ${jsonErrors[key] ? 'border-red-500/60' : ''}`}
          />
          {jsonErrors[key] && (
            <p className="text-[11px] text-red-500">Invalid JSON — changes won&apos;t be saved until fixed.</p>
          )}
        </div>
      )}

      {field.type === 'repeater' && field.fields && (
        <RepeaterField
          propKey={key}
          subFields={field.fields}
          items={
            Array.isArray(localProps[key])
              ? (localProps[key] as Record<string, unknown>[])
              : []
          }
          onChange={(next) => update(key, next)}
          inputCls={inputCls}
        />
      )}

      {field.description && (
        <p className="mt-1.5 text-[11px] text-[var(--text-primary)]/35 leading-snug">{field.description}</p>
      )}
    </div>
  )

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-[var(--text-primary)]/10 overflow-y-auto bg-[var(--surface-raised)]">
      <div className="px-4 py-4 border-b border-[var(--text-primary)]/10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{def.label}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(localProps, null, 2))
                toast.success('Props copied as JSON')
              }}
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
        {ungrouped.map(([key, field]) => renderField(key, field))}

        {Object.entries(groupMap).map(([groupName, entries]) => (
          <details
            key={groupName}
            className="group/group border border-[var(--text-primary)]/10 rounded-lg overflow-hidden"
            open={groupOpenRef.current[groupName] !== false}
            onToggle={(e) => { groupOpenRef.current[groupName] = (e.currentTarget as HTMLDetailsElement).open }}
          >
            <summary className="flex items-center justify-between px-3 py-2 bg-[var(--surface-overlay)]/50 cursor-pointer list-none select-none">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-primary)]/50">{groupName}</span>
              <svg
                width="10" height="10" viewBox="0 0 12 12" fill="none"
                className="text-[var(--text-primary)]/30 transition-transform group-open/group:rotate-90"
              >
                <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="p-3 space-y-4 border-t border-[var(--text-primary)]/10">
              {entries.map(([key, field]) => renderField(key, field))}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
