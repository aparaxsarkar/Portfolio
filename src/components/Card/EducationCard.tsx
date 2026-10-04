import type { Ref } from 'react'
import type { EducationEntry } from '../../data'
import './Card.css'

interface EducationCardProps {
  entry: EducationEntry
  ref?: Ref<HTMLDivElement>
  position: number
  total: number
}

/**
 * A credential, not a project: degree · years, university, then quiet metadata. Same card shell and dimensions as
 * every other card, except that the height follows the content (no reserved space; a set of cards shares the tallest one's height). Optional fields are omitted
 * entirely when absent.
 */
export function EducationCard({ entry, ref, position, total }: EducationCardProps) {
  const { degree, years, university, gpa, distinction, link } = entry
  return (
    <div ref={ref} className="card card--compact" role="group" aria-roledescription="slide" aria-label={`${position} of ${total}`}>
      <p className="card__tags">
        {degree} · {years}
      </p>
      <h3 className="card__title">{university}</h3>
      {(gpa || distinction) && (
        <ul className="card__meta">
          {gpa && <li>GPA: {gpa}</li>}
          {distinction && <li>{distinction}</li>}
        </ul>
      )}
      {link && (
        <a
          className="card__link"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${link.label}: ${university} (opens in a new tab)`}
          draggable={false}
        >
          {link.label} <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  )
}
