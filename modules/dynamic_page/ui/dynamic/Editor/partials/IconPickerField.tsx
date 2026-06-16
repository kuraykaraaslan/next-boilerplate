'use client'

import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck, faStar, faHeart, faUser, faUsers, faHome, faCog, faSearch, faBell,
  faEnvelope, faPhone, faMapMarkerAlt, faLock, faUnlock, faShield, faKey,
  faArrowRight, faArrowLeft, faArrowUp, faArrowDown, faChevronRight, faChevronDown,
  faPlus, faMinus, faXmark, faTrash, faPencil, faCopy, faShare, faDownload, faUpload,
  faLink, faImage, faVideo, faMusic, faFile, faFolder, faDatabase, faCode, faTerminal,
  faGlobe, faCloud, faWifi, faBolt, faFire, faLeaf, faSun, faMoon, faSnowflake,
  faRocket, faGem, faCrown, faTrophy, faMedal, faAward, faBookmark, faTag, faTags,
  faShoppingCart, faShoppingBag, faCreditCard, faMoneyBill, faChartBar, faChartLine,
  faChartPie, faTable, faList, faBars, faCircle, faSquare, faTriangleExclamation,
  faInfo, faQuestion, faExclamation, faCheckCircle, faTimesCircle, faLightbulb,
  faBriefcase, faBuilding, faCity, faMap, faCompass, faClock, faCalendar, faHistory,
  faMagic, faPalette, faBrush, faPen, faFont, faBold, faItalic, faUnderline,
  faHandshake, faThumbsUp, faThumbsDown, faComments, faComment, faReply, faPaperPlane,
  faAt, faHashtag, faBorderAll,
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

// Curated subset of FA solid icons with labels
const ICON_LIST: Array<{ name: string; icon: IconDefinition; label: string }> = [
  { name: 'check', icon: faCheck, label: 'Check' },
  { name: 'star', icon: faStar, label: 'Star' },
  { name: 'heart', icon: faHeart, label: 'Heart' },
  { name: 'user', icon: faUser, label: 'User' },
  { name: 'users', icon: faUsers, label: 'Users' },
  { name: 'home', icon: faHome, label: 'Home' },
  { name: 'cog', icon: faCog, label: 'Settings' },
  { name: 'search', icon: faSearch, label: 'Search' },
  { name: 'bell', icon: faBell, label: 'Bell' },
  { name: 'envelope', icon: faEnvelope, label: 'Email' },
  { name: 'phone', icon: faPhone, label: 'Phone' },
  { name: 'map-marker-alt', icon: faMapMarkerAlt, label: 'Location' },
  { name: 'lock', icon: faLock, label: 'Lock' },
  { name: 'unlock', icon: faUnlock, label: 'Unlock' },
  { name: 'shield', icon: faShield, label: 'Shield' },
  { name: 'key', icon: faKey, label: 'Key' },
  { name: 'arrow-right', icon: faArrowRight, label: 'Arrow Right' },
  { name: 'arrow-left', icon: faArrowLeft, label: 'Arrow Left' },
  { name: 'arrow-up', icon: faArrowUp, label: 'Arrow Up' },
  { name: 'arrow-down', icon: faArrowDown, label: 'Arrow Down' },
  { name: 'chevron-right', icon: faChevronRight, label: 'Chevron Right' },
  { name: 'chevron-down', icon: faChevronDown, label: 'Chevron Down' },
  { name: 'plus', icon: faPlus, label: 'Plus' },
  { name: 'minus', icon: faMinus, label: 'Minus' },
  { name: 'xmark', icon: faXmark, label: 'Close' },
  { name: 'trash', icon: faTrash, label: 'Delete' },
  { name: 'pencil', icon: faPencil, label: 'Edit' },
  { name: 'copy', icon: faCopy, label: 'Copy' },
  { name: 'share', icon: faShare, label: 'Share' },
  { name: 'download', icon: faDownload, label: 'Download' },
  { name: 'upload', icon: faUpload, label: 'Upload' },
  { name: 'link', icon: faLink, label: 'Link' },
  { name: 'image', icon: faImage, label: 'Image' },
  { name: 'video', icon: faVideo, label: 'Video' },
  { name: 'music', icon: faMusic, label: 'Music' },
  { name: 'file', icon: faFile, label: 'File' },
  { name: 'folder', icon: faFolder, label: 'Folder' },
  { name: 'database', icon: faDatabase, label: 'Database' },
  { name: 'code', icon: faCode, label: 'Code' },
  { name: 'terminal', icon: faTerminal, label: 'Terminal' },
  { name: 'globe', icon: faGlobe, label: 'Globe' },
  { name: 'cloud', icon: faCloud, label: 'Cloud' },
  { name: 'wifi', icon: faWifi, label: 'Wifi' },
  { name: 'bolt', icon: faBolt, label: 'Lightning' },
  { name: 'fire', icon: faFire, label: 'Fire' },
  { name: 'leaf', icon: faLeaf, label: 'Leaf' },
  { name: 'sun', icon: faSun, label: 'Sun' },
  { name: 'moon', icon: faMoon, label: 'Moon' },
  { name: 'snowflake', icon: faSnowflake, label: 'Snowflake' },
  { name: 'rocket', icon: faRocket, label: 'Rocket' },
  { name: 'gem', icon: faGem, label: 'Gem' },
  { name: 'crown', icon: faCrown, label: 'Crown' },
  { name: 'trophy', icon: faTrophy, label: 'Trophy' },
  { name: 'medal', icon: faMedal, label: 'Medal' },
  { name: 'award', icon: faAward, label: 'Award' },
  { name: 'bookmark', icon: faBookmark, label: 'Bookmark' },
  { name: 'tag', icon: faTag, label: 'Tag' },
  { name: 'tags', icon: faTags, label: 'Tags' },
  { name: 'shopping-cart', icon: faShoppingCart, label: 'Cart' },
  { name: 'shopping-bag', icon: faShoppingBag, label: 'Bag' },
  { name: 'credit-card', icon: faCreditCard, label: 'Card' },
  { name: 'money-bill', icon: faMoneyBill, label: 'Money' },
  { name: 'chart-bar', icon: faChartBar, label: 'Bar Chart' },
  { name: 'chart-line', icon: faChartLine, label: 'Line Chart' },
  { name: 'chart-pie', icon: faChartPie, label: 'Pie Chart' },
  { name: 'table', icon: faTable, label: 'Table' },
  { name: 'list', icon: faList, label: 'List' },
  { name: 'grid', icon: faBorderAll, label: 'Grid' },
  { name: 'bars', icon: faBars, label: 'Menu' },
  { name: 'circle', icon: faCircle, label: 'Circle' },
  { name: 'square', icon: faSquare, label: 'Square' },
  { name: 'warning', icon: faTriangleExclamation, label: 'Warning' },
  { name: 'info', icon: faInfo, label: 'Info' },
  { name: 'question', icon: faQuestion, label: 'Question' },
  { name: 'exclamation', icon: faExclamation, label: 'Exclamation' },
  { name: 'check-circle', icon: faCheckCircle, label: 'Check Circle' },
  { name: 'times-circle', icon: faTimesCircle, label: 'Error Circle' },
  { name: 'lightbulb', icon: faLightbulb, label: 'Idea' },
  { name: 'briefcase', icon: faBriefcase, label: 'Briefcase' },
  { name: 'building', icon: faBuilding, label: 'Building' },
  { name: 'city', icon: faCity, label: 'City' },
  { name: 'map', icon: faMap, label: 'Map' },
  { name: 'compass', icon: faCompass, label: 'Compass' },
  { name: 'clock', icon: faClock, label: 'Clock' },
  { name: 'calendar', icon: faCalendar, label: 'Calendar' },
  { name: 'history', icon: faHistory, label: 'History' },
  { name: 'magic', icon: faMagic, label: 'Magic' },
  { name: 'palette', icon: faPalette, label: 'Palette' },
  { name: 'brush', icon: faBrush, label: 'Brush' },
  { name: 'pen', icon: faPen, label: 'Pen' },
  { name: 'font', icon: faFont, label: 'Font' },
  { name: 'bold', icon: faBold, label: 'Bold' },
  { name: 'italic', icon: faItalic, label: 'Italic' },
  { name: 'underline', icon: faUnderline, label: 'Underline' },
  { name: 'handshake', icon: faHandshake, label: 'Handshake' },
  { name: 'thumbs-up', icon: faThumbsUp, label: 'Like' },
  { name: 'thumbs-down', icon: faThumbsDown, label: 'Dislike' },
  { name: 'comments', icon: faComments, label: 'Comments' },
  { name: 'comment', icon: faComment, label: 'Comment' },
  { name: 'reply', icon: faReply, label: 'Reply' },
  { name: 'paper-plane', icon: faPaperPlane, label: 'Send' },
  { name: 'at', icon: faAt, label: 'At' },
  { name: 'hashtag', icon: faHashtag, label: 'Hashtag' },
]

