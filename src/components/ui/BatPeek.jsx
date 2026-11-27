import { useEffect, useRef, useState } from "react";
import peekUrl from "/assets/batman/batman-peek.webp?url";
import irisLUrl from "/assets/batman/batman-iris-l.webp?url";
import irisRUrl from "/assets/batman/batman-iris-r.webp?url";
import eyeLUrl from "/assets/batman/batman-eye-l.png?url";
import eyeRUrl from "/assets/batman/batman-eye-r.png?url";
import styles from "./BatPeek.module.css";

/* the artwork is 480 x 570; the irises are 84px discs centred here */
const ART_W = 480;
const ART_H = 570;
const IRIS = 84;
const EYES = [
  { cx: 165, cy: 330, iris: irisLUrl, mask: eyeLUrl },
  { cx: 327, cy: 332, iris: irisRUrl, mask: eyeRUrl },
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * A little Batman peeking up over the bottom edge of the page whose eyes - and head -
 * follow the cursor. With nothing to follow (touch, or a still mouse) he looks around on
 * his own. The irises are separate sprites clipped to the eye shapes, so they slide inside
 * the sockets rather than the whole face swimming.
 */
const Peek = () => {
  const rootRef = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setShown(true), 800);
      return () => clearTimeout(t);
    }

    let frame = 0;
    let last = performance.now();
    let idleTimer = 0;
    let wander = 0;

    const look = (dx, dy, near) => {
      root.style.setProperty("--dx", dx.toFixed(3));
      root.style.setProperty("--dy", dy.toFixed(3));
      root.dataset.near = near ? "true" : "false";
    };

    const onMove = (event) => {
      last = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        /* aim from the eyes, a little below the top of the visible head */
        const ox = rect.left + rect.width / 2;
        const oy = rect.top + rect.height * 0.5;
        const vx = event.clientX - ox;
        const vy = event.clientY - oy;
        look(clamp(vx / 320, -1, 1), clamp(vy / 260, -1, 1), Math.hypot(vx, vy) < 170);
      });
    };

    /* with nothing to follow, glance about now and then */
    const idle = () => {
      if (performance.now() - last > 4000) {
        look(rand(-1, 1), rand(-0.6, 0.8), false);
      }
      wander = window.setTimeout(idle, rand(1600, 3200));
    };
    const rand = (a, b) => a + Math.random() * (b - a);

    window.addEventListener("pointermove", onMove, { passive: true });
    wander = window.setTimeout(idle, 3000);
    const rise = window.setTimeout(() => setShown(true), 1200);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      clearTimeout(idleTimer);
      clearTimeout(wander);
      clearTimeout(rise);
    };
  }, []);

  return (
    <div className={styles.root} ref={rootRef} data-shown={shown} aria-hidden="true">
      <div className={styles.head}>
        <img className={styles.body} src={peekUrl} alt="" width={ART_W} height={ART_H} draggable="false" />
        {EYES.map((eye) => (
          <span
            key={eye.iris}
            className={styles.socket}
            style={{ WebkitMaskImage: `url(${eye.mask})`, maskImage: `url(${eye.mask})` }}
          >
            <img
              className={styles.iris}
              src={eye.iris}
              alt=""
              draggable="false"
              style={{
                left: `${((eye.cx - IRIS / 2) / ART_W) * 100}%`,
                top: `${((eye.cy - IRIS / 2) / ART_H) * 100}%`,
                width: `${(IRIS / ART_W) * 100}%`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
};

/** Batman palette only; each time it is chosen he peeks up afresh. */
export const BatPeek = () => {
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

  return active ? <Peek /> : null;
};
