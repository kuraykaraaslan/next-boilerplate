'use client'

import { Component } from 'react'

export class BlockRenderErrorBoundary extends Component<
  { children: React.ReactNode; blockType: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; blockType: string }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: unknown) {
    console.error(`[DynamicPageRenderer] Block render error type="${this.props.blockType}"`, err)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export class BlockEditorErrorBoundary extends Component<
  { children: React.ReactNode; blockId: string; onDelete: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; blockId: string; onDelete: () => void }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center gap-3 h-16 text-xs text-red-500/50 border border-red-500/20 rounded m-2">
          <span>Block render error</span>
          <button
            onClick={this.props.onDelete}
            className="px-2 py-0.5 rounded text-[11px] bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            Delete block
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
