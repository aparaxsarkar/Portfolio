import { site } from '../../data'
import './Hero.css'

/** Title card. The name is the brand — no logo, no mark. */
export function Hero() {
  return (
    <section id="top" className="hero" aria-labelledby="hero-name" tabIndex={-1}>
      <div className="hero__inner">
        <h1 id="hero-name" className="hero__name">
          <span className="hero__name-part">{site.firstName}</span> <span className="hero__name-part">{site.lastName}</span>
        </h1>
        <p className="hero__tagline">{site.tagline}</p>
        <p className="hero__intro">{site.intro}</p>
      </div>
      <p className="hero__cue" aria-hidden="true">
        <span>{site.scrollCue}</span>
        <span className="hero__cue-arrow">↓</span>
      </p>
    </section>
  )
}
