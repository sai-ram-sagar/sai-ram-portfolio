import { useEffect, useMemo, useRef } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3 } from "three";
import { getGlowTexture } from "../sceneKit/glow";
import { easeOutCubic, lerp, smoothstep } from "../sceneKit/math";
import { useOrbit } from "../sceneKit/useOrbit";
import { Terrain } from "../DfrScene/Terrain";
import { TERRAIN } from "../DfrScene/terrain";
import { createTagTexture, tagScale } from "../DfrScene/labels";
import { Link } from "./Link";
import { createCadScreen } from "./screen";
import { CalltakerDesk, Citizen, DispatchCentre, DispatcherConsole, IncidentMarker } from "./Stations";
import { ErssDrone, PoliceCar } from "./Vehicles";
import { CALLTAKER, CITIZEN, CYCLE, DISPATCH, DISPATCHER, INCIDENT, REDUCED_AT, createSample, sampleInto } from "./timeline";

/** Advances the clock ahead of every other frame callback, and reports the current step. */
const Simulation = ({ sim, screen, reduced, onPhase }) => {
  const time = useRef(0);
  const last = useRef(-1);
  useFrame((_, delta) => {
    time.current += Math.min(delta, 0.05);
    sampleInto(sim.current, reduced ? CYCLE + REDUCED_AT : time.current);
    screen.paint(sim.current);
    if (sim.current.phase !== last.current) {
      last.current = sim.current.phase;
      onPhase?.(sim.current.phase);
    }
  }, -1);
  return null;
};

/** Camera: the composed view, plus drag to rotate within sensible limits (see sceneKit/useOrbit). */
const Rig = ({ sim, immersive, reduced }) => {
  const { camera, size } = useThree();
  const look = useMemo(() => new Vector3(0, 0.65, 0.1), []);
  const eased = useRef({ x: 0, y: 0 });
  const orbit = useOrbit({ reduced });

  useFrame((state, delta) => {
    const view = orbit(delta);
    const { time } = sim.current;
    eased.current.x += (state.pointer.x - eased.current.x) * 0.04;
    eased.current.y += (state.pointer.y - eased.current.y) * 0.04;

    const intro = easeOutCubic(time / 3);
    const fit = Math.min(size.width / (size.width < 420 ? 14.8 : 13.6), size.height / 8.8);
    /* in the full-width showcase the copy floats over the top-left, so the city sits right of it */
    const framed = immersive && size.width > 760;
    camera.zoom = (framed ? Math.min((size.width * 0.57) / 13.6, size.height / 10.2) : fit) * lerp(0.82, 1, intro);
    if (framed) camera.setViewOffset(size.width, size.height, -size.width * 0.2, size.height * 0.1, size.width, size.height);
    else camera.clearViewOffset();

    const azimuth = Math.PI / 4 + view.az + (Math.sin(time * 0.2) * 0.08 + eased.current.x * 0.14) * view.calm;
    const base = Math.atan2(7.8, 12.7);
    const elevation = base + view.el;
    const distance = Math.hypot(12.7, 7.8);
    const horizontal = Math.cos(elevation) * distance;
    camera.position.set(
      Math.sin(azimuth) * horizontal,
      Math.sin(elevation) * distance + eased.current.y * 0.6 * view.calm,
      Math.cos(azimuth) * horizontal
    );
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  });
  return null;
};

const Lighting = ({ sim }) => {
  const key = useRef();
  useFrame(() => {
    key.current.intensity = 2.1 * smoothstep(0, 1.2, sim.current.time);
  });
  return (
    <>
      <hemisphereLight args={["#7d9ccc", "#0b1020", 0.8]} />
      <directionalLight
        ref={key}
        position={[6, 9, 5]}
        color="#ffe3c2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
        shadow-radius={4}
      />
      {/* cool fill, with a faint red wash from the incident side */}
      <directionalLight position={[-7, 4, -6]} color="#3f78ff" intensity={0.9} />
      <directionalLight position={[8, 2, -4]} color="#ff4a52" intensity={0.25} />
    </>
  );
};

