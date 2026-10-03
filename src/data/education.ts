import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT — two entries; the layout keeps normal card dimensions. */
export const education: CardItem[] = [
  {
    id: 'edu-1',
    title: '[DEGREE], [UNIVERSITY]',
    tags: ['[Field of study]', '[Years]'],
    description: '[PLACEHOLDER: your focus area, any thesis or capstone, and the coursework most relevant to the work you do now. Keep it to a few lines. Be specific about your part. Say what you personally built or owned. Name the outcome plainly, with a number if you have one.]',
    link: external('Details', 'https://example.com/PLACEHOLDER-education-1'),
  },
  {
    id: 'edu-2',
    title: '[DEGREE], [UNIVERSITY]',
    tags: ['[Field of study]', '[Years]'],
    description: '[PLACEHOLDER: the programme, what you concentrated on, and one or two notable projects, courses or distinctions from it. Written in a few lines, not a transcript. Name the outcome plainly. Name the outcome plainly, with a number if you have one.]',
    link: external('Details', 'https://example.com/PLACEHOLDER-education-2'),
  },
]
