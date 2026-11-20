import { useEffect, useState } from "react";
import { DfrVisual } from "./DfrVisual";
import { ErssVisual } from "./ErssVisual";
import { SttVisual } from "./SttVisual";
import { WorkCard } from "./WorkCard";
import styles from "./ProjectShowcase.module.css";

/* projects that carry a live scene, keyed by the `scene` field in work.js */
const SCENES = { dfr: DfrVisual, stt: SttVisual, erss: ErssVisual };

const pad = (n) => String(n).padStart(2, "0");

/**
 * The platform projects as two full-height showcases rather than cards.
 *
 * Each project gets its own section: the 3D scene fills the screen and one
 * block of ordinary HTML floats over its top-left - title, summary, key
 * contributions and stack, stacked in that order. A slim index on the right
 * edge follows the reader and jumps between projects.
 */
export const ProjectShowcase = ({ items }) => {
  const [active, setActive] = useState(items[0]?.id);

  /* the section crossing the middle of the viewport is the active one */
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.dataset.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    items.forEach((item) => {
      const node = document.getElementById(`showcase-${item.id}`);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [items]);

  /* smooth scrolling comes from the page's own scroll-behavior, which already
     steps aside for visitors who prefer reduced motion */
  const go = (event, id) => {
    event.preventDefault();
    document.getElementById(`showcase-${id}`)?.scrollIntoView({ block: "start" });
  };

  return (
    <div className={styles.showcase}>
      <nav className={styles.indexRail} aria-label="Platform projects">
        <ol className={styles.index}>
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#showcase-${item.id}`}
                className={`${styles.indexLink} ${active === item.id ? styles.indexActive : ""}`}
                aria-current={active === item.id ? "true" : undefined}
                onClick={(event) => go(event, item.id)}
              >
                <span className={styles.indexNum}>{pad(i + 1)}</span>
                <span className={styles.indexLabel}>{item.short}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {items.map((project, i) => {
        const Scene = SCENES[project.scene];
        if (!Scene) return <WorkCard key={project.id} project={project} />;
        const isActive = active === project.id;

        return (
          <section
            key={project.id}
            id={`showcase-${project.id}`}
            data-id={project.id}
            data-scene={project.scene}
            data-active={isActive}
            className={styles.project}
            aria-labelledby={`showcase-${project.id}-title`}
          >
            <header className={styles.titleBlock}>
              <p className={styles.kicker}>
                <span className={styles.kickerIndex}>
                  {pad(i + 1)}
                  <span className={styles.kickerOf}> / {pad(items.length)}</span>
                </span>
                <span className={styles.kickerRule} aria-hidden="true" />
                <span className={styles.status}>{project.status}</span>
              </p>
              <h4 id={`showcase-${project.id}-title`} className={styles.title}>
                {project.title}
              </h4>
              <p className={styles.summary}>{project.summary}</p>

              <div className={styles.details}>
                <div>
                  <p className={styles.label}>Key contributions</p>
                  <ol className={styles.list}>
                    {project.highlights.map((highlight, n) => (
                      <li key={highlight}>
                        <span className={styles.itemNum}>{pad(n + 1)}</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <p className={styles.label}>Stack</p>
                  <ul className={styles.stack} aria-label="Technologies used">
                    {project.stack.map((tech) => (
                      <li key={tech} className={styles.tech}>
                        {tech}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </header>

            <div className={styles.stageArea}>
              <Scene immersive />
            </div>
          </section>
        );
      })}
    </div>
  );
};
