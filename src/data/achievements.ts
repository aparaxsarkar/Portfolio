import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT */
export const achievements: CardItem[] = [
  {
    id: 'ach-1',
    title: '[ACHIEVEMENT TITLE 1]',
    tags: ['[Award]', '[Year]'],
    description: '[Two-line description of what it recognised and why it mattered.]',
    link: external('Certificate', 'PLACEHOLDER-achievement-1'),
  },
  {
    id: 'ach-2',
    title: '[ACHIEVEMENT TITLE 2]',
    tags: ['[Hackathon]', '[Year]'],
    description: '[Two-line description of what it recognised and why it mattered.]',
    link: external('Certificate', 'PLACEHOLDER-achievement-2'),
  },
  {
    id: 'ach-3',
    title: '[ACHIEVEMENT TITLE 3]',
    tags: ['[Scholarship]', '[Year]'],
    description: '[Two-line description of what it recognised and why it mattered.]',
    link: external('Certificate', 'PLACEHOLDER-achievement-3'),
  },
  {
    id: 'ach-4',
    title: '[ACHIEVEMENT TITLE 4]',
    tags: ['[Publication]', '[Year]'],
    description: '[Two-line description of what it recognised and why it mattered.]',
    link: external('Certificate', 'PLACEHOLDER-achievement-4'),
  },
]
