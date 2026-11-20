import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, QuadraticBezierCurve3, TubeGeometry, Vector3 } from "three";
import { createLaneTag, tagScale } from "./textures";
import { PUSH, pusherPoint } from "./timeline";

const LILAC = "#9b8cff";
const mid = { x: 0, y: 0, z: 0 };

/**
 * The Pusher channel: a thin arc from the bridge to the agent's screen. It
 * stays up for the whole call; transcript and translation travel along it the
 * moment the bridge receives them.
 */
export const PusherLink = ({ sim }) => {
  const tube = useRef();
  const relay = useRef();
  const tag = useMemo(() => createLaneTag("PUSHER", null, LILAC), []);

  const geometry = useMemo(() => {
    const curve = new QuadraticBezierCurve3(
      new Vector3(...PUSH.p0),
      new Vector3(...PUSH.p1),
      new Vector3(...PUSH.p2)
    );
    return new TubeGeometry(curve, 48, 0.018, 6, false);
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      tag.dispose();
    },
    [geometry, tag]
  );

  pusherPoint(0.5, mid);

  useFrame(() => {
    const { live, burst, bridgeClock } = sim.current;
    const built = Math.min(1, Math.max(0, (bridgeClock - 3.0) / 1.2));
    tube.current.visible = built > 0.01;
    tube.current.material.opacity = built * (0.12 + live * 0.5);
    relay.current.scale.setScalar(0.8 + burst * 0.5);
    relay.current.material.opacity = built * (0.3 + live * 0.3 + burst * 0.4);
  });

  return (
    <group>
      <mesh ref={tube} geometry={geometry} visible={false}>
        <meshBasicMaterial color={LILAC} transparent opacity={0} toneMapped={false} />
      </mesh>
      {/* a relay ring where the arc crests, and its label */}
      <mesh ref={relay} position={[mid.x, mid.y, mid.z]} rotation={[0, Math.PI / 4, 0]}>
        <torusGeometry args={[0.16, 0.018, 8, 28]} />
        <meshBasicMaterial color={LILAC} transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} side={DoubleSide} />
      </mesh>
      <sprite position={[mid.x, mid.y + 0.38, mid.z]} scale={tagScale(tag, 0.26)} renderOrder={5}>
        <spriteMaterial map={tag} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
    </group>
  );
};
