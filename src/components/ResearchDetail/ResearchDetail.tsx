import type { ResearchEntry } from '../../data'
import './ResearchDetail.css'

/** The technical-depth layer: a spec sheet for the centred research card. Skimmable past, rewarding to read. */
export function ResearchDetail({ details }: Pick<ResearchEntry, 'details'>) {
  return (
    <dl className="spec">
      {details.map((d) => (
        <div key={d.label} className="spec__row">
          <dt>{d.label}</dt>
          <dd>{d.value}</dd>
        </div>
      ))}
    </dl>
  )
}
