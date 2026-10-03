import type { ReactNode } from 'react'
import './Section.css'

interface SectionProps {
  id: string
  title: string
  /** 1-based ordinal shown as the eyebrow. */
  number: number
  /** Nudge content up to make room for extra material beneath the carousel (e.g. Research's spec sheet). */
  lift?: boolean
  children: ReactNode
}

/**
 * A page section: native anchor target (focusable for skip/nav), semantic
 * heading, and the shared vertical placement that seats content in the
 * lower-middle of the landscape rather than the mathematical centre.
 */
export function Section({ id, title, number, lift, children }: SectionProps) {
  const headingId = `${id}-title`
  return (
    <section id={id} className={lift ? 'section section--lift' : 'section'} aria-labelledby={headingId} tabIndex={-1}>
      <header className="section__head">
        <p className="section__eyebrow" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </p>
        <h2 id={headingId} className="section__title">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}
