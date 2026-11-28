import { useEffect, useState } from "react";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Drives a peeking mascot: writes the cursor direction to the element as
 * `--dx` / `--dy` (each -1..1) and `data-near`, and reports when it has
 * "risen" into view. With nothing to follow (touch, or a still mouse) it
 * glances about on its own. `eyeY` is where the eyes sit as a share of the
 * element's height.
 */
export const usePeekGaze = (rootRef, { eyeY = 0.5, delay = 1200 } = {}) => {
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
        const vx = event.clientX - (rect.left + rect.width / 2);
        const vy = event.clientY - (rect.top + rect.height * eyeY);
        look(clamp(vx / 320, -1, 1), clamp(vy / 260, -1, 1), Math.hypot(vx, vy) < 170);
      });
    };

    const idle = () => {
      if (performance.now() - last > 4000) look(rand(-1, 1), rand(-0.6, 0.8), false);
      wander = window.setTimeout(idle, rand(1600, 3200));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    wander = window.setTimeout(idle, 3000);
    const rise = window.setTimeout(() => setShown(true), delay);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      clearTimeout(wander);
      clearTimeout(rise);
    };
  }, [rootRef, eyeY, delay]);

  return shown;
};

/** True while `<html data-palette>` equals `palette`. */
export const usePaletteIs = (palette) => {
  const [active, setActive] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.palette === palette,
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setActive(root.dataset.palette === palette);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette"] });
    return () => observer.disconnect();
  }, [palette]);

  return active;
};
