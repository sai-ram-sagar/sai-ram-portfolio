import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3 } from "three";
import { getGlowTexture } from "../sceneKit/glow";

const SEGMENTS = 220; /* rings along the route */
const SIDES = 6; /* corners around each ring */
const RADIUS = 0.034;
const HALO_RADIUS = 0.085;
const TRAIL = 36;

/* planned stretch is a cooler, dimmer blue; flown stretch is bright mint */
const PLANNED = [0.17, 0.58, 0.82];
const FLOWN = [0.6, 1.0, 0.86];

const makeTube = () => {
  const geometry = new BufferGeometry();
  const ringCount = SEGMENTS + 1;
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(ringCount * SIDES * 3), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(ringCount * SIDES * 3), 3));

  const index = [];
  for (let k = 0; k < SEGMENTS; k += 1) {
    for (let j = 0; j < SIDES; j += 1) {
      const a = k * SIDES + j;
      const b = k * SIDES + ((j + 1) % SIDES);
      const c = (k + 1) * SIDES + ((j + 1) % SIDES);
      const d = (k + 1) * SIDES + j;
      index.push(a, b, c, a, c, d);
    }
  }
  geometry.setIndex(index);
  geometry.boundingSphere = null;
  return geometry;
};

/**
 * The flight route: a smooth 3D tube that is drawn leg by leg while the
 * operator plans, follows a waypoint as it is dragged, and changes colour
 * behind the drone so planned and flown sections are easy to tell apart.
 */
export const Route = ({ mission }) => {
  const tube = useRef();
  const halo = useRef();
  const trail = useRef();
  const trailMat = useRef();
  const glowMap = getGlowTexture();

  const core = useMemo(makeTube, []);
  const glow = useMemo(makeTube, []);
  const trailGeometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.boundingSphere = null;
    return g;
  }, []);

  const scratch = useMemo(
    () => ({
      p: new Vector3(),
      t: new Vector3(),
      side: new Vector3(),
      n: new Vector3(),
      up: new Vector3(0, 1, 0),
      version: -1,
      doneIndex: -1,
    }),
    []
  );

  useEffect(
    () => () => {
      core.dispose();
      glow.dispose();
      trailGeometry.dispose();
    },
    [core, glow, trailGeometry]
  );

  const rebuild = (curve) => {
    const { p, t, side, n, up } = scratch;
    const cp = core.attributes.position.array;
    const gp = glow.attributes.position.array;
    for (let k = 0; k <= SEGMENTS; k += 1) {
      const u = k / SEGMENTS;
      curve.getPointAt(u, p);
      curve.getTangentAt(u, t);
      side.crossVectors(t, up);
      if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
      side.normalize();
      n.crossVectors(side, t).normalize();
      for (let j = 0; j < SIDES; j += 1) {
        const a = (j / SIDES) * Math.PI * 2;
        const cx = Math.cos(a);
        const sy = Math.sin(a);
        const o = (k * SIDES + j) * 3;
        cp[o] = p.x + (side.x * cx + n.x * sy) * RADIUS;
        cp[o + 1] = p.y + (side.y * cx + n.y * sy) * RADIUS;
        cp[o + 2] = p.z + (side.z * cx + n.z * sy) * RADIUS;
        gp[o] = p.x + (side.x * cx + n.x * sy) * HALO_RADIUS;
        gp[o + 1] = p.y + (side.y * cx + n.y * sy) * HALO_RADIUS;
        gp[o + 2] = p.z + (side.z * cx + n.z * sy) * HALO_RADIUS;
      }
    }
    core.attributes.position.needsUpdate = true;
    glow.attributes.position.needsUpdate = true;
  };

  const paintRings = (from, to, flownUpTo) => {
    const colors = core.attributes.color.array;
    for (let k = from; k <= to; k += 1) {
      const c = k <= flownUpTo ? FLOWN : PLANNED;
      for (let j = 0; j < SIDES; j += 1) {
        const o = (k * SIDES + j) * 3;
        colors[o] = c[0];
        colors[o + 1] = c[1];
        colors[o + 2] = c[2];
      }
    }
    core.attributes.color.needsUpdate = true;
  };

  useFrame((state) => {
    const m = mission.current;

    if (scratch.version !== m.routeVersion) {
      rebuild(m.curve);
      scratch.version = m.routeVersion;
    }

    /* reveal: only the rings up to the current progress are drawn */
    const rings = Math.floor(m.reveal * SEGMENTS);
    const count = rings * SIDES * 6;
    core.setDrawRange(0, count);
    glow.setDrawRange(0, count);

    /* recolour rings the drone has passed (a backwards step means the loop wrapped) */
    const flown = Math.floor(m.doneFrac * SEGMENTS);
    if (flown < scratch.doneIndex || scratch.doneIndex < 0) {
      paintRings(0, SEGMENTS, flown);
      scratch.doneIndex = flown;
    } else if (flown > scratch.doneIndex) {
      paintRings(scratch.doneIndex, flown, flown);
      scratch.doneIndex = flown;
    }

    const visible = m.routeAlpha > 0.01 && count > 0;
    tube.current.visible = visible;
    halo.current.visible = visible;
    tube.current.material.opacity = m.routeAlpha;
    halo.current.material.opacity = m.routeAlpha * (0.14 + m.routeFlash * 0.4);

    /* trail: a short comet of light behind the drone, stateless along the curve */
    const px = state.camera.zoom * state.gl.getPixelRatio() * 0.1;
    trailMat.current.size = px;
    const tp = trailGeometry.attributes.position.array;
    const tc = trailGeometry.attributes.color.array;
    const flying = m.doneFrac > 0 && m.doneFrac < 1 && m.t < 23.5;
    for (let j = 0; j < TRAIL; j += 1) {
      const o = j * 3;
      const u = m.doneFrac - j * 0.0042;
      if (!flying || u < 0) {
        tc[o] = tc[o + 1] = tc[o + 2] = 0;
        continue;
      }
      m.curve.getPointAt(u, scratch.p);
      tp[o] = scratch.p.x;
      tp[o + 1] = scratch.p.y;
      tp[o + 2] = scratch.p.z;
      const fade = (1 - j / TRAIL) ** 2;
      tc[o] = 0.55 * fade;
      tc[o + 1] = 1.0 * fade;
      tc[o + 2] = 0.9 * fade;
    }
    trailGeometry.attributes.position.needsUpdate = true;
    trailGeometry.attributes.color.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={tube} geometry={core} frustumCulled={false}>
        <meshBasicMaterial vertexColors transparent toneMapped={false} />
      </mesh>
      <mesh ref={halo} geometry={glow} frustumCulled={false}>
        <meshBasicMaterial
          color="#38d6ff"
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <points ref={trail} geometry={trailGeometry} frustumCulled={false}>
        <pointsMaterial
          ref={trailMat}
          map={glowMap}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          sizeAttenuation={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
};
