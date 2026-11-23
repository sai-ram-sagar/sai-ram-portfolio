import { useEffect, useMemo, useRef } from "react";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3 } from "three";
import { useOrbit } from "../sceneKit/useOrbit";
import { Bridge } from "./Bridge";
import { NodeHub } from "./NodeHub";
import { PbxStation } from "./PbxStation";
import { PusherLink } from "./PusherLink";
import { phaseAt } from "./phases";
import { ServerRack } from "./ServerRack";
import { Streams } from "./Streams";
import { Workstation } from "./Workstation";
import { createGridTexture, createLabelTexture, createScreen, getGlowTexture } from "./textures";
import {
  CYCLE,
  BRIDGE,
  REDUCED_AT,
  createSample,
  easeOutCubic,
  clamp01,
  lerp,
  sampleInto,
  transcriptKey,
  transcriptSnapshot,
  UI,
  smoothstep,
} from "./timeline";

/**
 * Advances the shared clock. Runs ahead of every other frame callback
 * (negative priority) so all parts read the same instant. Delta is clamped:
 * after the canvas has been paused offscreen the loop resumes where it left
 * off instead of jumping.
 */
const Simulation = ({ sim, screen, reduced, onPhase, onTranscript }) => {
  const lastKey = useRef("");
  const time = useRef(0);
  const lastPhase = useRef(-1);
  useFrame((_, delta) => {
    time.current += Math.min(delta, 0.05);
    sampleInto(sim.current, reduced ? REDUCED_AT + CYCLE : time.current);
    screen.paint(sim.current);

    /* tell the card's transcript window when the words that have arrived change */
    const key = transcriptKey(sim.current.t);
    if (key !== lastKey.current) {
      lastKey.current = key;
      onTranscript?.(transcriptSnapshot(sim.current.t));
    }
    /* report the step only when it changes; before the build ends it is "Speak" */
    const phase = phaseAt(sim.current.t);
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      onPhase?.(phase);
    }
  }, -1);
  return null;
};

