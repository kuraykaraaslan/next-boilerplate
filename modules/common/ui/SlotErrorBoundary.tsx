'use client';
import { Component, type ReactNode } from 'react';

type Props = { slot: string; component: string; children: ReactNode; fallback?: ReactNode };
type State = { failed: boolean };

/**
 * Isolates a single slot contribution: if a plugin-contributed component throws
 * during render, it is swallowed here so it cannot crash the host page. The
 * failure is logged with the slot + component id for diagnosis.
 */
export class SlotErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[slot:${this.props.slot}] contribution "${this.props.component}" failed to render`, error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
