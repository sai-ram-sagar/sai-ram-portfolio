import { useCallback, useEffect, useRef, useState } from "react";
import { profile } from "../../data/profile";
import styles from "./NameIntro.module.css";

const pick = (el) => {
  const c = getComputedStyle(el);
  return {
    fontFamily: c.fontFamily,
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    lineHeight: c.lineHeight,
    letterSpacing: c.letterSpacing,
    textTransform: c.textTransform,
    color: c.color,
    boxSizing: c.boxSizing,
    paddingTop: c.paddingTop,
    paddingRight: c.paddingRight,
    paddingBottom: c.paddingBottom,
    paddingLeft: c.paddingLeft,
    backgroundImage: c.backgroundImage,
    backgroundSize: c.backgroundSize,
    backgroundPosition: c.backgroundPosition,
    backgroundClip: c.backgroundClip,
    WebkitBackgroundClip: c.webkitBackgroundClip,
    WebkitTextFillColor: c.webkitTextFillColor,
  };
};

/**
 * Opening animation, for every theme. The job role and "Hi, I'm <name>" appear
 * in the middle of a screen painted in the theme's own background; that screen
 * then fades away while they glide to their real places in the page, where
 * the page's own heading takes over with no change at all.
 *
 * It plays only when the page is opened or reloaded, never when the palette is
 * changed afterwards. It is skipped for visitors who prefer reduced motion.
 */
export const NameIntro = () => {
  const intro = useRef(null);
  const group = useRef(null);
  const [layout, setLayout] = useState(null);
  const pending = useRef(false);

  const play = useCallback((fromBlack) => {
    const h1 = document.querySelector("main h1");
    /* let the hero's own entrance finish first, so what is measured (and copied)
       is its final resting look and position */
    const kicker = h1?.previousElementSibling;
    [h1, kicker].forEach((n) =>
      n?.getAnimations({ subtree: true }).forEach((a) => {
        try {
          a.finish();
        } catch {
          /* infinite animations cannot be finished; they are left alone */
        }
      })
    );
    const role = h1?.previousElementSibling?.children[1];
    const nameEl = h1?.children[1]?.firstElementChild;
    const greeting = h1?.children[0];
    if (!h1 || !role || !nameEl || !greeting) return;
    const r = role.getBoundingClientRect();
    const h = h1.getBoundingClientRect();
    const g = greeting.getBoundingClientRect();
    const n = nameEl.getBoundingClientRect();
    const left = Math.min(r.left, h.left);
    /* where the visible text actually is (the heading box can be wider than its words) */
    const ink = {
      left: Math.min(r.left, g.left, n.left),
      right: Math.max(r.right, g.right, n.right),
      top: r.top,
      bottom: Math.max(g.bottom, n.bottom),
    };
    setLayout({
      ink,
      left,
      top: r.top,
      width: Math.max(h.width, r.width),
      height: h.bottom - r.top,
      roleAt: [r.left - left, 0],
      roleText: role.textContent,
      /* each line is placed by its own measured box, so the glyphs sit exactly where the page's do */
      greetingBox: { left: g.left - left, top: g.top - r.top, width: g.width, height: g.height },
      nameBox: { left: n.left - left, top: n.top - r.top, width: n.width, height: n.height },
      role: pick(role),
      greeting: pick(greeting),
      name: pick(nameEl),
    });
    pending.current = fromBlack ? "black" : "fade";
  }, []);

  /* once the text is laid out at the heading's place, run the animation */
  useEffect(() => {
    if (!layout || !pending.current) return;
    const el = intro.current;
    const box = group.current;
    if (!el || !box) return;
    const fromBlack = pending.current === "black";
    pending.current = false;

    el.classList.remove(styles.go, styles.fromBlack);
    void el.getBoundingClientRect(); /* restart the screen animation */
    el.classList.add(styles.go);
    if (fromBlack) el.classList.add(styles.fromBlack);

    /* the text starts in the middle of the screen, a little larger, and glides home */
    /* the middle of the visible screen (clientWidth leaves out any scrollbar) */
    const mid = { x: document.documentElement.clientWidth / 2, y: window.innerHeight / 2 };
    const { ink } = layout;
    const inkCx = (ink.left + ink.right) / 2;
    const inkCy = (ink.top + ink.bottom) / 2;
    const dx = mid.x - inkCx;
    const dy = mid.y - inkCy;
    /* a little larger in the middle, but never wider than the screen allows */
    const grow = Math.max(1, Math.min(1.35, (document.documentElement.clientWidth * 0.86) / (ink.right - ink.left)));
    /* scale about the text's own centre, so it lands in the middle whatever its size */
    box.style.transformOrigin = `${inkCx - layout.left}px ${inkCy - layout.top}px`;
    const away = `translate(${dx}px, ${dy}px) scale(${grow})`;
    /* the page's own role and heading wait, hidden, under the moving copy; the copy
       is an exact stand-in, and when it lands it is swapped for them with no fade */
    const h1 = document.querySelector("main h1");
    const held = [h1, h1?.previousElementSibling?.children[1]].filter(Boolean);
    held.forEach((n) => {
      n.style.visibility = "hidden";
    });
    const release = () =>
      held.forEach((n) => {
        n.style.visibility = "";
      });
    box.style.display = "";
    box.getAnimations().forEach((a) => a.cancel());
    const move = box.animate(
      [
        { opacity: 0, transform: `${away} translateY(14px)`, offset: 0 },
        { opacity: 1, transform: away, offset: 0.14 },
        /* quick off the mark, then a long soft deceleration into place
           (the easing belongs to the keyframe the movement starts from) */
        { opacity: 1, transform: away, offset: 0.27, easing: "cubic-bezier(0.2, 0.9, 0.2, 1)" },
        { opacity: 1, transform: "translate(0, 0) scale(1)", offset: 1 },
      ],
      { duration: 3300, fill: "both" }
    );
    move.onfinish = () => {
      release();
      box.style.display = "none";
    };
    return () => {
      move.onfinish = null;
      release();
    };
  }, [layout]);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;

    /* page just opened: wait for the fonts (so the text measures true), then play */
    if (reduced) {
      root.removeAttribute("data-boot");
    } else {
      const ready = document.fonts?.ready ?? Promise.resolve();
      Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 1500))]).then(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          play(true);
          /* the screen is in place now; the page-load cover can go */
          requestAnimationFrame(() => root.removeAttribute("data-boot"));
        });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [play]);

  if (!layout) return <div ref={intro} className={styles.intro} aria-hidden="true" />;

  return (
    <div aria-hidden="true">
      <div ref={intro} className={styles.intro} />
      <div
        ref={group}
        className={styles.introText}
        style={{ top: layout.top, left: layout.left, width: layout.width, height: layout.height }}
      >
        <span className={styles.introRole} style={{ ...layout.role, left: layout.roleAt[0], top: layout.roleAt[1] }}>
          {layout.roleText}
        </span>
        <span className={styles.introLine} style={{ ...layout.greeting, ...layout.greetingBox }}>
          Hi, I&apos;m
        </span>
        <span className={styles.introLine} style={{ ...layout.name, ...layout.nameBox }}>
          {profile.fullName}
        </span>
      </div>
    </div>
  );
};
