'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'

interface VideoProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  url?: string
  aspectRatio?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
}

function extractEmbedUrl(url: string, autoplay: boolean, muted: boolean, loop: boolean): string | null {
  if (!url) return null

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    const id = ytMatch[1]
    const params = new URLSearchParams({
      ...(autoplay && { autoplay: '1' }),
      ...(muted && { mute: '1' }),
      ...(loop && { loop: '1', playlist: id }),
      rel: '0',
    })
    return `https://www.youtube.com/embed/${id}?${params}`
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    const id = vimeoMatch[1]
    const params = new URLSearchParams({
      ...(autoplay && { autoplay: '1' }),
      ...(muted && { muted: '1' }),
      ...(loop && { loop: '1' }),
    })
    return `https://player.vimeo.com/video/${id}?${params}`
  }

  // Direct video file or other embed URL — return as-is
  return url
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url)
}

function VideoBlock(rawProps: VideoProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)

  const heading     = rawProps.heading      || ''
  const subheading  = rawProps.subheading   || ''
  const url         = (rawProps.url as string) || ''
  const aspectRatio = (rawProps.aspectRatio as string) || '16/9'
  const autoplay    = Boolean(rawProps.autoplay)
  const muted       = Boolean(rawProps.muted)
  const loop        = Boolean(rawProps.loop)

  const paddingMap: Record<string, string> = { '16/9': 'pb-[56.25%]', '4/3': 'pb-[75%]', '1/1': 'pb-[100%]', '9/16': 'pb-[177.78%]' }
  const padClass = paddingMap[aspectRatio] ?? paddingMap['16/9']

  const embedUrl = url ? extractEmbedUrl(url, autoplay, muted, loop) : null
  const direct   = url ? isDirectVideo(url) : false

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-16`}>
        {(heading || subheading) && (
          <div className="text-center mb-10">
            {heading && <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">{heading}</h2>}
            {subheading && <p className="text-lg text-[var(--text-secondary)]">{subheading}</p>}
          </div>
        )}
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          {!url ? (
            <div className={`relative w-full ${padClass} bg-[var(--surface-overlay)]`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-[var(--text-primary)]/30">
                  <div className="text-5xl mb-3">▶</div>
                  <p className="text-sm">Paste a YouTube, Vimeo, or video URL</p>
                </div>
              </div>
            </div>
          ) : direct ? (
            <div className={`relative w-full ${padClass}`}>
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={url}
                autoPlay={autoplay}
                muted={muted}
                loop={loop}
                controls={!autoplay}
                playsInline
              />
            </div>
          ) : (
            <div className={`relative w-full ${padClass}`}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedUrl || url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={heading || 'Video'}
              />
            </div>
          )}
        </div>
      </div>
    </BaseBlock>
  )
}

export const VideoBlockDefinition = defineBlock<VideoProps>({
  type: 'VideoBlock',
  label: 'Video',
  category: 'Content',
  description: 'Embed a YouTube, Vimeo, or direct video file with optional heading.',
  schema: {
    heading:    { label: 'Heading',    type: 'text',     placeholder: 'Watch our demo', group: 'Content' },
    subheading: { label: 'Subheading', type: 'textarea', placeholder: 'Supporting copy…', group: 'Content' },
    url: { label: 'Video URL', type: 'url', placeholder: 'https://youtube.com/watch?v=...', group: 'Content' },
    aspectRatio: {
      label: 'Aspect Ratio', type: 'select', group: 'Layout',
      options: [
        { label: '16:9 (Widescreen)', value: '16/9' },
        { label: '4:3 (Classic)',     value: '4/3' },
        { label: '1:1 (Square)',      value: '1/1' },
        { label: '9:16 (Portrait)',   value: '9/16' },
      ],
    },
    autoplay: { label: 'Autoplay',     type: 'boolean', value: false, group: 'Playback' },
    muted:    { label: 'Muted',        type: 'boolean', value: false, group: 'Playback' },
    loop:     { label: 'Loop',         type: 'boolean', value: false, group: 'Playback' },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: '', subheading: '', url: '',
    aspectRatio: '16/9', autoplay: false, muted: false, loop: false,
    blockClass: 'bg-[var(--surface-base)]', sectionId: '',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  Component: VideoBlock,
})

export default VideoBlock
