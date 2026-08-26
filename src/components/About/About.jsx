import { AudioLines, Map as MapIcon, MonitorSmartphone } from "lucide-react";
import { Section } from "../ui/Section";
import { SpotlightCard } from "../ui/SpotlightCard";
import { profile, disciplines } from "../../data/profile";
import styles from "./About.module.css";

const ICONS = { MonitorSmartphone, Map: MapIcon, AudioLines };

const FACTS = [
  { term: "Based in", value: (p) => p.location },
  { term: "Focus", value: (p) => p.specialism },
  { term: "Core stack", value: (p) => p.stackLine },
];

export const About = () => (
  <Section
    id="about"
    index="01"
    label="About"
    title="Software for the moments that can't wait."
    caption="My day-to-day is an emergency-response platform where the interface, the map and the audio pipeline all have to stay live at once."
  >
    <div className={styles.grid}>
      <div className={styles.prose}>
        <p className={styles.leadParagraph} data-reveal="fade">
          {profile.summary}
        </p>
        <p data-reveal="fade" style={{ "--reveal-delay": "90ms" }}>
          {profile.summaryDetail}
        </p>

        <dl className={styles.facts}>
          {FACTS.map((fact, index) => (
            <div
              className={styles.fact}
              key={fact.term}
              data-reveal="fade"
              style={{ "--reveal-delay": `${180 + index * 70}ms` }}
            >
              <dt>{fact.term}</dt>
              <dd>{fact.value(profile)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ul className={styles.disciplines}>
        {disciplines.map((discipline, index) => {
          const Icon = ICONS[discipline.icon];
          return (
            <SpotlightCard
              as="li"
              key={discipline.title}
              contentClassName={styles.discipline}
              data-reveal="scale"
              style={{ "--reveal-delay": `${index * 110}ms` }}
            >
              <span className={styles.disciplineIcon}>
                <Icon size={18} strokeWidth={1.65} aria-hidden="true" />
              </span>
              <div className={styles.disciplineBody}>
                <h3 className={styles.disciplineTitle}>{discipline.title}</h3>
                <p className={styles.disciplineText}>{discipline.description}</p>
              </div>
              <span className={styles.disciplineIndex} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
            </SpotlightCard>
          );
        })}
      </ul>
    </div>
  </Section>
);