/** Dark base slab under the cut-away ground, with a thin blue rim. */
const Base = ({ sim }) => {
  const group = useRef();
  useFrame(() => {
    group.current.position.y = lerp(-0.4, 0, easeOutCubic(sim.current.time / 1.2));
  });
  const { w, d } = TERRAIN;
  return (
    <group ref={group}>
      <mesh position={[0, -0.7, 0]} receiveShadow>
        <boxGeometry args={[w + 0.45, 0.22, d + 0.45]} />
        <meshStandardMaterial color="#070d1a" roughness={0.9} metalness={0.2} />
      </mesh>
      {[d / 2 + 0.2, -d / 2 - 0.2].map((z) => (
        <mesh key={z} position={[0, -0.585, z]}>
          <boxGeometry args={[w + 0.45, 0.02, 0.04]} />
          <meshBasicMaterial color="#2f8cff" toneMapped={false} />
        </mesh>
      ))}
      {[-w / 2 - 0.2, w / 2 + 0.2].map((x) => (
        <mesh key={x} position={[x, -0.585, 0]}>
          <boxGeometry args={[0.04, 0.02, d + 0.45]} />
          <meshBasicMaterial color="#2f8cff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

/** Small floating labels: some stay, some appear only while that step is happening. */
const LABELS = [
  { text: "CITIZEN · 112", accent: "#ff5a64", pos: [CITIZEN.x + 0.7, 0.75, CITIZEN.z + 0.5], key: null, at: 1.2 },
  { text: "CALLTAKER · CAD", accent: "#5cf2ff", pos: [CALLTAKER.x + 0.6, 0.95, CALLTAKER.z + 0.55], key: null, at: 1.4 },
  { text: "DISPATCH CENTRE", accent: "#8fb4e8", pos: [DISPATCH.x - 0.35, 1.85, DISPATCH.z + 0.2], key: null, at: 1.6 },
  { text: "DISPATCHER", accent: "#ffcf70", pos: [DISPATCHER.x - 0.75, 0.85, DISPATCHER.z + 0.35], key: null, at: 1.8 },
  { text: "INCOMING 112", accent: "#ff5a64", pos: [CITIZEN.x + 0.2, 2.0, CITIZEN.z + 0.2], key: "tagCall" },
  { text: "INCIDENT LOCATED · GIS", accent: "#ff5a64", pos: [INCIDENT.x, 2.4, INCIDENT.z - 0.2], key: "tagIncident" },
  { text: "UNITS ASSIGNED", accent: "#5cf2ff", pos: [DISPATCH.x + 1.15, 2.45, DISPATCH.z - 0.5], key: "tagAssign" },
  { text: "ON SCENE", accent: "#7dffc4", pos: [INCIDENT.x, 2.75, INCIDENT.z - 0.2], key: "tagScene" },
];

const Labels = ({ sim }) => {
  const textures = useMemo(() => LABELS.map((l) => createTagTexture(l.text, { accent: l.accent })), []);
  const sprites = useRef([]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  useFrame(() => {
    const { time } = sim.current;
    LABELS.forEach((label, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;
      const v = label.key ? sim.current[label.key] : easeOutCubic((time - label.at) / 0.7);
      sprite.visible = v > 0.01;
      sprite.material.opacity = v;
      sprite.position.y = label.pos[1] - (1 - v) * 0.12;
    });
  });
  return LABELS.map((label, i) => (
    <sprite
      key={label.text}
      position={label.pos}
      scale={tagScale(textures[i], 0.24)}
      renderOrder={6}
      visible={false}
      ref={(node) => {
        sprites.current[i] = node;
      }}
    >
      <spriteMaterial map={textures[i]} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
  ));
};

/* ---- link endpoints, as functions of the current sample ---- */
const at = (x, y, z) => (_, out) => out.set(x, y, z);
const CITIZEN_PHONE = at(CITIZEN.x + 0.23, 0.38, CITIZEN.z);
const CALLTAKER_SCREEN = at(CALLTAKER.x, 0.55, CALLTAKER.z);
const DISPATCH_TOP = at(DISPATCH.x + 0.1, 1.1, DISPATCH.z);
const CAR_A = (s, out) => out.set(s.carA.x, 0.3, s.carA.z);
const CAR_B = (s, out) => out.set(s.carB.x, 0.3, s.carB.z);
const DRONE = (s, out) => out.set(s.drone.x, s.drone.y + 0.1, s.drone.z);
const INCIDENT_TOP = at(INCIDENT.x, 0.8, INCIDENT.z);

/** a few slow motes drifting above the city - cheap depth and atmosphere */
const Dust = () => {
  const ref = useRef();
  const glowMap = getGlowTexture();
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const positions = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = 0.6 + Math.random() * 3.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7;
    }
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state, delta) => {
    ref.current.rotation.y += Math.min(delta, 0.05) * 0.015;
    ref.current.material.size = state.camera.zoom * state.gl.getPixelRatio() * 0.045;
  });
  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial map={glowMap} color="#9cc8ff" transparent opacity={0.4} depthWrite={false} blending={AdditiveBlending} sizeAttenuation={false} toneMapped={false} />
    </points>
  );
};

/** In reduced-motion mode the canvas renders on demand, so ask for a few frames up front. */
const StaticFrames = () => {
  useEffect(() => {
    const timers = [0, 150, 500].map((delay) => setTimeout(() => invalidate(), delay));
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
};

const ErssScene = ({ active, reduced, onPhase, lowPower, immersive }) => {
  const sim = useRef(null);
  if (sim.current === null) sim.current = createSample();
  const screen = useMemo(() => createCadScreen(), []);
  useEffect(() => () => screen.dispose(), [screen]);

  return (
    <Canvas
      orthographic
      shadows
      dpr={lowPower ? 1 : [1, window.innerWidth < 700 ? 1.25 : 1.5]}
      frameloop={active ? (reduced ? "demand" : "always") : "never"}
      camera={{ position: [9, 7.8, 9], zoom: 28, near: 0.1, far: 60 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: lowPower ? "default" : "high-performance" }}
      aria-hidden="true"
    >
      <Simulation sim={sim} screen={screen} reduced={reduced} onPhase={onPhase} />
      <Rig sim={sim} immersive={immersive} reduced={reduced} />
      <Lighting sim={sim} />
      <Base sim={sim} />
      <Terrain sim={sim} />

      <Citizen sim={sim} />
      <CalltakerDesk sim={sim} screen={screen} />
      <DispatchCentre sim={sim} />
      <DispatcherConsole sim={sim} />
      <IncidentMarker sim={sim} />
      <PoliceCar sim={sim} car="carA" />
      <PoliceCar sim={sim} car="carB" />
      <ErssDrone sim={sim} />

      {/* real-time synchronisation: voice in, incident out, orders to the field */}
      <Link sim={sim} start={CITIZEN_PHONE} end={CALLTAKER_SCREEN} active="voice" color="#ff6a74" lift={1.3} count={11} />
      <Link sim={sim} start={CALLTAKER_SCREEN} end={DISPATCH_TOP} active="sync" color="#5cf2ff" lift={0.5} count={6} speed={0.6} />
      <Link sim={sim} start={DISPATCH_TOP} end={CAR_A} active="assignA" color="#7aa8ff" lift={0.9} count={8} />
      <Link sim={sim} start={DISPATCH_TOP} end={CAR_B} active="assignB" color="#7aa8ff" lift={1.1} count={8} />
      <Link sim={sim} start={DISPATCH_TOP} end={DRONE} active="assignDrone" color="#9b8cff" lift={0.7} count={8} />
      <Link sim={sim} start={CALLTAKER_SCREEN} end={INCIDENT_TOP} active="sync" color="#ff8a7a" lift={1.6} count={7} speed={0.35} />

      <Labels sim={sim} />
      <Dust />
      {reduced && <StaticFrames />}
    </Canvas>
  );
};

export default ErssScene;
