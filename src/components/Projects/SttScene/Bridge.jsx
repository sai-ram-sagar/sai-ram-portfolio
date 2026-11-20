import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, CatmullRomCurve3, DoubleSide, Object3D, TubeGeometry, Vector3 } from "three";
import { createLaneTag, getGlowTexture } from "./textures";
import { LANE_Y, LANE_Z, clamp01, easeOutBack, easeOutCubic, lerp } from "./timeline";

const PLANKS = 22;
const PLANK_X0 = -2.7;
const PLANK_STEP = 5.4 / (PLANKS - 1);
const DECK_Y = 0.62;
const PIERS = 7;
const FRAME_H = 1.72;

const progress = (time, start, duration) => clamp01((time - start) / duration);

/**
 * The one bridge from the PBX to the STT server. It carries the audio lane the
 * whole way, passes through the Node.js bridge's processing gates (the first
 * pillars along it), and carries the transcript lane on the last stretch to
 * the STT server. It is assembled once when the call connects, stays powered
 * for the whole call - every light on, whatever is or is not being sent - and
 * is only switched off and taken apart after the call ends.
 *
 * `bridgeClock` runs forward while connecting and back down while closing, so
 * taking the bridge apart is the build played in reverse.
 *
 * It is modelled 6.1 long and stretched along x to span `from` .. `to`;
 * `frames` and `lanes` are given in world x and converted here.
 */
