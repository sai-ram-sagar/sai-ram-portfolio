import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide, Object3D } from "three";
import { getGlowTexture } from "./textures";
import { easeOutBack } from "./timeline";

const UNITS = [0.38, 0.85, 1.32];
const LEDS_PER_UNIT = 6;
const LED_COUNT = UNITS.length * LEDS_PER_UNIT;
const CYAN = new Color("#5cf2ff");
const BLUE = new Color("#3b82ff");
const OFF = new Color("#0a1426");
const tint = new Color();

/**
 * STT server: three rack units whose LEDs and fans respond to the load, with
 * the speech core on top. The core is where audio becomes text, so it is the
 * brightest thing in the scene while audio is being processed.
 */
export const ServerRack = ({ sim }) => {
  const group = useRef();
  const leds = useRef();
  const fans = useRef([]);
  const coreSolid = useRef();
  const coreRingA = useRef();
  const coreRingB = useRef();
  const coreMat = useRef();
  const coreGlow = useRef();
  const coreLight = useRef();
  const portIn = useRef();
  const portOut = useRef();
  const glowMap = getGlowTexture();

  const ledMatrices = useMemo(() => {
    const dummy = new Object3D();
    const out = [];
    UNITS.forEach((y) => {
      for (let i = 0; i < LEDS_PER_UNIT; i += 1) {
        dummy.position.set(-0.52 + i * 0.1, y + 0.1, 0.655);
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

  useFrame((_, delta) => {
    const { time, activity, burst, live } = sim.current;
    const dt = Math.min(delta, 0.05);
    group.current.scale.y = Math.max(0.001, easeOutBack((time - 0.6) / 0.9));

    /* LEDs: calm and sparse at idle, fast and bright under load */
    for (let i = 0; i < LED_COUNT; i += 1) {
      const rate = 1.4 + activity * 9 + (i % 5) * 0.6;
      const on = Math.sin(time * rate + i * 2.31) > 0.1 - activity * 0.9;
      const level = on ? 0.35 + activity * 0.65 : 0.06;
      tint.copy(i % 3 === 0 ? BLUE : CYAN).multiplyScalar(level);
      leds.current.setColorAt(i, tint);
    }
    leds.current.instanceColor.needsUpdate = true;

    fans.current.forEach((fan, i) => {
      if (fan) fan.rotation.x += dt * (1.2 + activity * 16) * (i % 2 ? -1 : 1);
    });

    coreSolid.current.rotation.y += dt * (0.5 + activity * 3.2);
    coreSolid.current.rotation.x += dt * (0.3 + activity * 1.8);
    coreRingA.current.rotation.x += dt * (0.6 + activity * 4);
    coreRingB.current.rotation.z -= dt * (0.8 + activity * 5);
    const pulse = 0.5 + 0.5 * Math.sin(time * (2 + activity * 8));
    coreMat.current.emissiveIntensity = 0.6 + activity * 2.2 + pulse * activity * 1.2 + burst * 1.4;
    const glow = 0.5 + activity * 1.6 + burst * 0.8;
    coreGlow.current.scale.set(glow, glow, 1);
    coreGlow.current.material.opacity = 0.25 + activity * 0.5;
    coreLight.current.intensity = 0.5 + activity * 3.4 + burst * 2;

    /* ports stay lit while the connection is up; the output pulses with each word */
    portIn.current.opacity = 0.2 + live * (0.35 + activity * 0.45);
    portOut.current.opacity = 0.2 + live * 0.4 + Math.min(1, burst) * 0.4;
  });

  return (
    <group position={[4.4, 0, 0]} ref={group}>
      {/* platform */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.16, 2.5]} />
        <meshStandardMaterial color="#101b30" roughness={0.6} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[2.3, 0.025, 2.3]} />
        <meshStandardMaterial color="#17253f" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* rack units */}
      {UNITS.map((y, unit) => (
        <group key={y}>
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.44, 1.3]} />
            <meshStandardMaterial color="#16233f" roughness={0.42} metalness={0.7} />
          </mesh>
          {/* drive bays */}
          {[0, 1, 2].map((bay) => (
            <mesh key={bay} position={[-0.5 + bay * 0.32, y - 0.06, 0.655]}>
              <boxGeometry args={[0.27, 0.12, 0.012]} />
              <meshStandardMaterial color="#070c18" roughness={0.7} metalness={0.4} />
            </mesh>
          ))}
          {/* side fan and vent slats (the face the camera sees) */}
          <mesh position={[0.755, y, -0.28]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.17, 0.018, 8, 28]} />
            <meshStandardMaterial color="#2a3b5e" roughness={0.4} metalness={0.8} />
          </mesh>
          <group
            position={[0.757, y, -0.28]}
            ref={(node) => {
              fans.current[unit] = node;
            }}
          >
            {[0, 1, 2, 3].map((blade) => (
              <mesh key={blade} rotation={[(blade * Math.PI) / 4, 0, 0]}>
                <boxGeometry args={[0.012, 0.3, 0.05]} />
                <meshStandardMaterial color="#4b638f" roughness={0.4} metalness={0.7} />
              </mesh>
            ))}
          </group>
          {[0, 1, 2, 3].map((slat) => (
            <mesh key={slat} position={[0.752, y - 0.1 + slat * 0.065, 0.3]}>
              <boxGeometry args={[0.012, 0.022, 0.5]} />
              <meshStandardMaterial color="#070c18" roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      <instancedMesh ref={leds} args={[null, null, LED_COUNT]}>
        <boxGeometry args={[0.055, 0.055, 0.014]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* speech core */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.56, 0.08, 36]} />
        <meshStandardMaterial color="#202e4a" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.96, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.64, 36, 1, true]} />
        <meshStandardMaterial
          color="#7fdcff"
          transparent
          opacity={0.14}
          roughness={0.1}
          metalness={0.2}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 2.31, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.06, 36]} />
        <meshStandardMaterial color="#202e4a" roughness={0.4} metalness={0.8} />
      </mesh>
      <group position={[0, 1.96, 0]}>
        <mesh ref={coreSolid}>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshStandardMaterial
            ref={coreMat}
            color="#0d2038"
            emissive="#38d6ff"
            emissiveIntensity={1}
            roughness={0.3}
            metalness={0.4}
            flatShading
          />
        </mesh>
        <mesh ref={coreRingA}>
          <torusGeometry args={[0.32, 0.012, 8, 48]} />
          <meshBasicMaterial color="#5cf2ff" toneMapped={false} />
        </mesh>
        <mesh ref={coreRingB} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.01, 8, 48]} />
          <meshBasicMaterial color="#6aa8ff" toneMapped={false} />
        </mesh>
        <sprite ref={coreGlow}>
          <spriteMaterial
            map={glowMap}
            color="#38d6ff"
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        <pointLight ref={coreLight} color="#38c8ff" distance={5.5} decay={1.5} />
      </group>

      {/* intake (audio in, z-) and outlet (transcript out, z+) on the bridge side */}
      {[-0.5, 0.5].map((z) => (
        <group key={z}>
          <mesh position={[-0.93, 1.22, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.19, 0.21, 0.36, 28]} />
            <meshStandardMaterial color="#26375a" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh position={[-1.12, 1.22, z]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.2, 0.022, 10, 36]} />
            <meshBasicMaterial
              ref={z < 0 ? portIn : portOut}
              color={z < 0 ? "#4aa8ff" : "#5cf2ff"}
              transparent
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
