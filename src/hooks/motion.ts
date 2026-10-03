const query = '(prefers-reduced-motion: reduce)'

/** Read at the moment of use (carousel moves, nav jumps) so a mid-session OS change is honoured. */
export const prefersReducedMotion = () => window.matchMedia(query).matches
