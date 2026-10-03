import { site } from '../../data'
import './Contact.css'

/** The end of the journey: deep night, one restrained call to action. */
export function Contact() {
  const { heading, blurb, links } = site.contact
  return (
    <section id="contact" className="contact" aria-labelledby="contact-title" tabIndex={-1}>
      <div className="contact__inner">
        <h2 id="contact-title" className="contact__title">
          {heading}
        </h2>
        <p className="contact__blurb">{blurb}</p>
        <ul className="contact__links">
          {links.map((link) => {
            const external = link.href.startsWith('http')
            return (
              <li key={link.label}>
                <a
                  className="contact__link"
                  href={link.href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span className="contact__label">
                    {link.label} <span aria-hidden="true">↗</span>
                  </span>
                  {link.note && <span className="contact__note">{link.note}</span>}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
      <footer className="contact__footer">{site.footer}</footer>
    </section>
  )
}
