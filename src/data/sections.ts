/** Page structure. Order here is the order on the page and in the navigation. */
export interface SectionMeta {
  id: string
  /** Navigation label. `null` for the hero, which is not a nav item. */
  label: string | null
  /** Visible section title (kept identical to the nav label). */
  title?: string
}

export const SECTIONS: SectionMeta[] = [
  { id: 'top', label: null },
  { id: 'experiences', label: 'EXPERIENCES', title: 'Experiences' },
  { id: 'projects', label: 'PROJECTS', title: 'Projects' },
  { id: 'research', label: 'RESEARCH', title: 'Research' },
  { id: 'education', label: 'EDUCATION', title: 'Education' },
  { id: 'achievements', label: 'ACHIEVEMENTS', title: 'Achievements' },
  { id: 'extracurricular', label: 'EXTRACURRICULAR', title: 'Extracurricular' },
  { id: 'skills', label: 'SKILLS', title: 'Skills' },
  { id: 'contact', label: 'CONTACT', title: 'Contact' },
]
