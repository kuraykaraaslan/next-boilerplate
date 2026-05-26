'use client';
import { cn } from '@/modules_next/common/utils/cn';

const EMOJIS = [
  '😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘',
  '😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏',
  '😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠',
  '😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥',
  '👍','👎','👌','✌️','🤞','🤟','🤘','👋','🤚','✋','🖐️','🖖','👏','🙌','🤝','🙏',
  '💪','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕','💖','💗','💘','💝',
  '🔥','✨','⭐','🌟','💫','💯','✅','❌','⚠️','❓','❗','💡','📌','📎','🔗','🎉',
];

export function EmojiPicker({
  open,
  onClose,
  onSelect,
  anchorRect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorRect: DOMRect | null;
}) {
  if (!open) return null;

  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 6,
        left: Math.max(8, anchorRect.left - 240),
        zIndex: 60,
      }
    : { position: 'fixed', top: 80, right: 16, zIndex: 60 };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Emoji picker"
        className={cn(
          'w-72 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-lg p-2',
          'grid grid-cols-8 gap-1'
        )}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => { onSelect(e); onClose(); }}
            className="w-7 h-7 text-lg flex items-center justify-center rounded hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label={`Insert ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}
