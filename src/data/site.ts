import type { ContactLink } from './types'

export const site = {
  name: 'APARAJITA SARKAR',
  /** Split for the stacked layout on narrow screens. */
  firstName: 'APARAJITA',
  lastName: 'SARKAR',
  tagline: 'Building intelligent systems that work.',
  /** PLACEHOLDER — replace with the real introduction. */
  intro:
    '[PLACEHOLDER: short personal introduction — two or three sentences on who I am, what I build, and what I am looking for next.]',
  scrollCue: 'SCROLL TO EXPLORE',
  contact: {
    heading: "LET'S BUILD SOMETHING",
    /** PLACEHOLDER */
    blurb: '[PLACEHOLDER: a short, warm closing paragraph inviting people to get in touch.]',
    links: [
      { label: 'GitHub', href: 'https://github.com/aparajitasarkar', note: 'github.com/aparajitasarkar' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/PLACEHOLDER', note: 'linkedin.com/in/…' },
      { label: 'Email', href: 'mailto:hello@example.com', note: 'hello@example.com' },
      { label: 'Resume', href: '#', note: 'PDF · placeholder' },
    ] satisfies ContactLink[],
  },
  footer: `© ${new Date().getFullYear()} Aparajita Sarkar`,
} as const
