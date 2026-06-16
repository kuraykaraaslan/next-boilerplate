'use client'

import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/BaseBlock'
import { defineBlock } from '../utils/defineBlock'

interface TeamMember {
  name?: string; role?: string; bio?: string; avatar?: string
  twitter?: string; linkedin?: string; github?: string; link?: string
}

interface TeamProps extends Record<string, unknown> {
  heading?: string; subheading?: string
  style?: string; columns?: string
  members?: TeamMember[]
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function SocialLinks({ m }: { m: TeamMember }) {
  const links = [
    m.twitter  && { href: m.twitter,  icon: <IconX /> },
    m.linkedin && { href: m.linkedin, icon: <IconLinkedIn /> },
    m.github   && { href: m.github,   icon: <IconGitHub /> },
  ].filter(Boolean) as { href: string; icon: React.ReactNode }[]

  if (!links.length) return null
  return (
    <div className="flex gap-2 mt-1">
      {links.map(({ href, icon }, i) => (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/8 transition-colors"
        >
          {icon}
        </a>
      ))}
    </div>
  )
}

function Avatar({ m }: { m: TeamMember }) {
  if (m.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={m.avatar}
        alt={m.name || ''}
        className="w-20 h-20 rounded-full object-cover ring-2 ring-[var(--primary)]/20 flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-20 h-20 rounded-full bg-[var(--primary)]/12 flex items-center justify-center text-[var(--primary)] text-2xl font-bold flex-shrink-0">
      {(m.name || '?')[0].toUpperCase()}
    </div>
  )
}

function TeamBlock(rawProps: TeamProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)
  const heading    = rawProps.heading    || ''
  const subheading = rawProps.subheading || ''
  const style      = (rawProps.style   as string) || 'grid'
  const columns    = (rawProps.columns as string) || '3'
  const members    = (rawProps.members as TeamMember[] | undefined) || []

  const colClass: Record<string, string> = {
    '2': 'sm:grid-cols-2',
    '3': 'sm:grid-cols-2 lg:grid-cols-3',
    '4': 'sm:grid-cols-2 lg:grid-cols-4',
  }

  const sectionHeader = (heading || subheading) ? (
    <div className="text-center mb-14">
      {heading    && <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>}
      {subheading && <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">{subheading}</p>}
    </div>
  ) : null

  // ── Horizontal list (leadership style) ──────────────────────────────────────
  if (style === 'horizontal') {
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-20`}>
          {sectionHeader}
          <div className="space-y-6">
            {members.map((m, i) => (
              <div key={i} className="flex items-start gap-5 p-6 rounded-2xl bg-[var(--surface-raised)] border border-[var(--text-primary)]/8">
                <Avatar m={m} />
                <div className="flex-1 min-w-0">
                  {m.name && <p className="font-semibold text-lg text-[var(--text-primary)] leading-tight">{m.name}</p>}
                  {m.role && <p className="text-sm text-[var(--primary)] font-medium mt-0.5">{m.role}</p>}
                  {m.bio  && <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{m.bio}</p>}
                  <SocialLinks m={m} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BaseBlock>
    )
  }

  // ── Card grid ────────────────────────────────────────────────────────────────
  if (style === 'card') {
    return (
      <BaseBlock {...baseProps}>
        <div className={`${contentClass} py-20`}>
          {sectionHeader}
          <div className={`grid grid-cols-1 ${colClass[columns] ?? colClass['3']} gap-6`}>
            {members.map((m, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-4 p-8 rounded-2xl bg-[var(--surface-raised)] border border-[var(--text-primary)]/8 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <Avatar m={m} />
                <div>
                  {m.name && <p className="font-semibold text-[var(--text-primary)] text-lg leading-tight">{m.name}</p>}
                  {m.role && <p className="text-sm text-[var(--primary)] font-medium mt-1">{m.role}</p>}
                  {m.bio  && <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">{m.bio}</p>}
                </div>
                <SocialLinks m={m} />
              </div>
            ))}
          </div>
        </div>
      </BaseBlock>
    )
  }

  // ── Default: minimal grid ────────────────────────────────────────────────────
  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        {sectionHeader}
        <div className={`grid grid-cols-1 ${colClass[columns] ?? colClass['3']} gap-10`}>
          {members.map((m, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <Avatar m={m} />
              <div>
                {m.name && <p className="font-semibold text-[var(--text-primary)]">{m.name}</p>}
                {m.role && <p className="text-sm text-[var(--primary)] font-medium mt-0.5">{m.role}</p>}
                {m.bio  && <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{m.bio}</p>}
              </div>
              <SocialLinks m={m} />
            </div>
          ))}
        </div>
      </div>
    </BaseBlock>
  )
}

export const TeamBlockDefinition = defineBlock<TeamProps>({
  type: 'TeamBlock',
  label: 'Team',
  category: 'Content',
  description: 'Team member cards with photo, name, role, bio, and social links.',
  schema: {
    heading:    { label: 'Section Heading',    type: 'text',     placeholder: 'Meet the Team', group: 'Content' },
    subheading: { label: 'Section Subheading', type: 'textarea', placeholder: 'The people behind…', group: 'Content' },
    style: {
      label: 'Card Style', type: 'select', group: 'Layout',
      options: [
        { label: 'Minimal (no card)',  value: 'grid' },
        { label: 'Card (with border)', value: 'card' },
        { label: 'Horizontal list',    value: 'horizontal' },
      ],
    },
    columns: {
      label: 'Columns', type: 'select', group: 'Layout',
      showIf: { style: ['grid', 'card'] },
      options: [{ label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }],
    },
    members: {
      label: 'Team Members', type: 'repeater', group: 'Content',
      fields: {
        avatar:   { label: 'Photo',           type: 'img',      uploadFolder: 'avatars' },
        name:     { label: 'Full Name',        type: 'text',     placeholder: 'Jane Doe' },
        role:     { label: 'Role / Title',     type: 'text',     placeholder: 'CEO & Co-founder' },
        bio:      { label: 'Short Bio',        type: 'textarea', placeholder: 'Jane leads product…' },
        twitter:  { label: 'X / Twitter URL', type: 'url',      placeholder: 'https://x.com/janedoe' },
        linkedin: { label: 'LinkedIn URL',     type: 'url',      placeholder: 'https://linkedin.com/in/janedoe' },
        github:   { label: 'GitHub URL',       type: 'url',      placeholder: 'https://github.com/janedoe' },
      },
    },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: 'Meet the Team', subheading: 'The people building the future.',
    style: 'card', columns: '3',
    members: [
      { name: 'Alice Chen',  role: 'CEO & Co-founder',  bio: 'Alice drives vision and strategy.', avatar: '', twitter: '', linkedin: '', github: '' },
      { name: 'Bob Müller',  role: 'CTO',               bio: 'Bob leads our engineering org.',    avatar: '', twitter: '', linkedin: '', github: '' },
      { name: 'Carla Rossi', role: 'Head of Design',    bio: 'Carla shapes user experience.',     avatar: '', twitter: '', linkedin: '', github: '' },
    ],
    blockClass: 'bg-[var(--surface-base)]', sectionId: 'team',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  variants: [
    { id: 'card',       label: 'Cards',      description: 'Card grid with border',   overrides: { style: 'card',       columns: '3' } },
    { id: 'minimal',    label: 'Minimal',    description: 'No card background',      overrides: { style: 'grid',       columns: '3' } },
    { id: 'horizontal', label: 'Horizontal', description: 'Photo + text side by side', overrides: { style: 'horizontal' } },
  ],
  defaultVariant: 'card',
  Component: TeamBlock,
})

export default TeamBlock
