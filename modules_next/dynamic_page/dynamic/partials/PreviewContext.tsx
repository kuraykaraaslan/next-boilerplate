'use client'
import { createContext, useContext } from 'react'

export type PreviewMode = 'mobile' | 'tablet' | 'desktop'

export const PreviewContext = createContext<PreviewMode>('desktop')

export function PreviewProvider({ mode, children }: { mode: PreviewMode; children: React.ReactNode }) {
  return <PreviewContext.Provider value={mode}>{children}</PreviewContext.Provider>
}

export function usePreviewMode(): PreviewMode {
  return useContext(PreviewContext)
}
