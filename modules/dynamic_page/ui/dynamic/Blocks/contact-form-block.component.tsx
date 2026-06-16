'use client'

import { useState, FormEvent } from 'react'
import BaseBlock, {
  BASE_BLOCK_DEFAULT_PROPS,
  BASE_BLOCK_SCHEMA_FIELDS,
  parseBaseBlockProps,
  getBlockContentClass,
} from '../partials/base-block.component'
import { defineBlock } from '../utils/defineBlock'

interface ContactFormProps extends Record<string, unknown> {
  heading?: string
  subheading?: string
  webhookUrl?: string
  submitLabel?: string
  successMessage?: string
  showName?: boolean
  showEmail?: boolean
  showPhone?: boolean
  showSubject?: boolean
  showMessage?: boolean
  layout?: string
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

function ContactFormBlock(rawProps: ContactFormProps) {
  const baseProps    = parseBaseBlockProps(rawProps)
  const contentClass = getBlockContentClass(baseProps)

  const heading        = rawProps.heading        || 'Get in touch'
  const subheading     = rawProps.subheading     || ''
  const webhookUrl     = (rawProps.webhookUrl as string) || ''
  const submitLabel    = rawProps.submitLabel    || 'Send message'
  const successMessage = rawProps.successMessage || 'Thanks! We\'ll be in touch soon.'
  const showName       = rawProps.showName    !== false
  const showEmail      = rawProps.showEmail   !== false
  const showPhone      = Boolean(rawProps.showPhone)
  const showSubject    = Boolean(rawProps.showSubject)
  const showMessage    = rawProps.showMessage !== false
  const layout         = (rawProps.layout as string) || 'centered'

  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!webhookUrl) {
      setErrorMsg('No webhook URL configured.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    const data = Object.fromEntries(new FormData(e.currentTarget))

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-[var(--text-primary)]/15 bg-[var(--surface-base)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] text-sm transition-all'
  const labelCls = 'block text-sm font-medium text-[var(--text-primary)] mb-1.5'

  const isWide = layout === 'split'

  return (
    <BaseBlock {...baseProps}>
      <div className={`${contentClass} py-20`}>
        <div className={`${isWide ? 'lg:grid lg:grid-cols-2 lg:gap-16 items-start' : 'max-w-xl mx-auto'}`}>
          {/* Header */}
          <div className={isWide ? 'mb-10 lg:mb-0' : 'text-center mb-10'}>
            {heading    && <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">{heading}</h2>}
            {subheading && <p className="text-lg text-[var(--text-secondary)] leading-relaxed">{subheading}</p>}
          </div>

          {/* Form */}
          <div>
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="text-5xl">✅</div>
                <p className="text-[var(--text-primary)] font-medium">{successMessage}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {showName && (
                  <div>
                    <label className={labelCls} htmlFor="cf-name">Name</label>
                    <input id="cf-name" name="name" type="text" required placeholder="Jane Doe" className={inputCls} />
                  </div>
                )}

                <div className={showPhone ? 'grid sm:grid-cols-2 gap-4' : ''}>
                  {showEmail && (
                    <div>
                      <label className={labelCls} htmlFor="cf-email">Email</label>
                      <input id="cf-email" name="email" type="email" required placeholder="jane@example.com" className={inputCls} />
                    </div>
                  )}
                  {showPhone && (
                    <div>
                      <label className={labelCls} htmlFor="cf-phone">Phone</label>
                      <input id="cf-phone" name="phone" type="tel" placeholder="+1 555 000 0000" className={inputCls} />
                    </div>
                  )}
                </div>

                {showSubject && (
                  <div>
                    <label className={labelCls} htmlFor="cf-subject">Subject</label>
                    <input id="cf-subject" name="subject" type="text" placeholder="How can we help?" className={inputCls} />
                  </div>
                )}

                {showMessage && (
                  <div>
                    <label className={labelCls} htmlFor="cf-message">Message</label>
                    <textarea
                      id="cf-message" name="message" required rows={5}
                      placeholder="Tell us more…"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                )}

                {status === 'error' && (
                  <p className="text-sm text-red-500">{errorMsg || 'Something went wrong. Please try again.'}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {status === 'submitting' ? 'Sending…' : submitLabel}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </BaseBlock>
  )
}

export const ContactFormBlockDefinition = defineBlock<ContactFormProps>({
  type: 'ContactFormBlock',
  label: 'Contact Form',
  category: 'CTA',
  description: 'Configurable contact form that posts JSON to a webhook URL.',
  schema: {
    heading:        { label: 'Heading',         type: 'text',     placeholder: 'Get in touch', group: 'Content' },
    subheading:     { label: 'Subheading',       type: 'textarea', placeholder: 'Fill in the form and we\'ll respond within 24h.', group: 'Content' },
    submitLabel:    { label: 'Button label',     type: 'text',     placeholder: 'Send message', group: 'Content' },
    successMessage: { label: 'Success message',  type: 'text',     placeholder: 'Thanks! We\'ll be in touch soon.', group: 'Content' },
    webhookUrl:     { label: 'Webhook URL',      type: 'url',      placeholder: 'https://…', group: 'Integration' },
    layout: {
      label: 'Layout', type: 'select', group: 'Layout',
      options: [
        { label: 'Centred form', value: 'centered' },
        { label: 'Split (heading + form)', value: 'split' },
      ],
    },
    showName:    { label: 'Show Name field',    type: 'boolean', group: 'Fields' },
    showEmail:   { label: 'Show Email field',   type: 'boolean', group: 'Fields' },
    showPhone:   { label: 'Show Phone field',   type: 'boolean', group: 'Fields' },
    showSubject: { label: 'Show Subject field', type: 'boolean', group: 'Fields' },
    showMessage: { label: 'Show Message field', type: 'boolean', group: 'Fields' },
    ...BASE_BLOCK_SCHEMA_FIELDS,
  },
  defaultProps: {
    heading: 'Get in touch',
    subheading: 'Fill in the form and we\'ll get back to you within 24 hours.',
    submitLabel: 'Send message',
    successMessage: 'Thanks! We\'ll be in touch soon.',
    webhookUrl: '',
    layout: 'centered',
    showName: true,
    showEmail: true,
    showPhone: false,
    showSubject: false,
    showMessage: true,
    blockClass: 'bg-[var(--surface-base)]', sectionId: 'contact',
    ...BASE_BLOCK_DEFAULT_PROPS,
  },
  Component: ContactFormBlock,
})

export default ContactFormBlock
