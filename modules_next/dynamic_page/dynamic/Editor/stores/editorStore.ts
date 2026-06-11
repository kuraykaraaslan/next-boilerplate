import { create } from 'zustand'
import type { EditorStore } from './editor.types'
import { initialState } from './editor.types'
import { createUiSlice } from './slices/uiSlice'
import { createBlockSlice } from './slices/blockSlice'
import { createPersistSlice } from './slices/persistSlice'
import { createTranslationSlice } from './slices/translationSlice'

export type { EditorStore }
export type { PreviewMode, SeoData, DynamicPageBlockRecord } from './editor.types'
export { selectSelectedBlock } from './editor.types'

export const useEditorStore = create<EditorStore>()((...args) => ({
  ...initialState,
  ...createUiSlice(...args),
  ...createBlockSlice(...args),
  ...createPersistSlice(...args),
  ...createTranslationSlice(...args),
}))
