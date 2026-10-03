import { github } from './links'
import type { ResearchEntry } from './types'

/**
 * PLACEHOLDER CONTENT.
 * Research entries carry `details` — the technical depth layer, shown as a
 * spec sheet under the carousel for whichever card is centered.
 */
export const research: ResearchEntry[] = [
  {
    id: 'research-1',
    title: '[RESEARCH TITLE 1]',
    tags: ['Transformers', 'Representation Learning'],
    description: '[Two-line summary of the research question and the headline result.]',
    link: github('PLACEHOLDER-research-1'),
    details: [
      { label: 'Problem', value: '[What gap or failure mode this work targets.]' },
      { label: 'Approach', value: '[Model, objective, and training setup in a sentence or two.]' },
      { label: 'Stack', value: '[PyTorch · JAX · Weights & Biases · SLURM]' },
      { label: 'Outcome', value: '[Key metric, baseline comparison, venue or status.]' },
    ],
  },
  {
    id: 'research-2',
    title: '[RESEARCH TITLE 2]',
    tags: ['Reinforcement Learning', 'Planning'],
    description: '[Two-line summary of the research question and the headline result.]',
    link: github('PLACEHOLDER-research-2'),
    details: [
      { label: 'Problem', value: '[What gap or failure mode this work targets.]' },
      { label: 'Approach', value: '[Model, objective, and training setup in a sentence or two.]' },
      { label: 'Stack', value: '[PyTorch · Ray · Gymnasium]' },
      { label: 'Outcome', value: '[Key metric, baseline comparison, venue or status.]' },
    ],
  },
  {
    id: 'research-3',
    title: '[RESEARCH TITLE 3]',
    tags: ['NLP', 'Evaluation'],
    description: '[Two-line summary of the research question and the headline result.]',
    link: github('PLACEHOLDER-research-3'),
    details: [
      { label: 'Problem', value: '[What gap or failure mode this work targets.]' },
      { label: 'Approach', value: '[Model, objective, and training setup in a sentence or two.]' },
      { label: 'Stack', value: '[Hugging Face · scikit-learn · pandas]' },
      { label: 'Outcome', value: '[Key metric, baseline comparison, venue or status.]' },
    ],
  },
  {
    id: 'research-4',
    title: '[RESEARCH TITLE 4]',
    tags: ['Graph ML', 'Optimization'],
    description: '[Two-line summary of the research question and the headline result.]',
    link: github('PLACEHOLDER-research-4'),
    details: [
      { label: 'Problem', value: '[What gap or failure mode this work targets.]' },
      { label: 'Approach', value: '[Model, objective, and training setup in a sentence or two.]' },
      { label: 'Stack', value: '[PyTorch Geometric · NetworkX · CUDA]' },
      { label: 'Outcome', value: '[Key metric, baseline comparison, venue or status.]' },
    ],
  },
]
