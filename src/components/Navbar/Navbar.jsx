import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import styles from "./Navbar.module.css";

const LINKS = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

const SECTION_IDS = LINKS.map((link) => link.id);

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef(null);
  const listRef = useRef(null);
  const activeId = useScrollSpy(SECTION_IDS);

  /*
   * The active pill is one element that slides between links rather than a
   * background on each link — the movement is what tells you the page moved.
   * Its position is measured, so it stays correct at any font size or width.
   */
  const positionPill = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const current = list.querySelector("[data-active='true']");
    if (!current) {
      list.style.setProperty("--pill-opacity", "0");
      return;
    }
    list.style.setProperty("--pill-x", `${current.offsetLeft}px`);
    list.style.setProperty("--pill-w", `${current.offsetWidth}px`);
    list.style.setProperty("--pill-opacity", "1");
  }, []);

  useLayoutEffect(() => {
    positionPill();
  }, [activeId, positionPill]);

  useEffect(() => {
    window.addEventListener("resize", positionPill, { passive: true });
    /* fonts land after first paint and shift the link widths */
    document.fonts?.ready.then(positionPill).catch(() => {});
    return () => window.removeEventListener("resize", positionPill);
  }, [positionPill]);

  /* lock the page and close on Escape while the mobile panel is open */
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className={`${styles.header} ${menuOpen ? styles.solid : ""}`}>
        <nav className={styles.nav} aria-label="Primary">
          <a className={styles.brand} href="#top">
            <span className={styles.mark} aria-hidden="true">
              <span className={styles.markText}>SR</span>
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>Sai Ram</span>
              <span className={styles.brandRole}>Software Developer</span>
            </span>
          </a>

          <ul className={styles.desktopLinks} ref={listRef}>
            <li className={styles.pill} aria-hidden="true" />
            {LINKS.map((link) => (
              <li key={link.id} className={styles.linkItem} data-active={activeId === link.id}>
                <a
                  href={`#${link.id}`}
                  className={styles.link}
                  aria-current={activeId === link.id ? "true" : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <a className={styles.cta} href="#contact">
              <span className={styles.ctaSweep} aria-hidden="true" />
              <span>Let&apos;s talk</span>
              <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
            </a>
            <button
              ref={menuBtn}
              type="button"
              className={styles.menuBtn}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {/* reading position, driven entirely by --scroll-progress */}
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressBar} />
        </span>
      </header>

      {/*
        Deliberately a sibling of <header>: the header's backdrop-filter makes
        it a containing block for fixed children, which would clamp this panel
        to the height of the bar instead of the viewport.
      */}
      <nav
        id="mobile-menu"
        aria-label="Mobile"
        className={`${styles.panel} ${menuOpen ? styles.panelOpen : ""}`}
        hidden={!menuOpen}
      >
        <ul className={styles.panelLinks}>
          {LINKS.map((link, index) => (
            <li key={link.id} style={{ "--i": index }}>
              <a
                href={`#${link.id}`}
                onClick={() => setMenuOpen(false)}
                aria-current={activeId === link.id ? "true" : undefined}
              >
                <span className={styles.panelIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.panelLabel}>{link.label}</span>
                <ArrowUpRight className={styles.panelArrow} size={18} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
