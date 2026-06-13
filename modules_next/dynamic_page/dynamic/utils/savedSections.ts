import { v4 as uuidv4 } from 'uuid'
import type { BlockData } from '../types'

export interface SavedSection {
  id: string
  name: string
  blocks: Array<{ type: string; props: Record<string, unknown> }>
  savedAt: string
}

const STORAGE_KEY = 'dp_saved_sections'

export function getSavedSections(): SavedSection[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedSection[]
  } catch {
    return []
  }
}

export function saveSection(name: string, blocks: BlockData[]): SavedSection {
  const entry: SavedSection = {
    id: uuidv4(),
    name,
    blocks: blocks.map((b) => ({ type: b.type, props: structuredClone(b.props) })),
    savedAt: new Date().toISOString(),
  }
  const existing = getSavedSections()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing]))
  return entry
}

export function deleteSavedSection(id: string): void {
  const updated = getSavedSections().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function hydrateSavedSection(saved: SavedSection): BlockData[] {
  return saved.blocks.map((b, i) => ({
    id: uuidv4(),
    type: b.type,
    order: i,
    props: structuredClone(b.props),
  }))
}
