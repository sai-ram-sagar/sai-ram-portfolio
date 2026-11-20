import { BufferAttribute, BufferGeometry, Color, PlaneGeometry } from "three";
import { mulberry32, smoothstep } from "../sceneKit/math";

/*
 * The miniature landscape, generated procedurally and deterministically (a
 * seeded generator, so it looks identical on every visit). Everything here is
 * plain data and geometry; DfrScene/Terrain.jsx turns it into meshes.
 *
 * Layout, seen from above (x to the right, z towards the viewer):
 *   - a flat town in the middle with a road grid and building blocks
 *   - forested hills along the far edge
 *   - a launch pad and mission-control hut front-left, a small lake front-right
 */

export const TERRAIN = { w: 11.2, d: 7.4 };
export const PAD = { x: -4.1, z: 2.2 };
export const HUB = { x: -5.05, z: 3.05 };
export const LAKE = { x: 4.4, z: 2.75, rx: 0.95, rz: 0.62 };
export const FACADE_TILE = 0.3;

const gauss = (x, z, cx, cz, rx, rz, a) =>
  a * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));

/** Ground height at a point. The town is dead flat; only the far edge rises. */
export const heightAt = (x, z) => {
  const hills =
    gauss(x, z, -4.6, -2.9, 1.6, 1.0, 1.0) +
    gauss(x, z, 4.5, -2.8, 1.8, 1.05, 1.3) +
    gauss(x, z, 0.4, -3.5, 2.2, 0.5, 0.35);
  const north = 1 - smoothstep(-2.4, -1.7, z);
  const edge =
    smoothstep(TERRAIN.w / 2, TERRAIN.w / 2 - 0.8, Math.abs(x)) *
    smoothstep(TERRAIN.d / 2, TERRAIN.d / 2 - 0.7, Math.abs(z));
  const ripple = 0.03 * Math.sin(x * 2.1 + 1) * Math.cos(z * 1.7);
  return (hills + ripple) * north * edge;
};

export const ROADS = [
  { x0: -5.6, z0: 0.6, x1: 5.6, z1: 0.6, w: 0.55 },
  { x0: 1.0, z0: -1.8, x1: 1.0, z1: 3.7, w: 0.45 },
  { x0: -3.0, z0: -1.8, x1: -3.0, z1: 0.6, w: 0.4 },
  { x0: 3.8, z0: -1.8, x1: 3.8, z1: 3.7, w: 0.4 },
  { x0: -5.6, z0: -1.8, x1: 5.6, z1: -1.8, w: 0.35 },
  { x0: -4.1, z0: 0.6, x1: -4.1, z1: 2.2, w: 0.3 },
];

export const BLOCKS = [
  { x0: -2.7, x1: 0.65, z0: 1.0, z1: 3.5 },
  { x0: 1.35, x1: 3.45, z0: 1.0, z1: 3.5 },
  { x0: 4.1, x1: 5.4, z0: 1.0, z1: 2.0 },
  { x0: -2.7, x1: 0.65, z0: -1.5, z1: 0.2 },
  { x0: 1.35, x1: 3.45, z0: -1.5, z1: 0.2 },
  { x0: 4.1, x1: 5.4, z0: -1.5, z1: 0.2 },
  { x0: -5.4, x1: -3.35, z0: -1.5, z1: 0.2 },
];

const ROAD_TOP = 0.05;
const PLOT_TOP = 0.035;

/* ------------------------------------------------------------------ */
/* Merged geometry builder                                            */
/* ------------------------------------------------------------------ */

/**
 * Accumulates boxes into one BufferGeometry with per-vertex colour, so a whole
 * town is a single draw call. Side faces carry UVs scaled to world size, which
 * lets one small window texture tile correctly on every building.
 */
class Mesher {
  constructor() {
    this.p = [];
    this.n = [];
    this.u = [];
    this.c = [];
    this.i = [];
  }

