import { useEffect, useMemo, useRef } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3 } from "three";
import { getGlowTexture } from "../sceneKit/glow";
import { easeOutCubic, lerp, smoothstep } from "../sceneKit/math";
import { useOrbit } from "../sceneKit/useOrbit";
import { City } from "./City";
import { TERRAIN } from "./city";
import { createTagTexture, tagScale } from "../DfrScene/labels";
import { Link } from "./Link";
import { createCadScreen } from "./screen";
import { CalltakerDesk, Citizen, DispatchCentre, DispatcherConsole, Hospital, IncidentMarker, PoliceStation } from "./Stations";
import { Ambulance, ErssDrone, PoliceCar } from "./Vehicles";
import {
  CALLTAKER,
  CITIZEN,
  CYCLE,
  DISPATCH,
  HOSPITAL_1,
  HOSPITAL_2,
  INCIDENT,
  POLICE_1,
  POLICE_2,
  REDUCED_AT,
  createSample,
  sampleInto,
} from "./timeline";

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
    const fit = Math.min(size.width / (size.width < 420 ? 19.6 : 18.0), size.height / 11.6);
    /* in the full-width showcase the copy floats over the top-left, so the city sits right of it */
    const framed = immersive && size.width > 760;
    camera.zoom = (framed ? Math.min((size.width * 0.58) / 18.0, size.height / 12.6) : fit) * lerp(0.82, 1, intro);
    if (framed) camera.setViewOffset(size.width, size.height, -size.width * 0.235, size.height * 0.1, size.width, size.height);
    else camera.clearViewOffset();

    const azimuth = Math.PI / 4 + view.az + (Math.sin(time * 0.2) * 0.08 + eased.current.x * 0.14) * view.calm;
    const base = Math.atan2(9.4, 12.2); /* a higher, more aerial view than the other scenes */
    const elevation = base + view.el;
    const distance = Math.hypot(12.2, 9.4);
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
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={34}
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
  /* always there */
  { text: "CONTROL ROOM", accent: "#8fb4e8", pos: [DISPATCH.x - 0.3, 1.8, DISPATCH.z + 0.2], key: null, at: 1.6 },
  { text: "CALLTAKER · CAD", accent: "#5cf2ff", pos: [CALLTAKER.x + 0.6, 0.95, CALLTAKER.z + 0.55], key: null, at: 1.4 },
  { text: "POLICE STATION 1", accent: "#7aa8ff", pos: [POLICE_1.x, 1.55, POLICE_1.z], key: null, at: 2.0 },
  { text: "POLICE STATION 2", accent: "#7aa8ff", pos: [POLICE_2.x + 0.2, 1.65, POLICE_2.z + 0.1], key: null, at: 2.2 },
  { text: "HOSPITAL 1", accent: "#ff6a74", pos: [HOSPITAL_1.x, 1.85, HOSPITAL_1.z + 0.3], key: null, at: 2.4 },
  { text: "HOSPITAL 2", accent: "#ff6a74", pos: [HOSPITAL_2.x, 1.55, HOSPITAL_2.z + 0.4], key: null, at: 2.6 },
  /* the call: they trade four short lines */
  { text: "INCOMING 112", accent: "#ff5a64", pos: [CITIZEN.x + 0.2, 2.1, CITIZEN.z + 0.2], key: "tagCall" },
  { text: "112 · WHAT'S YOUR EMERGENCY?", accent: "#5cf2ff", pos: [CALLTAKER.x + 0.9, 1.45, CALLTAKER.z + 0.1], key: "q1" },
  { text: "ACCIDENT NEAR MG ROAD!", accent: "#ff5a64", pos: [CITIZEN.x + 0.2, 2.1, CITIZEN.z + 0.2], key: "q2" },
  { text: "IS ANYONE INJURED?", accent: "#5cf2ff", pos: [CALLTAKER.x + 0.9, 1.45, CALLTAKER.z + 0.1], key: "q3" },
  { text: "YES · NEED AN AMBULANCE", accent: "#ff5a64", pos: [CITIZEN.x + 0.2, 2.1, CITIZEN.z + 0.2], key: "q4" },
  { text: "INCIDENT LOCATED · GIS", accent: "#ff5a64", pos: [INCIDENT.x, 2.75, INCIDENT.z - 0.2], key: "tagLoc" },
  /* matching: the nearest police station and hospital are picked */
  { text: "NEAREST · 2.2 KM", accent: "#7dffc4", pos: [POLICE_1.x, 2.0, POLICE_1.z], key: "tagP1" },
  { text: "3.4 KM", accent: "#8a95aa", pos: [POLICE_2.x + 0.2, 2.1, POLICE_2.z + 0.1], key: "tagP2" },
  { text: "MEDICAL NEEDED", accent: "#ff5a64", pos: [DISPATCH.x + 0.5, 2.45, DISPATCH.z], key: "tagMedic" },
  { text: "NEAREST · 2.7 KM", accent: "#7dffc4", pos: [HOSPITAL_1.x, 2.3, HOSPITAL_1.z + 0.3], key: "tagH1" },
  { text: "4.2 KM", accent: "#8a95aa", pos: [HOSPITAL_2.x, 2.0, HOSPITAL_2.z + 0.4], key: "tagH2" },
  /* response */
  { text: "ON SCENE", accent: "#7dffc4", pos: [INCIDENT.x, 3.05, INCIDENT.z - 0.2], key: "tagScene" },
  { text: "PATIENT ON BOARD", accent: "#ffcf70", pos: [INCIDENT.x + 0.5, 2.1, INCIDENT.z + 0.1], key: "tagBoard" },
  { text: "PATIENT ADMITTED", accent: "#7dffc4", pos: [HOSPITAL_1.x + 0.5, 2.6, HOSPITAL_1.z + 0.3], key: "tagAdmit" },
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
      scale={tagScale(textures[i], 0.32)}
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
const CONTROL_TOP = at(DISPATCH.x + 0.1, 1.1, DISPATCH.z);
const POLICE_1_TOP = at(POLICE_1.x, 1.2, POLICE_1.z);
const POLICE_2_TOP = at(POLICE_2.x, 1.2, POLICE_2.z);
const HOSPITAL_1_TOP = at(HOSPITAL_1.x + 0.3, 1.3, HOSPITAL_1.z);
const HOSPITAL_2_TOP = at(HOSPITAL_2.x + 0.3, 1.3, HOSPITAL_2.z);
const CAR_A = (s, out) => out.set(s.carA.x, 0.3, s.carA.z);
const CAR_B = (s, out) => out.set(s.carB.x, 0.3, s.carB.z);
const AMBULANCE = (s, out) => out.set(s.amb.x, 0.32, s.amb.z);
const DRONE = (s, out) => out.set(s.drone.x, s.drone.y + 0.1, s.drone.z);
const INCIDENT_TOP = at(INCIDENT.x, 1.0, INCIDENT.z);

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
      <City sim={sim} />

      <Citizen sim={sim} />
      <CalltakerDesk sim={sim} screen={screen} />
      <DispatchCentre sim={sim} />
      <DispatcherConsole sim={sim} />
      <PoliceStation sim={sim} at={POLICE_1} pad active />
      <PoliceStation sim={sim} at={POLICE_2} />
      <Hospital sim={sim} at={HOSPITAL_1} active />
      <Hospital sim={sim} at={HOSPITAL_2} />
      <IncidentMarker sim={sim} />

      {/* station 1's two cars and hospital 1's ambulance work the incident; station 2 and hospital 2 stay parked */}
      <PoliceCar sim={sim} car="carA" />
      <PoliceCar sim={sim} car="carB" />
      <PoliceCar sim={sim} car="far1" />
      <PoliceCar sim={sim} car="far2" />
      <Ambulance sim={sim} car="amb" />
      <Ambulance sim={sim} car="ambFar" />
      <ErssDrone sim={sim} />

      {/* the call, both ways: the citizen talks, the calltaker answers */}
      <Link sim={sim} start={CITIZEN_PHONE} end={CALLTAKER_SCREEN} active="voice" color="#ff6a74" lift={1.3} count={9} />
      <Link sim={sim} start={CALLTAKER_SCREEN} end={CITIZEN_PHONE} active="voice" color="#5cf2ff" lift={1.9} count={9} speed={0.5} />
      {/* the incident reaches the control room */}
      <Link sim={sim} start={CALLTAKER_SCREEN} end={CONTROL_TOP} active="sync" color="#5cf2ff" lift={0.5} count={6} speed={0.6} />
      <Link sim={sim} start={CALLTAKER_SCREEN} end={INCIDENT_TOP} active="sync" color="#ff8a7a" lift={1.6} count={7} speed={0.35} />
      {/* matching: both police stations and both hospitals are checked, the nearest wins */}
      <Link sim={sim} start={CONTROL_TOP} end={POLICE_1_TOP} active="candP1" color="#7dffc4" lift={1.4} count={8} />
      <Link sim={sim} start={CONTROL_TOP} end={POLICE_2_TOP} active="candP2" color="#7a869c" lift={2.0} count={5} />
      <Link sim={sim} start={CONTROL_TOP} end={HOSPITAL_1_TOP} active="candH1" color="#7dffc4" lift={1.0} count={8} />
      <Link sim={sim} start={CONTROL_TOP} end={HOSPITAL_2_TOP} active="candH2" color="#7a869c" lift={0.8} count={5} />
      {/* orders to the chosen units */}
      <Link sim={sim} start={CONTROL_TOP} end={CAR_A} active="assignA" color="#7aa8ff" lift={1.6} count={8} />
      <Link sim={sim} start={CONTROL_TOP} end={CAR_B} active="assignB" color="#7aa8ff" lift={2.0} count={8} />
      <Link sim={sim} start={CONTROL_TOP} end={DRONE} active="assignDrone" color="#9b8cff" lift={1.2} count={8} />
      <Link sim={sim} start={CONTROL_TOP} end={AMBULANCE} active="assignAmb" color="#ff8a7a" lift={1.2} count={8} />

      <Labels sim={sim} />
      <Dust />
      {reduced && <StaticFrames />}
    </Canvas>
  );
};

export default ErssScene;
