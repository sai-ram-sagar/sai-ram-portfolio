import { AudioLines, Navigation } from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";
import styles from "./WorkCard.module.css";

const ICONS = { Navigation, AudioLines };

/**
 * Internal platform work: no public demo and no screenshot exists, so the
 * card leans on typography and a schematic rather than a stand-in image.
 */
export const WorkCard = ({ project, delay = 0 }) => {
  const Icon = ICONS[project.icon];

  return (
    <SpotlightCard
      as="article"
      contentClassName={styles.card}
      data-reveal="scale"
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      <header className={styles.head}>
        <div className={styles.headTop}>
          <span className={styles.icon}>
            <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <span className={styles.status}>{project.status}</span>
        </div>
        <h4 className={styles.title}>{project.title}</h4>
        <p className={styles.summary}>{project.summary}</p>
        <span className={styles.headRule} aria-hidden="true" />
      </header>

      <ul className={styles.highlights}>
        {project.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      <ul className={styles.stack} aria-label="Technologies used">
        {project.stack.map((tech) => (
          <li key={tech} className={styles.tech}>
            {tech}
          </li>
        ))}
      </ul>
    </SpotlightCard>
  );
};