export const ICON_MAP: Record<string, IconDefinition> = Object.fromEntries(
  ICON_LIST.map(({ name, icon }) => [name, icon])
)

export function getIconDef(name: string): IconDefinition | undefined {
  return ICON_MAP[name]
}

interface Props {
  value: string | undefined
  onChange: (name: string) => void
}

export function IconPickerField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = search
    ? ICON_LIST.filter(({ name, label }) =>
        label.toLowerCase().includes(search.toLowerCase()) ||
        name.toLowerCase().includes(search.toLowerCase())
      )
    : ICON_LIST

  const currentIcon = value ? ICON_MAP[value] : undefined

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[var(--text-primary)] outline-none bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 hover:border-[var(--primary)]/40 transition-colors"
      >
        {currentIcon ? (
          <FontAwesomeIcon icon={currentIcon} className="w-4 h-4 text-[var(--primary)]" />
        ) : (
          <span className="w-4 h-4 rounded border border-dashed border-[var(--text-primary)]/20 inline-block" />
        )}
        <span className="flex-1 text-left text-[var(--text-primary)]/70">
          {value || 'Choose icon…'}
        </span>
        {value && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="text-[var(--text-primary)]/30 hover:text-red-500 transition-colors ml-auto text-xs px-1"
            title="Clear"
          >
            ✕
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-[var(--surface-raised)] border border-[var(--text-primary)]/10 rounded-lg shadow-xl">
          <div className="p-2 border-b border-[var(--text-primary)]/10">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="w-full px-2.5 py-1.5 rounded-md text-xs bg-[var(--surface-overlay)] border border-[var(--text-primary)]/10 text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/30 outline-none"
            />
          </div>
          <div className="grid grid-cols-7 gap-0.5 p-2 max-h-52 overflow-y-auto">
            {filtered.map(({ name, icon, label }) => (
              <button
                key={name}
                type="button"
                title={label}
                onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                className={`flex items-center justify-center w-8 h-8 rounded transition-colors ${
                  value === name
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-primary)]/60 hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]'
                }`}
              >
                <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-7 text-center text-xs text-[var(--text-primary)]/30 py-4">No icons found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
