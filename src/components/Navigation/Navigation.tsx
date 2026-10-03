import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { SECTIONS, site } from '../../data'
import { pageStore, scrollToSection } from '../../scroll/driver'
import './Navigation.css'

const items = SECTIONS.filter((s) => s.label !== null)

/**
 * One <nav>, two states. At rest it is a quiet line of labels set into the
 * sky; once the page scrolls it condenses into a small floating bar. The same
 * list becomes a compact dropdown (never a full-screen overlay) on narrow screens.
 */
export function Navigation() {
  const compact = useSyncExternalStore(pageStore.subscribe, pageStore.getCompact, () => false)
  const active = useSyncExternalStore(pageStore.subscribe, pageStore.getActive, () => 0)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector<HTMLElement>('.nav__menu')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    scrollToSection(id)
  }

  return (
    <header className="nav" data-compact={compact} data-open={open}>
      <nav ref={rootRef} className="nav__inner" aria-label="Primary">
        <a className="nav__name" href="#top" onClick={go('top')} tabIndex={compact ? 0 : -1}>
          {site.name}
        </a>
        <button
          type="button"
          className="nav__menu"
          aria-expanded={open}
          aria-controls="nav-list"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
          <span className="nav__menu-icon" aria-hidden="true" />
        </button>
        <ul id="nav-list" className="nav__list">
          {items.map((item) => {
            const current = SECTIONS[active]?.id === item.id
            return (
              <li key={item.id}>
                <a
                  className="nav__link"
                  href={`#${item.id}`}
                  onClick={go(item.id)}
                  aria-current={current ? 'location' : undefined}
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
