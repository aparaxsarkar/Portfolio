import { useEffect } from 'react'
import { Carousel } from './components/Carousel/Carousel'
import { Contact } from './components/Contact/Contact'
import { Hero } from './components/Hero/Hero'
import { Navigation } from './components/Navigation/Navigation'
import { Section } from './components/Section/Section'
import { Skills } from './components/Skills/Skills'
import { achievements, education, experiences, extracurricular, projects, research, SECTIONS } from './data'
import { startScrollDriver } from './scroll/driver'
import { DesertWorld } from './world/DesertWorld'

const titleOf = (id: string) => SECTIONS.find((s) => s.id === id)?.title ?? id

export default function App() {
  useEffect(() => startScrollDriver(), [])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <DesertWorld />
      <Navigation />
      <main id="main" tabIndex={-1}>
        <Hero />

        <Section id="experiences" title={titleOf('experiences')}>
          <Carousel label="Experiences" noun="experience" items={experiences} />
        </Section>

        <Section id="projects" title={titleOf('projects')}>
          <Carousel label="Projects" noun="project" items={projects} />
        </Section>

        <Section id="research" title={titleOf('research')}>
          <Carousel label="Research" noun="research entry" items={research} />
        </Section>

        <Section id="education" title={titleOf('education')}>
          <Carousel label="Education" noun="education entry" items={education} />
        </Section>

        <Section id="achievements" title={titleOf('achievements')}>
          <Carousel label="Achievements" noun="achievement" items={achievements} />
        </Section>

        <Section id="extracurricular" title={titleOf('extracurricular')}>
          <Carousel label="Extracurricular activities" noun="activity" items={extracurricular} />
        </Section>

        <Section id="skills" title={titleOf('skills')}>
          <Skills />
        </Section>

        <Contact />
      </main>
    </>
  )
}
