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
    blurb:
      'I’m currently pursuing full-time opportunities in AI/ML and software engineering starting May 2027 or later. While recent CPT restrictions mean I won’t be able to pursue internships before graduation, I’m always open to meeting curious people, exchanging ideas, and building cool things together. If you’re working on something interesting—or simply want to get in touch—don’t hesitate to reach out.',
    links: [
      { label: 'GitHub', href: 'https://github.com/aparaxsarkar', note: 'github.com/aparaxsarkar' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/aparajita-sarkar/', note: 'linkedin.com/in/aparajita-sarkar' },
      { label: 'Email', href: 'mailto:aparajita.sarkar.sj@gmail.com', note: 'aparajita.sarkar.sj@gmail.com' },
      { label: 'Resume', href: '#', note: 'PDF · placeholder' },
    ] satisfies ContactLink[],
  },
  footer: `© ${new Date().getFullYear()} Aparajita Sarkar`,
} as const
