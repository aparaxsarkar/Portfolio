import { computeWorld, type WorldState } from './state'

type Listener = (state: WorldState) => void

/**
 * Tiny external store for the world. Scroll writes `progress`; canvases and the
 * CSS-variable bridge subscribe. It deliberately lives outside React: a value
 * that changes every frame must not re-render the component tree.
 */
let current = computeWorld(0)
const listeners = new Set<Listener>()

export const worldStore = {
  get: () => current,
  setProgress(progress: number) {
    if (progress === current.progress) return
    current = computeWorld(progress)
    listeners.forEach((l) => l(current))
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

/** Mirrors the world's UI tokens onto :root so plain CSS can consume them. */
export function bindWorldToCss(root: HTMLElement = document.documentElement) {
  const apply = (state: WorldState) => {
    for (const [name, value] of Object.entries(state.ui)) root.style.setProperty(name, value)
  }
  apply(current)
  return worldStore.subscribe(apply)
}
