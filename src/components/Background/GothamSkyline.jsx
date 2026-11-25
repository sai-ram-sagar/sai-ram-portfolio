import styles from "./GothamSkyline.module.css";

/*
 * A Gotham-style skyline for the Batman palette only: three layers of gothic towers with a few
 * lit windows, built once from a fixed seed (so it never changes between visits). It is hidden
 * unless the Batman palette is active, and kept faint so the page content always stays in front.
 */
const WIDTH = 1600;

const makeRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* one row of towers: each is a block, sometimes with a spire or stepped crown */
const buildLayer = (seed, { minH, maxH, minW, maxW, base, windows }) => {
  const rand = makeRandom(seed);
  const parts = [];
  const lit = [];
  let x = -20;
  while (x < WIDTH + 20) {
    const w = minW + rand() * (maxW - minW);
    const h = minH + rand() * (maxH - minH);
    const top = base - h;
    const kind = rand();
    if (kind < 0.34) {
      // tower with a pointed spire
      const spire = 30 + rand() * 60;
      parts.push(`M${x} ${base}V${top}L${x + w / 2} ${top - spire}L${x + w} ${top}V${base}Z`);
    } else if (kind < 0.62) {
      // stepped crown
      const inset = w * 0.22;
      parts.push(
        `M${x} ${base}V${top + 18}H${x + inset}V${top}H${x + w - inset}V${top + 18}H${x + w}V${base}Z`,
      );
    } else if (kind < 0.76) {
      // clock tower: narrow shaft with a pitched roof and a small turret each side
      parts.push(
        `M${x} ${base}V${top + 30}L${x + w / 2} ${top - 24}L${x + w} ${top + 30}V${base}Z`,
      );
    } else {
      parts.push(`M${x} ${base}V${top}H${x + w}V${base}Z`);
    }
    if (windows) {
      for (let wy = top + 24; wy < base - 18; wy += 18) {
        for (let wx = x + 8; wx < x + w - 10; wx += 14) {
          if (rand() < windows) lit.push(`M${wx.toFixed(1)} ${wy.toFixed(1)}h4v6h-4z`);
        }
      }
    }
    x += w + rand() * 6;
  }
  return { d: parts.join(""), lit: lit.join("") };
};

const LAYERS = [
  { seed: 11, minH: 130, maxH: 230, minW: 38, maxW: 80, base: 520, windows: 0 },
  { seed: 29, minH: 170, maxH: 300, minW: 46, maxW: 96, base: 520, windows: 0.06 },
  { seed: 47, minH: 120, maxH: 340, minW: 56, maxW: 120, base: 520, windows: 0.1 },
].map((layer) => buildLayer(layer.seed, layer));

export const GothamSkyline = () => (
  <svg
    className={styles.skyline}
    viewBox={`0 0 ${WIDTH} 520`}
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
  >
    <path className={styles.far} d={LAYERS[0].d} />
    <path className={styles.mid} d={LAYERS[1].d} />
    <path className={styles.near} d={LAYERS[2].d} />
    <path className={styles.lights} d={`${LAYERS[1].lit}${LAYERS[2].lit}`} />
  </svg>
);
