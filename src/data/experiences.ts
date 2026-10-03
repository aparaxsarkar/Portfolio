import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT — replace each entry; add or remove freely. */
export const experiences: CardItem[] = [
  {
    id: 'exp-1',
    title: '[ROLE TITLE], [COMPANY]',
    tags: ['Python', 'LLMs', 'AWS'],
    description: '[PLACEHOLDER SUMMARY: where you worked and what the team was building. Two or three sentences on what you personally built or owned, the scale it ran at, and the result it delivered. Say what you personally built or owned. Name the outcome plainly, with a.]',
    link: external('Details', 'https://example.com/PLACEHOLDER-experience-1'),
  },
  {
    id: 'exp-2',
    title: '[ROLE TITLE], [COMPANY]',
    tags: ['TypeScript', 'React', 'Node.js'],
    description: '[PLACEHOLDER SUMMARY: the role and the product. What you shipped, which parts of the stack you worked across, and the measurable outcome or user impact it had. Name the outcome plainly. Name the outcome plainly, with a number if you have one.]',
    link: external('Details', 'https://example.com/PLACEHOLDER-experience-2'),
  },
  {
    id: 'exp-3',
    title: '[ROLE TITLE], [COMPANY]',
    tags: ['PyTorch', 'MLOps', 'Docker'],
    description: '[PLACEHOLDER SUMMARY: what the work was, what you personally built or shipped, and the outcome it had for the team or its users — kept to about four lines. Mention the result, not only… Mention the result, not only the method. Keep it scannable: purpose.]',
    link: external('Details', 'https://example.com/PLACEHOLDER-experience-3'),
  },
  {
    id: 'exp-4',
    title: '[ROLE TITLE], [COMPANY]',
    tags: ['Java', 'Microservices', 'Kafka'],
    description: '[PLACEHOLDER SUMMARY: the team, the problem, and your contribution. Mention the systems you designed or improved, how it was validated, and the difference it made once it shipped. Keep it scannable: purpose, build, outcome. Say why it mattered and to whom.]',
    link: external('Details', 'https://example.com/PLACEHOLDER-experience-4'),
  },
]
