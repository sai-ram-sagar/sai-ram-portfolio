import { AudioLines, Navigation } from "lucide-react";
import { SpotlightCard } from "../ui/SpotlightCard";
import { DfrVisual } from "./DfrVisual";
import { SttVisual } from "./SttVisual";
import styles from "./WorkCard.module.css";

const ICONS = { Navigation, AudioLines };

/* projects that carry a live scene in their visual area, keyed by `scene` */
const SCENES = { dfr: DfrVisual, stt: SttVisual };

/**
 * Internal platform work: no public demo and no screenshot exists, so where a
 * project has a live 3D scene it leads the card as the showcase, with the
 * written detail underneath; the rest leans on typography.
 */
export const WorkCard = ({ project, delay = 0 }) => {
  const Icon = ICONS[project.icon];
  const Scene = SCENES[project.scene];

  return (
    <SpotlightCard
      as="article"
      contentClassName={styles.card}
      data-reveal="scale"
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      {Scene && (
        <div className={styles.visual}>
          <Scene />
        </div>
      )}

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
