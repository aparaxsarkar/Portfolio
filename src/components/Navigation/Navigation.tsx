import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { SECTIONS, site } from '../../data'
import { pageStore, scrollToSection } from '../../scroll/driver'
import './Navigation.css'

const items = SECTIONS.filter((s) => s.label !== null)

/**
 * One <nav>, one shape: a small floating bar, identical from the first frame onward (no landing state, nothing driven
 * by scroll). On narrow screens the same list becomes a dropdown (never a full-screen overlay).
 */
export function Navigation() {
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
    <header className="nav" data-open={open}>
      <nav ref={rootRef} className="nav__inner" aria-label="Primary">
        <a className="nav__name" href="#top" onClick={go('top')}>
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
