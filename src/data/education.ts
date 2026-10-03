import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT — two entries; the layout keeps normal card dimensions. */
export const education: CardItem[] = [
  {
    id: 'edu-1',
    title: '[DEGREE], [UNIVERSITY]',
    tags: ['[Field of study]', '[Years]'],
    description: '[Two-line note: focus area, thesis or capstone, relevant coursework.]',
    link: external('Details', 'PLACEHOLDER-education-1'),
  },
  {
    id: 'edu-2',
    title: '[DEGREE], [UNIVERSITY]',
    tags: ['[Field of study]', '[Years]'],
    description: '[Two-line note: focus area, thesis or capstone, relevant coursework.]',
    link: external('Details', 'PLACEHOLDER-education-2'),
  },
]
