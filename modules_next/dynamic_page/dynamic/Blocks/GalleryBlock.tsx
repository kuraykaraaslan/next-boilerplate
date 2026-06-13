'use client'

import { useState, useCallback } from 'react'
import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'

interface GalleryImage { url?: string; alt?: string; caption?: string }

interface GalleryProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  columns?: string
  gap?: string
  images?: GalleryImage[]
}

function Lightbox({ images, index, onClose }: { images: GalleryImage[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index)

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrent((c) => (c - 1 + images.length) % images.length)
  }, [images.length])

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrent((c) => (c + 1) % images.length)
  }, [images.length])

  const img = images[current]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none"
        aria-label="Close"
      >
        ×
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl leading-none px-3 py-2"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl leading-none px-3 py-2"
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      <div className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-3 px-14" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img?.url || ''}
          alt={img?.alt || ''}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        {img?.caption && (
          <p className="text-white/60 text-sm text-center">{img.caption}</p>
        )}
        {images.length > 1 && (
          <p className="text-white/40 text-xs">{current + 1} / {images.length}</p>
        )}
      </div>
    </div>
  )
}

function GalleryBlock(rawProps: GalleryProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)
  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const columns    = (rawProps.columns as string) || '3'
  const gap        = (rawProps.gap as string) || 'md'
  const images     = (rawProps.images as GalleryImage[] | undefined) || []

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const colMap: Record<string, string> = {
    '2': 'grid-cols-1 sm:grid-cols-2',
    '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }
  const gapMap: Record<string, string> = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' }

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        {(heading || subheading) && (
          <div className="text-center mb-14">
            {heading    && <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>}
            {subheading && <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>}
          </div>
        )}

        {images.length === 0 ? (
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-[var(--text-primary)]/10 rounded-2xl">
            <p className="text-[var(--text-secondary)] text-sm">Add images to display the gallery</p>
          </div>
        ) : (
          <div className={`grid ${colMap[columns] ?? colMap['3']} ${gapMap[gap] ?? gapMap['md']}`}>
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="group relative overflow-hidden rounded-xl aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.alt || `Gallery image ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-[var(--surface-overlay)] flex items-center justify-center">
                    <span className="text-[var(--text-secondary)]/40 text-3xl">🖼</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl">⊕</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </BaseBlock>
  )
}

export const GalleryBlockDefinition = defineBlock<GalleryProps>({
  type: 'GalleryBlock',
  label: 'Gallery',
  category: 'Content',
  description: 'Responsive photo grid with a fullscreen lightbox viewer.',
  schema: {
    heading:    { label: 'Section Heading',    type: 'text',     placeholder: 'Our Work', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'A selection of projects.', group: 'Content' },
    columns: {
      label: 'Columns', type: 'select', group: 'Layout',
      options: [
        { label: '2 columns', value: '2' },
        { label: '3 columns', value: '3' },
        { label: '4 columns', value: '4' },
      ],
    },
    gap: {
      label: 'Gap', type: 'select', group: 'Layout',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
      ],
    },
    images: {
      label: 'Images', type: 'repeater', group: 'Content',
      fields: {
        url:     { label: 'Image',   type: 'img',  uploadFolder: 'gallery' },
        alt:     { label: 'Alt text', type: 'text', placeholder: 'Describe the image' },
        caption: { label: 'Caption', type: 'text', placeholder: 'Optional caption shown in lightbox' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: '', subheading: '',
    columns: '3', gap: 'md',
    images: [
      { url: '', alt: 'Image 1', caption: '' },
      { url: '', alt: 'Image 2', caption: '' },
      { url: '', alt: 'Image 3', caption: '' },
    ],
    blockClass: 'bg-[var(--surface-base)]', sectionId: 'gallery',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  Component: GalleryBlock,
})

export default GalleryBlock
