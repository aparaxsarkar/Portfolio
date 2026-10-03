import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT */
export const achievements: CardItem[] = [
  {
    id: 'ach-1',
    title: '[ACHIEVEMENT TITLE 1]',
    tags: ['[Award]', '[Year]'],
    description: '[PLACEHOLDER SUMMARY: what this recognised, who awarded it, and why it mattered — a few concise lines. Be specific about your part. Name the outcome plainly. Say what you personally built or owned. Name the outcome plainly, with a number if you have one.]',
    link: external('Certificate', 'https://example.com/PLACEHOLDER-achievement-1'),
  },
  {
    id: 'ach-2',
    title: '[ACHIEVEMENT TITLE 2]',
    tags: ['[Hackathon]', '[Year]'],
    description: '[PLACEHOLDER SUMMARY: the event or competition, what your team built in the time available, and where it placed. Short and factual, a few lines at most. Name the outcome plainly. Name the outcome plainly, with a number if you have one.]',
    link: external('Certificate', 'https://example.com/PLACEHOLDER-achievement-2'),
  },
  {
    id: 'ach-3',
    title: '[ACHIEVEMENT TITLE 3]',
    tags: ['[Scholarship]', '[Year]'],
    description: '[PLACEHOLDER SUMMARY: what the award or scholarship was for, how it was earned, and what it made possible. Concise and specific rather than general. Mention the result, not only the method. Mention the result, not only the method. Keep it scannable: purpose.]',
    link: external('Certificate', 'https://example.com/PLACEHOLDER-achievement-3'),
  },
  {
    id: 'ach-4',
    title: '[ACHIEVEMENT TITLE 4]',
    tags: ['[Publication]', '[Year]'],
    description: '[PLACEHOLDER SUMMARY: the publication or talk, its venue, and the contribution it made. A few lines is plenty — say what it was and why it mattered. Keep it scannable. Say why it mattered. Keep it scannable: purpose, build, outcome. Say why it mattered and to.]',
    link: external('Certificate', 'https://example.com/PLACEHOLDER-achievement-4'),
  },
]
