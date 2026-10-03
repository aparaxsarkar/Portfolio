import type { ReactNode } from 'react'
import { useCarousel } from '../../hooks/useCarousel'
import type { CardItem } from '../../data'
import { Card } from '../Card/Card'
import './Carousel.css'

interface CarouselProps<T extends CardItem> {
  /** Accessible name, e.g. "Projects". */
  label: string
  /** Singular noun used in announcements and button labels, e.g. "project". */
  noun: string
  items: T[]
  /** Optional extra detail for the centred item (used by Research). */
  renderDetail?: (item: T) => ReactNode
}

export function Carousel<T extends CardItem>({ label, noun, items, renderDetail }: CarouselProps<T>) {
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
            item={item}
            position={i + 1}
            total={items.length}
            setRef={setCardRef(i)}
            onSelect={() => (isStatic ? undefined : goTo(i))}
            isCurrent={isStatic || i === index}
          />
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
        {isStatic ? '' : `${noun} ${index + 1} of ${items.length}: ${active.title}`}
      </p>

      {renderDetail && (
        <div className="carousel__detail" role="region" aria-label={`Details: ${active.title}`}>
          {renderDetail(active)}
        </div>
      )}
    </div>
  )
}

interface CardSlotProps {
  item: CardItem
  position: number
  total: number
  setRef: (el: HTMLElement | null) => void
  onSelect: () => void
  isCurrent: boolean
}

/** Wraps a card with the "click a side card to bring it forward" and "focus brings it forward" behaviours. */
function CardSlot({ item, position, total, setRef, onSelect, isCurrent }: CardSlotProps) {
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
      <Card ref={setRef} item={item} position={position} total={total} />
    </div>
  )
}
