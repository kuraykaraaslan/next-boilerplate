'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import type { FieldSchema } from '../../types'
import RepeaterField from '../RepeaterField'

const inputBase = 'w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10'

interface BaseProps {
  fieldKey: string
  field: FieldSchema
  value: unknown
  onUpdate: (key: string, value: unknown) => void
  inputCls: string
}

// ── Image field ────────────────────────────────────────────────────────────────

interface ImageFieldProps extends BaseProps {
  tenantId: string
  uploadingKey: string | null
  onUpload: (key: string, file: File, folder?: string) => void
}

export function ImageField({ fieldKey, field, value, onUpdate, inputCls, tenantId, uploadingKey, onUpload }: ImageFieldProps) {
  const [dragOverKey, setDragOverKey] = useState(false)
  const src = value as string

  return (
    <div className="space-y-3">
      <div
        className="relative"
        onDragOver={(e) => { e.preventDefault(); setDragOverKey(true) }}
        onDragLeave={() => setDragOverKey(false)}
        onDrop={async (e) => {
          e.preventDefault(); setDragOverKey(false)
          const file = e.dataTransfer.files?.[0]
          if (file && file.type.startsWith('image/')) onUpload(fieldKey, file, field.uploadFolder || 'content')
        }}
      >
        {src ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={field.label}
              className={`w-full h-32 object-cover rounded-md border transition-colors ${dragOverKey ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-[var(--text-primary)]/10'}`}
            />
            {dragOverKey && (
              <div className="absolute inset-0 rounded-md bg-[var(--primary)]/10 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-medium text-[var(--primary)]">Drop to replace</span>
              </div>
            )}
            <button
              onClick={() => onUpdate(fieldKey, '')}
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-red-500/80 hover:text-white transition-colors text-xs"
              title="Remove image"
            ><FontAwesomeIcon icon={faTrash} className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className={`w-full h-32 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${dragOverKey ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--text-primary)]/10'}`}>
            {dragOverKey ? (
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
        value={src ?? (field.value as string) ?? ''}
        placeholder={field.placeholder || 'Paste image URL or upload a file'}
        onChange={(e) => onUpdate(fieldKey, e.target.value)}
        className={inputCls}
      />

      <input
        type="file"
        accept={field.accept || 'image/*'}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          onUpload(fieldKey, file, field.uploadFolder || 'content')
          e.currentTarget.value = ''
        }}
        className={inputCls}
      />

      <p className="text-[11px] text-[var(--text-primary)]/35">
        {uploadingKey === fieldKey ? 'Uploading...' : 'Upload a file or paste a URL.'}
      </p>
    </div>
  )
}

// ── Number field ───────────────────────────────────────────────────────────────

export function NumberField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  const num = (value as number) ?? (field.value as number) ?? 0
  if (field.min !== undefined && field.max !== undefined) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={num}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => onUpdate(fieldKey, Number(e.target.value))}
            className="flex-1 accent-[var(--primary)] h-1.5 cursor-pointer"
          />
          <input
            type="number"
            value={num}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onUpdate(fieldKey, Number(e.target.value))}
            onBlur={(e) => {
              let v = Number(e.target.value)
              if (field.min !== undefined) v = Math.max(v, field.min)
              if (field.max !== undefined) v = Math.min(v, field.max)
              onUpdate(fieldKey, v)
            }}
            className="w-16 px-2 py-1.5 rounded-md text-xs text-center bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 text-[var(--text-primary)] outline-none"
          />
        </div>
      </div>
    )
  }
  return (
    <input
      type="number"
      value={num}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(e) => onUpdate(fieldKey, Number(e.target.value))}
      onBlur={(e) => {
        let v = Number(e.target.value)
        if (field.min !== undefined) v = Math.max(v, field.min)
        if (field.max !== undefined) v = Math.min(v, field.max)
        onUpdate(fieldKey, v)
      }}
      className={inputCls}
    />
  )
}

// ── JSON field ─────────────────────────────────────────────────────────────────

interface JsonFieldProps extends BaseProps {
  jsonError: boolean
  onJsonChange: (key: string, raw: string, parsed: unknown | null, hasError: boolean) => void
}

export function JsonField({ fieldKey, field, value, inputCls, jsonError, onJsonChange }: JsonFieldProps) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <div className="space-y-1">
      <textarea
        value={raw}
        placeholder={field.placeholder}
        rows={8}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value)
            onJsonChange(fieldKey, e.target.value, parsed, false)
          } catch {
            onJsonChange(fieldKey, e.target.value, null, true)
          }
        }}
        className={`${inputBase} resize-none font-mono text-xs ${jsonError ? 'border-red-500/60' : ''}`}
      />
      {jsonError && (
        <p className="text-[11px] text-red-500">Invalid JSON — changes won&apos;t be saved until fixed.</p>
      )}
    </div>
  )
}

// ── Repeater field wrapper ─────────────────────────────────────────────────────

export function RepeaterFieldWrapper({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  if (!field.fields) return null
  return (
    <RepeaterField
      propKey={fieldKey}
      subFields={field.fields}
      items={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
      onChange={(next) => onUpdate(fieldKey, next)}
      inputCls={inputCls}
    />
  )
}
