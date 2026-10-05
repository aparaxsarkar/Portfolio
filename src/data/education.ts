import type { EducationEntry } from './types'

/**
 * Only degree, years and university are required; gpa and distinction appear on the card only when present.
 * Listed most recent first.
 */
export const education: EducationEntry[] = [
  {
    id: 'edu-1',
    degree: 'MS in Computer Science',
    years: '2025 – 2027',
    university: 'Rutgers University – New Brunswick',
    gpa: '4.0 / 4.0',
    distinction: 'Concentration: Machine Learning',
  },
  {
    id: 'edu-2',
    degree: 'BTech in Electronics',
    years: '2020 – 2024',
    university: 'Cummins College – Pune University',
    gpa: '9.3 / 10.0',
    distinction: 'Honors: Data Science',
  },
]
