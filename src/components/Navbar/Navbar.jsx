import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { ThemeToggle } from "../ui/ThemeToggle";
import { PaletteMenu } from "../ui/PaletteMenu";
import batmobileUrl from "/assets/batman/batmobile.webp?url";
import styles from "./Navbar.module.css";

const LINKS = [
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

const SECTION_IDS = LINKS.map((link) => link.id);

/* the spider's legs, top-down: [root x, root y, knee x, knee y, foot x, foot y] - four a side */
const LEGS = [-1, 1].flatMap((side) =>
  [
    [3, 2, 7, 6, 10, 9],
    [1, 2, 3, 7, 4, 10],
    [-2, 2, -4, 7, -7, 10],
    [-5, 2, -9, 6, -13, 9],
  ].map(([x, y, kx, ky, ex, ey]) => [x, y * side * 0.9, kx, ky * side, ex, ey * side])
);

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef(null);
  const listRef = useRef(null);
  const activeId = useScrollSpy(SECTION_IDS);
  const crawlerRef = useRef(null);
  const batmobileRef = useRef(null);

  /* the spider only crawls while the page is actually scrolling */
  useEffect(() => {
    let timer;
    const onScroll = () => {
      const els = [crawlerRef.current, batmobileRef.current].filter(Boolean);
      if (!els.length) return;
      els.forEach((el) => (el.dataset.moving = ""));
      clearTimeout(timer);
      timer = setTimeout(() => els.forEach((el) => delete el.dataset.moving), 180);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  /*
   * The active pill is one element that slides between links rather than a
   * background on each link - the movement is what tells you the page moved.
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
          {/* the left cell is as wide as the buttons on the right, which keeps the menu centred */}
          <div className={styles.balance}>
            <a className={styles.available} href="#contact">
              <span className={styles.availableDot} aria-hidden="true" />
              <span>Open to work</span>
            </a>
          </div>

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
            <PaletteMenu />
            <ThemeToggle />

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

        {/* Spider-Man palette only: a spider crawls along the leading edge of that bar */}
        <span className={styles.crawler} ref={crawlerRef} aria-hidden="true">
          <svg viewBox="-14 -11 28 22">
            {LEGS.map(([x, y, kx, ky, ex, ey], i) => (
              <path
                key={i}
                className={styles.leg}
                d={`M${x} ${y} L${kx} ${ky} L${ex} ${ey}`}
                style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${(i % 2) * -0.14}s` }}
              />
            ))}
            <ellipse className={styles.abdomen} cx="-4" cy="0" rx="6" ry="4.2" />
            <path className={styles.mark} d="M-7 0 L-1 0 M-4 -2.4 L-4 2.4" />
            <circle className={styles.head} cx="4.6" cy="0" r="3.1" />
            <circle className={styles.eye} cx="6.2" cy="-1.1" r="0.7" />
            <circle className={styles.eye} cx="6.2" cy="1.1" r="0.7" />
          </svg>
        </span>

        {/* Batman palette only: the Batmobile drives along the same bar as you scroll */}
        <span className={styles.batmobile} ref={batmobileRef} aria-hidden="true">
          <img src={batmobileUrl} alt="" draggable="false" />
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
