import { useEffect, useMemo, useRef } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3 } from "three";
import { getGlowTexture } from "../sceneKit/glow";
import { useOrbit } from "../sceneKit/useOrbit";
import { easeOutCubic, lerp, smoothstep } from "../sceneKit/math";
import { Drone } from "./Drone";
import { LaunchPad, HomePin, MissionControl } from "./MissionControl";
import { CYCLE, Mission, REDUCED_AT } from "./mission";
import { Route } from "./Route";
import { Terrain } from "./Terrain";
import { TERRAIN } from "./terrain";
import { Waypoints } from "./Waypoints";

/**
 * Advances the mission clock ahead of every other frame callback. Delta is
 * clamped so a scene paused offscreen resumes where it left off, and the
 * current step is reported upward only when it changes.
 */
const Simulation = ({ mission, reduced, onPhase }) => {
  const time = useRef(0);
  const lastPhase = useRef(-1);
  useFrame((_, delta) => {
    time.current += Math.min(delta, 0.05);
    /* a still frame mid-flight: past the opening, so every intro has played */
    const now = reduced ? CYCLE + REDUCED_AT : time.current;
    const m = mission.current.update(now);
    if (m.phase !== lastPhase.current) {
      lastPhase.current = m.phase;
      onPhase?.(m.phase);
    }
  }, -1);
  return null;
};

/** Slow orbital sway with pointer parallax, fitted to the card. */
const Rig = ({ mission, immersive, reduced }) => {
  const { camera, size } = useThree();
  const look = useMemo(() => new Vector3(0, 0.65, 0.1), []);
  const eased = useRef({ x: 0, y: 0 });
  const orbit = useOrbit({ reduced });

  useFrame((state, delta) => {
    const view = orbit(delta);
    const { time } = mission.current;
    eased.current.x += (state.pointer.x - eased.current.x) * 0.04;
    eased.current.y += (state.pointer.y - eased.current.y) * 0.04;

    const intro = easeOutCubic(time / 3);
    const fit = Math.min(size.width / (size.width < 420 ? 14.8 : 13.6), size.height / 8.8);
    /* In the full-width showcase the title copy floats over the top-left, so the
       diorama is eased down and to the right, into the clear part of the frame. */
    const framed = immersive && size.width > 760;
    camera.zoom = (framed ? Math.min((size.width * 0.57) / 13.6, size.height / 10.2) : fit) * lerp(0.82, 1, intro);
    if (framed) camera.setViewOffset(size.width, size.height, -size.width * 0.2, size.height * 0.1, size.width, size.height);
    else camera.clearViewOffset();

    /* idle sway and pointer parallax drift around wherever the visitor left the view */
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

const Lighting = ({ mission }) => {
  const key = useRef();
  useFrame(() => {
    key.current.intensity = 2.3 * smoothstep(0, 1.2, mission.current.time);
  });
  return (
    <>
      <hemisphereLight args={["#7d9ccc", "#0b1020", 0.85]} />
      {/* a warm low sun against cool fill: natural colours, blue shadows */}
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
      <directionalLight position={[-7, 4, -6]} color="#3f78ff" intensity={0.9} />
    </>
  );
};

/** Dark navy base slab under the cut-away ground, with a thin cyan rim. */
const Base = ({ mission }) => {
  const group = useRef();
  useFrame(() => {
    const p = easeOutCubic(mission.current.time / 1.2);
    group.current.position.y = lerp(-0.4, 0, p);
  });
  const { w, d } = TERRAIN;
  return (
    <group ref={group}>
      <mesh position={[0, -0.7, 0]} receiveShadow>
        <boxGeometry args={[w + 0.45, 0.22, d + 0.45]} />
        <meshStandardMaterial color="#070d1a" roughness={0.9} metalness={0.2} />
      </mesh>
      {[
        [0, d / 2 + 0.2, w + 0.45, 0.04],
        [0, -d / 2 - 0.2, w + 0.45, 0.04],
      ].map(([x, z, ww, dd]) => (
        <mesh key={z} position={[x, -0.585, z]}>
          <boxGeometry args={[ww, 0.02, dd]} />
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

/* a few slow motes drifting above the miniature - cheap depth and atmosphere */
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
      <pointsMaterial
        map={glowMap}
        color="#9cc8ff"
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation={false}
        toneMapped={false}
      />
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

const DfrScene = ({ active, reduced, onPhase, lowPower, immersive }) => {
  const mission = useRef(null);
  if (mission.current === null) mission.current = new Mission();

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
      <Simulation mission={mission} reduced={reduced} onPhase={onPhase} />
      <Rig mission={mission} immersive={immersive} reduced={reduced} />
      <Lighting mission={mission} />
      <Base mission={mission} />
      <Terrain sim={mission} />
      <LaunchPad mission={mission} />
      <HomePin mission={mission} />
      <MissionControl mission={mission} />
      <Route mission={mission} />
      <Waypoints mission={mission} />
      <Drone mission={mission} />
      <Dust />
      {reduced && <StaticFrames />}
    </Canvas>
  );
};

export default DfrScene;
