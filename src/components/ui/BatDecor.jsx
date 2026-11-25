import { useEffect, useRef, useState } from "react";
import hangUrl from "/assets/batman/batman-hang.webp?url";
import ropeUrl from "/assets/batman/batman-rope.webp?url";
import styles from "./BatDecor.module.css";

/* ---------- timing: the same visit as the Spider-Man theme ---------- */
const DROP_DELAY_MS = 5000;
const DROP_MS = 20000;
const CLIMB_AT = 0.9; // where the lowering animation starts its climb back up
const CLICK_ME_AT = DROP_DELAY_MS + DROP_MS * 0.4; // greeting for 5 s, then "Click me!"
const LEAVE_AT = DROP_DELAY_MS + DROP_MS * CLIMB_AT; // 15 s after he has arrived
const EXTRA_MS = 5000; // every click keeps him here 5 s longer
const WHEE_LEAD_MS = 1300; // he says "Whee!" this long before going
const FUN_LINES = ["Gotham needs good developers!", "Hire him, he's good!", "Nice to meet you!"];

const findAnim = (root, key) =>
  root.getAnimations({ subtree: true }).find((a) => (a.animationName || "").includes(key));

const Batman = ({ onPlay, say, touched }) => (
  <div className={`${styles.figure} ${touched ? "" : styles.beckon}`} onClick={onPlay}>
    <span className={styles.bubble}>{"Hi, I'm Sai Ram's guide!"}</span>
    {say && (
      <span key={say.id} className={styles.say}>
        {say.text}
      </span>
    )}
    <div className={styles.cutout}>
      <img className={styles.bodyImg} src={hangUrl} alt="" draggable="false" />
    </div>
  </div>
);

/* One visit: he lowers himself on his rope, greets you, and can be clicked. */
const Hanging = () => {
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

  /* he has no free hand to wave with: the whole rope swings a little, slowly, like a pendulum.
     "add" lays it on top of the constant gentle sway instead of replacing it, so nothing jumps */
  const swing = () =>
    root.current?.querySelector("[class*=swinger]")?.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(2.4deg)", offset: 0.3 },
        { transform: "rotate(-1.6deg)", offset: 0.62 },
        { transform: "rotate(0.8deg)", offset: 0.85 },
        { transform: "rotate(0deg)" },
      ],
      { duration: 3600, easing: "ease-in-out", composite: "add" },
    );

  // on his way up he always says "Whee!" (no spin: he just climbs away)
  const whee = () => {
    leaving.current = true;
    speak("Whee!");
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
    // nobody clicked after his greeting: ask for it
    t.clickMe = setTimeout(() => !clicks.current && speak("Click me!", 0), CLICK_ME_AT);
    return () => Object.values(t).forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click 1: he points at the projects and scrolls there. Later clicks: a friendly line.
  // Each click keeps him 5 s longer; he only leaves when the time is up (always with "Whee!", then he simply climbs away).
  const onPlay = () => {
    const el = root.current;
    if (!el || leaving.current) return;
    setTouched(true);
    clearTimeout(timers.current.clickMe);
    // freeze the automatic lowering and greeting: the clicks take over
    findAnim(el, "drop")?.pause();
    findAnim(el, "bubble")?.cancel();

    const step = clicks.current;
    clicks.current += 1;

    if (step === 0) {
      speak("Let's see his projects, they are interesting!");
      swing();
      setTimeout(() => {
        document.getElementById("projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
    } else {
      speak(FUN_LINES[(step - 1) % FUN_LINES.length]);
      swing();
    }

    leaveAt.current += EXTRA_MS;
    schedule();
  };

  return (
    <div className={styles.root} ref={root} aria-hidden="true">
      <div className={styles.dangler}>
        {/* rope and Batman swing together about the top of the screen, so the rope never bends or breaks */}
        <div className={styles.swinger}>
          <span className={styles.rope} style={{ backgroundImage: `url(${ropeUrl})` }} />
          <Batman onPlay={onPlay} say={say} touched={touched} />
        </div>
      </div>
    </div>
  );
};

/**
 * Batman palette only: a chibi Batman lowers himself on a rope from the top-right corner,
 * greets you, can be clicked, and climbs back up - the same visit as Spider-Man's, with the
 * same click cycle. Nothing is mounted for any other palette, and each time Batman is
 * chosen he makes a fresh visit.
 */
export const BatDecor = () => {
  const [active, setActive] = useState(
    () => document.documentElement.dataset.palette === "batman",
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setActive(root.dataset.palette === "batman");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette"] });
    return () => observer.disconnect();
  }, []);

  return active ? <Hanging /> : null;
};
