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
  /**
   * Optional second line under the title, e.g. the employer for a role. The title then ends in a comma and the
   * organisation sits on the line below, so every card in the set reads the same way.
   */
  org?: string
  /** Shown above the title, joined with " · ". */
  tags: string[]
  /** A short summary, shown in up to five lines: what it was, what was built or done, and the outcome or purpose. */
  description: string
  /**
   * Optional outbound link. Code-oriented cards (projects, research) use GitHub; others link to what they describe
   * ("Certificate", "Details", "View"). Leave it out when there is no real destination — the card simply omits it.
   */
  link?: CardLink
}

/**
 * An academic credential. Deliberately not a CardItem: no summary, no tags — just the facts.
 * Every field except `degree`, `years` and `university` is optional and is simply not rendered when absent.
 */
export interface EducationEntry {
  id: string
  /** Degree or programme, e.g. "B.S., Computer Science". */
  degree: string
  /** e.g. "2019 – 2023". */
  years: string
  university: string
  /** The score only, e.g. "3.7 / 4.0"; the card adds the "GPA:" label. */
  gpa?: string
  /** A complete line, e.g. "Honors: Data Science", "Concentration: Machine Learning" or "Thesis: …". */
  distinction?: string
  link?: CardLink
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

/** The card's full name as spoken or announced: "Role, Organisation" when there is an organisation. */
export const cardName = (item: Pick<CardItem, 'title' | 'org'>) => (item.org ? `${item.title}, ${item.org}` : item.title)
