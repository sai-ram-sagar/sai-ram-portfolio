import styles from "./Background.module.css";

/**
 * Layered page backdrop.
 *
 * Six decorative layers, all driven by CSS alone - the only input is the
 * `--scroll-y` variable published by usePageScroll, which offsets the grid
 * and the aurora fields at different rates to give the page depth.
 *
 * Nothing here reacts per-frame in JS and nothing repaints on scroll: the
 * layers are transform-only, so the compositor handles them.
 */
export const Background = () => (
  <div className={styles.backdrop} aria-hidden="true">
    <div className={styles.grid} />
    <div className={styles.auroraTop} />
    <div className={styles.auroraMid} />
    <div className={styles.auroraLow} />
    <div className={styles.grain} />
    <div className={styles.vignette} />
  </div>
);
