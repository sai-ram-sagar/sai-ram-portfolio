import styles from "./Section.module.css";

/**
 * The shell every section shares: a boundary divider, a numbered eyebrow,
 * a display heading and an optional caption.
 *
 * Keeping this in one place is what makes the vertical rhythm, the eyebrow
 * treatment and the heading scale identical everywhere — sections differ in
 * their content, never in their frame.
 */
export const Section = ({
  id,
  index,
  label,
  title,
  caption,
  children,
  divider = true,
  className = "",
}) => (
  <section id={id} className={`${styles.section} ${className}`} aria-labelledby={`${id}-title`}>
    {divider && (
      <span className={styles.divider} data-reveal="fade" aria-hidden="true">
        <span className={styles.dividerLine} />
      </span>
    )}

    <div className={styles.inner}>
      <header className={styles.header}>
        <p className={styles.eyebrow} data-reveal="fade">
          <span className={styles.eyebrowIndex}>{index}</span>
          <span className={styles.eyebrowRule} aria-hidden="true" />
          <span className={styles.eyebrowLabel}>{label}</span>
        </p>

        <h2 id={`${id}-title`} className={styles.title} data-reveal="mask">
          <span>{title}</span>
        </h2>

        {caption && (
          <p className={styles.caption} data-reveal="fade" style={{ "--reveal-delay": "120ms" }}>
            {caption}
          </p>
        )}
      </header>

      {children}
    </div>
  </section>
);
