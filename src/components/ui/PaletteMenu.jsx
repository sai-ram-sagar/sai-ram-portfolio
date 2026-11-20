import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { PALETTES } from "../../data/palettes";
import { usePalette } from "../../hooks/usePalette";
import styles from "./PaletteMenu.module.css";

/**
 * Colour palette dropdown.
 *
 * Independent of the sun/moon toggle: it only sets which palette is layered
 * over the current theme, so light/dark stays exactly as it was. Each option
 * previews its own colours, so the list is readable whichever theme is active.
 */
export const PaletteMenu = () => {
  const { palette, setPalette } = usePalette();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const current = PALETTES.find((item) => item.id === palette) ?? PALETTES[0];

  /* close on outside press or Escape */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /* move focus to the selected option when the list opens */
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector("[aria-checked='true']")?.focus();
  }, [open]);

  const moveFocus = (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...listRef.current.querySelectorAll("[role='menuitemradio']")];
    const index = items.indexOf(document.activeElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  };

  const choose = (id) => {
    setPalette(id);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Colour palette: ${current.label}`}
        title="Colour palette"
        onClick={() => setOpen((value) => !value)}
      >
        <Palette size={17} strokeWidth={1.9} aria-hidden="true" />
        <ChevronDown
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          size={13}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={styles.menu}
          role="menu"
          aria-label="Colour palette"
          ref={listRef}
          onKeyDown={moveFocus}
        >
          {PALETTES.map((item) => {
            const selected = item.id === palette;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`${styles.option} ${selected ? styles.optionActive : ""}`}
                onClick={() => choose(item.id)}
              >
                <span
                  className={styles.swatch}
                  style={{
                    background: `linear-gradient(135deg, ${item.swatch[0]} 50%, ${item.swatch[1]} 50%)`,
                  }}
                  aria-hidden="true"
                />
                <span className={styles.label}>{item.label}</span>
                {selected && <Check className={styles.check} size={15} strokeWidth={2.4} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
