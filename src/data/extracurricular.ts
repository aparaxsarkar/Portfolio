import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT */
export const extracurricular: CardItem[] = [
  {
    id: 'extra-1',
    title: '[ACTIVITY TITLE 1]',
    tags: ['[Leadership]', '[Years]'],
    description: '[PLACEHOLDER SUMMARY: your role and what you led or organised. Say what changed because you were involved and who it served. Be specific about your part. Name the outcome plainly. Say what you personally built or owned. Name the outcome plainly, with a number.]',
    link: external('View', 'PLACEHOLDER-extracurricular-1'),
  },
  {
    id: 'extra-2',
    title: '[ACTIVITY TITLE 2]',
    tags: ['[Mentoring]', '[Years]'],
    description: '[PLACEHOLDER SUMMARY: who you mentored or supported, what you did together over time, and what came of it for them and for you. Name the outcome plainly. Name the outcome plainly, with a number if you have one. Mention the result, not only the method.]',
    link: external('View', 'PLACEHOLDER-extracurricular-2'),
  },
  {
    id: 'extra-3',
    title: '[ACTIVITY TITLE 3]',
    tags: ['[Community]', '[Years]'],
    description: '[PLACEHOLDER SUMMARY: the community or club, the part you played in it, and a result worth knowing about, in about four lines. Mention the result, not only the method. Keep it scannable. Mention the result, not only the method. Keep it scannable: purpose.]',
    link: external('View', 'PLACEHOLDER-extracurricular-3'),
  },
  {
    id: 'extra-4',
    title: '[ACTIVITY TITLE 4]',
    tags: ['[Open source]', '[Years]'],
    description: '[PLACEHOLDER SUMMARY: the open-source or volunteer work, what you contributed, and its reach or impact — in a few concise lines. Keep it scannable. Say why it mattered. Keep it scannable: purpose, build, outcome. Say why it mattered and to whom.]',
  },
]
