'use client';
import { useCallback, useEffect, type MutableRefObject } from 'react';
import { useRteStore, useRteStoreApi } from './store';
import type { SuggestionItem } from './SuggestionPopup';
import type { MentionUser, QuillInstance, SlashCommand } from './types';

export type UseTriggerKeyboardArgs = {
  quillRef: MutableRefObject<QuillInstance | null>;
  mentions: MentionUser[] | undefined;
  slashItems: SlashCommand[] | undefined;
};

/**
 * Filters mention / slash suggestions by current query, wires
 * Arrow / Enter / Tab / Escape keyboard navigation, and exposes
 * accept callbacks for click-to-insert behavior in
 * <SuggestionPopup>.
 */
export function useTriggerKeyboard({ quillRef, mentions, slashItems }: UseTriggerKeyboardArgs) {
  const api = useRteStoreApi();
  const mentionState = useRteStore((s) => s.mention);
  const slashState   = useRteStore((s) => s.slash);

  const filteredMentions = (mentions ?? []).filter((m) =>
    m.label.toLowerCase().includes(mentionState.query.toLowerCase()) ||
    (m.description ?? '').toLowerCase().includes(mentionState.query.toLowerCase())
  );
  const filteredSlash = (slashItems ?? []).filter((s) =>
    s.label.toLowerCase().includes(slashState.query.toLowerCase())
  );

  const acceptMention = useCallback((it: SuggestionItem) => {
    const q = quillRef.current; if (!q) return;
    const start = mentionState.trigger;
    const len = mentionState.query.length + 1;
    q.deleteText(start, len, 'user');
    const chip = '<span class="kui-rte-mention" data-id="' + it.id + '">@' + it.label + '</span>&nbsp;';
    if (q.clipboard.dangerouslyPasteHTMLAtIndex) q.clipboard.dangerouslyPasteHTMLAtIndex(start, chip, 'user');
    else q.clipboard.dangerouslyPasteHTML(chip, 'user');
    api.getState().setMention({ open: false, query: '', trigger: -1, pos: null, idx: 0 });
  }, [api, mentionState, quillRef]);

  const acceptSlash = useCallback((it: SuggestionItem) => {
    const q = quillRef.current; if (!q) return;
    const cmd = (slashItems ?? []).find((s) => s.id === it.id);
    const start = slashState.trigger;
    const len = slashState.query.length + 1;
    q.deleteText(start, len, 'user');
    if (cmd) cmd.action(q);
    api.getState().setSlash({ open: false, query: '', trigger: -1, pos: null, idx: 0 });
  }, [api, slashItems, slashState, quillRef]);

  useEffect(() => {
    if (!mentionState.open && !slashState.open) return;
    const handler = (e: KeyboardEvent) => {
      const list = mentionState.open ? filteredMentions : filteredSlash;
      const setter = mentionState.open ? api.getState().setMention : api.getState().setSlash;
      const cur = mentionState.open ? mentionState.idx : slashState.idx;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setter((s) => ({ ...s, idx: Math.min(list.length - 1, cur + 1) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setter((s) => ({ ...s, idx: Math.max(0, cur - 1) }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = list[cur];
        if (item) {
          const sugg: SuggestionItem = {
            id: item.id, label: item.label,
            description: 'description' in item ? item.description : undefined,
          };
          if (mentionState.open) acceptMention(sugg);
          else acceptSlash(sugg);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        api.getState().setMention((s) => ({ ...s, open: false }));
        api.getState().setSlash((s)   => ({ ...s, open: false }));
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [mentionState, slashState, filteredMentions, filteredSlash, acceptMention, acceptSlash, api]);

  return { filteredMentions, filteredSlash, acceptMention, acceptSlash };
}
