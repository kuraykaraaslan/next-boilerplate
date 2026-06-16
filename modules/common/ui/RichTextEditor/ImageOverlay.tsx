'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const BTN = 'inline-flex items-center justify-center h-7 px-2 rounded text-xs text-text-primary hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus transition-colors';

export function ImageOverlay({
  open,
  rect,
  onResize,
  onAlign,
  onRemove,
}: {
  open: boolean;
  rect: DOMRect | null;
  onResize: (width: string) => void;
  onAlign: (align: 'left' | 'center' | 'right') => void;
  onRemove: () => void;
}) {
  if (!open || !rect) return null;
  return (
    <div
      role="toolbar"
      aria-label="Image options"
      className="rounded-lg border border-border bg-surface-raised shadow-lg flex items-center gap-0.5 px-1 py-1"
      style={{ position: 'fixed', top: rect.top - 38, left: rect.left, zIndex: 55 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" title="Small (25%)" className={BTN} onClick={() => onResize('25%')}>S</button>
      <button type="button" title="Medium (50%)" className={BTN} onClick={() => onResize('50%')}>M</button>
      <button type="button" title="Large (100%)" className={BTN} onClick={() => onResize('100%')}>L</button>
      <span className="w-px h-5 bg-border mx-1 self-center" aria-hidden="true" />
      <button type="button" title="Align left" className={BTN} onClick={() => onAlign('left')}>⇤</button>
      <button type="button" title="Align center" className={BTN} onClick={() => onAlign('center')}>⇔</button>
      <button type="button" title="Align right" className={BTN} onClick={() => onAlign('right')}>⇥</button>
      <span className="w-px h-5 bg-border mx-1 self-center" aria-hidden="true" />
      <button type="button" title="Remove image" className={BTN} onClick={onRemove}>
        <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
