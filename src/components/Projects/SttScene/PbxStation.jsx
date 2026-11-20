import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide, Object3D } from "three";
import { LANE_Y, LANE_Z, PBX, HUB, easeOutBack } from "./timeline";

const UNITS = [0.38, 0.85, 1.32];
const LEDS_PER_UNIT = 5;
const LED_COUNT = UNITS.length * LEDS_PER_UNIT;
const AMBER = new Color("#ffb454");
const OFF = new Color("#1a1208");
const tint = new Color();

/**
 * The PBX: the source of the live call. A small telephony rack whose lights
 * flicker with the call, an antenna that throws out signal rings while a call
 * is up, and a port that feeds the raw audio into the bridge.
 */
export const PbxStation = ({ sim }) => {
  const group = useRef();
  const leds = useRef();
  const rings = useRef([]);
  const beacon = useRef();

  const ledMatrices = useMemo(() => {
    const dummy = new Object3D();
    const out = [];
    UNITS.forEach((y) => {
      for (let i = 0; i < LEDS_PER_UNIT; i += 1) {
        dummy.position.set(-0.3 + i * 0.12, y + 0.1, 0.455);
        dummy.updateMatrix();
        out.push(dummy.matrix.clone());
      }
    });
    return out;
  }, []);

  useLayoutEffect(() => {
    ledMatrices.forEach((matrix, i) => {
      leds.current.setMatrixAt(i, matrix);
      leds.current.setColorAt(i, OFF);
    });
    leds.current.instanceMatrix.needsUpdate = true;
    leds.current.instanceColor.needsUpdate = true;
  }, [ledMatrices]);

  useFrame(() => {
    const { time, callOn, level } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.45) / 0.9));

    for (let i = 0; i < LED_COUNT; i += 1) {
      const on = Math.sin(time * (2 + level * 8) + i * 2.1) > 0.2 - callOn * 0.7;
      tint.copy(AMBER).multiplyScalar(on ? 0.25 + callOn * 0.75 : 0.06);
      leds.current.setColorAt(i, tint);
    }
    leds.current.instanceColor.needsUpdate = true;

    beacon.current.material.opacity = 0.4 + callOn * (0.35 + 0.25 * Math.sin(time * 6));
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const p = (time * 0.75 + i / 3) % 1;
      ring.scale.setScalar(0.3 + p * 1.7);
      ring.material.opacity = callOn * (1 - p) * 0.5;
    });
  });

  const portX = PBX.out - PBX.x;
  const rawEnd = HUB.gates[0] - PBX.x; /* raw audio runs as far as the first gate */

  return (
    <group position={[PBX.x, 0, 0]} ref={group}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.16, 2.3]} />
        <meshStandardMaterial color="#101b30" roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[1.82, 0.025, 2.12]} />
        <meshStandardMaterial color="#17253f" roughness={0.5} metalness={0.4} />
      </mesh>

      {UNITS.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.44, 0.9]} />
            <meshStandardMaterial color="#1c2338" roughness={0.45} metalness={0.7} />
          </mesh>
          {[0, 1].map((p) => (
            <mesh key={p} position={[-0.25 + p * 0.5, y - 0.07, 0.455]}>
              <boxGeometry args={[0.4, 0.1, 0.012]} />
              <meshStandardMaterial color="#080c16" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      <instancedMesh ref={leds} args={[null, null, LED_COUNT]}>
        <boxGeometry args={[0.05, 0.05, 0.014]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* antenna and the signal it throws out while a call is up */}
      <mesh position={[0.3, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.02, 0.76, 6]} />
        <meshStandardMaterial color="#9aa2af" metalness={0.7} roughness={0.35} />
      </mesh>
      {[1.75, 2.0].map((y) => (
        <mesh key={y} position={[0.3, y, 0]}>
          <boxGeometry args={[0.34 - (y - 1.75) * 0.5, 0.014, 0.014]} />
          <meshStandardMaterial color="#9aa2af" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      <mesh ref={beacon} position={[0.3, 2.3, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#ffb454" transparent toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(node) => {
            rings.current[i] = node;
          }}
          position={[0.3, 2.3, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.3, 40]} />
          <meshBasicMaterial
            color="#ffb454"
            transparent
            opacity={0}
            side={DoubleSide}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* raw audio leaves through this port and runs to the bridge */}
      <mesh position={[portX - 0.18, LANE_Y, LANE_Z.audio]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.19, 0.21, 0.36, 28]} />
        <meshStandardMaterial color="#3a2f26" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[portX, LANE_Y, LANE_Z.audio]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.2, 0.022, 10, 36]} />
        <meshBasicMaterial color="#ffb454" toneMapped={false} />
      </mesh>
      <mesh position={[(portX + rawEnd) / 2, LANE_Y, LANE_Z.audio]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, rawEnd - portX, 20, 1, true]} />
        <meshBasicMaterial
          color="#ffb454"
          transparent
          opacity={0.09}
          side={DoubleSide}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};
