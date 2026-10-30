import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import styles from "./ThemeToggle.module.css";

/**
 * Light/dark switch.
 *
 * Both icons are always rendered and cross-faded, so the control never
 * reflows and the swap reads as one movement rather than a swap of glyphs.
 * The button reports the state it is in, not the one it would switch to.
 */
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  /*
   * The reveal starts at the button's centre rather than the pointer, so a
   * keyboard activation (where the click has no coordinates) looks identical
   * to a mouse one.
   */
  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={handleClick}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className={styles.icons} aria-hidden="true">
        <Sun className={`${styles.icon} ${isDark ? "" : styles.iconActive}`} size={17} strokeWidth={1.9} />
        <Moon className={`${styles.icon} ${isDark ? styles.iconActive : ""}`} size={17} strokeWidth={1.9} />
      </span>
    </button>
  );
};