/** Slow orbital sway with pointer parallax, fitted to whatever size the card is. */
const Rig = ({ sim, immersive, reduced }) => {
  const { camera, size } = useThree();
  const look = useMemo(() => new Vector3(0, 1.35, 0.1), []);
  const eased = useRef({ x: 0, y: 0 });
  const orbit = useOrbit({ reduced });

  useFrame((state, delta) => {
    const view = orbit(delta);
    const { time } = sim.current;
    eased.current.x += (state.pointer.x - eased.current.x) * 0.04;
    eased.current.y += (state.pointer.y - eased.current.y) * 0.04;

    const intro = easeOutCubic(time / 3.2);
    const fit = Math.min(size.width / (size.width < 420 ? 16.2 : 15.0), size.height / 8.8);
    /* In the full-width showcase the title copy floats over the top-left, so the
       diorama is eased down and to the right, into the clear part of the frame. */
    const framed = immersive && size.width > 760;
    camera.zoom = (framed ? Math.min((size.width * 0.6) / 14.2, size.height / 10.2) : fit) * lerp(0.8, 1, intro);
    if (framed) camera.setViewOffset(size.width, size.height, -size.width * 0.2, size.height * 0.03, size.width, size.height);
    else camera.clearViewOffset();

    /* idle sway and pointer parallax drift around wherever the visitor left the view */
    const azimuth = Math.PI / 4 + view.az + (Math.sin(time * 0.22) * 0.09 + eased.current.x * 0.16) * view.calm;
    const base = Math.atan2(7.6, 12.7);
    const elevation = base + view.el;
    const distance = Math.hypot(12.7, 7.6);
    const horizontal = Math.cos(elevation) * distance;
    camera.position.set(
      Math.sin(azimuth) * horizontal,
      Math.sin(elevation) * distance + eased.current.y * 0.7 * view.calm,
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
    key.current.intensity = 1.9 * smoothstep(0, 1.2, sim.current.time);
  });
  return (
    <>
      <hemisphereLight args={["#6e92d0", "#0a1020", 0.75]} />
      <directionalLight
        ref={key}
        position={[6, 9, 4.5]}
        color="#d4e6ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0006}
        shadow-radius={4}
      />
      <directionalLight position={[-7, 4, -6]} color="#2f6bff" intensity={1.1} />
    </>
  );
};

/** Floor, rim lights and the opening scan sweep. */
const Diorama = ({ sim, grid }) => {
  const group = useRef();
  const scan = useRef();

  useFrame(() => {
    const { time } = sim.current;
    group.current.scale.setScalar(lerp(0.9, 1, easeOutCubic(time / 1.2)));

    const p = clamp01((time - 0.1) / 2.0);
    scan.current.scale.setScalar(0.05 + easeOutCubic(p) * 8.5);
    scan.current.material.opacity = (1 - p) * 0.8 * (time > 0.1 ? 1 : 0);
  });

  return (
    <group ref={group}>
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[13.4, 0.5, 6.2]} />
        <meshStandardMaterial color="#0c1527" roughness={0.8} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.64, 0]} receiveShadow>
        <boxGeometry args={[13.9, 0.28, 6.7]} />
        <meshStandardMaterial color="#070d1a" roughness={0.9} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[13.2, 6]} />
        <meshBasicMaterial map={grid} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* glowing rim */}
      {[
        [0, 3.08, 13.4, 0.05],
        [0, -3.08, 13.4, 0.05],
      ].map(([x, z, w, d]) => (
        <mesh key={z} position={[x, 0.01, z]}>
          <boxGeometry args={[w, 0.02, d]} />
          <meshBasicMaterial color="#2f8cff" toneMapped={false} />
        </mesh>
      ))}
      {[-6.68, 6.68].map((x) => (
        <mesh key={x} position={[x, 0.01, 0]}>
          <boxGeometry args={[0.05, 0.02, 6.2]} />
          <meshBasicMaterial color="#2f8cff" toneMapped={false} />
        </mesh>
      ))}

      {/* corner posts */}
      {[
        [-6.4, -2.8],
        [6.4, -2.8],
        [-6.4, 2.8],
        [6.4, 2.8],
      ].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.32, 10]} />
            <meshStandardMaterial color="#1c2b48" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshBasicMaterial color="#5cf2ff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* scattered components, for scale and density */}
      {[
        [-5.9, 2.4, 0.5, 0.18, 0.4],
        [5.7, 2.3, 0.45, 0.16, 0.4],
        [-3.2, -2.4, 0.55, 0.16, 0.36],
        [1.8, -2.5, 0.42, 0.14, 0.42],
        [-0.6, -2.4, 0.7, 0.1, 0.3],
        [4.8, -2.3, 0.4, 0.12, 0.34],
      ].map(([x, z, w, h, d]) => (
        <mesh key={`${x}${z}`} position={[x, h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#152340" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}

      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.92, 1, 80]} />
        <meshBasicMaterial
          color="#5cf2ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <Labels sim={sim} />
    </group>
  );
};

const LABELS = [
  { title: "PBX", detail: "live call stream", position: [-5.6, 3.0, 0.8], at: 1.2 },
  { title: "NODE.JS BRIDGE", detail: "clean · resample · chunk", position: [-2.2, 3.2, 0.9], at: 1.6 },
  { title: "STT SERVER", detail: "transcribe · translate", position: [4.4, 3.6, 0.2], at: 1.8 },
  { title: "AGENT UI", detail: "live via Pusher", position: [4.4, 0.4, 2.75], at: 1.4 },
];

const Labels = ({ sim }) => {
  const textures = useMemo(
    () => LABELS.map((label) => createLabelTexture(label.title, label.detail)),
    []
  );
  const sprites = useRef([]);

  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures]);

  useFrame(() => {
    const { time } = sim.current;
    LABELS.forEach((label, i) => {
      const sprite = sprites.current[i];
      if (!sprite) return;
      const p = easeOutCubic((time - label.at) / 0.7);
      sprite.material.opacity = p;
      sprite.position.y = label.position[1] - (1 - p) * 0.3;
    });
  });

  return LABELS.map((label, i) => (
    <sprite
      key={label.title}
      position={label.position}
      scale={[2.05, 0.59, 1]}
      ref={(node) => {
        sprites.current[i] = node;
      }}
    >
      <spriteMaterial map={textures[i]} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
  ));
};