  quad(a, b, c, d, normal, uw, vh, color) {
    const base = this.p.length / 3;
    this.p.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k += 1) this.n.push(...normal);
    this.u.push(0, 0, uw, 0, uw, vh, 0, vh);
    for (let k = 0; k < 4; k += 1) this.c.push(color.r, color.g, color.b);
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  box(cx, cy, cz, w, h, d, color, { sides = true, top = true, tile = FACADE_TILE } = {}) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const y0 = cy - h / 2;
    const y1 = cy + h / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    if (sides) {
      this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d / tile, h / tile, color);
      this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d / tile, h / tile, color);
      this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w / tile, h / tile, color);
      this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w / tile, h / tile, color);
    }
    if (top) {
      this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1, 1, color);
    }
  }

  build() {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(this.p), 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(this.n), 3));
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(this.u), 2));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(this.c), 3));
    geometry.setIndex(this.i);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

const roadBox = (mesher, road, color, thickness = ROAD_TOP) => {
  const horizontal = road.z0 === road.z1;
  const length = horizontal ? Math.abs(road.x1 - road.x0) : Math.abs(road.z1 - road.z0);
  const cx = (road.x0 + road.x1) / 2;
  const cz = (road.z0 + road.z1) / 2;
  mesher.box(cx, thickness / 2, cz, horizontal ? length : road.w, thickness, horizontal ? road.w : length, color, {
    sides: false,
  });
};

/* ------------------------------------------------------------------ */
/* Terrain surface                                                     */
/* ------------------------------------------------------------------ */

const GRASS_A = new Color("#2e4a37");
const GRASS_B = new Color("#3c5c42");
const HILL = new Color("#4d6248");
const ROCK = new Color("#6a6f70");
const tint = new Color();

const buildTerrain = () => {
  const geometry = new PlaneGeometry(TERRAIN.w, TERRAIN.d, 112, 74);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = heightAt(x, z);
    position.setY(i, h);

    const n = 0.5 + 0.5 * Math.sin(x * 1.3 + z * 0.7) * Math.cos(z * 1.9 - x * 0.4);
    tint.copy(GRASS_A).lerp(GRASS_B, n);
    tint.lerp(HILL, smoothstep(0.2, 0.7, h));
    tint.lerp(ROCK, smoothstep(0.85, 1.25, h) * 0.75);
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
};

/* ------------------------------------------------------------------ */
/* Town                                                                */
/* ------------------------------------------------------------------ */

const WALLS = ["#b8b2a3", "#9ea3ab", "#c9b99a", "#8c8f96", "#a89a88", "#7d8794", "#bdbab2"].map(
  (hex) => new Color(hex)
);
const ASPHALT = new Color("#262b35");
const PLOT = new Color("#3b414b");
const MARKING = new Color("#cfc7a8");
const ROOF = new Color();

const buildTown = (rand) => {
  const walls = new Mesher();
  const roofs = new Mesher();
  const plots = new Mesher();
  const roads = new Mesher();
  const marks = new Mesher();
  const footprints = [];

  BLOCKS.forEach((block) => {
    const pad = 0.05;
    plots.box(
      (block.x0 + block.x1) / 2,
      PLOT_TOP / 2,
      (block.z0 + block.z1) / 2,
      block.x1 - block.x0 + pad * 2,
      PLOT_TOP,
      block.z1 - block.z0 + pad * 2,
      PLOT,
      { sides: false }
    );

    const cols = Math.max(1, Math.round((block.x1 - block.x0) / 0.72));
    const rows = Math.max(1, Math.round((block.z1 - block.z0) / 0.72));
    const lotW = (block.x1 - block.x0) / cols;
    const lotD = (block.z1 - block.z0) / rows;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const w = lotW * (0.56 + rand() * 0.2);
        const d = lotD * (0.56 + rand() * 0.2);
        const tall = rand() > 0.9;
        const h = tall ? 0.62 + rand() * 0.3 : 0.14 + rand() * 0.3;
        const cx = block.x0 + lotW * (c + 0.5);
        const cz = block.z0 + lotD * (r + 0.5);
        const wall = WALLS[Math.floor(rand() * WALLS.length)];
        const base = PLOT_TOP - 0.005;

        walls.box(cx, base + h / 2, cz, w, h, d, wall, { top: false });
        ROOF.copy(wall).multiplyScalar(0.55);
        roofs.box(cx, base + h + 0.015, cz, w + 0.04, 0.03, d + 0.04, ROOF, { sides: false });
        if (rand() > 0.45) {
          const ux = w * (0.2 + rand() * 0.2);
          const uz = d * (0.2 + rand() * 0.2);
          roofs.box(cx + (rand() - 0.5) * w * 0.4, base + h + 0.065, cz + (rand() - 0.5) * d * 0.4, ux, 0.07, uz, ROOF, {
            sides: true,
            tile: 1,
          });
        }
        footprints.push({ x: cx, z: cz, w, d });
      }
    }
  });

  ROADS.forEach((road) => {
    roadBox(roads, road, ASPHALT);
    /* dashed centre line */
    const horizontal = road.z0 === road.z1;
    const length = horizontal ? Math.abs(road.x1 - road.x0) : Math.abs(road.z1 - road.z0);
    const start = horizontal ? Math.min(road.x0, road.x1) : Math.min(road.z0, road.z1);
    for (let s = 0.2; s < length - 0.1; s += 0.34) {
      const along = start + s;
      if (horizontal) marks.box(along, ROAD_TOP + 0.002, road.z0, 0.16, 0.004, 0.025, MARKING, { sides: false });
      else marks.box(road.x0, ROAD_TOP + 0.002, along, 0.025, 0.004, 0.16, MARKING, { sides: false });
    }
  });

  return {
    walls: walls.build(),
    roofs: roofs.build(),
    plots: plots.build(),
    roads: roads.build(),
    marks: marks.build(),
    footprints,
  };
};