export const Bridge = ({ sim, from, to, frames: frameXs, lanes: laneSpecs }) => {
  const k = (to - from) / 6.1;
  const center = (to + from) / 2;
  const local = useCallback((x) => (x - center) / k, [center, k]);

  const planks = useRef();
  const piers = useRef([]);
  const frames = useRef([]);
  const lanes = useRef([]);
  const cableA = useRef();
  const cableB = useRef();
  const spark = useRef();
  const tags = useRef([]);
  const status = useRef([]);
  const lastClock = useRef(-1);
  const glows = useRef([]);
  const glowMap = getGlowTexture();
  const dummy = useMemo(() => new Object3D(), []);

  const frameLocal = useMemo(() => frameXs.map(local), [frameXs, local]);
  const pierLocal = useMemo(
    () => Array.from({ length: PIERS }, (_, i) => -2.55 + (i * 5.1) / (PIERS - 1)),
    []
  );

  /* anything that glows registers here and is dimmed or lit with the bridge's power */
  const glow = useCallback((node) => {
    if (!node || glows.current.some((entry) => entry.material === node.material)) return;
    glows.current.push({
      material: node.material,
      color: node.material.color.clone(),
      opacity: node.material.opacity,
    });
  }, []);

  /* suspension cables rise over every frame and sag between them */
  const cableGeometry = useMemo(() => {
    const top = FRAME_H + DECK_Y;
    const points = [[-3.05, 0.72]];
    let previous = -3.05;
    frameLocal.forEach((x) => {
      points.push([(previous + x) / 2, 1.95], [x, top]);
      previous = x;
    });
    points.push([(previous + 3.05) / 2, 1.95], [3.05, 0.72]);
    const curve = new CatmullRomCurve3(points.map(([x, y]) => new Vector3(x, y, 0)));
    return new TubeGeometry(curve, 220, 0.02, 6, false);
  }, [frameLocal]);

  /* direction tags and the two connection-state tags */
  const tagSet = useMemo(
    () => ({
      lanes: [
        { texture: createLaneTag("AUDIO", "right", "#4aa8ff"), position: [local(0.15), 1.86, LANE_Z.audio - 0.1] },
        { texture: createLaneTag("TEXT", "left", "#6dffc4"), position: [local(1.55), 1.86, LANE_Z.data + 0.1] },
      ],
      states: [
        { key: "connectedTag", texture: createLaneTag("WEBSOCKET · CONNECTED", null, "#6dffc4"), position: [local(1.0), 3.0, 0] },
        { key: "endedTag", texture: createLaneTag("WEBSOCKET · CLOSED", null, "#ffb454"), position: [local(1.0), 3.0, 0] },
      ],
    }),
    [local]
  );

  useLayoutEffect(
    () => () => {
      cableGeometry.dispose();
      tagSet.lanes.forEach((tag) => tag.texture.dispose());
      tagSet.states.forEach((tag) => tag.texture.dispose());
    },
    [cableGeometry, tagSet]
  );

  const writePlanks = (clock) => {
    let front = PLANK_X0;
    for (let i = 0; i < PLANKS; i += 1) {
      const p = easeOutBack(progress(clock, 1.0 + i * 0.06, 0.5));
      if (p > 0.02) front = PLANK_X0 + i * PLANK_STEP;
      dummy.position.set(PLANK_X0 + i * PLANK_STEP, DECK_Y - (1 - p) * 1.6, 0);
      dummy.scale.set(1, Math.max(p, 0.001), 1);
      dummy.updateMatrix();
      planks.current.setMatrixAt(i, dummy.matrix);
    }
    planks.current.instanceMatrix.needsUpdate = true;
    return front;
  };

  useFrame(() => {
    const { bridgeClock: clock, live, t, time } = sim.current;

    /* ---- power: every glowing part follows `live`, never the traffic ---- */
    const power = lerp(0.16, 1, live);
    glows.current.forEach((entry) => {
      entry.material.color.copy(entry.color).multiplyScalar(power);
      if (entry.material.transparent) entry.material.opacity = entry.opacity * lerp(0.25, 1, live);
    });
    cableA.current.material.emissiveIntensity = 0.1 + live * 0.9;

    /* connection-state tags */
    tagSet.states.forEach((tag, i) => {
      const sprite = status.current[i];
      if (!sprite) return;
      const value = sim.current[tag.key];
      sprite.visible = value > 0.01;
      sprite.material.opacity = value;
      sprite.position.y = tag.position[1] + (1 - value) * -0.15;
    });

    /* handshake: a pulse runs the length of the new bridge and back */
    const hand = progress(t, 4.4, 1.0);
    const pulse = hand > 0 && hand < 1;
    if (pulse) {
      const run = hand < 0.5 ? hand * 2 : 2 - hand * 2;
      spark.current.visible = true;
      spark.current.position.set(lerp(-3.0, 3.0, easeOutCubic(run)), LANE_Y, 0);
      spark.current.scale.set(1.3 / k, 1.3, 1);
    }

    /* the build only needs rewriting while the clock is moving */
    if (clock === lastClock.current) {
      if (!pulse) spark.current.visible = false;
      return;
    }
    lastClock.current = clock;

    const front = writePlanks(clock);

    const tagFade = easeOutCubic(progress(clock, 3.7, 0.7));
    tags.current.forEach((tag) => {
      if (tag) tag.material.opacity = tagFade * (0.4 + 0.6 * live);
    });

    piers.current.forEach((pier, i) => {
      if (pier) pier.scale.y = Math.max(0.001, easeOutBack(progress(clock, 0.6 + i * 0.1, 0.55)));
    });
    frames.current.forEach((frame, i) => {
      if (frame) frame.scale.y = Math.max(0.001, easeOutBack(progress(clock, 2.0 + i * 0.26, 0.7)));
    });

    const cable = easeOutCubic(progress(clock, 3.0, 1.0));
    const drawn = Math.floor(cableGeometry.index.count * cable);
    cableA.current.geometry.setDrawRange(0, drawn);
    cableB.current.geometry.setDrawRange(0, drawn);

    lanes.current.forEach((lane) => {
      if (lane) lane.scale.x = Math.max(0.001, easeOutCubic(progress(clock, 3.3, 1.0)));
    });

    /* a bright point rides the construction front (and the teardown front) */
    const working = clock > 0.5 && clock < 3.0;
    if (!pulse) spark.current.visible = working;
    if (working && !pulse) {
      spark.current.position.set(front + 0.1, DECK_Y + 0.4, 0);
      const s = 0.9 + 0.3 * Math.sin(time * 18);
      spark.current.scale.set(s / k, s, 1);
    }
  });

  return (
    <group position={[center, 0, 0]} scale={[k, 1, 1]}>
      {/* abutments: the PBX end carries no ring of its own (the PBX port is there) */}
      {[-3.05, 3.05].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.72, 2.1]} />
            <meshStandardMaterial color="#1a2947" roughness={0.45} metalness={0.7} />
          </mesh>
          {x > 0 &&
            [LANE_Z.audio, LANE_Z.data].map((z) => (
              <mesh key={z} ref={glow} position={[-0.28, LANE_Y, z]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.19, 0.02, 10, 32]} />
                <meshBasicMaterial color={z < 0 ? "#4aa8ff" : "#6dffc4"} toneMapped={false} />
              </mesh>
            ))}
        </group>
      ))}

      {/* piers: each group sits on the floor so scale.y grows upward */}
      {pierLocal.flatMap((x, i) =>
        [-0.75, 0.75].map((z, side) => (
          <group
            key={`${x}${z}`}
            position={[x, 0, z]}
            scale={[1, 0.001, 1]}
            ref={(node) => {
              piers.current[i * 2 + side] = node;
            }}
          >
            <mesh position={[0, 0.28, 0]} castShadow>
              <cylinderGeometry args={[0.1 / k, 0.12 / k, 0.56, 14]} />
              <meshStandardMaterial color="#26375a" roughness={0.4} metalness={0.8} />
            </mesh>
          </group>
        ))
      )}

      {/* deck */}
      <instancedMesh ref={planks} args={[null, null, PLANKS]} castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.08, 1.9]} />
        <meshStandardMaterial color="#20324f" roughness={0.45} metalness={0.7} />
      </instancedMesh>
      {[-0.93, 0.93].map((z) => (
        <mesh key={z} ref={glow} position={[0, DECK_Y + 0.045, z]}>
          <boxGeometry args={[5.5, 0.012, 0.03]} />
          <meshBasicMaterial color="#38d6ff" toneMapped={false} />
        </mesh>
      ))}

      {/* pillars: the same portal frame all the way along - the first three are
          the Node.js bridge's processing gates, the rest carry the WebSocket on */}
      {frameLocal.map((x, i) => (
        <group
          key={frameXs[i]}
          position={[x, DECK_Y + 0.04, 0]}
          scale={[1, 0.001, 1]}
          ref={(node) => {
            frames.current[i] = node;
          }}
        >
          {[-0.95, 0.95].map((z) => (
            <group key={z}>
              <mesh position={[0, FRAME_H / 2, z]} castShadow>
                <boxGeometry args={[0.11 / k, FRAME_H, 0.11]} />
                <meshStandardMaterial color="#26375a" roughness={0.4} metalness={0.8} />
              </mesh>
              <mesh ref={glow} position={[0, FRAME_H / 2, z + (z < 0 ? 0.062 : -0.062)]}>
                <boxGeometry args={[0.02 / k, FRAME_H - 0.1, 0.012]} />
                <meshBasicMaterial color="#38d6ff" toneMapped={false} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, FRAME_H, 0]} castShadow>
            <boxGeometry args={[0.13 / k, 0.11, 2.05]} />
            <meshStandardMaterial color="#26375a" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh ref={glow} position={[0, FRAME_H + 0.07, 0]}>
            <boxGeometry args={[0.04 / k, 0.02, 1.9]} />
            <meshBasicMaterial color="#5cf2ff" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* suspension cables */}
      {[-0.95, 0.95].map((z, i) => (
        <mesh key={z} ref={i === 0 ? cableA : cableB} geometry={cableGeometry} position={[0, 0, z]}>
          <meshStandardMaterial color="#8fb4e8" emissive="#2a6fb0" emissiveIntensity={1} roughness={0.35} metalness={0.8} />
        </mesh>
      ))}

      {/* glass data conduits: audio (blue) the whole way, transcript (mint) from the bridge on */}
      {laneSpecs.map((lane, i) => {
        const x0 = local(lane.from);
        const x1 = local(lane.to);
        return (
          <group
            key={lane.z}
            position={[(x0 + x1) / 2, LANE_Y, lane.z]}
            ref={(node) => {
              lanes.current[i] = node;
            }}
          >
            <mesh ref={glow} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.2, x1 - x0, 24, 1, true]} />
              <meshBasicMaterial
                color={lane.z < 0 ? "#3b82ff" : "#34e0a8"}
                transparent
                opacity={0.085}
                side={DoubleSide}
                depthWrite={false}
                blending={AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={glow} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.007, 0.007, x1 - x0, 6]} />
              <meshBasicMaterial color={lane.z < 0 ? "#4aa8ff" : "#6dffc4"} transparent opacity={0.5} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {tagSet.lanes.map((tag, i) => (
        <sprite
          key={i}
          ref={(node) => {
            tags.current[i] = node;
          }}
          position={tag.position}
          scale={[(0.3 * tag.texture.userData.aspect) / k, 0.3, 1]}
          renderOrder={4}
        >
          <spriteMaterial map={tag.texture} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>
      ))}
      {tagSet.states.map((tag, i) => (
        <sprite
          key={tag.key}
          ref={(node) => {
            status.current[i] = node;
          }}
          position={tag.position}
          scale={[(0.3 * tag.texture.userData.aspect) / k, 0.3, 1]}
          renderOrder={5}
          visible={false}
        >
          <spriteMaterial map={tag.texture} transparent opacity={0} depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>
      ))}

      <sprite ref={spark} visible={false}>
        <spriteMaterial
          map={glowMap}
          color="#7fe8ff"
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
      <pointLight position={[0, 2.6, 0]} color="#4a8cff" intensity={1.2} distance={7} decay={1.6} />
    </group>
  );
};
