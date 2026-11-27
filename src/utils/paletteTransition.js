import { PALETTES } from "../data/palettes";

/*
 * Palette change, played as a moment instead of a swap.
 *
 * Two layers run together:
 *  - the new palette is revealed through a feathered circle that grows from
 *    the palette button (the same View Transition mechanism as the sun/moon
 *    toggle, see useTheme);
 *  - rings in the new palette's accent colour ripple outward with it.
 *
 * The flourish is a plain element given its own view-transition-name, so it
 * is painted live above the reveal while the transition runs and carries on
 * as ordinary DOM once the transition has finished.
 */
const REVEAL_MS = 900;
const FX_MS = 1050;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
/* mirrors the gradient on ::view-transition-new(root) in index.css */
const MASK_SOLID = 0.76;
const SVG_NS = "http://www.w3.org/2000/svg";

let running = false;

const svgEl = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  if (parent) parent.appendChild(node);
  return node;
};

const rand = (min, max) => min + Math.random() * (max - min);

/* ------------------------------------------------------------
   Rings of the new palette's accent colour, for every palette
   ------------------------------------------------------------ */
const ripple = (svg, { x, y, radius, accent }) => {
  [0, 110, 220].forEach((delay, i) => {
    const ring = svgEl(
      "circle",
      { cx: x, cy: y, r: radius, fill: "none", stroke: accent, "stroke-width": 3 - i * 0.7 },
      svg
    );
    ring.style.transformOrigin = `${x}px ${y}px`;
    ring.animate(
      { transform: ["scale(0)", "scale(1)"], opacity: [0.9, 0] },
      { duration: FX_MS - 150, delay, easing: EASE, fill: "both" }
    );
  });
};

const buildOverlay = (id, x, y, radius) => {
  const accent = PALETTES.find((p) => p.id === id)?.swatch[1] ?? "#ffffff";
  const overlay = document.createElement("div");
  overlay.className = "palette-fx";
  overlay.setAttribute("aria-hidden", "true");

  const svg = svgEl("svg", {
    width: "100%",
    height: "100%",
    viewBox: `0 0 ${window.innerWidth} ${window.innerHeight}`,
    preserveAspectRatio: "none",
  });
  svg.style.overflow = "visible";
  overlay.appendChild(svg);

  ripple(svg, { x, y, radius, accent });
  return overlay;
};

/**
 * Applies `apply` (which must set the new palette synchronously) with the
 * themed transition, falling back to a plain swap wherever motion is unwanted.
 */
export const transitionPalette = (next, apply, origin) => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || document.hidden || running) {
    apply();
    return;
  }

  const x = origin?.x ?? window.innerWidth - 48;
  const y = origin?.y ?? 48;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  running = true;
  let overlay = null;
  const finish = () => {
    overlay?.remove();
    running = false;
  };
  /* the timer is the guarantee: a promise alone can stall in a hidden tab */
  setTimeout(finish, FX_MS + 500);

  const mount = () => {
    overlay = buildOverlay(next, x, y, radius);
    document.body.appendChild(overlay);
  };

  if (!document.startViewTransition) {
    apply();
    mount();
    return;
  }

  const transition = document.startViewTransition(() => {
    apply();
    mount();
  });

  transition.ready
    .then(() => {
      const solidEdge = radius / MASK_SOLID;
      document.documentElement.animate(
        {
          maskSize: ["0px 0px", `${solidEdge * 2}px ${solidEdge * 2}px`],
          maskPosition: [`${x}px ${y}px`, `${x - solidEdge}px ${y - solidEdge}px`],
        },
        {
          duration: REVEAL_MS,
          easing: EASE,
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        }
      );
      document.documentElement.animate(
        { opacity: [1, 1, 0] },
        {
          duration: REVEAL_MS,
          easing: "linear",
          pseudoElement: "::view-transition-old(root)",
        }
      );
    })
    .catch(() => {
      /* a superseded transition rejects; the palette is already applied */
    });

  transition.finished.catch(() => {}).finally(() => {
    /* the flourish may outlast the reveal by a beat; the guard removes it */
    if (!overlay) finish();
  });
};
