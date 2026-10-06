import type { CardItem } from './types'

/** PLACEHOLDER CONTENT — replace each entry; add or remove freely. */
export const experiences: CardItem[] = [
  {
    id: 'exp-1',
    title: 'MACHINE LEARNING RESEARCH INTERN, AIML.COM',
    tags: ['Python', 'PyTorch', 'Hugging Face', 'LLMs'],
    description:
      'Benchmarked parameter-efficient fine-tuning and alignment pipelines for LLMs by implementing LoRA, adapters, and DPO with PyTorch and Hugging Face PEFT/TRL in Python. Built a 134K-parameter CNN-LSTM multimodal fusion model for visual question answering, achieving 99.08% test accuracy.',
  },
  {
    id: 'exp-2',
    title: 'SOFTWARE DEVELOPER INTERN, SCHLUMBERGER',
    tags: ['Backend', 'Java', 'Spring Boot', 'APIs', 'Databases'],
    description:
      'Built backend APIs for large-scale entity retrieval using Java and Spring Boot across Cassandra, Apache Jena, and JanusGraph; improved entity-retrieval speed by 5×. Developed automated workflows for identifying promising drilling sites and stopping exploration when projected profitability fell below a defined threshold.',
  },
  {
    id: 'exp-3',
    title: 'PART-TIME LECTURER, RUTGERS UNIVERSITY',
    tags: ['AI', 'Machine Learning', 'Deep Learning', 'Python'],
    description:
      'Taught weekly recitations for Artificial Intelligence, Machine Learning, and Deep Learning courses covering NumPy, pandas, TensorFlow, and scikit-learn. Architected Python/PowerShell grading pipelines that sandbox-executed PyTorch submissions and processed 365 assignments, reducing grading time by 95% and saving 75+ hours.',
  },
]
