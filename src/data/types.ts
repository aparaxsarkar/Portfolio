/**
 * Content schemas. Components render these shapes and nothing else, so
 * swapping placeholder content for real content never touches a component.
 */

/** The outbound link on a card. The label says what the destination actually is. */
export interface CardLink {
  /** Visible text, e.g. "GitHub", "Company", "Details". An "↗" is appended by the card. */
  label: string
  href: string
}

/** One card in a carousel. Every card shows tags, title, a two-line description and a link. */
export interface CardItem {
  id: string
  title: string
  /** Shown above the title, joined with " · ". */
  tags: string[]
  /** Clamped to two lines in the card. Keep it short. */
  description: string
  /**
   * Optional outbound link. Code-oriented cards (projects, research) use GitHub; others link to what they describe
   * ("Certificate", "Details", "View"). Leave it out when there is no real destination — the card simply omits it.
   */
  link?: CardLink
}

/** Research is the technical-depth layer: same card, plus a spec sheet shown below the carousel. */
export interface ResearchEntry extends CardItem {
  details: { label: string; value: string }[]
}

export interface SkillGroup {
  category: string
  items: string[]
}

export interface ContactLink {
  label: string
  href: string
  /** Shown beside the label (e.g. the address). */
  note?: string
}
