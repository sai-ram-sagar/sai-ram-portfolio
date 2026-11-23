import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import { easeOutBack } from "../sceneKit/math";
import { createPadTexture } from "../DfrScene/labels";
import { CALLTAKER, CITIZEN, DISPATCH, DISPATCHER, INCIDENT } from "./timeline";

const NAVY = "#202e4a";
const SKIN = "#d9b99b";

/** A tiny seated or standing person: body, head, and an optional headset. */
const Person = ({ color, scale = 1, headset = false, y = 0 }) => (
  <group scale={scale} position={[0, y, 0]}>
    <mesh position={[0, 0.12, 0]} castShadow>
      <capsuleGeometry args={[0.05, 0.1, 4, 8]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.27, 0]} castShadow>
      <sphereGeometry args={[0.045, 10, 10]} />
      <meshStandardMaterial color={SKIN} roughness={0.8} />
    </mesh>
    {headset && (
      <mesh position={[0, 0.285, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.05, 0.008, 6, 14, Math.PI]} />
        <meshStandardMaterial color="#10141c" />
      </mesh>
    )}
  </group>
);

/** The citizen dialling 112 at the scene of the emergency. */
export const Citizen = ({ sim }) => {
  const rings = useRef([]);
  const phone = useRef();
  const body = useRef();
  useFrame(() => {
    const { time, ringing, voice, incident, citizenVis } = sim.current;
    body.current.scale.setScalar(1.4 * Math.max(0.001, citizenVis));
    body.current.visible = citizenVis > 0.01;
    const live = Math.max(ringing, voice) * (citizenVis > 0.5 ? 1 : 0);
    phone.current.material.emissiveIntensity = 0.4 + live * 2.4 + 0.6 * Math.sin(time * 14) * ringing;
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const p = (time * 0.8 + i / 3) % 1;
      ring.scale.setScalar(0.3 + p * 1.3);
      ring.material.opacity = live * (1 - p) * 0.6 * (1 - incident * 0.3);
    });
  });
  return (
    <group position={[CITIZEN.x + 0.2, 0.05, CITIZEN.z]} ref={body}>
      <Person color="#c0463c" />
      {/* phone raised to the ear */}
      <mesh ref={phone} position={[0.05, 0.27, 0.04]} castShadow>
        <boxGeometry args={[0.025, 0.06, 0.012]} />
        <meshStandardMaterial color="#10141c" emissive="#ff5a64" emissiveIntensity={0.4} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(node) => {
            rings.current[i] = node;
          }}
          position={[0.05, 0.3, 0.04]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.3, 0.33, 40]} />
          <meshBasicMaterial
            color="#ff5a64"
            transparent
            opacity={0}
            side={DoubleSide}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
};

/** The calltaker's workstation: desk, chair, operator, and the live CAD screen. */
export const CalltakerDesk = ({ sim, screen }) => {
  const group = useRef();
  const glow = useRef();
  useFrame(() => {
    const { time, calltakerBusy, ringing } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.5) / 0.8));
    glow.current.intensity = 0.4 + calltakerBusy * 1.2 + ringing * 1.2;
  });
  return (
    <group position={[CALLTAKER.x, 0.035, CALLTAKER.z]} rotation={[0, Math.PI / 4, 0]} ref={group}>
      <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.04, 0.34]} />
        <meshStandardMaterial color="#27344d" roughness={0.5} metalness={0.5} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.085, 0]} castShadow>
          <boxGeometry args={[0.04, 0.17, 0.3]} />
          <meshStandardMaterial color={NAVY} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* monitor */}
      <mesh position={[0, 0.215, -0.02]}>
        <boxGeometry args={[0.1, 0.05, 0.06]} />
        <meshStandardMaterial color={NAVY} />
      </mesh>
      <mesh position={[0, 0.4, -0.04]} castShadow>
        <boxGeometry args={[0.52, 0.34, 0.03]} />
        <meshStandardMaterial color="#141f36" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, -0.022]}>
        <planeGeometry args={[0.47, 0.294]} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>
      <pointLight ref={glow} position={[0, 0.45, 0.25]} color="#6fd2ff" distance={1.6} decay={1.6} />
      {/* operator and chair */}
      <mesh position={[0, 0.1, 0.34]} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.2]} />
        <meshStandardMaterial color="#10141c" />
      </mesh>
      <group position={[0, 0.06, 0.34]} rotation={[0, Math.PI, 0]}>
        <Person color="#3f78ff" headset scale={0.9} />
      </group>
    </group>
  );
};

