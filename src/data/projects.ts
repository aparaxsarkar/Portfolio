import { github } from './links'
import type { CardItem } from './types'

/** Crucible is real; the remaining entries are PLACEHOLDER CONTENT — replace each; add or remove freely. */
export const projects: CardItem[] = [
  {
    id: 'crucible',
    title: 'CRUCIBLE – Self-Improving Security Harness',
    tags: ['LLMs', 'RAG', 'AI Security', 'Python', 'MongoDB'],
    description:
      'Built a self-evolving LLM security harness in Python where red-team agents generate tool-use attacks and blue-team agents develop and evaluate defensive patches across system generations. Implementing persistent RAG memory using MongoDB, attack success fell from 66.7% to 0% across five generations, while also increasing generated candidate quality by 7×.',
    link: github('Crucible'),
  },
  {
    id: 'portfolio',
    title: 'BONUS! THIS PORTFOLIO!',
    tags: ['Frontend', 'React', 'TypeScript', 'Canvas/SVG'],
    description:
      'Engineered a portfolio with React and TypeScript, using a deterministic world-state system to synchronize environment lighting, sun position, shadows, sky transitions, and celestial effects with navigation progress. Built reusable, data-driven carousels with Canvas/SVG rendering, keyboard and touch interaction, and responsive design across desktop and mobile.',
    link: github('https://github.com/aparaxsarkar/aparaxsarkar.github.io'),
  },
  {
    id: 'project-1',
    title: '[PROJECT TITLE 1]',
    tags: ['LLMs', 'Agents', 'MongoDB'],
    description: '[PLACEHOLDER SUMMARY: what the project does and who it is for. Describe what you built, the interesting technical decision, and the outcome or purpose — in a few concise lines. Say what you personally built or owned. Name the outcome plainly, with a number if.]',
    link: github('PLACEHOLDER-project-1'),
  },
  {
    id: 'project-2',
    title: '[PROJECT TITLE 2 — A LONGER NAME]',
    tags: ['React', 'TypeScript', 'WebGL'],
    description: '[PLACEHOLDER SUMMARY: what was built and why it exists. One or two sentences on the approach you took, what made it technically interesting, and the result it produced. Name the outcome plainly, with a number if you have one. Mention the result, not only the.]',
    link: github('PLACEHOLDER-project-2'),
  },
  {
    id: 'project-3',
    title: '[PROJECT TITLE 3]',
    tags: ['PyTorch', 'Computer Vision'],
    description: '[PLACEHOLDER SUMMARY: the problem this project tackles, the model or system you built to solve it, and how well it worked. Written to be scanned in a few seconds, not read like a README. Mention the result, not only the method. Keep it scannable: purpose.]',
    link: github('PLACEHOLDER-project-3'),
  },
  {
    id: 'project-4',
    title: '[PROJECT TITLE 4]',
    tags: ['Go', 'gRPC', 'PostgreSQL'],
    description: '[PLACEHOLDER SUMMARY: what the service does, how it is structured, and the outcome — the latency, scale, or reason it exists, in a few concise lines a visitor can scan. Keep it scannable. Keep it scannable: purpose, build, outcome. Say why it mattered and to.]',
    link: github('PLACEHOLDER-project-4'),
  },
  {
    id: 'project-5',
    title: '[PROJECT TITLE 5]',
    tags: ['RAG', 'Vector Search', 'FastAPI'],
    description: '[PLACEHOLDER SUMMARY: the idea, what you implemented end to end, and what you learned or achieved. Keep it to the essentials: purpose, build, outcome. Say why it mattered. Say why it mattered and to whom. End on what changed because of the work.]',
    link: github('PLACEHOLDER-project-5'),
  },
  {
    id: 'project-6',
    title: '[PROJECT TITLE 6]',
    tags: ['Rust', 'Systems'],
    description: '[PLACEHOLDER SUMMARY: what you built and the constraint that made it interesting. Then how you approached it, and what it achieved or taught you, in three or four lines. End on what changed because of the work. Say what you personally built or owned.]',
    link: github('PLACEHOLDER-project-6'),
  },
  {
    id: 'project-7',
    title: '[PROJECT TITLE 7]',
    tags: ['Next.js', 'Postgres', 'Stripe'],
    description: '[PLACEHOLDER SUMMARY: the product, the pieces you built, and the result. A concise paragraph that tells a visitor what this is without opening the repository. Name the outcome plainly. Say what you personally built or owned. Name the outcome plainly, with a.]',
    link: github('PLACEHOLDER-project-7'),
  },
]
