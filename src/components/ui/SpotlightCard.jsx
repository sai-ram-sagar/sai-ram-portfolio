import { usePointerSpotlight } from "../../hooks/usePointerSpotlight";
import styles from "./SpotlightCard.module.css";

/**
 * Glass surface with a gradient hairline border and a pointer-tracked
 * highlight. `as` swaps the element, `contentClassName` styles the inner
 * layer that actually holds the layout (the decorative layers sit behind it).
 */
export const SpotlightCard = ({
  as: Tag = "div",
  className = "",
  contentClassName = "",
  children,
  ...rest
}) => {
  const { ref, onPointerMove } = usePointerSpotlight();

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      className={`${styles.card} ${className}`}
      {...rest}
    >
      <span className={styles.spotlight} aria-hidden="true" />
      <span className={styles.edge} aria-hidden="true" />
      <div className={`${styles.content} ${contentClassName}`}>{children}</div>
    </Tag>
  );
};
