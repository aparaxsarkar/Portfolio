import { external } from './links'
import type { CardItem } from './types'

/** PLACEHOLDER CONTENT — replace each entry; add or remove freely. */
export const experiences: CardItem[] = [
  {
    id: 'exp-1',
    title: 'MACHINE LEARNING RESEARCH INTERN, AIML.COM',
    tags: ['Python', 'PyTorch', 'Hugging Face', 'LLMs'],
    description:
      'Benchmarked parameter-efficient fine-tuning and alignment pipelines for LLM by implementing LoRA, adapters, and DPO with PyTorch and Hugging Face PEFT/TRL in Python. Built a 134K-parameter CNN-LSTM multimodal fusion model for visual question answering, achieving 99.08% test accuracy.',
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
]
