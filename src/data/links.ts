import type { CardLink } from './types'

const OWNER = 'aparajitasarkar'

/** Link to a repository. Replace the slug (or pass a full URL) with the real repo. */
export const github = (slug: string): CardLink => ({
  label: 'GitHub',
  href: slug.startsWith('http') ? slug : `https://github.com/${OWNER}/${slug}`,
})

/** Link to the thing a non-code card describes (a company, a school, an award page, …). PLACEHOLDER hosts. */
export const external = (label: string, slug: string): CardLink => ({
  label,
  href: `https://example.com/${slug}`,
})
