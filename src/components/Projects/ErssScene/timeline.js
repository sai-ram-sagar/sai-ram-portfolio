import { Vector3 } from "three";
import { clamp01, easeInOutCubic, lerp, smoothstep } from "../sceneKit/math";
import { phaseAt } from "./phases";

/*
 * One clock drives the whole ecosystem; every position and glow is a pure
 * function of the cycle time, so the loop closes without a reset. All of it is
 * simulated - nothing here is connected to real emergency services.
 *
 *    0.0 -  2.0   the city wakes up
 *    2.0 -  9.6   CALL      a citizen dials 112; the voice call reaches the calltaker
 *    5.0 -  8.2   LOCATE    the CAD screen places the incident on the GIS map
 *    6.4 - 21.0   the incident syncs to the dispatch centre
 *    8.2 - 11.4   DISPATCH  the dispatcher assigns the nearest unit and the drone
 *   11.4 - 22.0   RESPOND   police units drive to the incident, the drone flies its route
 *   22.0 - 28.8   resolved: units and drone return to base
 */

export const CYCLE = 30;
/* a still frame for visitors who prefer reduced motion: everything in motion */
export const REDUCED_AT = 15.2;

/* ---- places (x, z on the shared terrain; y is up) ---- */
export const INCIDENT = new Vector3(2.4, 0.05, 0.6);
export const CITIZEN = { x: 2.4, z: 0.6 };
export const CALLTAKER = { x: -3.15, z: 2.8 };
export const DISPATCH = { x: -4.95, z: 2.8 };
export const DISPATCHER = { x: -4.55, z: 1.6 };
export const ROOF = new Vector3(DISPATCH.x, 0.95, DISPATCH.z);

/* ---- roads the patrol cars follow (they match the shared city's road grid) ---- */
export const PATH_A = [
  [-5.1, 0.6],
  [1.7, 0.6],
];
/* the second unit takes the northern loop and comes in from the east */
export const PATH_B = [
  [-5.5, 0.6],
  [1.0, 0.6],
  [1.0, -1.8],
  [3.8, -1.8],
  [3.8, 0.6],
  [3.1, 0.6],
];

const lengthsOf = (path) => {
  const cum = [0];
  for (let i = 1; i < path.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  }
  return cum;
};
const CUM_A = lengthsOf(PATH_A);
const CUM_B = lengthsOf(PATH_B);

/** Position and heading along a polyline at fraction u (0..1). */
const along = (path, cum, u, out) => {
  const d = clamp01(u) * cum[cum.length - 1];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i += 1;
  const seg = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  const [x0, z0] = path[i - 1];
  const [x1, z1] = path[i];
  out.x = lerp(x0, x1, seg);
  out.z = lerp(z0, z1, seg);
  out.heading = Math.atan2(x1 - x0, z1 - z0);
  return out;
};

/* a car's drive: out along the path, wait on scene, come back the same way */
const drive = (path, cum, leave, arrive, back, home, out) => {
  const t = out.t;
  let u = 0;
  if (t >= leave && t < arrive) u = easeInOutCubic((t - leave) / (arrive - leave));
  else if (t >= arrive && t < back) u = 1;
  else if (t >= back && t < home) u = 1 - easeInOutCubic((t - back) / (home - back));
  along(path, cum, u, out);
  /* driving back, the car faces the other way */
  if (t >= back && t < home) out.heading += Math.PI;
  out.moving = (t >= leave && t < arrive) || (t >= back && t < home) ? 1 : 0;
  return out;
};

/* ---- drone route: roof -> over the city -> loiter above the incident -> back ---- */
const ROUTE = [
  new Vector3(ROOF.x, 1.0, ROOF.z),
  new Vector3(-3.4, 1.7, 1.7),
  new Vector3(-1.4, 1.95, 1.1),
  new Vector3(0.4, 1.95, 0.5),
  new Vector3(1.7, 1.8, 0.5),
  new Vector3(INCIDENT.x, 1.55, INCIDENT.z),
];
const LOITER_R = 0.7;

