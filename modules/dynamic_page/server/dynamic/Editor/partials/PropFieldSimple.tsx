'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import type { FieldSchema, FieldOption } from '../../types'

const optVal = (o: FieldOption): string => (typeof o === 'string' ? o : o.value)
const optLabel = (o: FieldOption): string => (typeof o === 'string' ? o : o.label)

interface BaseProps {
  fieldKey: string
  field: FieldSchema
  value: unknown
  onUpdate: (key: string, value: unknown) => void
  inputCls: string
}

export function TextField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <input
      type="text"
      value={(value as string) ?? (field.value as string) ?? ''}
      placeholder={field.placeholder}
      onChange={(e) => onUpdate(fieldKey, e.target.value)}
      className={inputCls}
    />
  )
}

export function UrlField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <input
      type="url"
      value={(value as string) ?? (field.value as string) ?? ''}
      placeholder={field.placeholder}
      onChange={(e) => onUpdate(fieldKey, e.target.value)}
      className={inputCls}
    />
  )
}

export function DatetimeField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <input
      type="datetime-local"
      value={(value as string) ?? (field.value as string) ?? ''}
      onChange={(e) => onUpdate(fieldKey, e.target.value)}
      className={inputCls}
    />
  )
}

export function TextareaField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <textarea
      value={(value as string) ?? (field.value as string) ?? ''}
      placeholder={field.placeholder}
      rows={3}
      onChange={(e) => onUpdate(fieldKey, e.target.value)}
      className={`${inputCls} resize-none`}
    />
  )
}

export function RichTextField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <textarea
      value={(value as string) ?? ''}
      placeholder={field.placeholder || 'Enter HTML content…'}
      rows={6}
      onChange={(e) => onUpdate(fieldKey, e.target.value)}
      className={`${inputCls} resize-none font-mono text-xs`}
    />
  )
}

export function ColorField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={(value as string) || '#000000'}
        onChange={(e) => onUpdate(fieldKey, e.target.value)}
        className="w-9 h-8 rounded cursor-pointer border-0 p-0.5 bg-transparent"
      />
      <input
        type="text"
        value={(value as string) ?? ''}
        onChange={(e) => onUpdate(fieldKey, e.target.value)}
        className={`flex-1 ${inputCls}`}
      />
      {(value as string) && (
        <button
          onClick={() => onUpdate(fieldKey, '')}
          className="text-xs px-2 py-1 rounded text-[var(--text-primary)]/40 hover:text-red-500 transition-colors"
          title="Clear color"
        >
          <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export function BooleanField({ fieldKey, field, value, onUpdate }: BaseProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={(value as boolean) ?? (field.value as boolean) ?? false}
        onChange={(e) => onUpdate(fieldKey, e.target.checked)}
        className="w-4 h-4 rounded accent-[var(--primary)]"
      />
      <span className="text-sm text-[var(--text-primary)]/60">{field.placeholder || 'Enabled'}</span>
    </label>
  )
}

export function SelectField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  return (
    <select
      value={(value as string) ?? (field.value as string) ?? ''}
      onChange={(e) => onUpdate(fieldKey, e.target.value)}
      className={inputCls}
    >
      {field.options?.map((opt) => (
        <option key={optVal(opt)} value={optVal(opt)}>{optLabel(opt)}</option>
      ))}
    </select>
  )
}

export function MultiSelectField({ fieldKey, field, value, onUpdate, inputCls }: BaseProps) {
  const current = Array.isArray(value) ? (value as string[]) : []
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {current.map((val) => (
          <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
            {val}
            <button
              onClick={() => onUpdate(fieldKey, current.filter((v) => v !== val))}
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
            if (!current.includes(e.target.value)) onUpdate(fieldKey, [...current, e.target.value])
            e.target.value = ''
          }}
          className={inputCls}
        >
          <option value="">Add option…</option>
          {field.options.map((opt) => {
            const v = optVal(opt); const l = optLabel(opt)
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
            if (!current.includes(val)) onUpdate(fieldKey, [...current, val])
            e.currentTarget.value = ''
          }}
        />
      )}
    </div>
  )
}
