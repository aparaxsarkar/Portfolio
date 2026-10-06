import type { Ref } from 'react'
import { cardName, type CardItem } from '../../data'
import './Card.css'

interface CardProps {
  item: CardItem
  ref?: Ref<HTMLDivElement>
  /** 1-based position, for the slide label. */
  position: number
  total: number
}

/** Card anatomy: tags · title · description · optional labelled outbound link ↗. Nothing is ever clipped. */
export function Card({ item, ref, position, total }: CardProps) {
  return (
    <div
      ref={ref}
      className="card card--compact card--fit"
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
    >
      <p className="card__tags">{item.tags.join(' · ')}</p>
      <h3 className="card__title">
        {item.org ? (
          <>
            <span className="card__role">{item.title},</span> <span className="card__org">{item.org}</span>
          </>
        ) : (
          item.title
        )}
      </h3>
      <p className="card__desc">{item.description}</p>
      {item.link && (
        <a
          className="card__link"
          href={item.link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.link.label}: ${cardName(item)} (opens in a new tab)`}
          draggable={false}
        >
          {item.link.label} <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  )
}
