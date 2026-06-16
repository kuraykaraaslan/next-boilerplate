'use client';
import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faChevronLeft, faChevronRight,
  faMagnifyingGlassPlus, faMagnifyingGlassMinus,
  faExpand, faCopy, faTrash, faAnglesLeft, faAnglesRight, faGripVertical,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@nb/common/server/utils/cn';
import { ContextMenu } from '@nb/common/ui/ContextMenu';
import type { ContextMenuItem } from '@nb/common/ui/ContextMenu';

export type ImageGalleryImage = {
  src: string;
  alt: string;
  caption?: string;
};

type GalleryColumns = 2 | 3 | 4;
type GalleryAspect  = 'square' | 'video' | 'portrait' | 'auto';
type GalleryGap     = 'sm' | 'md' | 'lg';

export type ImageGalleryProps = {
  images: ImageGalleryImage[];
  columns?: GalleryColumns;
  aspect?: GalleryAspect;
  gap?: GalleryGap;
  lightbox?: boolean;
  showCaptions?: boolean;
  reorderable?: boolean;
  onReorder?: (images: ImageGalleryImage[]) => void;
  onRemove?: (index: number, image: ImageGalleryImage) => void;
  className?: string;
};

const columnClasses: Record<GalleryColumns, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
};

const gapClasses: Record<GalleryGap, string> = {
  sm: 'gap-1', md: 'gap-2', lg: 'gap-4',
};

const aspectClasses: Record<GalleryAspect, string> = {
  square: 'aspect-square', video: 'aspect-video', portrait: 'aspect-[3/4]', auto: '',
};

