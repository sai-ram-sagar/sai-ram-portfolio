import { AudioLines, Map as MapIcon, MonitorSmartphone } from "lucide-react";
import { Section } from "../ui/Section";
import { SpotlightCard } from "../ui/SpotlightCard";
import { profile, disciplines } from "../../data/profile";
import personalProjects from "../../data/projects.json";
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
    caption="I build web apps where every second counts - live dashboards, maps that move, and audio that becomes text as people speak."
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

    {/* full width under both columns, so neither column ends in a tall empty patch */}
    <div className={styles.workedOn}>
      <h3 className={styles.workedOnTitle} data-reveal="fade">
        Projects I&apos;ve worked on
      </h3>
      <ul className={styles.workedOnList}>
        {profile.workedOn.map((item, index) => (
          <li
            key={item.name}
            className={styles.workedOnItem}
            data-reveal="fade"
            style={{ "--reveal-delay": `${index * 70}ms` }}
          >
            <span className={styles.workedOnName}>
              {item.name}
              {item.status && <span className={styles.workedOnStatus}>{item.status}</span>}
            </span>
            <span className={styles.workedOnDetail}>{item.detail}</span>
          </li>
        ))}
        <li
          className={styles.personal}
          data-reveal="fade"
          style={{ "--reveal-delay": `${profile.workedOn.length * 70}ms` }}
        >
          On my own time I&apos;ve built {personalProjects.length} apps of my own, all live online:{" "}
          {personalProjects.map((project) => project.title).join(", ")}.{" "}
          <a className={styles.personalLink} href="#projects">
            See them below
          </a>
        </li>
      </ul>
    </div>
  </Section>
);
