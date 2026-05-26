import type { ComponentType } from 'react'

export type { BlockData, DynamicPageBlockRecord } from '@/modules/dynamic_page/dynamic_page.types'

export type FieldType =
  | 'text' | 'url' | 'textarea' | 'color' | 'boolean' | 'number'
  | 'select' | 'multi-select' | 'json' | 'img' | 'repeater'
  | 'icon' | 'rich-text' | 'datetime'

export type FieldOption = string | { label: string; value: string }

export interface FieldSchema {
  label: string
  type: FieldType
  value?: unknown
  options?: FieldOption[]
  placeholder?: string
  uploadFolder?: string
  accept?: string
  description?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  showIf?: Record<string, unknown | unknown[]>
  group?: string
  fields?: Record<string, FieldSchema>
}

export interface BlockDefinition {
  type: string
  label: string
  description: string
  category: string
  icon?: string
  tags?: string[]
  skeletonHeight?: number
  defaultProps: Record<string, unknown>
  schema: Record<string, FieldSchema>
  Component: ComponentType<Record<string, unknown>>
}

