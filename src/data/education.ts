import type { EducationEntry } from './types'

/**
 * PLACEHOLDER CONTENT — bracketed values are placeholders.
 * Only degree, years and university are required; gpa and distinction appear on the card only when present.
 */
export const education: EducationEntry[] = [
  {
    id: 'edu-1',
    degree: '[B.S. / B.A., MAJOR]',
    years: '[YEARS]',
    university: '[UNIVERSITY]',
    gpa: '3.7 / 4.0',
    distinction: 'Honors: Data Science',
  },
  {
    id: 'edu-2',
    degree: '[M.S. / PROGRAM]',
    years: '[YEARS]',
    university: '[UNIVERSITY]',
    gpa: '[X.XX / 4.00]',
  },
]
