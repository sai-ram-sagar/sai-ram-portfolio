import { Building2, MapPin } from "lucide-react";
import { Section } from "../ui/Section";
import { experience } from "../../data/experience";
import styles from "./Experience.module.css";

export const Experience = () => {
  if (!experience.length) return null;

  return (
    <Section
      id="experience"
      index="02"
      label="Experience"
      title="Where I've been shipping."
      caption="Production work on a system that police dispatch operators depend on every day."
    >
      <ol className={styles.timeline}>
        <span className={styles.rail} data-reveal="fade" aria-hidden="true">
          <span className={styles.railFill} />
        </span>

        {experience.map((role, index) => (
          <li key={`${role.company}-${role.period}`} className={styles.entry}>
            <span className={styles.node} data-reveal="fade" aria-hidden="true" />

            <header className={styles.head}>
              <p className={styles.period} data-reveal="fade">
                {role.period}
              </p>
              <h3 className={styles.role} data-reveal="mask">
                <span>{role.role}</span>
              </h3>
              <p className={styles.company} data-reveal="fade" style={{ "--reveal-delay": "80ms" }}>
                <Building2 size={15} strokeWidth={1.7} aria-hidden="true" />
                {role.company}
              </p>
              <p className={styles.meta} data-reveal="fade" style={{ "--reveal-delay": "130ms" }}>
                <MapPin size={13} strokeWidth={1.7} aria-hidden="true" />
                {role.location}
              </p>
              {role.context && (
                <p
                  className={styles.context}
                  data-reveal="fade"
                  style={{ "--reveal-delay": "190ms" }}
                >
                  {role.context}
                </p>
              )}
            </header>

            <div className={styles.body}>
              <ul className={styles.highlights}>
                {role.highlights.map((highlight, i) => (
                  <li
                    key={highlight}
                    className={styles.highlight}
                    data-reveal="up"
                    style={{ "--reveal-delay": `${Math.min(i, 6) * 55}ms` }}
                  >
                    {highlight}
                  </li>
                ))}
              </ul>

              <ul className={styles.stack} aria-label="Technologies used">
                {role.stack.map((tech, i) => (
                  <li
                    key={tech}
                    className={styles.tech}
                    data-reveal="scale"
                    style={{ "--reveal-delay": `${i * 35}ms` }}
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            </div>

            <span className={styles.entryIndex} aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
};
