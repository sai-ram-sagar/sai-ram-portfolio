import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, DoubleSide } from "three";
import {
  WAYPOINT_COUNT,
  waypointInfo,
  waypointOrigin,
} from "./mission";
import { createInfoPainter, createNumberTexture, createTagTexture, tagScale } from "./labels";
import { clamp01 } from "../sceneKit/math";

const PLANNED = new Color("#38c8f0");
const AMBER = new Color("#ffcf70");
const DONE = new Color("#7dffc4");
const WHITE = new Color("#ffffff");
const tint = new Color();

const ringMaterial = (color) => ({
  color,
  transparent: true,
  opacity: 0,
  side: DoubleSide,
  depthWrite: false,
  blending: AdditiveBlending,
  toneMapped: false,
});

/**
 * One numbered marker: a glowing vertical beam from the ground to the flight
 * altitude, a head, and a number badge. Colour tells its state - cyan planned,
 * amber being configured, mint once the drone has passed.
 */
const Marker = ({ mission, index, numberTexture }) => {
  const group = useRef();
  const beam = useRef();
  const halo = useRef();
  const head = useRef();
  const badge = useRef();
  const spawnRing = useRef();
  const passRing = useRef();
  const ghost = useRef();
  const cursor = useRef();
  const origin = waypointOrigin(index);

  useFrame(() => {
    const w = mission.current.wp[index];
    const k = Math.max(0, w.spawn * (1 - w.sink));
    const height = Math.max(0.001, (w.alt - w.gy) * k);

    group.current.position.set(w.x, w.gy, w.z);
    group.current.visible = k > 0.002;

    beam.current.scale.y = height;
    beam.current.position.y = height / 2;
    halo.current.scale.y = height;
    halo.current.position.y = height / 2;
    head.current.position.y = height;
    const headScale = k * (0.85 + w.hlConfig * 0.55 + w.hl * 0.7);
    head.current.scale.setScalar(Math.max(0.001, headScale));
    head.current.rotation.y = mission.current.time * 1.4;
    badge.current.position.y = height + 0.32;
    badge.current.scale.setScalar(0.4 * (0.9 + w.hlConfig * 0.25 + w.hl * 0.2) * Math.min(1, k * 1.4));

    tint.copy(PLANNED).lerp(DONE, w.done).lerp(AMBER, w.hlConfig).lerp(WHITE, w.hl * 0.5);
    beam.current.material.color.copy(tint);
    halo.current.material.color.copy(tint);
    halo.current.material.opacity = 0.16 + w.hlConfig * 0.16 + w.hl * 0.2;
    head.current.material.color.copy(tint);
    badge.current.material.color.copy(tint);

    /* a ring expands from the ground when the marker is placed ... */
    const born = clamp01(w.age / 0.9);
    spawnRing.current.visible = w.age >= 0 && born < 1;
    spawnRing.current.scale.setScalar(0.15 + born * 0.9);
    spawnRing.current.material.opacity = (1 - born) * 0.7;

    /* ... and another when the drone flies past it */
    const passed = w.pulse >= 0 ? clamp01(w.pulse / 1.2) : 1;
    passRing.current.visible = w.pulse >= 0 && passed < 1;
    passRing.current.scale.setScalar(0.2 + passed * 1.1);
    passRing.current.material.opacity = (1 - passed) * 0.7;

    /* the dragged waypoint leaves a faint ghost where it used to be */
    if (index === 2) {
      ghost.current.visible = w.ghost > 0.01;
      ghost.current.material.opacity = w.ghost * 0.55;
      cursor.current.visible = w.cursor > 0.01;
      cursor.current.material.opacity = w.cursor * 0.6;
      cursor.current.rotation.z = mission.current.time * 1.5;
    }
  });

  return (
    <>
      <group ref={group} visible={false}>
        <mesh ref={beam} position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
        <mesh ref={halo} position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 12, 1, true]} />
          <meshBasicMaterial transparent opacity={0.16} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh ref={head}>
          <octahedronGeometry args={[0.09, 0]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
        <sprite ref={badge}>
          <spriteMaterial map={numberTexture} transparent depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>
        <mesh ref={spawnRing} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.46, 0.5, 40]} />
          <meshBasicMaterial {...ringMaterial("#38c8f0")} />
        </mesh>
        <mesh ref={passRing} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.46, 0.5, 40]} />
          <meshBasicMaterial {...ringMaterial("#7dffc4")} />
        </mesh>
        {index === 2 && (
          <mesh ref={cursor} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.25, 6]} />
            <meshBasicMaterial {...ringMaterial("#ffcf70")} />
          </mesh>
        )}
      </group>
      {index === 2 && (
        <mesh ref={ghost} position={[origin.x, 0.06, origin.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial {...ringMaterial("#ffcf70")} />
        </mesh>
      )}
    </>
  );
};

/** Waypoint markers, the shared altitude/speed readout and the completion tag. */
export const Waypoints = ({ mission }) => {
  const numbers = useMemo(
    () => Array.from({ length: WAYPOINT_COUNT }, (_, i) => createNumberTexture(i + 1)),
    []
  );
  const info = useMemo(() => createInfoPainter(), []);
  const doneTag = useMemo(() => createTagTexture("COMPLETE", { accent: "#7dffc4", icon: "check" }), []);
  const infoSprite = useRef();
  const doneSprite = useRef();

  useEffect(
    () => () => {
      numbers.forEach((texture) => texture.dispose());
      info.dispose();
      doneTag.dispose();
    },
    [numbers, info, doneTag]
  );

  useFrame(() => {
    const m = mission.current;

    const target = m.wp[m.info.index];
    info.paint(waypointInfo(m.info.index));
    infoSprite.current.visible = m.info.alpha > 0.01;
    infoSprite.current.material.opacity = m.info.alpha;
    infoSprite.current.position.set(target.x, target.alt + 0.85 + (1 - m.info.alpha) * -0.12, target.z);

    const last = m.wp[WAYPOINT_COUNT - 1];
    doneSprite.current.visible = m.complete > 0.01;
    doneSprite.current.material.opacity = m.complete;
    doneSprite.current.position.set(last.x, last.alt + 1.55 + m.complete * 0.1, last.z);
  });

  return (
    <group>
      {numbers.map((texture, i) => (
        <Marker key={i} mission={mission} index={i} numberTexture={texture} />
      ))}
      <sprite ref={infoSprite} scale={[1.55, 0.64, 1]} visible={false} renderOrder={6}>
        <spriteMaterial map={info.texture} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      <sprite ref={doneSprite} scale={tagScale(doneTag, 0.36)} visible={false} renderOrder={6}>
        <spriteMaterial map={doneTag} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
};