/** The control room: a glass-fronted operations building where 112 calls are taken and units dispatched. */
export const DispatchCentre = ({ sim }) => {
  const group = useRef();
  const windows = useRef();
  const dish = useRef();
  const beacon = useRef();
  useFrame((_, delta) => {
    const { time, dispatchBusy } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.65) / 0.9));
    windows.current.material.emissiveIntensity = 0.5 + dispatchBusy * 1.6;
    dish.current.rotation.y += Math.min(delta, 0.05) * (0.4 + dispatchBusy * 1.2);
    beacon.current.material.opacity = 0.4 + dispatchBusy * (0.4 + 0.2 * Math.sin(time * 6));
  });
  return (
    <group position={[DISPATCH.x, 0.035, DISPATCH.z]} ref={group}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.15, 0.8, 0.95]} />
        <meshStandardMaterial color="#aab2bf" roughness={0.65} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.84, 0]} castShadow>
        <boxGeometry args={[1.22, 0.07, 1.02]} />
        <meshStandardMaterial color="#4b5566" roughness={0.7} />
      </mesh>
      {/* glass front with a lit operations floor behind it */}
      <mesh ref={windows} position={[0.2, 0.42, 0.485]}>
        <boxGeometry args={[0.72, 0.4, 0.01]} />
        <meshStandardMaterial color="#10202f" emissive="#3aa8d8" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0.5, 0.42, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.01]} />
        <meshStandardMaterial color="#10202f" emissive="#3aa8d8" emissiveIntensity={0.8} roughness={0.3} />
      </mesh>
      {/* antenna and dish */}
      <mesh position={[-0.42, 1.2, -0.3]} castShadow>
        <cylinderGeometry args={[0.014, 0.02, 0.62, 6]} />
        <meshStandardMaterial color="#9aa2af" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh ref={beacon} position={[-0.42, 1.52, -0.3]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ff5a64" transparent toneMapped={false} />
      </mesh>
      <group position={[0.4, 0.88, -0.3]} ref={dish}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.014, 0.02, 0.12, 6]} />
          <meshStandardMaterial color="#9aa2af" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.16, 0.04]} rotation={[-0.9, 0, 0]} castShadow>
          <sphereGeometry args={[0.13, 18, 10, 0, Math.PI * 2, 0, 1.05]} />
          <meshStandardMaterial color="#d7dbe2" roughness={0.45} metalness={0.4} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

/** The dispatcher at a console, coordinating field units. */
export const DispatcherConsole = ({ sim }) => {
  const group = useRef();
  const screens = useRef([]);
  useFrame(() => {
    const { time, dispatchBusy } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.8) / 0.8));
    screens.current.forEach((screen, i) => {
      if (screen) screen.material.emissiveIntensity = 0.5 + dispatchBusy * (0.9 + 0.4 * Math.sin(time * 5 + i * 2));
    });
  });
  return (
    <group position={[DISPATCHER.x, 0.035, DISPATCHER.z]} rotation={[0, Math.PI / 4, 0]} ref={group}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.66, 0.04, 0.3]} />
        <meshStandardMaterial color="#27344d" roughness={0.5} metalness={0.5} />
      </mesh>
      {[-0.27, 0.27].map((x) => (
        <mesh key={x} position={[x, 0.075, 0]}>
          <boxGeometry args={[0.04, 0.15, 0.26]} />
          <meshStandardMaterial color={NAVY} />
        </mesh>
      ))}
      {[-0.17, 0.17].map((x, i) => (
        <mesh
          key={x}
          ref={(node) => {
            screens.current[i] = node;
          }}
          position={[x, 0.32, -0.04]}
          castShadow
        >
          <boxGeometry args={[0.28, 0.2, 0.025]} />
          <meshStandardMaterial color="#0c1a2c" emissive="#ff7a5a" emissiveIntensity={0.5} roughness={0.3} />
        </mesh>
      ))}
      <group position={[0, 0.04, 0.32]} rotation={[0, Math.PI, 0]}>
        <Person color="#e0a43a" headset scale={0.9} />
      </group>
    </group>
  );
};

