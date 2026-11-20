import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import { UI, easeOutBack } from "./timeline";

const KEY_COLS = 11;
const KEY_ROWS = 3;

/**
 * Agent UI: a miniature workstation. Its screen shows the live transcript and
 * translation as they arrive over Pusher.
 */
export const Workstation = ({ sim, screen }) => {
  const group = useRef();
  const screenGlow = useRef();
  const keys = useRef();

  const keyMatrices = useMemo(() => {
    const dummy = new Object3D();
    const out = [];
    for (let row = 0; row < KEY_ROWS; row += 1) {
      for (let col = 0; col < KEY_COLS; col += 1) {
        dummy.position.set(0.66 + row * 0.1, 0.225, -0.42 + col * 0.084);
        dummy.updateMatrix();
        out.push(dummy.matrix.clone());
      }
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    keyMatrices.forEach((matrix, i) => keys.current.setMatrixAt(i, matrix));
    keys.current.instanceMatrix.needsUpdate = true;
  }, [keyMatrices]);

  useFrame(() => {
    const { time, arrive } = sim.current;
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.35) / 0.9));
    screenGlow.current.intensity = 0.7 + arrive * 1.6;
  });

  return (
    <group position={[UI.x, 0, UI.z]} ref={group}>
      {/* platform */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.16, 1.9]} />
        <meshStandardMaterial color="#101b30" roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[1.92, 0.025, 1.72]} />
        <meshStandardMaterial color="#17253f" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* the desk set is angled a little towards the viewer so the screen reads */}
      <group rotation={[0, -0.42, 0]}>
        {/* monitor */}
        <mesh position={[-0.35, 0.2, 0]} castShadow>
          <boxGeometry args={[0.55, 0.05, 0.6]} />
          <meshStandardMaterial color="#202e4a" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[-0.38, 0.45, 0]} castShadow>
          <boxGeometry args={[0.1, 0.5, 0.16]} />
          <meshStandardMaterial color="#202e4a" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[-0.46, 1.22, 0]} castShadow>
          <boxGeometry args={[0.1, 0.92, 1.56]} />
          <meshStandardMaterial color="#141f36" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[-0.35, 1.22, 0]} castShadow>
          <boxGeometry args={[0.07, 1.12, 1.82]} />
          <meshStandardMaterial color="#1b2a47" roughness={0.35} metalness={0.7} />
        </mesh>
        <mesh position={[-0.312, 1.22, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.66, 0.97]} />
          <meshBasicMaterial map={screen.texture} toneMapped={false} />
        </mesh>
        {/* power LED on the bezel */}
        <mesh position={[-0.312, 0.695, 0.78]}>
          <boxGeometry args={[0.01, 0.02, 0.06]} />
          <meshBasicMaterial color="#5cf2ff" toneMapped={false} />
        </mesh>
        <pointLight ref={screenGlow} position={[0.3, 1.2, 0]} color="#6fd2ff" distance={4.2} decay={1.6} />

        {/* keyboard and mouse */}
        <mesh position={[0.78, 0.2, -0.08]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 0.04, 1.02]} />
          <meshStandardMaterial color="#1b2a47" roughness={0.45} metalness={0.5} />
        </mesh>
        <instancedMesh ref={keys} args={[null, null, KEY_COLS * KEY_ROWS]}>
          <boxGeometry args={[0.07, 0.02, 0.064]} />
          <meshStandardMaterial color="#3a5278" roughness={0.5} metalness={0.3} />
        </instancedMesh>
        <mesh position={[0.82, 0.2, 0.86]} castShadow>
          <boxGeometry args={[0.14, 0.035, 0.09]} />
          <meshStandardMaterial color="#1b2a47" roughness={0.45} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
};
