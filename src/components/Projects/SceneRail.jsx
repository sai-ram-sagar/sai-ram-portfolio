import styles from "./SceneRail.module.css";

/**
 * HTML overlay shared by the project scenes: a step rail that follows the
 * animation, and a note saying the data is simulated. It lives above the
 * canvas so the 3D scene itself stays free of UI.
 */
export const SceneRail = ({ steps, active, note, placement = "left" }) => (
  <>
    <ol className={`${styles.rail} ${placement === "right" ? styles.right : ""}`} aria-hidden="true">
      {steps.map((name, i) => (
        <li key={name} className={`${styles.step} ${i === active ? styles.active : ""}`}>
          <span className={styles.num}>{i + 1}</span>
          <span className={styles.name}>{name}</span>
        </li>
      ))}
    </ol>
    <span className={`${styles.note} ${placement === "right" ? styles.noteWide : ""}`} aria-hidden="true">
      {note}
    </span>
  </>
);
