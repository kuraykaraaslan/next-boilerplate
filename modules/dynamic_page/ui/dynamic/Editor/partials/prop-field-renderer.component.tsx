'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRotateLeft, faMobileAlt, faTabletAlt, faDesktop } from '@fortawesome/free-solid-svg-icons'
import type { FieldSchema, LinkValue } from '../../types'
import {
  TextField, UrlField, DatetimeField, TextareaField, RichTextField,
  ColorField, BooleanField, SelectField, MultiSelectField,
} from './prop-field-simple.component'
import { ImageField, NumberField, JsonField, RepeaterFieldWrapper } from './prop-field-complex.component'
import { IconPickerField } from './icon-picker-field.component'
import { LinkField } from './link-field.component'
import { ColorTokenField } from './color-token-field.component'
import { getBreakpointValue, setResponsiveProp } from '../../utils/responsive'
import type { ResponsiveValue } from '../../types'
import { useEditorStore } from '../stores/editorStore'

type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const inputCls = 'w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10'

const BREAKPOINTS: Array<{ id: Breakpoint; icon: typeof faMobileAlt; title: string }> = [
  { id: 'mobile',  icon: faMobileAlt,  title: 'Mobile'  },
  { id: 'tablet',  icon: faTabletAlt,  title: 'Tablet'  },
  { id: 'desktop', icon: faDesktop,    title: 'Desktop' },
]

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
  const previewMode = useEditorStore((s) => s.previewMode)
  // When field is responsive, activeBreakpoint follows previewMode by default
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>(previewMode as Breakpoint)

  const isModified = defaultValue !== undefined &&
    value !== undefined &&
    JSON.stringify(value) !== JSON.stringify(defaultValue)

  // For responsive fields, resolve the value for the active breakpoint
  const resolvedValue = field.responsive
    ? getBreakpointValue(value as ResponsiveValue, activeBreakpoint)
    : value

  const handleUpdate = (key: string, newVal: unknown) => {
    if (!field.responsive) {
      onUpdate(key, newVal)
      return
    }
    const next = setResponsiveProp(value as ResponsiveValue, activeBreakpoint, newVal)
    onUpdate(key, next)
  }

  const base = { fieldKey, field, value: resolvedValue, onUpdate: handleUpdate, inputCls }

  const fieldControl = (
    <>
      {field.type === 'text'       && <TextField {...base} />}
      {field.type === 'url'        && <UrlField {...base} />}
      {field.type === 'datetime'   && <DatetimeField {...base} />}
      {field.type === 'textarea'   && <TextareaField {...base} />}
      {field.type === 'rich-text'  && <RichTextField {...base} />}
      {field.type === 'color'      && <ColorField {...base} />}
      {field.type === 'color-token' && (
        <ColorTokenField
          value={resolvedValue as string | undefined}
          onChange={(v) => handleUpdate(fieldKey, v)}
        />
      )}
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
      {field.type === 'icon'       && (
        <IconPickerField
          value={resolvedValue as string | undefined}
          onChange={(v) => handleUpdate(fieldKey, v)}
        />
      )}
      {field.type === 'link'       && (
        <LinkField
          value={resolvedValue as LinkValue | undefined}
          onChange={(v) => handleUpdate(fieldKey, v)}
          placeholder={field.placeholder}
        />
      )}
    </>
  )

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
        <div className="flex items-center gap-1">
          {field.responsive && (
            <div className="flex items-center gap-0.5 mr-1">
              {BREAKPOINTS.map(({ id, icon, title }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveBreakpoint(id)}
                  title={title}
                  className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                    activeBreakpoint === id
                      ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                      : 'text-[var(--text-primary)]/25 hover:text-[var(--text-primary)]/60'
                  }`}
                >
                  <FontAwesomeIcon icon={icon} className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          )}
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
      </div>

      {fieldControl}

      {field.description && (
        <p className="mt-1.5 text-[11px] text-[var(--text-primary)]/35 leading-snug">{field.description}</p>
      )}
    </div>
  )
}
