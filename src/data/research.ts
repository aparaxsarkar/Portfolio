import { github } from './links'
import type { CardItem } from './types'

/**
 * PLACEHOLDER CONTENT.
 * Research uses the same card as everything else; its technical depth lives in the summary (up to five lines).
 */
export const research: CardItem[] = [
  {
    id: 'research-1',
    title: '[RESEARCH TITLE 1]',
    tags: ['Transformers', 'Representation Learning'],
    description:
      '[PLACEHOLDER SUMMARY: the research question and why it matters, the model or training setup you used, the key technical detail, and the headline result against the baseline. Say what you personally built.]',
    link: github('PLACEHOLDER-research-1'),
  },
  {
    id: 'research-2',
    title: '[RESEARCH TITLE 2]',
    tags: ['Reinforcement Learning', 'Planning'],
    description:
      '[PLACEHOLDER SUMMARY: the problem and the failure mode it targets, the method you proposed or evaluated, the benchmark, and what the results showed. Name the outcome plainly, with a number if you have one. Mention the result, not only the method.]',
    link: github('PLACEHOLDER-research-2'),
  },
  {
    id: 'research-3',
    title: '[RESEARCH TITLE 3]',
    tags: ['NLP', 'Evaluation'],
    description:
      '[PLACEHOLDER SUMMARY: what was being measured and where existing evaluation falls short, the data and models involved, your approach, and the finding or venue. Mention the result, not only the method. Keep it scannable: purpose, build, outcome.]',
    link: github('PLACEHOLDER-research-3'),
  },
  {
    id: 'research-4',
    title: '[RESEARCH TITLE 4]',
    tags: ['Graph ML', 'Optimization'],
    description:
      '[PLACEHOLDER SUMMARY: the task and why it is hard, the graph or optimisation formulation, and your method. Then one line on the implementation and one on the outcome. Keep it scannable. Keep it scannable: purpose, build, outcome. Say why it mattered and to.]',
    link: github('PLACEHOLDER-research-4'),
  },
]
