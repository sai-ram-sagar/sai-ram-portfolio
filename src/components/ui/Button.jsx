import styles from "./Button.module.css";

/**
 * The site's only button/CTA. Centralising it is what keeps every call to
 * action on the same micro-interaction: a light sweeping across the surface,
 * the icon stepping forward, and a small press compression — all under
 * 200ms so the control always feels immediate.
 */
export const Button = ({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  icon: Icon,
  iconSide = "right",
  className = "",
  children,
  ...rest
}) => (
  <Tag
    className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
    data-icon-side={Icon ? iconSide : undefined}
    {...rest}
  >
    <span className={styles.sweep} aria-hidden="true" />
    {Icon && iconSide === "left" && (
      <Icon className={styles.icon} size={16} strokeWidth={2} aria-hidden="true" />
    )}
    <span className={styles.label}>{children}</span>
    {Icon && iconSide === "right" && (
      <Icon className={styles.icon} size={16} strokeWidth={2} aria-hidden="true" />
    )}
  </Tag>
);