/* ------------------------------------------------------------------ */
/* Vegetation                                                          */
/* ------------------------------------------------------------------ */

const distToRoad = (x, z, road) => {
  const minX = Math.min(road.x0, road.x1);
  const maxX = Math.max(road.x0, road.x1);
  const minZ = Math.min(road.z0, road.z1);
  const maxZ = Math.max(road.z0, road.z1);
  const dx = Math.max(minX - x, 0, x - maxX);
  const dz = Math.max(minZ - z, 0, z - maxZ);
  return Math.hypot(dx, dz);
};

const isFree = (x, z) => {
  if (Math.abs(x) > TERRAIN.w / 2 - 0.25 || Math.abs(z) > TERRAIN.d / 2 - 0.25) return false;
  if (ROADS.some((road) => distToRoad(x, z, road) < road.w / 2 + 0.16)) return false;
  if (BLOCKS.some((b) => x > b.x0 - 0.2 && x < b.x1 + 0.2 && z > b.z0 - 0.2 && z < b.z1 + 0.2)) return false;
  if (Math.hypot(x - PAD.x, z - PAD.z) < 0.85) return false;
  if (Math.hypot(x - HUB.x, z - HUB.z) < 0.7) return false;
  const lx = (x - LAKE.x) / (LAKE.rx + 0.25);
  const lz = (z - LAKE.z) / (LAKE.rz + 0.25);
  return lx * lx + lz * lz > 1;
};

const PINE = ["#1f4a36", "#245240", "#2b5b43"].map((hex) => new Color(hex));
const BROAD = ["#3d6a3e", "#497a45", "#5a8a4c", "#6e8f43"].map((hex) => new Color(hex));

const buildTrees = (rand) => {
  const pines = [];
  const broads = [];
  let attempts = 0;
  while (pines.length + broads.length < 110 && attempts < 4000) {
    attempts += 1;
    const x = (rand() - 0.5) * (TERRAIN.w - 0.5);
    const z = (rand() - 0.5) * (TERRAIN.d - 0.5);
    if (!isFree(x, z)) continue;
    const y = heightAt(x, z);
    const onHill = y > 0.18 || z < -2.1;
    /* forest thickens on the hills and thins out on the plain */
    if (!onHill && rand() > 0.16) continue;
    const s = 0.75 + rand() * 0.6;
    if (onHill ? rand() > 0.28 : rand() > 0.6) {
      pines.push({ x, y, z, s, color: PINE[Math.floor(rand() * PINE.length)] });
    } else {
      broads.push({ x, y, z, s, color: BROAD[Math.floor(rand() * BROAD.length)] });
    }
  }
  return { pines, broads };
};

export const buildWorld = () => {
  const rand = mulberry32(20241);
  return {
    terrain: buildTerrain(),
    town: buildTown(rand),
    trees: buildTrees(rand),
  };
};
