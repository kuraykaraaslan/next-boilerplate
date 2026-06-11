'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons'
import type { FieldSchema } from '../../types'
import {
  TextField, UrlField, DatetimeField, TextareaField, RichTextField,
  ColorField, BooleanField, SelectField, MultiSelectField,
} from './PropFieldSimple'
import { ImageField, NumberField, JsonField, RepeaterFieldWrapper } from './PropFieldComplex'

const inputCls = 'w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10'

interface PropFieldRendererProps {
  fieldKey: string
  field: FieldSchema
  value: unknown
  defaultValue: unknown
  tenantId: string
  uploadingKey: string | null
  jsonError: boolean
  onUpdate: (key: string, value: unknown) => void
  onUpload: (key: string, file: File, folder?: string) => void
  onJsonChange: (key: string, raw: string, parsed: unknown | null, hasError: boolean) => void
}

export function PropFieldRenderer({
  fieldKey, field, value, defaultValue, tenantId,
  uploadingKey, jsonError, onUpdate, onUpload, onJsonChange,
}: PropFieldRendererProps) {
  const isModified = defaultValue !== undefined &&
    value !== undefined &&
    JSON.stringify(value) !== JSON.stringify(defaultValue)

  const base = { fieldKey, field, value, onUpdate, inputCls }

  return (
    <div key={fieldKey}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-[var(--text-primary)]/55 flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
          {isModified && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" title="Modified from default" />
          )}
        </label>
        {defaultValue !== undefined && (
          <button
            onClick={() => onUpdate(fieldKey, defaultValue)}
            title="Reset to default"
            className="text-[10px] text-[var(--text-primary)]/25 hover:text-[var(--text-primary)]/60 transition-colors px-1 rounded"
          >
            <FontAwesomeIcon icon={faArrowRotateLeft} className="w-3 h-3" />
          </button>
        )}
      </div>

      {field.type === 'text'       && <TextField {...base} />}
      {field.type === 'url'        && <UrlField {...base} />}
      {field.type === 'datetime'   && <DatetimeField {...base} />}
      {field.type === 'textarea'   && <TextareaField {...base} />}
      {field.type === 'rich-text'  && <RichTextField {...base} />}
      {field.type === 'color'      && <ColorField {...base} />}
      {field.type === 'boolean'    && <BooleanField {...base} />}
      {field.type === 'select'     && <SelectField {...base} />}
      {field.type === 'multi-select' && <MultiSelectField {...base} />}
      {field.type === 'number'     && <NumberField {...base} />}
      {field.type === 'img'        && (
        <ImageField {...base} tenantId={tenantId} uploadingKey={uploadingKey} onUpload={onUpload} />
      )}
      {field.type === 'json'       && (
        <JsonField {...base} jsonError={jsonError} onJsonChange={onJsonChange} />
      )}
      {field.type === 'repeater'   && <RepeaterFieldWrapper {...base} />}

      {field.description && (
        <p className="mt-1.5 text-[11px] text-[var(--text-primary)]/35 leading-snug">{field.description}</p>
      )}
    </div>
  )
}
