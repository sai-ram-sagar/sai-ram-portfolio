import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

const STORAGE_KEY = "theme";
const REVEAL_MS = 760;
/* smooth both ends - a decelerate-only curve starts with a visible snap */
const REVEAL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
/* fraction of the mask that is fully opaque; the rest is the soft band.
   Must match the gradient on ::view-transition-new(root) in index.css. */
const MASK_SOLID = 0.76;

/* Keep in sync with the inline script in index.html, which applies the same
   choice before first paint so the page never flashes the wrong theme. */
export const readTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage can be blocked; fall through to the system preference */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

/**
 * Crossfade for browsers without the View Transitions API.
 *
 * Paints the outgoing background over the page, swaps the theme underneath,
 * then fades that cover away. Not the circular reveal, but it means Firefox
 * gets a soft change rather than a hard snap.
 */
const fadeThrough = (apply, duration, easing) => {
  const cover = document.createElement("div");
  cover.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483647",
    "pointer-events:none",
    `background:${getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim()}`,
  ].join(";");

  document.body.appendChild(cover);
  apply();

  /*
   * This element covers the entire page, so its removal can never depend on
   * a promise alone: an animation in a document that stops rendering never
   * progresses, `finished` never settles, and the cover would sit over the
   * site indefinitely. The timer is the guarantee; the promise is the fast
   * path.
   */
  let done = false;
  const clean = () => {
    if (done) return;
    done = true;
    cover.remove();
  };

  const animation = cover.animate({ opacity: [1, 0] }, { duration, easing });
  animation.finished.then(clean, clean);
  setTimeout(clean, duration + 400);
};

const persist = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* a blocked store only costs persistence, not the switch itself */
  }
};

/**
 * Owns the site's light/dark state.
 *
 * The attribute on <html> is the single source of truth - every colour token
 * keys off it - and the choice is remembered. Until someone picks explicitly
 * the site follows the OS, including when the OS flips mid-session.
 *
 * `toggleTheme` optionally takes the screen point the switch was pressed at
 * and plays a circular reveal outward from it, so the new theme visibly comes
 * from the control rather than simply replacing the page.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState(() =>
    typeof document === "undefined"
      ? "dark"
      : document.documentElement.dataset.theme || readTheme()
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    /* keep the browser UI (address bar, form controls) in step */
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim()
      );
    }
  }, [theme]);

  /* follow the OS only while the visitor has not chosen for themselves */
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = (event) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch {
        /* unreadable storage means no explicit choice was saved */
      }
      setTheme(event.matches ? "light" : "dark");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = useCallback(
    (origin) => {
      const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";

      /*
       * The attribute is written here rather than left to the effect above:
       * the view transition has to capture the finished DOM inside its
       * callback, and a passive effect would not have run by then.
       */
      const apply = () => {
        document.documentElement.dataset.theme = next;
        flushSync(() => setTheme(next));
      };

      persist(next);

      /*
       * A hidden document is skipped deliberately: the spec aborts a view
       * transition on a document that is not rendering, so starting one there
       * only produces a rejected promise for no benefit.
       */
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || document.hidden) {
        apply();
        return;
      }

      if (!document.startViewTransition) {
        fadeThrough(apply, REVEAL_MS, REVEAL_EASE);
        return;
      }

      const x = origin?.x ?? window.innerWidth - 48;
      const y = origin?.y ?? 48;
      /* reach the furthest corner, or the circle stops short of the page */
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      const transition = document.startViewTransition(apply);

      transition.ready
        .then(() => {
          const root = document.documentElement;

          /*
           * The reveal is a feathered mask, not clip-path: clip-path has no
           * soft option, and its hard rim is exactly what you see scraping
           * across the text.
           *
           * The gradient itself is fixed in CSS and only its size and
           * position animate. Animating `mask-image` directly looks like the
           * obvious approach but is discrete - it snaps to the end value at
           * the halfway point instead of growing. Size and position are
           * lengths, so they interpolate properly.
           *
           * Both animate in step, which keeps the circle pinned to the
           * button while it expands rather than drifting toward a corner.
           */
          const solidEdge = radius / MASK_SOLID;

          root.animate(
            {
              maskSize: ["0px 0px", `${solidEdge * 2}px ${solidEdge * 2}px`],
              maskPosition: [
                `${x}px ${y}px`,
                `${x - solidEdge}px ${y - solidEdge}px`,
              ],
            },
            {
              duration: REVEAL_MS,
              easing: REVEAL_EASE,
              fill: "both",
              pseudoElement: "::view-transition-new(root)",
            }
          );

          /* the outgoing snapshot dissolves under the band, so the two
             themes meet as a blend instead of a line */
          root.animate(
            { opacity: [1, 1, 0] },
            {
              duration: REVEAL_MS,
              easing: "linear",
              pseudoElement: "::view-transition-old(root)",
            }
          );
        })
        .catch(() => {
          /* a superseded transition rejects; the theme is already applied */
        });
    },
    []
  );

  return { theme, toggleTheme };
};
