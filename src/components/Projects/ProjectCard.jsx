import { ArrowUpRight } from "lucide-react";
import { getImageUrl } from "../../utils";
import { useImageReady } from "../../hooks/useImageReady";
import { usePointerSpotlight } from "../../hooks/usePointerSpotlight";
import styles from "./ProjectCard.module.css";

const hostOf = (url) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/*
 * A project file: a folder with a labelled tab, the live capture filed
 * inside as a sheet, and a front pocket that carries the details. On hover
 * the pocket tips open and the sheet is drawn up out of it.
 */
export const ProjectCard = ({
  project: { title, imageSrc, description, skills, demo },
  index = 0,
  delay = 0,
}) => {
  const { ready, imageProps } = useImageReady();
  const { ref, onPointerMove } = usePointerSpotlight();
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      ref={ref}
      onPointerMove={onPointerMove}
      className={styles.folder}
      data-reveal="scale"
      style={{ "--reveal-delay": `${delay}ms` }}
    >
      <div className={styles.tab} aria-hidden="true">
        <span className={styles.tabIndex}>P/{number}</span>
        <span className={styles.tabHost}>{hostOf(demo)}</span>
      </div>

      <div className={styles.pocket}>
        <span className={styles.paper} aria-hidden="true" />

        <div className={styles.sheet}>
          {!ready && <span className={`skeleton ${styles.sheetSkeleton}`} aria-hidden="true" />}
          <img
            className={`${styles.image} ${ready ? styles.imageReady : ""}`}
            src={getImageUrl(imageSrc)}
            alt={`Screenshot of the ${title} web app`}
            loading="lazy"
            decoding="async"
            {...imageProps}
          />
          <span className={styles.stamp} aria-hidden="true">
            Live
          </span>
          {/* the front pocket is transformed, so its link can't stretch up here */}
          <a className={styles.sheetLink} href={demo} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" />
        </div>

        <div className={styles.front}>
          <h4 className={styles.title}>{title}</h4>
          <p className={styles.description}>{description}</p>

          <div className={styles.footer}>
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
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
        </div>

        <span className={styles.sheen} aria-hidden="true" />
      </div>
    </article>
  );
};
