import { useEffect, useRef } from 'react'
import { createWorldRenderer } from './renderer'
import './world.css'

/**
 * The persistent desert. Purely decorative (aria-hidden): no portfolio content
 * lives in the canvases. It never re-renders — the renderer subscribes to the
 * world store directly.
 */
export function DesertWorld() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    return root ? createWorldRenderer(root) : undefined
  }, [])

  return (
    <div ref={rootRef} className="world" aria-hidden="true">
      <canvas className="world__layer" />
      <canvas className="world__layer" />
      <canvas className="world__layer" />
    </div>
  )
}
