import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import { easeOutBack, smoothstep } from "../sceneKit/math";
import { createPadTexture, createTagTexture, tagScale } from "./labels";
import { HUB, PAD } from "./terrain";


/** The launch pad, with a ring that pulses while the mission initialises and while the battery charges. */
export const LaunchPad = ({ mission }) => {
  const ring = useRef();
  const padTexture = useMemo(() => createPadTexture(), []);
  useEffect(() => () => padTexture.dispose(), [padTexture]);

  useFrame(() => {
    const m = mission.current;
    const init = smoothstep(0.1, 0.6, m.t) * (1 - smoothstep(1.5, 2.4, m.t));
    const charge = m.battery.charging ? 0.5 + 0.5 * Math.sin(m.time * 4) : 0;
    ring.current.material.opacity = 0.25 + init * 0.55 + charge * 0.25;
    ring.current.scale.setScalar(1 + init * 0.12);
  });

  return (
    <group position={[PAD.x, 0, PAD.z]}>
      <mesh position={[0, 0.045, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.52, 0.56, 0.05, 40]} />
        <meshStandardMaterial color="#2a313d" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.0715, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 40]} />
        <meshStandardMaterial map={padTexture} roughness={0.8} />
      </mesh>
      <mesh ref={ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.56, 48]} />
        <meshBasicMaterial
          color="#5cf2ff"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

/** The mission start: a slim beam up from the pad to the launch point, with its label. */
export const HomePin = ({ mission }) => {
  const group = useRef();
  const tag = useMemo(() => createTagTexture("HOME", { accent: "#5cf2ff" }), []);
  useEffect(() => () => tag.dispose(), [tag]);

  useFrame(() => {
    const rise = easeOutBack((mission.current.time - 0.4) / 0.9);
    group.current.scale.set(1, Math.max(0.001, rise), 1);
  });

  return (
    <group position={[PAD.x, 0.07, PAD.z]} ref={group}>
      <mesh position={[0, 0.465, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.93, 6]} />
        <meshBasicMaterial color="#5cf2ff" transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.93, 0]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshBasicMaterial color="#5cf2ff" toneMapped={false} />
      </mesh>
      <sprite position={[0, 1.62, 0]} scale={tagScale(tag, 0.3)}>
        <spriteMaterial map={tag} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
};

/**
 * The mission-control hut. Its dish slowly tracks the drone and a faint link
 * pulses from the mast whenever the route is being uploaded or flown.
 */
export const MissionControl = ({ mission }) => {
  const dish = useRef();
  const beacon = useRef();
  const rings = useRef([]);
  const screen = useRef();
  const yaw = useRef(0);
  const tag = useMemo(() => createTagTexture("CONTROL", { accent: "#8fb4e8" }), []);
  useEffect(() => () => tag.dispose(), [tag]);

  useFrame((_, delta) => {
    const m = mission.current;
    const dt = Math.min(delta, 0.05);
    const target = Math.atan2(m.drone.x - HUB.x, m.drone.z - HUB.z);
    let diff = target - yaw.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    yaw.current += diff * Math.min(1, dt * 2.5);
    dish.current.rotation.y = yaw.current;

    beacon.current.material.opacity = 0.35 + m.link * (0.4 + 0.25 * Math.sin(m.time * 6));
    screen.current.material.emissiveIntensity = 0.5 + m.link * 0.9;

    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const p = (m.time * 0.8 + i / 3) % 1;
      ring.scale.setScalar(0.3 + p * 1.6);
      ring.material.opacity = m.link * (1 - p) * 0.4;
    });
  });

  return (
    <group position={[HUB.x, 0.035, HUB.z]} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.32, 0.5]} />
        <meshStandardMaterial color="#c4c0b6" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.335, 0]} castShadow>
        <boxGeometry args={[0.78, 0.03, 0.56]} />
        <meshStandardMaterial color="#555b66" roughness={0.8} />
      </mesh>
      <mesh ref={screen} position={[0, 0.17, 0.253]}>
        <boxGeometry args={[0.5, 0.12, 0.01]} />
        <meshStandardMaterial color="#10202f" emissive="#3aa8d8" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      {/* dish on the roof */}
      <group position={[-0.18, 0.35, 0]} ref={dish}>
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.018, 0.026, 0.1, 8]} />
          <meshStandardMaterial color="#8c93a0" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.14, 0.03]} rotation={[-0.9, 0, 0]} castShadow>
          <sphereGeometry args={[0.14, 20, 10, 0, Math.PI * 2, 0, 1.05]} />
          <meshStandardMaterial color="#d7dbe2" roughness={0.45} metalness={0.4} side={DoubleSide} />
        </mesh>
      </group>
      {/* mast, beacon and the faint link rings */}
      <mesh position={[0.24, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, 0.44, 6]} />
        <meshStandardMaterial color="#9aa2af" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh ref={beacon} position={[0.24, 0.79, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#5cf2ff" transparent toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(node) => {
            rings.current[i] = node;
          }}
          position={[0.24, 0.79, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.3, 40]} />
          <meshBasicMaterial
            color="#5cf2ff"
            transparent
            opacity={0}
            side={DoubleSide}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <sprite position={[0.1, 1.2, 0]} scale={tagScale(tag, 0.3)}>
        <spriteMaterial map={tag} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
};

