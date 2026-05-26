'use client';
/* =========================================================
   PER-INSTANCE ZUSTAND STORE
   Each <RichTextEditor> creates its own store via
   `createRichTextEditorStore()` and provides it through
   `RichTextEditorStoreContext`. Sub-components read state
   via the `useRteStore` hook.
========================================================= */

import { createContext, createElement, useContext } from 'react';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { BubbleState, ImageSelection, QuillFormats, TriggerState } from './types';

export type RichTextEditorState = {
  // Lifecycle
  ready: boolean;

  // Output mirror
  html: string;

  // Counter
  chars: number;
  words: number;

  // Active formats (drives bubble menu pressed-state)
  active: QuillFormats;

  // Modes
  htmlMode: boolean;
  htmlSource: string;
  fullscreen: boolean;

  // Color picker values (text + background)
  textColor: string | null;
  bgColor: string | null;

  // Modal / popover open states
  imgOpen: boolean;
  tableOpen: boolean;
  emojiOpen: boolean;
  emojiAnchor: DOMRect | null;

  // Trigger / overlay state
  bubble: BubbleState;
  mention: TriggerState;
  slash: TriggerState;
  imgSel: ImageSelection;
};

export type RichTextEditorActions = {
  setReady: (v: boolean) => void;
  setHtml: (v: string) => void;
  setCounts: (chars: number, words: number) => void;
  setActive: (a: QuillFormats) => void;

  setHtmlMode: (v: boolean) => void;
  setHtmlSource: (v: string) => void;
  setFullscreen: (v: boolean | ((p: boolean) => boolean)) => void;

  setTextColor: (v: string | null) => void;
  setBgColor: (v: string | null) => void;

  openImg: () => void;
  closeImg: () => void;
  openTable: () => void;
  closeTable: () => void;
  openEmoji: (anchor: DOMRect | null) => void;
  closeEmoji: () => void;

  setBubble: (b: BubbleState) => void;
  setMention: (s: TriggerState | ((p: TriggerState) => TriggerState)) => void;
  setSlash: (s: TriggerState | ((p: TriggerState) => TriggerState)) => void;
  setImgSel: (s: ImageSelection) => void;
};

export type RichTextEditorStore = RichTextEditorState & RichTextEditorActions;

const EMPTY_TRIGGER: TriggerState = { open: false, query: '', trigger: -1, pos: null, idx: 0 };

export function createRichTextEditorStore(initialHtml = '') {
  return create<RichTextEditorStore>((set) => ({
    ready: false,
    html: initialHtml,
    chars: 0,
    words: 0,
    active: {},

    htmlMode: false,
    htmlSource: '',
    fullscreen: false,

    textColor: null,
    bgColor: null,

    imgOpen: false,
    tableOpen: false,
    emojiOpen: false,
    emojiAnchor: null,

    bubble: { open: false, position: null },
    mention: { ...EMPTY_TRIGGER },
    slash: { ...EMPTY_TRIGGER },
    imgSel: { open: false, el: null, rect: null },

    setReady: (v) => set({ ready: v }),
    setHtml: (v) => set({ html: v }),
    setCounts: (chars, words) => set({ chars, words }),
    setActive: (a) => set({ active: a }),

    setHtmlMode: (v) => set({ htmlMode: v }),
    setHtmlSource: (v) => set({ htmlSource: v }),
    setFullscreen: (v) => set((s) => ({ fullscreen: typeof v === 'function' ? v(s.fullscreen) : v })),

    setTextColor: (v) => set({ textColor: v }),
    setBgColor: (v) => set({ bgColor: v }),

    openImg: () => set({ imgOpen: true }),
    closeImg: () => set({ imgOpen: false }),
    openTable: () => set({ tableOpen: true }),
    closeTable: () => set({ tableOpen: false }),
    openEmoji: (anchor) => set({ emojiOpen: true, emojiAnchor: anchor }),
    closeEmoji: () => set({ emojiOpen: false }),

    setBubble: (b) => set({ bubble: b }),
    setMention: (s) => set((p) => ({ mention: typeof s === 'function' ? s(p.mention) : s })),
    setSlash:   (s) => set((p) => ({ slash:   typeof s === 'function' ? s(p.slash)   : s })),
    setImgSel: (s) => set({ imgSel: s }),
  }));
}

export type RichTextEditorStoreHook = UseBoundStore<StoreApi<RichTextEditorStore>>;

const RichTextEditorStoreContext = createContext<RichTextEditorStoreHook | null>(null);

export function RichTextEditorStoreProvider({
  store,
  children,
}: {
  store: RichTextEditorStoreHook;
  children: React.ReactNode;
}) {
  return createElement(RichTextEditorStoreContext.Provider, { value: store }, children);
}

export function useRteStore<T>(selector: (s: RichTextEditorStore) => T): T {
  const store = useContext(RichTextEditorStoreContext);
  if (!store) throw new Error('useRteStore must be used inside <RichTextEditorStoreProvider>');
  return store(selector);
}

export function useRteStoreApi(): RichTextEditorStoreHook {
  const store = useContext(RichTextEditorStoreContext);
  if (!store) throw new Error('useRteStoreApi must be used inside <RichTextEditorStoreProvider>');
  return store;
}
