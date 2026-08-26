import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Section } from "../ui/Section";
import { Button } from "../ui/Button";
import { ProjectCard } from "./ProjectCard";
import { WorkCard } from "./WorkCard";
import { work } from "../../data/work";
import projects from "../../data/projects.json";
import styles from "./Projects.module.css";

const INITIAL_COUNT = 6;

const GroupHeading = ({ kind, children, count }) => (
  <h3 className={styles.groupTitle} data-reveal="fade">
    <span className={styles.groupLabel}>{kind}</span>
    <span className={styles.groupText}>{children}</span>
    <span className={styles.groupRule} aria-hidden="true" />
    <span className={styles.groupCount} aria-hidden="true">
      {String(count).padStart(2, "0")}
    </span>
  </h3>
);

export const Projects = () => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? projects : projects.slice(0, INITIAL_COUNT);
  const hidden = projects.length - INITIAL_COUNT;

  return (
    <Section
      id="projects"
      index="03"
      label="Projects"
      title="Things I've built."
      caption="Platform work from my current role, alongside personal projects that are live and open to try."
    >
      {work.length > 0 && (
        <div className={styles.group}>
          <GroupHeading kind="Professional" count={work.length}>
            Platform projects
          </GroupHeading>
          <div className={styles.workGrid}>
            {work.map((project, index) => (
              <WorkCard key={project.id} project={project} delay={index * 100} />
            ))}
          </div>
        </div>
      )}

      <div className={styles.group}>
        <GroupHeading kind="Personal" count={projects.length}>
          Projects you can open
        </GroupHeading>

        <div className={styles.projectGrid}>
          {visible.map((project, index) => (
            <ProjectCard key={project.title} project={project} delay={(index % 3) * 90} />
          ))}
        </div>

        {hidden > 0 && !expanded && (
          <div className={styles.moreWrap}>
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronDown}
              className={styles.more}
              onClick={() => setExpanded(true)}
            >
              Show {hidden} more {hidden === 1 ? "project" : "projects"}
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
};
