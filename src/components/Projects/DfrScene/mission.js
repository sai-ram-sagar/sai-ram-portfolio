import { CatmullRomCurve3, Vector3 } from "three";
import {
  clamp01,
  easeInOutCubic,
  easeOutBack,
  lerp,
  smoothstep,
} from "../sceneKit/math";
import { phaseAt } from "./phases";
import { PAD, heightAt } from "./terrain";

/*
 * Simulated mission data and the one clock that drives the scene.
 *
 * Nothing here talks to a real drone: the waypoints, altitudes, speeds and
 * battery figures are invented for the demonstration. Every visible quantity
 * is a pure function of the cycle time, so the loop closes without a reset -
 * the last frame (drone docked, route gone) is the same as the first.
 *
 *    0.0 -  1.8  initialise: home point, drone on the pad, battery charging
 *    2.4 -  8.6  PLAN       waypoints are placed one by one, the route follows
 *    9.0 - 14.2  CONFIGURE  inspect a waypoint, then drag one to a new spot
 *   14.2 - 15.0  route confirmed
 *   15.0 - 23.4  EXECUTE    take off, fly the ordered route, waypoints light up
 *   23.4 - 30.0  COMPLETE   indicator, route clears, drone returns and lands
 */

export const CYCLE = 30;
/* where a still frame is taken from for visitors who prefer reduced motion */
export const REDUCED_AT = 19.8;

const SPAWN0 = 2.4;
const SPAWN_STEP = 1.3;
const DRAW_DUR = 1.0;
const FLY = { start: 16.2, end: 23.4 };
const RETURN = { start: 25.4, end: 28.2, landEnd: 29.4 };
const FADE_ROUTE = { start: 25.0, end: 26.5 };
const SINK = { start: 25.6, end: 27.0 };
const ALT_SCALE = 35; /* world units -> metres, for the on-screen readout */

/* x, altitude (world y), z, simulated speed in m/s */
const WAYPOINTS = [
  { x: -2.4, y: 1.35, z: 0.6, speed: 7 },
  { x: -0.5, y: 1.75, z: -1.2, speed: 8 },
  { x: 1.2, y: 1.55, z: 1.2, speed: 8, moved: { x: 2.0, z: -0.3 } },
  { x: 3.3, y: 1.95, z: -1.9, speed: 10 },
  { x: 4.6, y: 1.5, z: 0.9, speed: 7 },
];

export const WAYPOINT_COUNT = WAYPOINTS.length;
export const altitudeMetres = (y) => Math.round(y * ALT_SCALE);
export const waypointOrigin = (index) => WAYPOINTS[index];
export const waypointInfo = (index) => ({
  number: index + 1,
  altitude: altitudeMetres(WAYPOINTS[index].y),
  speed: WAYPOINTS[index].speed,
});

const LAUNCH = new Vector3(PAD.x, 1.0, PAD.z);
const DOCK_Y = 0.2;
const SAMPLES = 220;

const bump = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));

const curveOf = (points) => new CatmullRomCurve3(points, false, "centripetal", 0.5);

/** Fraction of the curve's length closest to `point`, by sampling. */
const arcFraction = (curve, point, samples = SAMPLES) => {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i <= samples; i += 1) {
    const d = curve.getPointAt(i / samples).distanceToSquared(point);
    if (d < bestDist) {
      bestDist = d;
      best = i / samples;
    }
  }
  return best;
};

/* the flight eases in and out a little, but cruises close to constant speed */
const flightEase = (s) => lerp(s, smoothstep(0, 1, s), 0.35);

export class Mission {
  constructor() {
    /* live waypoint state, mutated every frame */
    this.wp = WAYPOINTS.map((w, i) => ({
      x: w.x,
      z: w.z,
      gy: heightAt(w.x, w.z),
      alt: w.y,
      spawn: 0,
      sink: 0,
      hl: 0,
      done: 0,
      age: -1, /* seconds since the marker was placed */
      pulse: -1, /* seconds since the drone passed, or -1 */
      hlConfig: 0,
      ghost: 0,
      cursor: 0,
      index: i,
    }));

    this.points = [LAUNCH.clone(), ...this.wp.map((w) => new Vector3(w.x, w.alt, w.z))];
    this.curve = curveOf(this.points);
    this.routeVersion = 0;

    /* the finished route, used once to find when the drone reaches each stop */
    const finalPoints = [
      LAUNCH.clone(),
      ...WAYPOINTS.map((w) => new Vector3(w.moved?.x ?? w.x, w.y, w.moved?.z ?? w.z)),
    ];
    this.finalCurve = curveOf(finalPoints);
    this.arrivals = finalPoints.slice(1).map((p) => {
      const frac = arcFraction(this.finalCurve, p);
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 24; k += 1) {
        const mid = (lo + hi) / 2;
        if (flightEase(mid) < frac) lo = mid;
        else hi = mid;
      }
      return FLY.start + ((lo + hi) / 2) * (FLY.end - FLY.start);
    });
    /* where along the live route each waypoint sits - drives the leg-by-leg reveal */
    this.legEnds = this.points.slice(1).map((p) => arcFraction(this.curve, p, 120));
    this.signature = null;

