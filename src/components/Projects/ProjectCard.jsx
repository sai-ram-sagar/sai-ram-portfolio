import { ArrowUpRight } from "lucide-react";
import { getImageUrl } from "../../utils";
import { SpotlightCard } from "../ui/SpotlightCard";
import styles from "./ProjectCard.module.css";

const hostOf = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const ProjectCard = ({
  project: { title, imageSrc, description, skills, demo },
  delay = 0,
}) => (
  <SpotlightCard
    as="article"
    contentClassName={styles.card}
    data-reveal="scale"
    style={{ "--reveal-delay": `${delay}ms` }}
  >
    {/* browser frame makes it explicit that this is a capture of the live site */}
    <div className={styles.preview}>
      <div className={styles.chrome}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.url}>{hostOf(demo)}</span>
      </div>
      <div className={styles.shot}>
        <span className={styles.shotGlow} aria-hidden="true" />
        <img
          className={styles.image}
          src={getImageUrl(imageSrc)}
          alt={`Screenshot of the ${title} web app`}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>

    <div className={styles.body}>
      <h4 className={styles.title}>{title}</h4>
      <p className={styles.description}>{description}</p>

      <ul className={styles.skills} aria-label="Technologies used">
        {skills.map((skill) => (
          <li key={skill} className={styles.skill}>
            {skill}
          </li>
        ))}
      </ul>

      <a
        className={styles.link}
        href={demo}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open the live ${title} site in a new tab`}
      >
        <span className={styles.linkLabel}>Open live site</span>
        <span className={styles.linkArrow} aria-hidden="true">
          <ArrowUpRight size={15} strokeWidth={2} />
        </span>
      </a>
    </div>
  </SpotlightCard>
);
