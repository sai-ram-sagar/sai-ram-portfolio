/* Small numeric helpers shared by the 3D scenes. */

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;

export const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t) => 1 - (1 - clamp01(t)) ** 3;

export const easeInOutCubic = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};

/* overshoots slightly, then settles - the "snap into place" of a built piece */
export const easeOutBack = (t) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  const x = clamp01(t) - 1;
  return 1 + c3 * x ** 3 + c1 * x ** 2;
};

/* deterministic scatter in [-1, 1], so a scene looks identical every time */
export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

/* small seeded generator for procedural layouts */
export const mulberry32 = (seed) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
