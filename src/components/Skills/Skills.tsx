import { skills } from '../../data'
import './Skills.css'

/** Deliberately plain: categorised reference lists, no meters, no levels. */
export function Skills() {
  return (
    <div className="skills">
      {skills.map((group) => (
        <div key={group.category} className="skills__group">
          <h3 className="skills__category">{group.category}</h3>
          <ul className="skills__list">
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
