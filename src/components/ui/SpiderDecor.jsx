import { useEffect, useRef, useState } from "react";
import bodyUrl from "/assets/spiderman/spiderman-body.webp?url";
import webUrl from "/assets/spiderman/spiderman-web.webp?url";
import armUrl from "/assets/spiderman/spiderman-arm.webp?url";
import styles from "./SpiderDecor.module.css";

/* corner web: spokes fanning out of the corner, and sagging threads between them */
const SPOKES = [0, 15, 30, 45, 60, 75, 90].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a), Math.sin(a)];
});
const RINGS = [0.28, 0.5, 0.74, 1];

const webPath = (size) => {
  let d = "";
  SPOKES.forEach(([x, y]) => {
    d += `M0 0 L${(x * size).toFixed(1)} ${(y * size).toFixed(1)} `;
  });
  RINGS.forEach((r) => {
    for (let i = 0; i < SPOKES.length - 1; i += 1) {
      const [x0, y0] = SPOKES[i];
      const [x1, y1] = SPOKES[i + 1];
      const ax = x0 * r * size;
      const ay = y0 * r * size;
      const bx = x1 * r * size;
      const by = y1 * r * size;
      /* each thread sags a little towards the corner, the way real silk hangs */
      const cx = ((ax + bx) / 2) * 0.9;
      const cy = ((ay + by) / 2) * 0.9;
      d += `M${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} `;
    }
  });
  return d;
};

const Web = ({ className }) => (
  <svg className={`${styles.web} ${className}`} viewBox="0 0 200 200" aria-hidden="true">
    <path d={webPath(200)} pathLength="1" />
  </svg>
);

/*
 * Spider-Man hanging upside down on the web: the artwork itself (cut out from the supplied
 * image), in two layers - the body, and the free forearm with its open hand. The hand is a
 * separate layer so it can swing from the elbow to wave hello while the rest stays put.
 */
/* ---------- playing with him: click him ---------- */
const DROP_DELAY_MS = 5000;
const DROP_MS = 20000;
const CLIMB_AT = 0.9; // where the lowering animation starts its climb back up
const CLICK_ME_AT = DROP_DELAY_MS + DROP_MS * 0.4; // "Hi, I'm Sai Ram's guide!" for 5 s, then "Click me!"
const LEAVE_AT = DROP_DELAY_MS + DROP_MS * CLIMB_AT; // 15 s after he has arrived
const EXTRA_MS = 5000; // every click keeps him here 5 s longer
const WHEE_LEAD_MS = 1300; // he says "Whee!" and spins this long before going
const FUN_LINES = ["Hire him, he's good!", "Nice to meet you!", "Thanks for stopping by!"];

const findAnim = (root, key) =>
  root.getAnimations({ subtree: true }).find((a) => (a.animationName || "").includes(key));

const SpiderMan = ({ onPlay, say, touched }) => (
  <div className={`${styles.figure} ${touched ? "" : styles.beckon}`} onClick={onPlay}>
    <span className={styles.bubble}>{"Hi, I'm Sai Ram's guide!"}</span>
    {say && (
      <span key={say.id} className={styles.say}>
        {say.text}
      </span>
    )}
    <div className={styles.cutout}>
      <img className={styles.armImg} src={armUrl} alt="" draggable="false" />
      <img className={styles.bodyImg} src={bodyUrl} alt="" draggable="false" />
    </div>
  </div>
);

/**
 * Spider-Man palette decorations: webs in the top corners and a cartoon
 * Spider-Man who lowers himself on a web now and then, waves hello, and
 * climbs back up. They are always in the page but stay
 * hidden unless the Spider-Man palette is active (see the module's :global
 * rules), so no other palette is affected.
 */
export const SpiderDecor = () => {
  const root = useRef(null);
  const [say, setSay] = useState(null);
  const [touched, setTouched] = useState(false);
  const clicks = useRef(0);
  const leaving = useRef(false);
  const mountedAt = useRef(0);
  const leaveAt = useRef(LEAVE_AT); // ms after mount at which he leaves
  const timers = useRef({});

  const speak = (text, ms = 3200) => {
    setSay({ text, id: Date.now() });
    clearTimeout(timers.current.hush);
    if (ms) timers.current.hush = setTimeout(() => setSay(null), ms);
  };

  const wave = () =>
    root.current?.querySelector("[class*=armImg]")?.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-18deg)" },
        { transform: "rotate(-3deg)" },
        { transform: "rotate(-18deg)" },
        { transform: "rotate(-3deg)" },
        { transform: "rotate(-18deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 1700, easing: "ease-in-out" },
    );

  // on his way up he always says "Whee!" and spins
  const whee = () => {
    leaving.current = true;
    speak("Whee!");
    root.current?.querySelector("[class*=cutout]")?.animate(
      [{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }],
      { duration: 900, easing: "cubic-bezier(0.3, 0.1, 0.3, 1)" },
    );
  };

  const climb = () => {
    const drop = root.current && findAnim(root.current, "drop");
    if (!drop) return;
    drop.currentTime = DROP_DELAY_MS + DROP_MS * CLIMB_AT;
    drop.play();
  };

  // (re)plan his departure: "Whee!" a moment before leaveAt, then he climbs up
  const schedule = () => {
    clearTimeout(timers.current.whee);
    clearTimeout(timers.current.climb);
    const left = leaveAt.current - (performance.now() - mountedAt.current);
    timers.current.whee = setTimeout(whee, Math.max(0, left - WHEE_LEAD_MS));
    timers.current.climb = setTimeout(climb, Math.max(WHEE_LEAD_MS, left));
  };

  useEffect(() => {
    const t = timers.current;
    mountedAt.current = performance.now();
    schedule();
    // nobody clicked after his "Hi!": ask for it
    t.clickMe = setTimeout(() => !clicks.current && speak("Click me!", 0), CLICK_ME_AT);
    return () => Object.values(t).forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click 1: he points at the projects and scrolls there. Later clicks: a friendly line. Each click keeps him 5 s longer; he only leaves when the
  // time is up (always with "Whee!").
  const onPlay = () => {
    const el = root.current;
    if (!el || leaving.current) return;
    setTouched(true);
    clearTimeout(timers.current.clickMe);
    // freeze the automatic lowering, wave and "Hi!": the clicks take over
    findAnim(el, "drop")?.pause();
    ["wave", "bubble"].forEach((k) => findAnim(el, k)?.cancel());

    const step = clicks.current;
    clicks.current += 1;

    if (step === 0) {
      speak("Let's see his projects, they are interesting!");
      wave();
      setTimeout(() => {
        document.getElementById("projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
    } else {
      speak(FUN_LINES[(step - 1) % FUN_LINES.length]);
      wave();
    }

    leaveAt.current += EXTRA_MS;
    schedule();
  };

  return (
    <div className={styles.root} ref={root} aria-hidden="true">
      <Web className={styles.webLeft} />
      <Web className={styles.webRight} />
      <div className={styles.dangler}>
        <span className={styles.thread} style={{ backgroundImage: `url(${webUrl})` }} />
        <SpiderMan onPlay={onPlay} say={say} touched={touched} />
      </div>
    </div>
  );
};
