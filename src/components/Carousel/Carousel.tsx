import type { ReactNode, Ref } from 'react'
import { useCarousel } from '../../hooks/useCarousel'
import type { CardItem } from '../../data'
import { Card } from '../Card/Card'
import './Carousel.css'

/** What a carousel hands each card so it can take part in the slide behaviours. */
export interface SlideProps {
  ref: Ref<HTMLDivElement>
  /** 1-based position, for the slide label. */
  position: number
  total: number
}

interface CarouselProps<T extends { id: string }> {
  /** Accessible name, e.g. "Projects". */
  label: string
  /** Singular noun used in announcements and button labels, e.g. "project". */
  noun: string
  items: T[]
  /** Text announced to screen readers when an item becomes current. */
  announce: (item: T) => string
  renderCard: (item: T, slide: SlideProps) => ReactNode
}

/** The standard project/experience-style carousel. */
export function CardCarousel({ label, noun, items }: { label: string; noun: string; items: CardItem[] }) {
  return (
    <Carousel
      label={label}
      noun={noun}
      items={items}
      announce={(item) => item.title}
      renderCard={(item, slide) => <Card item={item} {...slide} />}
    />
  )
}

export function Carousel<T extends { id: string }>({ label, noun, items, announce, renderCard }: CarouselProps<T>) {
  const { viewportRef, setCardRef, index, isStatic, goTo, next, prev, viewportProps } = useCarousel(items.length)
  const active = items[index]
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="carousel" data-static={isStatic}>
      <div
        ref={viewportRef}
        className="carousel__viewport"
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={isStatic ? undefined : 0}
        {...viewportProps}
      >
        {items.map((item, i) => (
          <CardSlot
            key={item.id}
            onSelect={() => (isStatic ? undefined : goTo(i))}
            isCurrent={isStatic || i === index}
          >
            {renderCard(item, { ref: setCardRef(i), position: i + 1, total: items.length })}
          </CardSlot>
        ))}
      </div>

      {!isStatic && (
        <div className="carousel__controls">
          <button type="button" className="carousel__btn" onClick={prev} disabled={index === 0} aria-label={`Previous ${noun}`}>
            <span aria-hidden="true">←</span>
          </button>
          <div className="carousel__ticks">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className="carousel__tick"
                aria-label={`Show ${noun} ${i + 1} of ${items.length}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <button type="button" className="carousel__btn" onClick={next} disabled={index === items.length - 1} aria-label={`Next ${noun}`}>
            <span aria-hidden="true">→</span>
          </button>
          <p className="carousel__count" aria-hidden="true">
            {pad(index + 1)} / {pad(items.length)}
          </p>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {isStatic ? '' : `${noun} ${index + 1} of ${items.length}: ${announce(active)}`}
      </p>

    </div>
  )
}

interface CardSlotProps {
  onSelect: () => void
  isCurrent: boolean
  children: ReactNode
}

/** Wraps a card with the "click a side card to bring it forward" and "focus brings it forward" behaviours. */
function CardSlot({ onSelect, isCurrent, children }: CardSlotProps) {
  return (
    <div
      className="carousel__slot"
      onClickCapture={(e) => {
        if (!isCurrent) {
          e.preventDefault()
          e.stopPropagation()
          onSelect()
        }
      }}
      onFocus={() => {
        if (!isCurrent) onSelect()
      }}
    >
      {children}
    </div>
  )
}
