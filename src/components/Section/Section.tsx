import type { ReactNode } from 'react'
import './Section.css'

interface SectionProps {
  id: string
  title: string
  children: ReactNode
}

/**
 * A page section: native anchor target (focusable for skip/nav), semantic heading, and the shared vertical placement
 * that seats content in the lower-middle of the landscape rather than the mathematical centre.
 */
export function Section({ id, title, children }: SectionProps) {
  const headingId = `${id}-title`
  return (
    <section id={id} className="section" aria-labelledby={headingId} tabIndex={-1}>
      <header className="section__head">
        <h2 id={headingId} className="section__title">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}