/** The incident on the map: a red pin that pulses, with GIS rings on the ground; green once resolved. */
export const IncidentMarker = ({ sim }) => {
  const group = useRef();
  const beam = useRef();
  const head = useRef();
  const rings = useRef([]);
  const gis = useRef();
  useFrame(() => {
    const { time, incident, resolved, ping } = sim.current;
    const k = Math.max(0.001, incident);
    group.current.visible = incident > 0.01;
    group.current.scale.set(1, k, 1);
    const hue = resolved;
    const r = 1 - hue * 0.7;
    const g = 0.28 + hue * 0.72;
    const b = 0.3 + hue * 0.2;
    beam.current.material.color.setRGB(r, g, b);
    head.current.material.color.setRGB(r, g, b);
    head.current.rotation.y = time * 1.6;
    head.current.position.y = 1.62 + 0.04 * Math.sin(time * 4);
    gis.current.scale.setScalar(0.2 + ping * 1.5);
    gis.current.material.opacity = (1 - ping) * 0.8 * incident;
    gis.current.material.color.setRGB(r, g, b);
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const p = (time * 0.7 + i / 2) % 1;
      ring.scale.setScalar(0.4 + p * 1.1);
      ring.material.opacity = (1 - p) * 0.5 * incident;
      ring.material.color.setRGB(r, g, b);
    });
  });
  return (
    <group position={[INCIDENT.x, 0.06, INCIDENT.z]} ref={group} visible={false}>
      <mesh ref={beam} position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 1.6, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>
      <mesh ref={head} position={[0, 1.62, 0]}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(node) => {
            rings.current[i] = node;
          }}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.4, 0.44, 40]} />
          <meshBasicMaterial transparent opacity={0} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
      {/* the GIS location ping: a crisp ring that sweeps outward */}
      <mesh ref={gis} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.5, 6]} />
        <meshBasicMaterial transparent opacity={0} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
};

/**
 * A police station: a low station house with garage bays, a rotating beacon and
 * a parking apron in front. Station 1 (the near one) also carries the drone's
 * pad on its roof and its beacon speeds up while its units are out.
 */
