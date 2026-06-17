'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBold, faItalic, faUnderline, faLink, faStrikethrough } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@kuraykaraaslan/common/server/utils/cn';

const BTN = 'inline-flex items-center justify-center w-7 h-7 rounded text-text-primary hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors';

export function BubbleMenu({
  open,
  position,
  active,
  onToggle,
  onLink,
}: {
  open: boolean;
  position: { top: number; left: number } | null;
  active: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean };
  onToggle: (fmt: 'bold' | 'italic' | 'underline' | 'strike') => void;
  onLink: () => void;
}) {
  if (!open || !position) return null;
  return (
    <div
      role="toolbar"
      aria-label="Format selection"
      className="rounded-lg border border-border bg-surface-raised shadow-lg flex items-center gap-0.5 px-1 py-1"
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 55 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" title="Bold (Ctrl+B)" aria-pressed={!!active.bold}
        className={cn(BTN, active.bold && 'text-primary bg-primary-subtle')}
        onClick={() => onToggle('bold')}>
        <FontAwesomeIcon icon={faBold} className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <button type="button" title="Italic (Ctrl+I)" aria-pressed={!!active.italic}
        className={cn(BTN, active.italic && 'text-primary bg-primary-subtle')}
        onClick={() => onToggle('italic')}>
        <FontAwesomeIcon icon={faItalic} className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <button type="button" title="Underline (Ctrl+U)" aria-pressed={!!active.underline}
        className={cn(BTN, active.underline && 'text-primary bg-primary-subtle')}
        onClick={() => onToggle('underline')}>
        <FontAwesomeIcon icon={faUnderline} className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <button type="button" title="Strikethrough" aria-pressed={!!active.strike}
        className={cn(BTN, active.strike && 'text-primary bg-primary-subtle')}
        onClick={() => onToggle('strike')}>
        <FontAwesomeIcon icon={faStrikethrough} className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      <span className="w-px h-5 bg-border mx-1 self-center" aria-hidden="true" />
      <button type="button" title="Insert link"
        className={BTN}
        onClick={onLink}>
        <FontAwesomeIcon icon={faLink} className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