    this.t = 0;
    this.time = 0;
    this.phase = 0;
    this.reveal = 0;
    this.routeAlpha = 1;
    this.routeFlash = 0;
    this.doneFrac = 0;
    this.trailFrac = 0;
    this.info = { index: 1, alpha: 0 };
    this.complete = 0;
    this.link = 0;
    this.battery = { pct: 100, charging: false };
    this.drone = { x: PAD.x, y: DOCK_Y, z: PAD.z, yaw: 0, speed: 0, spin: 0, hover: 0 };
    this.dock = { pulse: 0 };
    this._a = new Vector3();
    this._b = new Vector3();
    this._yawHome = this.headingOf(this.finalCurve.getTangentAt(0));
  }

  headingOf(v) {
    return Math.atan2(v.x, v.z);
  }

  /** Drone position and heading target at cycle time `t`, written into `out`. */
  poseAt(t, out) {
    const end = this.finalCurve.getPointAt(1);
    const endTangent = this.finalCurve.getTangentAt(1);

    if (t < 15.0) {
      out.set(PAD.x, DOCK_Y, PAD.z);
      return this._yawHome;
    }
    if (t < FLY.start) {
      const e = easeInOutCubic((t - 15.0) / (FLY.start - 15.0));
      out.set(PAD.x, lerp(DOCK_Y, LAUNCH.y, e), PAD.z);
      return this._yawHome;
    }
    if (t < FLY.end) {
      const u = flightEase((t - FLY.start) / (FLY.end - FLY.start));
      this.curve.getPointAt(u, out);
      return this.headingOf(this.curve.getTangentAt(clamp01(u)));
    }
    if (t < RETURN.start) {
      out.copy(end);
      out.y += 0.03 * Math.sin((t - FLY.end) * 3);
      return this.headingOf(endTangent);
    }
    if (t < RETURN.end) {
      const e = easeInOutCubic((t - RETURN.start) / (RETURN.end - RETURN.start));
      const mid = this._b.set((end.x + PAD.x) / 2, Math.max(end.y, LAUNCH.y) + 0.7, (end.z + PAD.z) / 2);
      const k = 1 - e;
      out.set(
        k * k * end.x + 2 * k * e * mid.x + e * e * PAD.x,
        k * k * end.y + 2 * k * e * mid.y + e * e * LAUNCH.y,
        k * k * end.z + 2 * k * e * mid.z + e * e * PAD.z
      );
      /* head along the bezier, then swing back to the pad's resting heading */
      const dx = 2 * k * (mid.x - end.x) + 2 * e * (PAD.x - mid.x);
      const dz = 2 * k * (mid.z - end.z) + 2 * e * (PAD.z - mid.z);
      return Math.atan2(dx, dz);
    }
    if (t < RETURN.landEnd) {
      const e = easeInOutCubic((t - RETURN.end) / (RETURN.landEnd - RETURN.end));
      out.set(PAD.x, lerp(LAUNCH.y, DOCK_Y, e), PAD.z);
      return this._yawHome;
    }
    out.set(PAD.x, DOCK_Y, PAD.z);
    return this._yawHome;
  }

  /** Recompute everything for absolute scene time `time`. */
  update(time) {
    const t = time % CYCLE;
    this.time = time;
    this.t = t;
    this.phase = phaseAt(t);

    /* ---- waypoint 3 is dragged to a new spot while the route follows ---- */
    const moved = WAYPOINTS[2].moved;
    const slide = easeInOutCubic((t - 11.8) / 1.4);
    const lift = smoothstep(11.2, 11.8, t) * (1 - smoothstep(13.2, 13.8, t));
    const wp3 = this.wp[2];
    wp3.x = lerp(WAYPOINTS[2].x, moved.x, slide);
    wp3.z = lerp(WAYPOINTS[2].z, moved.z, slide);
    wp3.gy = heightAt(wp3.x, wp3.z);
    wp3.alt = WAYPOINTS[2].y + 0.3 * lift;
    wp3.ghost = smoothstep(11.6, 11.9, t) * (1 - smoothstep(13.4, 14.2, t)) * 0.9;
    wp3.cursor = lift;

    /* ---- per-waypoint state ---- */
    this.wp.forEach((w, i) => {
      w.spawn = easeOutBack((t - (SPAWN0 + i * SPAWN_STEP)) / 0.7);
      w.sink = smoothstep(SINK.start, SINK.end, t);
      const config = i === 1 ? bump(t, 9.2, 9.5, 10.7, 11.0) : i === 2 ? bump(t, 11.2, 11.5, 13.9, 14.2) : 0;
      const since = t - this.arrivals[i];
      w.age = t - (SPAWN0 + i * SPAWN_STEP);
      w.pulse = since >= 0 && since < 1.4 ? since : -1;
      w.hlConfig = config;
      w.hl = since >= 0 ? Math.exp(-since * 2.2) : 0;
      w.done = since >= 0 ? smoothstep(0, 0.35, since) : 0;
    });
    this.info.index = t < 11.1 ? 1 : 2;
    this.info.alpha = Math.max(bump(t, 9.2, 9.6, 10.6, 11.0), bump(t, 11.2, 11.6, 13.9, 14.3));

    /* ---- route geometry follows the markers ---- */
    this.wp.forEach((w, i) => this.points[i + 1].set(w.x, w.alt, w.z));
    /* the curve is rebuilt only when a marker actually moved (including the
       snap back to the original layout when the cycle wraps) */
    const signature = wp3.x * 1000 + wp3.z * 10 + wp3.alt;
    if (signature !== this.signature) {
      this.signature = signature;
      this.curve.updateArcLengths();
      this.routeVersion += 1;
      if (t < 10) this.legEnds = this.points.slice(1).map((p) => arcFraction(this.curve, p, 120));
    }

    /* ---- route reveal, leg by leg, as each waypoint is placed ---- */
    let reveal = 0;
    for (let i = 0; i < WAYPOINTS.length; i += 1) {
      const g = easeInOutCubic((t - (SPAWN0 + i * SPAWN_STEP)) / DRAW_DUR);
      if (g <= 0) break;
      const from = i === 0 ? 0 : this.legEnds[i - 1];
      reveal = lerp(from, this.legEnds[i], g);
    }
    this.reveal = reveal;
    this.routeAlpha = 1 - smoothstep(FADE_ROUTE.start, FADE_ROUTE.end, t);
    this.routeFlash = bump(t, 14.2, 14.6, 14.8, 15.2);

    const flown = t < FLY.start ? 0 : t < FLY.end ? flightEase((t - FLY.start) / (FLY.end - FLY.start)) : 1;
    this.doneFrac = flown;

    /* ---- drone ---- */
    const heading = this.poseAt(t, this._a);
    this.poseAt(Math.max(0, t - 0.06), this._b);
    const speed = this._a.distanceTo(this._b) / 0.06;
    const d = this.drone;
    d.x = this._a.x;
    d.y = this._a.y;
    d.z = this._a.z;
    d.heading = heading;
    d.speed = speed;
    d.spin = smoothstep(14.7, 15.5, t) * (1 - smoothstep(29.0, 29.6, t));
    d.airborne = t >= 15.0 && t < RETURN.landEnd;

    /* ---- battery: drains only while flying, recharges on the pad ---- */
    let pct;
    let charging = false;
    if (t >= RETURN.landEnd || t < 2.0) {
      const tau = t >= RETURN.landEnd ? t - RETURN.landEnd : t + (CYCLE - RETURN.landEnd);
      pct = lerp(41, 100, smoothstep(0, 2.6, tau));
      charging = true;
    } else if (t < 15.0) {
      pct = 100;
    } else {
      pct = lerp(100, 41, clamp01((t - 15.0) / (RETURN.landEnd - 15.0)));
    }
    this.battery.pct = pct;
    this.battery.charging = charging;

    /* ---- mission-complete indicator and the link between hut and drone ---- */
    this.complete = bump(t, 23.4, 23.9, 26.2, 27.0);
    this.link =
      smoothstep(2.0, 2.6, t) * (1 - smoothstep(14.4, 15.0, t)) * 0.55 +
      smoothstep(14.8, 15.4, t) * (1 - smoothstep(29.0, 29.6, t));
    return this;
  }
}
