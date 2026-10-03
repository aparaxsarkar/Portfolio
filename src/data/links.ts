import type { CardLink } from './types'

/** GitHub account used when a repo is given as a bare name, e.g. github('my-repo'). */
const OWNER = 'aparajitasarkar'

/** Link to a repository: pass a full URL, or just the repo name. */
export const github = (repoOrUrl: string): CardLink => ({
  label: 'GitHub',
  href: repoOrUrl.startsWith('http') ? repoOrUrl : `https://github.com/${OWNER}/${repoOrUrl}`,
})

/**
 * Link to whatever a non-code card describes (a company page, a certificate, a write-up, …).
 * `label` is the visible text ("Details", "Certificate", "View", …); `url` is the full destination.
 * Omit the `link` field on a card entirely if there is nothing worth linking to.
 */
export const external = (label: string, url: string): CardLink => ({ label, href: url })
