import { Vector3 } from "three";
import { clamp01, easeInOutCubic, lerp, smoothstep } from "../sceneKit/math";
import { phaseAt } from "./phases";

/*
 * One clock drives the whole ecosystem; every position and glow is a pure
 * function of the cycle time, so the loop closes without a reset. All of it is
 * simulated - nothing here is connected to real emergency services.
 *
 *    2.0 -  3.4   a citizen dials 112; the call is answered in the control room
 *    3.4 - 12.6   CALL      the calltaker and the citizen talk; the incident is
 *                           located on the GIS map while they speak
 *    9.4 - 15.4   MATCH     the control room compares both police stations and
 *                           both hospitals and picks the nearest of each
 *   12.9 - 19.0   DISPATCH  the nearest station's cars and drone are sent out; the
 *                           nearest hospital's ambulance follows
 *   19.0 - 26.0   RESPOND   police secure the scene, the ambulance loads the citizen
 *   24.4 - 40.0   RETURN    the ambulance takes the citizen to hospital; cars and
 *                           drone go back to their station
 */

export const CYCLE = 40;
/* a still frame for visitors who prefer reduced motion: police on scene, ambulance loading */
export const REDUCED_AT = 22.9;

/* ---- places (x, z on the city; y is up) ----
 * The control room is at the front-left corner. Police station 1 and hospital 1
 * are the nearest to the incident; police station 2 and hospital 2 are further. */
export const INCIDENT = new Vector3(0.9, 0.05, -1.2);
export const CITIZEN = { x: 0.9, z: -1.2 };
export const CALLTAKER = { x: -3.2, z: 2.85 };
export const DISPATCH = { x: -4.8, z: 2.75 }; /* the control room building */
export const DISPATCHER = { x: -4.1, z: 2.1 };
export const POLICE_1 = { x: -1.95, z: -2.55 }; /* near */
export const POLICE_2 = { x: 4.2, z: 2.25 }; /* far */
export const HOSPITAL_1 = { x: 0.95, z: 2.55 }; /* near */
export const HOSPITAL_2 = { x: -4.7, z: -2.2 }; /* far */
export const ROOF = new Vector3(POLICE_1.x - 0.2, 0.95, POLICE_1.z - 0.02); /* the drone's pad, on police station 1 */

/* where vehicles wait, in front of their building (x, z) */
export const PARK = {
  car1: [POLICE_1.x - 0.4, POLICE_1.z + 0.8],
  car2: [POLICE_1.x + 0.4, POLICE_1.z + 0.8],
  amb: [HOSPITAL_1.x + 0.4, HOSPITAL_1.z + 0.55],
  far1: [POLICE_2.x - 0.4, POLICE_2.z + 0.8],
  far2: [POLICE_2.x + 0.4, POLICE_2.z + 0.8],
  ambFar: [HOSPITAL_2.x + 0.55, HOSPITAL_2.z + 0.75],
};

/* ---- roads the vehicles follow (they match the city's road grid) ---- */
/* both police cars come out of station 1 onto the cross street and drive to the scene from the west */
export const PATH_A = [PARK.car1, [PARK.car1[0], -1.2], [0.3, -1.2]];
export const PATH_B = [PARK.car2, [PARK.car2[0], -1.2], [-0.1, -1.2]];
/* the ambulance leaves hospital 1 eastwards, takes the east street north and arrives from the east */
export const PATH_AMB = [PARK.amb, [PARK.amb[0], 3.1], [2.6, 3.1], [2.6, -1.2], [1.35, -1.2]];

const lengthsOf = (path) => {
  const cum = [0];
  for (let i = 1; i < path.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  }
  return cum;
};
const CUM_A = lengthsOf(PATH_A);
const CUM_B = lengthsOf(PATH_B);
const CUM_AMB = lengthsOf(PATH_AMB);

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