export function ImageGallery({
  images: imagesProp,
  columns = 3,
  aspect = 'square',
  gap = 'md',
  lightbox = true,
  showCaptions = false,
  reorderable = false,
  onReorder,
  onRemove,
  className,
}: ImageGalleryProps) {
  const [images, setImages] = useState<ImageGalleryImage[]>(imagesProp);
  useEffect(() => { setImages(imagesProp); }, [imagesProp]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const isOpen = activeIndex !== null;

  const openLightbox  = useCallback((i: number) => { setActiveIndex(i); setZoomed(false); }, []);
  const closeLightbox = useCallback(() => { setActiveIndex(null); setZoomed(false); }, []);
  const prevImage     = useCallback(() => { setActiveIndex((i) => i === null ? null : (i - 1 + images.length) % images.length); setZoomed(false); }, [images.length]);
  const nextImage     = useCallback(() => { setActiveIndex((i) => i === null ? null : (i + 1) % images.length); setZoomed(false); }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft')  prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeLightbox, prevImage, nextImage]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (i: number) => setDragFrom(i);
  const handleDragOver  = (e: React.DragEvent, i: number) => { e.preventDefault(); if (i !== dragFrom) setDragOver(i); };
  const handleDragLeave = () => setDragOver(null);
  const handleDrop      = (dropIdx: number) => {
    if (dragFrom === null || dragFrom === dropIdx) { setDragFrom(null); setDragOver(null); return; }
    const next = [...images];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(dropIdx, 0, moved);
    setImages(next);
    onReorder?.(next);
    setDragFrom(null); setDragOver(null);
  };
  const handleDragEnd = () => { setDragFrom(null); setDragOver(null); };

  const moveToIndex = (from: number, to: number) => {
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setImages(next);
    onReorder?.(next);
  };

  const removeAt = (i: number) => {
    onRemove?.(i, images[i]);
    const next = images.filter((_, idx) => idx !== i);
    setImages(next);
    onReorder?.(next);
  };

  const copyUrl = (src: string) => { navigator.clipboard?.writeText(src).catch(() => {}); };

  const buildMenuItems = (i: number): ContextMenuItem[] => [
    { label: 'Open in lightbox', icon: <FontAwesomeIcon icon={faExpand} className="w-3.5 h-3.5" aria-hidden="true" />, onClick: () => openLightbox(i) },
    { label: 'Copy image URL',   icon: <FontAwesomeIcon icon={faCopy}   className="w-3.5 h-3.5" aria-hidden="true" />, shortcut: '⌘C', onClick: () => copyUrl(images[i].src) },
    { type: 'separator' },
    { type: 'group', label: 'Reorder' },
    { label: 'Move to first', icon: <FontAwesomeIcon icon={faAnglesLeft}  className="w-3.5 h-3.5" aria-hidden="true" />, disabled: i === 0,                   onClick: () => moveToIndex(i, 0) },
    { label: 'Move to last',  icon: <FontAwesomeIcon icon={faAnglesRight} className="w-3.5 h-3.5" aria-hidden="true" />, disabled: i === images.length - 1,   onClick: () => moveToIndex(i, images.length - 1) },
    { type: 'separator' },
    { label: 'Remove', icon: <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" aria-hidden="true" />, danger: true, onClick: () => removeAt(i) },
  ];

  const activeImage = activeIndex !== null ? images[activeIndex] : null;

  return (
    <>
      <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} role="list" aria-label="Image gallery">
        {images.map((img, i) => {
          const isDragging   = dragFrom === i;
          const isDropTarget = dragOver === i && dragFrom !== null && dragFrom !== i;

          const tile = (
            <div
              role="listitem"
              draggable={reorderable}
              onDragStart={reorderable ? () => handleDragStart(i) : undefined}
              onDragOver={reorderable  ? (e) => handleDragOver(e, i) : undefined}
              onDragLeave={reorderable ? handleDragLeave : undefined}
              onDrop={reorderable      ? () => handleDrop(i) : undefined}
              onDragEnd={reorderable   ? handleDragEnd : undefined}
              className={cn(
                'group relative overflow-hidden rounded-lg bg-surface-sunken transition-all duration-200',
                aspect !== 'auto' && aspectClasses[aspect],
                reorderable  && 'cursor-grab active:cursor-grabbing',
                isDragging   && 'opacity-40 scale-95 ring-2 ring-[var(--primary)] ring-inset',
                isDropTarget && 'ring-2 ring-[var(--primary)] shadow-lg scale-[1.02]',
              )}
            >
              <img src={img.src} alt={img.alt} loading="lazy" draggable={false}
                className={cn('w-full h-full object-cover transition-transform duration-300 group-hover:scale-105', aspect === 'auto' && 'aspect-square', isDragging && 'pointer-events-none')}
              />

              {reorderable && (
                <div aria-hidden="true" className="absolute top-1.5 left-1.5 z-10 w-6 h-6 flex items-center justify-center rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <FontAwesomeIcon icon={faGripVertical} className="w-3 h-3" />
                </div>
              )}

              {lightbox && (
                <button onClick={() => openLightbox(i)} aria-label={`Open ${img.alt} in lightbox`}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 group-hover:bg-black/40 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-inset"
                >
                  <FontAwesomeIcon icon={faExpand} aria-hidden="true" className="text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-md" />
                  {img.caption && (
                    <span className="text-white text-xs font-medium px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2 drop-shadow-md">
                      {img.caption}
                    </span>
                  )}
                </button>
              )}

              {showCaptions && img.caption && (
                <p className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1 line-clamp-1 pointer-events-none">
                  {img.caption}
                </p>
              )}
            </div>
          );

          return reorderable ? (
            <ContextMenu key={`${img.src}-${i}`} items={buildMenuItems(i)}>{tile}</ContextMenu>
          ) : (
            <div key={`${img.src}-${i}`}>{tile}</div>
          );
        })}
      </div>

      {lightbox && isOpen && activeImage && (
        <div role="dialog" aria-modal="true" aria-label="Image lightbox" className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="text-white/70 text-sm tabular-nums select-none">{(activeIndex ?? 0) + 1} / {images.length}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <FontAwesomeIcon icon={zoomed ? faMagnifyingGlassMinus : faMagnifyingGlassPlus} aria-hidden="true" />
              </button>
              <button onClick={closeLightbox} aria-label="Close lightbox"
                className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex items-center justify-center overflow-hidden px-14">
            <img src={activeImage.src} alt={activeImage.alt} draggable={false}
              className={cn('max-h-full max-w-full object-contain transition-transform duration-300 select-none', zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in')}
              onClick={() => setZoomed((z) => !z)}
            />
            {images.length > 1 && (
              <>
                <button onClick={prevImage} aria-label="Previous image"
                  className="absolute left-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
                </button>
                <button onClick={nextImage} aria-label="Next image"
                  className="absolute right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {activeImage.caption && <p className="shrink-0 text-center text-white/80 text-sm px-6 py-2">{activeImage.caption}</p>}

          {images.length > 1 && (
            <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 justify-center">
              {images.map((img, i) => (
                <button key={i} onClick={() => { setActiveIndex(i); setZoomed(false); }}
                  aria-label={`View ${img.alt}`} aria-pressed={i === activeIndex}
                  className={cn(
                    'shrink-0 w-12 h-12 rounded overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    i === activeIndex ? 'ring-2 ring-white opacity-100 scale-105' : 'opacity-40 hover:opacity-70',
                  )}
                >
                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover" draggable={false} />
                </button>
              ))}
            </div>
          )}

          <button onClick={closeLightbox} aria-label="Close lightbox" className="absolute inset-0 -z-10 cursor-default focus-visible:outline-none" tabIndex={-1} />
        </div>
      )}
    </>
  );
}
