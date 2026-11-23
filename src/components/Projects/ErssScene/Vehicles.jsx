import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import { getGlowTexture } from "../sceneKit/glow";

const WHEELS = [
  [-0.085, 0.045, 0.11],
  [0.085, 0.045, 0.11],
  [-0.085, 0.045, -0.11],
  [0.085, 0.045, -0.11],
];

/**
 * A police patrol car. It follows the state it is given (`car` is a key of the
 * sample, or `fixed` for one that just sits parked), and its light bar flashes
 * red and blue while it is out. The car is modelled facing +z.
 */
export const PoliceCar = ({ sim, car, fixed }) => {
  const group = useRef();
  const red = useRef();
  const blue = useRef();
  const glowR = useRef();
  const glowB = useRef();
  const glowMap = getGlowTexture();
  useFrame(() => {
    const { time } = sim.current;
    const state = fixed ?? sim.current[car];
    group.current.position.set(state.x, 0.05, state.z);
    group.current.rotation.y = state.heading;
    const flash = Math.floor(time * 6) % 2;
    const r = state.lights * (flash ? 1 : 0.15);
    const b = state.lights * (flash ? 0.15 : 1);
    red.current.material.emissiveIntensity = 0.3 + r * 3;
    blue.current.material.emissiveIntensity = 0.3 + b * 3;
    glowR.current.material.opacity = r * 0.8;
    glowB.current.material.opacity = b * 0.8;
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0.085, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.07, 0.36]} />
        <meshStandardMaterial color="#e6e9ee" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.185, 0.034, 0.37]} />
        <meshStandardMaterial color="#1b3a7a" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.145, -0.01]} castShadow>
        <boxGeometry args={[0.15, 0.06, 0.19]} />
        <meshStandardMaterial color="#1a2438" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh ref={red} position={[-0.04, 0.188, -0.01]}>
        <boxGeometry args={[0.07, 0.02, 0.04]} />
        <meshStandardMaterial color="#400a0e" emissive="#ff2a38" emissiveIntensity={0.3} />
      </mesh>
      <mesh ref={blue} position={[0.04, 0.188, -0.01]}>
        <boxGeometry args={[0.07, 0.02, 0.04]} />
        <meshStandardMaterial color="#0a1a40" emissive="#2a6cff" emissiveIntensity={0.3} />
      </mesh>
      <sprite ref={glowR} position={[-0.05, 0.2, -0.01]} scale={[0.34, 0.34, 1]}>
        <spriteMaterial map={glowMap} color="#ff2a38" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={glowB} position={[0.05, 0.2, -0.01]} scale={[0.34, 0.34, 1]}>
        <spriteMaterial map={glowMap} color="#2a6cff" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} position={[x, 0.09, 0.182]}>
          <boxGeometry args={[0.04, 0.02, 0.006]} />
          <meshBasicMaterial color="#fff6d8" toneMapped={false} />
        </mesh>
      ))}
      {WHEELS.map((w) => (
        <mesh key={w.join()} position={w} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#0c0f16" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

/** An ambulance: white body with a red stripe and cross, and a flashing light bar while it is out. */
export const Ambulance = ({ sim, car, fixed }) => {
  const group = useRef();
  const bar = useRef();
  const glow = useRef();
  const glowMap = getGlowTexture();
  useFrame(() => {
    const { time } = sim.current;
    const state = fixed ?? sim.current[car];
    group.current.position.set(state.x, 0.05, state.z);
    group.current.rotation.y = state.heading;
    const flash = Math.floor(time * 5) % 2;
    const on = state.lights * (flash ? 1 : 0.2);
    bar.current.material.emissiveIntensity = 0.3 + on * 3;
    glow.current.material.opacity = on * 0.8;
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0.115, -0.03]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.13, 0.36]} />
        <meshStandardMaterial color="#f2f4f7" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.095, 0.17]} castShadow>
        <boxGeometry args={[0.2, 0.09, 0.1]} />
        <meshStandardMaterial color="#e4e8ee" roughness={0.45} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.12, 0.222]}>
        <boxGeometry args={[0.16, 0.04, 0.006]} />
        <meshStandardMaterial color="#10202f" roughness={0.3} />
      </mesh>
      {/* red stripe along both sides */}
      {[-0.101, 0.101].map((x) => (
        <mesh key={x} position={[x, 0.085, -0.03]}>
          <boxGeometry args={[0.004, 0.03, 0.34]} />
          <meshStandardMaterial color="#d8242e" />
        </mesh>
      ))}
      {/* red cross on the roof */}
      <mesh position={[0, 0.183, -0.03]}>
        <boxGeometry args={[0.1, 0.004, 0.026]} />
        <meshStandardMaterial color="#d8242e" emissive="#d8242e" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.183, -0.03]}>
        <boxGeometry args={[0.026, 0.004, 0.1]} />
        <meshStandardMaterial color="#d8242e" emissive="#d8242e" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={bar} position={[0, 0.2, 0.12]}>
        <boxGeometry args={[0.12, 0.02, 0.04]} />
        <meshStandardMaterial color="#40100e" emissive="#ff3a3a" emissiveIntensity={0.3} />
      </mesh>
      <sprite ref={glow} position={[0, 0.21, 0.12]} scale={[0.4, 0.4, 1]}>
        <spriteMaterial map={glowMap} color="#ff4a4a" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </sprite>
      {WHEELS.map(([x, y, z]) => (
        <mesh key={`${x}${z}`} position={[x * 1.1, y, z * 1.25]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#0c0f16" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

/** The DFR drone: a small quadcopter that lifts off the dispatch centre's roof, flies the route and loiters over the incident. */
export const ErssDrone = ({ sim }) => {
  const group = useRef();
  const props = useRef([]);
  const beam = useRef();
  useFrame((_, delta) => {
    const { drone } = sim.current;
    group.current.position.set(drone.x, drone.y, drone.z);
    group.current.rotation.y = drone.heading;
    props.current.forEach((prop, i) => {
      if (prop) prop.rotation.y += Math.min(delta, 0.05) * drone.spin * 55 * (i % 2 ? -1 : 1);
    });
    beam.current.visible = drone.beam > 0.01;
    beam.current.material.opacity = drone.beam * 0.22;
  });
  const MOTORS = [
    [0.17, 0.17],
    [-0.17, 0.17],
    [0.17, -0.17],
    [-0.17, -0.17],
  ];
  return (
    <group ref={group}>
      <group scale={1.1}>
        <mesh castShadow>
          <boxGeometry args={[0.16, 0.05, 0.24]} />
          <meshStandardMaterial color="#2c3340" roughness={0.45} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.04, -0.01]}>
          <boxGeometry args={[0.12, 0.03, 0.17]} />
          <meshStandardMaterial color="#e6e9ee" roughness={0.4} />
        </mesh>
        {MOTORS.map(([x, z], i) => (
          <group key={i}>
            <mesh position={[x / 2, 0.005, z / 2]} rotation={[0, Math.atan2(x, z), 0]}>
              <boxGeometry args={[0.03, 0.02, Math.hypot(x, z)]} />
              <meshStandardMaterial color="#3a4252" metalness={0.5} />
            </mesh>
            <group
              position={[x, 0.04, z]}
              ref={(node) => {
                props.current[i] = node;
              }}
            >
              <mesh>
                <boxGeometry args={[0.24, 0.004, 0.02]} />
                <meshStandardMaterial color="#1a1f2a" />
              </mesh>
            </group>
            <mesh position={[x, 0.02, z + (z > 0 ? 0.03 : -0.03)]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshBasicMaterial color={z > 0 ? "#e8f6ff" : "#ff5a64"} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* the drone's searchlight, once it is over the incident */}
      <mesh ref={beam} position={[0, -0.65, 0]} visible={false}>
        <coneGeometry args={[0.42, 1.3, 24, 1, true]} />
        <meshBasicMaterial color="#cfe6ff" transparent opacity={0} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
};