/* a vehicle's trip: out along the path, wait on scene, come back the same way */
const drive = (path, cum, t, leave, arrive, back, home, out) => {
  let u = 0;
  if (t >= leave && t < arrive) u = easeInOutCubic((t - leave) / (arrive - leave));
  else if (t >= arrive && t < back) u = 1;
  else if (t >= back && t < home) u = 1 - easeInOutCubic((t - back) / (home - back));
  along(path, cum, u, out);
  /* driving back, the vehicle faces the other way */
  if (t >= back && t < home) out.heading += Math.PI;
  out.moving = (t >= leave && t < arrive) || (t >= back && t < home) ? 1 : 0;
  /* lights run for the whole trip, from leaving to getting home */
  out.lights = t >= leave && t < home ? 1 : 0;
  return out;
};

/* ---- drone route: station roof -> over the city -> loiter above the incident -> back ---- */
const ROUTE = [
  new Vector3(ROOF.x, 1.0, ROOF.z),
  new Vector3(-1.4, 1.6, -2.0),
  new Vector3(-0.5, 1.8, -1.8),
  new Vector3(0.3, 1.75, -1.5),
  new Vector3(INCIDENT.x, 1.55, INCIDENT.z),
];
const LOITER_R = 0.7;

const parked = ([x, z], heading) => ({ x, z, heading, moving: 0, lights: 0 });

export const createSample = () => ({
  time: 0,
  t: 0,
  phase: 0,
  /* link activity, 0..1 */
  voice: 0,
  sync: 0,
  candP1: 0,
  candP2: 0,
  candH1: 0,
  candH2: 0,
  assignA: 0,
  assignB: 0,
  assignDrone: 0,
  assignAmb: 0,
  /* incident and citizen */
  incident: 0,
  resolved: 0,
  ping: 0,
  citizenVis: 1,
  /* labels and speech bubbles */
  tagCall: 0,
  tagLoc: 0,
  tagScene: 0,
  tagMedic: 0,
  tagBoard: 0,
  tagAdmit: 0,
  tagP1: 0,
  tagP2: 0,
  tagH1: 0,
  tagH2: 0,
  q1: 0,
  q2: 0,
  q3: 0,
  q4: 0,
  /* people and buildings */
  ringing: 0,
  calltakerBusy: 0,
  dispatchBusy: 0,
  admit: 0,
  /* vehicles */
  carA: parked(PARK.car1, 0),
  carB: parked(PARK.car2, 0),
  amb: parked(PARK.amb, 0),
  far1: parked(PARK.far1, 0),
  far2: parked(PARK.far2, 0),
  ambFar: parked(PARK.ambFar, 0),
  drone: { x: ROOF.x, y: ROOF.y, z: ROOF.z, heading: 0, spin: 0, beam: 0 },
});

const bump = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));
const tmp = new Vector3();

