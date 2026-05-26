'use client';
import type { MentionUser, QuillInstance, SlashCommand } from './types';
import type { RichTextEditorStoreHook } from './store';

/** Updates the chars / words counters in the store from current Quill text. */
export function updateCounts(q: QuillInstance, store: RichTextEditorStoreHook) {
  const text = q.getText().replace(/\n+$/, '');
  const chars = text.length;
  const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  store.getState().setCounts(chars, words);
}

/**
 * Detects `@` (mention) or `/` (slash) triggers immediately before the
 * caret. Opens / closes the corresponding popup state in the store and
 * computes screen-space anchor coordinates for rendering.
 */
export function detectTriggers(
  q: QuillInstance,
  idx: number,
  mentions: MentionUser[] | undefined,
  slashItems: SlashCommand[] | undefined,
  store: RichTextEditorStoreHook,
) {
  const text = q.getText(0, idx);
  const atIdx    = text.lastIndexOf('@');
  const slashIdx = text.lastIndexOf('/');
  const st = store.getState();

  if (mentions && atIdx >= 0) {
    const before = atIdx === 0 ? ' ' : text[atIdx - 1];
    if (/\s/.test(before)) {
      const query = text.slice(atIdx + 1);
      if (!/\s/.test(query)) {
        const bounds = q.getBounds(atIdx, 0);
        const root = q.container.getBoundingClientRect();
        st.setMention({
          open: true, query, trigger: atIdx,
          pos: { top: root.top + bounds.bottom + 4, left: root.left + bounds.left },
          idx: 0,
        });
        if (st.slash.open) st.setSlash((s) => ({ ...s, open: false }));
        return;
      }
    }
  }

  if (slashItems && slashIdx >= 0) {
    const beforeSlash = slashIdx === 0 ? '\n' : text[slashIdx - 1];
    if (beforeSlash === '\n' || slashIdx === 0) {
      const query = text.slice(slashIdx + 1);
      if (!/\s/.test(query)) {
        const bounds = q.getBounds(slashIdx, 0);
        const root = q.container.getBoundingClientRect();
        st.setSlash({
          open: true, query, trigger: slashIdx,
          pos: { top: root.top + bounds.bottom + 4, left: root.left + bounds.left },
          idx: 0,
        });
        if (st.mention.open) st.setMention((s) => ({ ...s, open: false }));
        return;
      }
    }
  }

  if (st.mention.open) st.setMention((s) => ({ ...s, open: false }));
  if (st.slash.open)   st.setSlash((s) => ({ ...s, open: false }));
}
