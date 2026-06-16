'use client';
import { ImageInsertModal } from './ImageInsertModal';
import { TableInsertModal } from './TableInsertModal';
import { EmojiPicker } from './EmojiPicker';
import { SuggestionPopup, type SuggestionItem } from './SuggestionPopup';
import { BubbleMenu } from './BubbleMenu';
import { ImageOverlay } from './ImageOverlay';
import { useRteStore, useRteStoreApi } from './store';
import type { MentionUser, SlashCommand } from './types';

export type PopupOverlaysProps = {
  readOnly: boolean;
  filteredMentions: MentionUser[];
  filteredSlash: SlashCommand[];
  onAcceptMention: (it: SuggestionItem) => void;
  onAcceptSlash: (it: SuggestionItem) => void;
  onInsertImage: (payload: { src: string; alt: string; file?: File | null }) => void;
  onInsertTable: (rows: number, cols: number) => void;
  onInsertEmoji: (emoji: string) => void;
  onApplyFormat: (name: string, value: unknown) => void;
  onResizeImage: (width: string) => void;
  onAlignImage: (align: 'left' | 'center' | 'right') => void;
  onRemoveImage: () => void;
};

/**
 * Stacks every floating UI piece the editor renders below its DOM:
 * insert-image / insert-table modals, emoji picker, bubble selection
 * menu, mention + slash suggestion popups, and the image overlay.
 * All state comes from the per-instance Zustand store via context.
 */
export function PopupOverlays({
  readOnly,
  filteredMentions, filteredSlash,
  onAcceptMention, onAcceptSlash,
  onInsertImage, onInsertTable, onInsertEmoji, onApplyFormat,
  onResizeImage, onAlignImage, onRemoveImage,
}: PopupOverlaysProps) {
  const api = useRteStoreApi();
  const imgOpen     = useRteStore((s) => s.imgOpen);
  const tableOpen   = useRteStore((s) => s.tableOpen);
  const emojiOpen   = useRteStore((s) => s.emojiOpen);
  const emojiAnchor = useRteStore((s) => s.emojiAnchor);
  const active      = useRteStore((s) => s.active);
  const bubble      = useRteStore((s) => s.bubble);
  const mention     = useRteStore((s) => s.mention);
  const slash       = useRteStore((s) => s.slash);
  const imgSel      = useRteStore((s) => s.imgSel);

  return (
    <>
      <ImageInsertModal
        open={imgOpen}
        onClose={() => api.getState().closeImg()}
        onInsert={onInsertImage}
      />
      <TableInsertModal
        open={tableOpen}
        onClose={() => api.getState().closeTable()}
        onInsert={onInsertTable}
      />
      <EmojiPicker
        open={emojiOpen}
        onClose={() => api.getState().closeEmoji()}
        onSelect={onInsertEmoji}
        anchorRect={emojiAnchor}
      />
      <BubbleMenu
        open={bubble.open && !readOnly}
        position={bubble.position}
        active={active as { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean }}
        onToggle={(fmt) => onApplyFormat(fmt, !active[fmt])}
        onLink={() => { const url = window.prompt('Link URL'); if (url) onApplyFormat('link', url); }}
      />
      <SuggestionPopup
        open={mention.open && filteredMentions.length > 0}
        items={filteredMentions.map((m) => ({ id: m.id, label: m.label, description: m.description }))}
        activeIndex={mention.idx}
        position={mention.pos}
        onSelect={onAcceptMention}
        onClose={() => api.getState().setMention((s) => ({ ...s, open: false }))}
        emptyMessage="No matches"
        ariaLabel="Mention suggestions"
      />
      <SuggestionPopup
        open={slash.open && filteredSlash.length > 0}
        items={filteredSlash.map((s) => ({ id: s.id, label: s.label, description: s.description, icon: s.icon }))}
        activeIndex={slash.idx}
        position={slash.pos}
        onSelect={onAcceptSlash}
        onClose={() => api.getState().setSlash((s) => ({ ...s, open: false }))}
        emptyMessage="No commands"
        ariaLabel="Slash commands"
      />
      <ImageOverlay
        open={imgSel.open && !readOnly}
        rect={imgSel.rect}
        onResize={onResizeImage}
        onAlign={onAlignImage}
        onRemove={onRemoveImage}
      />
    </>
  );
}