export const sampleInto = (out, time) => {
  const t = time % CYCLE;
  out.time = time;
  out.t = t;
  out.phase = phaseAt(t);

  /* the call: two-way voice for as long as they talk */
  out.voice = bump(t, 3.0, 3.5, 13.0, 13.8);
  out.ringing = bump(t, 2.0, 2.4, 3.0, 3.4);
  out.calltakerBusy = bump(t, 3.2, 3.8, 33.0, 34.0);

  /* the conversation, as four short bubbles that trade places */
  out.q1 = bump(t, 3.4, 3.8, 5.3, 5.7); /* calltaker: what's your emergency */
  out.q2 = bump(t, 5.8, 6.2, 7.8, 8.2); /* citizen: accident near ... */
  out.q3 = bump(t, 8.3, 8.7, 10.0, 10.4); /* calltaker: anyone injured */
  out.q4 = bump(t, 10.5, 10.9, 12.4, 12.9); /* citizen: yes, need an ambulance */

  /* the incident is placed on the GIS map while the citizen describes it */
  out.incident = smoothstep(6.4, 7.2, t) * (1 - smoothstep(29.5, 31.0, t));
  out.ping = t >= 6.4 ? ((t - 6.4) * 0.55) % 1 : 1;
  out.resolved = smoothstep(24.4, 25.4, t) * (1 - smoothstep(29.5, 31.0, t));
  out.tagCall = bump(t, 2.3, 2.8, 3.3, 3.8);
  out.tagLoc = bump(t, 6.8, 7.4, 9.0, 9.8);

  /* the control room hears it, and compares: police stations first, hospitals once an ambulance is asked for */
  out.sync = bump(t, 7.0, 7.6, 32.0, 33.2);
  out.dispatchBusy = bump(t, 7.2, 7.8, 33.0, 34.0);
  out.candP1 = bump(t, 9.4, 9.9, 12.9, 13.4);
  out.candP2 = 0.45 * bump(t, 9.4, 9.9, 12.9, 13.4);
  out.tagP1 = bump(t, 9.8, 10.4, 13.4, 14.2);
  out.tagP2 = bump(t, 10.2, 10.8, 13.4, 14.2);
  out.tagMedic = bump(t, 12.2, 12.8, 14.8, 15.6);
  out.candH1 = bump(t, 12.6, 13.1, 14.8, 15.3);
  out.candH2 = 0.45 * bump(t, 12.6, 13.1, 14.8, 15.3);
  out.tagH1 = bump(t, 13.0, 13.6, 15.6, 16.4);
  out.tagH2 = bump(t, 13.4, 14.0, 15.6, 16.4);

  /* orders go out to the chosen units */
  out.assignA = bump(t, 12.9, 13.4, 25.2, 26.2);
  out.assignB = bump(t, 13.6, 14.1, 25.8, 26.8);
  out.assignDrone = bump(t, 14.2, 14.7, 26.2, 27.2);
  out.assignAmb = bump(t, 14.8, 15.3, 30.2, 31.2);

  /* on scene, loading the patient, admitted */
  out.tagScene = bump(t, 19.4, 20.0, 24.0, 24.8);
  out.tagBoard = bump(t, 23.0, 23.6, 25.6, 26.4);
  out.tagAdmit = bump(t, 31.0, 31.6, 34.5, 35.5);
  out.admit = bump(t, 30.8, 31.4, 33.5, 35.0);

  /* the citizen boards the ambulance, and is back on the street for the next cycle */
  out.citizenVis = t < 30 ? 1 - smoothstep(22.8, 23.8, t) : smoothstep(36.8, 38.2, t);

  /* vehicles: the cars from station 1 and the ambulance from hospital 1; station 2 and hospital 2 stay parked */
  drive(PATH_A, CUM_A, t, 14.0, 18.6, 25.6, 33.0, out.carA);
  drive(PATH_B, CUM_B, t, 14.8, 19.4, 26.4, 33.8, out.carB);
  drive(PATH_AMB, CUM_AMB, t, 15.4, 22.4, 24.4, 31.0, out.amb);

  /* drone */
  const d = out.drone;
  const air = smoothstep(14.4, 15.6, t) * (1 - smoothstep(33.0, 34.4, t));
  d.spin = smoothstep(14.0, 14.6, t) * (1 - smoothstep(34.0, 34.6, t));
  let u = 0;
  let loiter = 0;
  if (t >= 15.6 && t < 21.2) u = easeInOutCubic((t - 15.6) / 5.6);
  else if (t >= 21.2 && t < 26.0) {
    u = 1;
    loiter = (t - 21.2) / 4.8;
  } else if (t >= 26.0 && t < 33.0) u = 1 - easeInOutCubic((t - 26.0) / 7.0);
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
  /* it faces the incident while it is out */
  d.heading =
    Math.atan2(INCIDENT.x - d.x, INCIDENT.z - d.z) * smoothstep(16.0, 17.5, t) * (1 - smoothstep(26.6, 27.6, t));
  d.beam = bump(t, 21.8, 22.6, 25.2, 26.0);
  return out;
};