export const PoliceStation = ({ sim, at, pad = false, active = false }) => {
  const group = useRef();
  const beacon = useRef();
  const lamp = useRef();
  const padTexture = useMemo(() => createPadTexture(), []);
  useEffect(() => () => padTexture.dispose(), [padTexture]);
  useFrame((_, delta) => {
    const { time, t } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.7) / 0.9));
    const out = active && t > 14.0 && t < 33.8;
    beacon.current.rotation.y += Math.min(delta, 0.05) * (out ? 6 : 1.2);
    lamp.current.material.opacity = out ? 0.5 + 0.3 * Math.sin(time * 9) : 0.35;
  });
  return (
    <group position={[at.x, 0.035, at.z]} ref={group}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.8, 0.85]} />
        <meshStandardMaterial color="#9fb0c8" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.84, 0]} castShadow>
        <boxGeometry args={[1.58, 0.07, 0.93]} />
        <meshStandardMaterial color="#1f3f86" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7, 0.432]}>
        <boxGeometry args={[1.52, 0.1, 0.012]} />
        <meshStandardMaterial color="#1f3f86" roughness={0.6} />
      </mesh>
      {[-0.42, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.22, 0.432]}>
          <boxGeometry args={[0.46, 0.4, 0.012]} />
          <meshStandardMaterial color="#0b1220" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0.56, 0.24, 0.432]}>
        <boxGeometry args={[0.22, 0.44, 0.012]} />
        <meshStandardMaterial color="#10202f" emissive="#3aa8d8" emissiveIntensity={0.8} />
      </mesh>
      {pad && (
        <mesh position={[-0.2, 0.879, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.34, 36]} />
          <meshStandardMaterial map={padTexture} roughness={0.8} />
        </mesh>
      )}
      <mesh position={[0.55, 0.98, -0.2]}>
        <cylinderGeometry args={[0.012, 0.018, 0.2, 6]} />
        <meshStandardMaterial color="#9aa2af" metalness={0.7} />
      </mesh>
      <group position={[0.55, 1.1, -0.2]} ref={beacon}>
        <mesh>
          <boxGeometry args={[0.1, 0.05, 0.05]} />
          <meshStandardMaterial color="#10141c" />
        </mesh>
        <mesh position={[0.05, 0, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#ff2a38" toneMapped={false} />
        </mesh>
        <mesh position={[-0.05, 0, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#2a6cff" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={lamp} position={[0.55, 1.1, -0.2]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color="#8fb4ff" transparent opacity={0.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.003, 0.8]} receiveShadow>
        <boxGeometry args={[1.9, 0.012, 0.55]} />
        <meshStandardMaterial color="#262b35" roughness={0.9} />
      </mesh>
    </group>
  );
};

/**
 * A hospital: a pale multi-storey block with a red cross, an ambulance bay on
 * the front and a parking apron. Hospital 1 (the near one) glows green when the
 * patient is admitted.
 */
export const Hospital = ({ sim, at, active = false }) => {
  const group = useRef();
  const cross = useRef();
  const halo = useRef();
  useFrame(() => {
    const { time, admit } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.75) / 0.9));
    cross.current.material.emissiveIntensity = 0.6 + 0.3 * Math.sin(time * 2.4) + (active ? admit * 1.6 : 0);
    halo.current.material.opacity = active ? admit * 0.7 : 0;
    halo.current.scale.setScalar(0.6 + admit * 0.6);
  });
  return (
    <group position={[at.x, 0.035, at.z]} ref={group}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.0, 0.85]} />
        <meshStandardMaterial color="#e6eaf0" roughness={0.6} metalness={0.05} />
      </mesh>
      <mesh position={[0.5, 0.75, -0.1]} castShadow>
        <boxGeometry args={[0.5, 1.5, 0.6]} />
        <meshStandardMaterial color="#d9dee6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[1.56, 0.06, 0.9]} />
        <meshStandardMaterial color="#8c97aa" roughness={0.7} />
      </mesh>
      {/* rows of windows on the front */}
      {[0.3, 0.62, 0.9].map((y) => (
        <mesh key={y} position={[-0.2, y, 0.432]}>
          <boxGeometry args={[1.0, 0.1, 0.012]} />
          <meshStandardMaterial color="#10202f" emissive="#3aa8d8" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* ambulance bay */}
      <mesh position={[0.5, 0.17, 0.432]}>
        <boxGeometry args={[0.36, 0.3, 0.012]} />
        <meshStandardMaterial color="#0b1220" roughness={0.8} />
      </mesh>
      {/* the red cross, up on the tower */}
      <mesh ref={cross} position={[0.5, 1.3, 0.202]}>
        <boxGeometry args={[0.3, 0.09, 0.012]} />
        <meshStandardMaterial color="#d8242e" emissive="#ff3a3a" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.5, 1.3, 0.202]}>
        <boxGeometry args={[0.09, 0.3, 0.012]} />
        <meshStandardMaterial color="#d8242e" emissive="#ff3a3a" emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={halo} position={[0.5, 0.02, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.56, 40]} />
        <meshBasicMaterial color="#7dffc4" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.003, 0.8]} receiveShadow>
        <boxGeometry args={[1.9, 0.012, 0.55]} />
        <meshStandardMaterial color="#262b35" roughness={0.9} />
      </mesh>
    </group>
  );
};
