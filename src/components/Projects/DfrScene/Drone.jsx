import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide } from "three";
import { createBatteryPainter } from "./labels";

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/* motor positions: an X-frame quadcopter */
const MOTORS = [
  { x: 0.34, z: 0.34, dir: 1 },
  { x: -0.34, z: 0.34, dir: -1 },
  { x: 0.34, z: -0.34, dir: -1 },
  { x: -0.34, z: -0.34, dir: 1 },
];

const BODY = "#2c3340";
const ARM = "#3a4252";
const DARK = "#12161e";

/**
 * Enterprise quadcopter. The outer group follows the mission path; the inner
 * group leans into acceleration and turns, the way a real airframe does.
 */
export const Drone = ({ mission }) => {
  const outer = useRef();
  const inner = useRef();
  const props = useRef([]);
  const discs = useRef([]);
  const state = useRef({ yaw: null, rate: 0, pitch: 0, roll: 0 });
  const battery = useMemo(() => createBatteryPainter(), []);

  useEffect(() => () => battery.dispose(), [battery]);

  useFrame((_, delta) => {
    const m = mission.current;
    const d = m.drone;
    const s = state.current;
    const dt = Math.min(Math.max(delta, 1e-3), 0.05);

    const bob = d.airborne ? 0.018 * Math.sin(m.time * 2.6) : 0;
    outer.current.position.set(d.x, d.y + bob, d.z);

    /* heading eases towards the path direction instead of snapping */
    const previous = s.yaw ?? d.heading;
    const next = previous + wrapAngle(d.heading - previous) * Math.min(1, dt * 4.5);
    s.yaw = next;
    const rate = wrapAngle(next - previous) / dt;
    s.rate += (rate - s.rate) * Math.min(1, dt * 5);
    s.pitch += (clamp(d.speed * 0.14, 0, 0.26) - s.pitch) * Math.min(1, dt * 4);
    s.roll += (clamp(-s.rate * 0.14, -0.28, 0.28) - s.roll) * Math.min(1, dt * 5);

    outer.current.rotation.y = next;
    inner.current.rotation.x = s.pitch;
    inner.current.rotation.z = s.roll;

    props.current.forEach((prop, i) => {
      if (prop) prop.rotation.y += dt * d.spin * 55 * MOTORS[i].dir;
    });
    discs.current.forEach((disc) => {
      if (disc) disc.material.opacity = d.spin * 0.16;
    });

    battery.paint(m.battery.pct, m.battery.charging);
  });

  return (
    <group ref={outer}>
      <group scale={1.55}>
      <group ref={inner}>
        {/* fuselage */}
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.1, 0.46]} />
          <meshStandardMaterial color={BODY} roughness={0.45} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.07, -0.02]} castShadow>
          <boxGeometry args={[0.24, 0.06, 0.34]} />
          <meshStandardMaterial color="#e6e9ee" roughness={0.4} metalness={0.2} />
        </mesh>
        {/* accent band */}
        <mesh position={[0, 0.0, 0.232]}>
          <boxGeometry args={[0.2, 0.025, 0.004]} />
          <meshBasicMaterial color="#5cf2ff" toneMapped={false} />
        </mesh>
        {/* GPS mast */}
        <mesh position={[0, 0.14, -0.14]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 6]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        <mesh position={[0, 0.195, -0.14]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.014, 16]} />
          <meshStandardMaterial color="#cfd5df" roughness={0.4} />
        </mesh>
        {/* gimbal camera */}
        <mesh position={[0, -0.085, 0.16]} castShadow>
          <sphereGeometry args={[0.058, 14, 10]} />
          <meshStandardMaterial color={DARK} roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.085, 0.215]}>
          <circleGeometry args={[0.022, 12]} />
          <meshBasicMaterial color="#6fd2ff" toneMapped={false} />
        </mesh>

        {/* arms, motors and rotors */}
        {MOTORS.map((motor, i) => {
          const angle = Math.atan2(motor.x, motor.z);
          const len = Math.hypot(motor.x, motor.z);
          return (
            <group key={i}>
              <mesh position={[motor.x / 2, 0.01, motor.z / 2]} rotation={[0, angle, 0]} castShadow>
                <boxGeometry args={[0.055, 0.04, len]} />
                <meshStandardMaterial color={ARM} roughness={0.5} metalness={0.5} />
              </mesh>
              <mesh position={[motor.x, 0.045, motor.z]} castShadow>
                <cylinderGeometry args={[0.052, 0.058, 0.07, 16]} />
                <meshStandardMaterial color={DARK} roughness={0.4} metalness={0.7} />
              </mesh>
              {/* landing leg */}
              <mesh position={[motor.x * 0.8, -0.075, motor.z * 0.8]} castShadow>
                <cylinderGeometry args={[0.01, 0.014, 0.17, 6]} />
                <meshStandardMaterial color={DARK} roughness={0.6} />
              </mesh>
              <group
                position={[motor.x, 0.092, motor.z]}
                ref={(node) => {
                  props.current[i] = node;
                }}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.46, 0.006, 0.038]} />
                  <meshStandardMaterial color="#1a1f2a" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.006, 0]}>
                  <cylinderGeometry args={[0.014, 0.014, 0.014, 8]} />
                  <meshStandardMaterial color="#aab3c2" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>
              <mesh
                ref={(node) => {
                  discs.current[i] = node;
                }}
                position={[motor.x, 0.096, motor.z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <circleGeometry args={[0.235, 28]} />
                <meshBasicMaterial color="#cfe6f7" transparent opacity={0} side={DoubleSide} depthWrite={false} toneMapped={false} />
              </mesh>
              {/* navigation lights: white at the nose, red at the tail */}
              <mesh position={[motor.x, 0.02, motor.z + (motor.z > 0 ? 0.04 : -0.04)]}>
                <sphereGeometry args={[0.014, 8, 8]} />
                <meshBasicMaterial color={motor.z > 0 ? "#e8f6ff" : "#ff6b6b"} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      </group>
      </group>

      {/* battery readout - a reminder that every mission is bounded by endurance */}
      <sprite position={[0, 0.82, 0]} scale={[1.1, 0.359, 1]} renderOrder={5}>
        <spriteMaterial map={battery.texture} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
};