/* a few slow motes drifting above the diorama - cheap depth and atmosphere */
const Dust = () => {
  const ref = useRef();
  const glowMap = getGlowTexture();
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const positions = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 1] = 0.4 + Math.random() * 3.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    g.setAttribute("position", new BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state, delta) => {
    ref.current.rotation.y += Math.min(delta, 0.05) * 0.02;
    ref.current.material.size = state.camera.zoom * state.gl.getPixelRatio() * 0.05;
  });
  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={glowMap}
        color="#7fc4ff"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation={false}
        toneMapped={false}
      />
    </points>
  );
};

/**
 * Pins the transcript window to the scene: the monitor screen is projected to
 * screen pixels every frame and handed to the card's CSS, so the window floats
 * with the camera's slow sway instead of sitting at a fixed spot.
 */
const UiAnchor = () => {
  const point = useMemo(() => new Vector3(UI.x - 0.3, 1.25, UI.z - 0.15), []);
  const last = useRef({ x: -1, y: -1, w: -1, h: -1 });
  useFrame((state) => {
    const { camera, size, gl } = state;
    camera.updateMatrixWorld();
    const p = point.clone().project(camera);
    const x = (p.x * 0.5 + 0.5) * size.width;
    const y = (-p.y * 0.5 + 0.5) * size.height;
    const prev = last.current;
    if (Math.abs(x - prev.x) < 0.5 && Math.abs(y - prev.y) < 0.5 && size.width === prev.w && size.height === prev.h) return;
    last.current = { x, y, w: size.width, h: size.height };
    const stage = gl.domElement.closest("[data-stage]");
    if (!stage) return;
    stage.style.setProperty("--ui-x", `${x.toFixed(1)}px`);
    stage.style.setProperty("--ui-y", `${y.toFixed(1)}px`);
    stage.style.setProperty("--stage-w", `${size.width}px`);
    stage.style.setProperty("--stage-h", `${size.height}px`);
  });
  return null;
};

/** In reduced-motion mode the canvas renders on demand, so ask for a few frames up front. */
const StaticFrames = () => {
  useEffect(() => {
    const timers = [0, 120, 400].map((delay) => setTimeout(() => invalidate(), delay));
    return () => timers.forEach(clearTimeout);
  }, []);
  return null;
};

const SttScene = ({ active, reduced, onPhase, onTranscript, lowPower, immersive }) => {
  const sim = useRef(createSample());
  const screen = useMemo(() => createScreen(), []);
  const grid = useMemo(() => createGridTexture(), []);

  useEffect(
    () => () => {
      screen.dispose();
      grid.dispose();
    },
    [screen, grid]
  );

  return (
    <Canvas
      orthographic
      shadows
      dpr={lowPower ? 1 : [1, window.innerWidth < 700 ? 1.25 : 1.5]}
      frameloop={active ? (reduced ? "demand" : "always") : "never"}
      camera={{ position: [9, 7.6, 9], zoom: 30, near: 0.1, far: 60 }}
      gl={{ antialias: !lowPower, alpha: true, powerPreference: lowPower ? "default" : "high-performance" }}
      aria-hidden="true"
    >
      <Simulation sim={sim} screen={screen} reduced={reduced} onPhase={onPhase} onTranscript={onTranscript} />
      <Rig sim={sim} immersive={immersive} reduced={reduced} />
      <Lighting sim={sim} />
      <Diorama sim={sim} grid={grid} />
      <PbxStation sim={sim} />
      <NodeHub sim={sim} />
      <Bridge sim={sim} from={BRIDGE.from} to={BRIDGE.to} frames={BRIDGE.frames} lanes={BRIDGE.lanes} />
      <Workstation sim={sim} screen={screen} />
      <UiAnchor />
      <PusherLink sim={sim} />
      <ServerRack sim={sim} />
      <Streams sim={sim} />
      <Dust />
      {reduced && <StaticFrames />}
    </Canvas>
  );
};

export default SttScene;
