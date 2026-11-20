import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide } from "three";
import { AUDIO, HUB, LANE_Y, LANE_Z, PBX, clamp01, levelAt } from "./timeline";

const DECK_TOP = 0.66;
const FRAME_H = 1.72;

/* the three things the Node.js bridge does to the audio, in order */
const STAGES = [
  { x: HUB.gates[0], color: "#5cf2c0" }, /* noise cancelling */
  { x: HUB.gates[1], color: "#6aa8ff" }, /* resample to the model's rate */
  { x: HUB.gates[2], color: "#5cf2ff" }, /* cut into 200 ms chunks */
];

/**
 * The Node.js bridge's processing, drawn on the bridge itself: the first three
 * pillars along the bridge are its gates, each filled with a faint coloured
 * field that brightens as speech passes through. Above the middle gate sits
 * the Node.js mark, and at the end of the stretch a ring marks where
 * transcripts leave for Pusher.
 */
export const NodeHub = ({ sim }) => {
  const panels = useRef([]);
  const hex = useRef();
  const stem = useRef();
  const pusherRing = useRef();
  const stageColors = useMemo(() => STAGES.map((stage) => new Color(stage.color)), []);

  useFrame((_, delta) => {
    const { burst, live, bridgeClock, callOn, t } = sim.current;
    const built = clamp01((bridgeClock - 3.2) / 1.0);

    /* each gate pulses with the speech that is passing through it right now */
    STAGES.forEach((stage, i) => {
      const panel = panels.current[i];
      if (!panel) return;
      const passing = levelAt(t - (stage.x - PBX.out) / AUDIO.speed) * callOn;
      panel.visible = built > 0.01;
      panel.material.opacity = built * (0.05 + live * 0.05 + passing * 0.3);
      panel.material.color.copy(stageColors[i]);
    });

    hex.current.visible = built > 0.01;
    hex.current.scale.setScalar(built);
    stem.current.visible = built > 0.01;
    hex.current.rotation.y += Math.min(delta, 0.05) * (0.5 + callOn * 1.5);
    pusherRing.current.visible = built > 0.01;
    pusherRing.current.material.opacity = built * (0.25 + live * 0.25 + Math.min(1, burst) * 0.5);
  });

  return (
    <group>
      {STAGES.map((stage, i) => (
        <mesh
          key={stage.x}
          ref={(node) => {
            panels.current[i] = node;
          }}
          position={[stage.x, DECK_TOP + FRAME_H / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          visible={false}
        >
          <planeGeometry args={[1.8, FRAME_H - 0.12]} />
          <meshBasicMaterial
            color={stage.color}
            transparent
            opacity={0}
            side={DoubleSide}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* the Node.js mark above the middle gate */}
      <mesh ref={stem} position={[HUB.gates[1], DECK_TOP + FRAME_H + 0.2, 0]} visible={false}>
        <cylinderGeometry args={[0.03, 0.03, 0.28, 6]} />
        <meshStandardMaterial color="#26375a" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh ref={hex} position={[HUB.gates[1], DECK_TOP + FRAME_H + 0.5, 0]} castShadow visible={false}>
        <cylinderGeometry args={[0.3, 0.3, 0.1, 6]} />
        <meshStandardMaterial color="#12301c" emissive="#6cc24a" emissiveIntensity={1.3} roughness={0.4} />
      </mesh>

      {/* where transcripts leave the bridge for Pusher */}
      <mesh ref={pusherRing} position={[HUB.outX, LANE_Y, LANE_Z.data]} rotation={[0, Math.PI / 2, 0]} visible={false}>
        <torusGeometry args={[0.2, 0.022, 10, 36]} />
        <meshBasicMaterial color="#9b8cff" transparent toneMapped={false} />
      </mesh>
    </group>
  );
};