export const createSample = () => ({
  time: 0,
  t: 0,
  phase: 0,
  /* link activity, 0..1 */
  voice: 0,
  sync: 0,
  assignA: 0,
  assignB: 0,
  assignDrone: 0,
  /* incident */
  incident: 0, /* marker scale-in */
  resolved: 0,
  ping: 0, /* GIS ping progress, restarts */
  /* labels */
  tagCall: 0,
  tagIncident: 0,
  tagAssign: 0,
  tagScene: 0,
  /* people and screens */
  ringing: 0,
  calltakerBusy: 0,
  dispatchBusy: 0,
  /* vehicles */
  carA: { x: PATH_A[0][0], z: PATH_A[0][1], heading: Math.PI / 2, moving: 0, t: 0 },
  carB: { x: PATH_B[0][0], z: PATH_B[0][1], heading: Math.PI / 2, moving: 0, t: 0 },
  drone: { x: ROOF.x, y: ROOF.y, z: ROOF.z, heading: 0, spin: 0, beam: 0 },
});

const bump = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));
const tmp = new Vector3();

export const sampleInto = (out, time) => {
  const t = time % CYCLE;
  out.time = time;
  out.t = t;
  out.phase = phaseAt(t);

  /* links */
  out.voice = bump(t, 2.2, 2.8, 9.2, 9.8);
  out.sync = bump(t, 6.4, 7.0, 21.0, 22.0);
  out.assignA = bump(t, 8.6, 9.1, 17.0, 18.0);
  out.assignB = bump(t, 9.4, 9.9, 20.0, 21.0);
  out.assignDrone = bump(t, 10.2, 10.7, 21.0, 22.0);

  /* incident marker: appears once the call is located, clears when resolved */
  out.incident = smoothstep(5.0, 5.8, t) * (1 - smoothstep(21.4, 22.4, t));
  out.resolved = smoothstep(21.0, 21.8, t) * (1 - smoothstep(23.0, 24.0, t));
  out.ping = t >= 5.0 ? ((t - 5.0) * 0.55) % 1 : 1;

  out.tagCall = bump(t, 2.4, 3.0, 5.0, 5.8);
  out.tagIncident = bump(t, 5.6, 6.2, 12.0, 13.0);
  out.tagAssign = bump(t, 8.8, 9.3, 12.4, 13.2);
  out.tagScene = bump(t, 16.4, 17.0, 21.0, 21.8);

  out.ringing = bump(t, 2.0, 2.4, 4.2, 4.6);
  out.calltakerBusy = bump(t, 4.2, 4.8, 9.6, 10.4);
  out.dispatchBusy = bump(t, 6.6, 7.2, 21.0, 22.0);

  /* vehicles */
  out.carA.t = t;
  drive(PATH_A, CUM_A, 9.4, 16.0, 22.4, 28.4, out.carA);
  out.carB.t = t;
  drive(PATH_B, CUM_B, 10.4, 19.0, 22.8, 29.0, out.carB);

  /* drone */
  const d = out.drone;
  /* 0 on the roof pad, 1 in the air: it climbs, flies, loiters, and settles back down */
  const air = smoothstep(10.6, 11.8, t) * (1 - smoothstep(28.2, 29.4, t));
  d.spin = smoothstep(10.2, 10.8, t) * (1 - smoothstep(29.2, 29.7, t));
  let u = 0;
  let loiter = 0;
  if (t >= 11.8 && t < 17.4) u = easeInOutCubic((t - 11.8) / 5.6);
  else if (t >= 17.4 && t < 22.2) {
    u = 1;
    loiter = (t - 17.4) / 4.8;
  } else if (t >= 22.2 && t < 28.0) u = 1 - easeInOutCubic((t - 22.2) / 5.8);
  const f = u * (ROUTE.length - 1);
  const i = Math.min(ROUTE.length - 2, Math.floor(f));
  tmp.copy(ROUTE[i]).lerp(ROUTE[i + 1], f - i);
  d.x = tmp.x;
  d.z = tmp.z;
  const routeY = tmp.y + Math.sin(u * Math.PI) * 0.18;
  if (loiter > 0) {
    const a = loiter * Math.PI * 2 * 1.2;
    const k = smoothstep(0, 0.12, loiter);
    d.x += Math.sin(a) * LOITER_R * k;
    d.z += Math.cos(a) * LOITER_R * k;
  }
  d.y = lerp(ROOF.y + 0.05, routeY, air);
  /* it faces the incident once it is on its way */
  d.heading =
    Math.atan2(INCIDENT.x - d.x, INCIDENT.z - d.z) * smoothstep(12.5, 14.0, t) * (1 - smoothstep(23.0, 24.0, t));
  d.beam = bump(t, 17.0, 17.8, 21.6, 22.4);
  return out;
};
