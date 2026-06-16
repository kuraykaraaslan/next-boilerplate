import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faBolt, faRocket, faCodeBranch, faChartLine, faPlug,
  faBook, faRss, faClockRotateLeft, faCircleCheck,
  faShield, faLifeRing, faUsers, faBriefcase,
} from '@fortawesome/free-solid-svg-icons'

export type NavLink = { label?: string; href?: string }
export type MegaItem = { icon?: string; label?: string; description?: string; href?: string }
export type MegaSection = {
  trigger?: string
  width?: string
  items?: MegaItem[]
  featuredEyebrow?: string
  featuredTitle?: string
  featuredDescription?: string
  featuredPrimaryLabel?: string
  featuredPrimaryHref?: string
  featuredSecondaryLabel?: string
  featuredSecondaryHref?: string
}

export type ICON_MAP_TYPE = Record<string, IconDefinition>

export const ICON_MAP: ICON_MAP_TYPE = {
  rocket: faRocket,
  'code-branch': faCodeBranch,
  'chart-line': faChartLine,
  plug: faPlug,
  book: faBook,
  rss: faRss,
  'clock-rotate-left': faClockRotateLeft,
  'circle-check': faCircleCheck,
  shield: faShield,
  'life-ring': faLifeRing,
  users: faUsers,
  briefcase: faBriefcase,
  bolt: faBolt,
}
