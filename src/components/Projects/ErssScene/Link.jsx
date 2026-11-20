import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import { getGlowTexture } from "../sceneKit/glow";

const SEGMENTS = 28;
const a = new Vector3();
const b = new Vector3();
const p = new Vector3();

/**
 * A live communication line between two components: a thin arc with data
 * particles running along it. The ends are functions, so a line can follow a
 * moving car or the drone. It is only drawn while `active` is above zero.
 */
export const Link = ({ sim, start, end, active, color = "#5cf2ff", lift = 0.8, count = 9, speed = 0.45 }) => {
  const line = useRef();
  const points = useRef();
  const pointsMat = useRef();
  const glowMap = getGlowTexture();
  const tint = useMemo(() => new Color(color), [color]);

  const lineGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3));
    g.boundingSphere = null;
    return g;
  }, []);
  const dotGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
    g.boundingSphere = null;
    return g;
  }, [count]);

  useEffect(
    () => () => {
      lineGeo.dispose();
      dotGeo.dispose();
    },
    [lineGeo, dotGeo]
  );

  const at = (u, out) => {
    out.lerpVectors(a, b, u);
    out.y += Math.sin(u * Math.PI) * lift;
    return out;
  };

  useFrame((state) => {
    const level = sim.current[active];
    const on = level > 0.01;
    line.current.visible = on;
    points.current.visible = on;
    if (!on) return;

    start(sim.current, a);
    end(sim.current, b);

    const lp = lineGeo.attributes.position.array;
    for (let i = 0; i <= SEGMENTS; i += 1) {
      at(i / SEGMENTS, p);
      lp[i * 3] = p.x;
      lp[i * 3 + 1] = p.y;
      lp[i * 3 + 2] = p.z;
    }
    lineGeo.attributes.position.needsUpdate = true;
    line.current.material.opacity = 0.28 * level;

    const dp = dotGeo.attributes.position.array;
    const dc = dotGeo.attributes.color.array;
    for (let i = 0; i < count; i += 1) {
      const u = (sim.current.time * speed + i / count) % 1;
      at(u, p);
      dp[i * 3] = p.x;
      dp[i * 3 + 1] = p.y;
      dp[i * 3 + 2] = p.z;
      const fade = Math.min(1, u * 6) * Math.min(1, (1 - u) * 6) * level;
      dc[i * 3] = tint.r * fade;
      dc[i * 3 + 1] = tint.g * fade;
      dc[i * 3 + 2] = tint.b * fade;
    }
    dotGeo.attributes.position.needsUpdate = true;
    dotGeo.attributes.color.needsUpdate = true;
    pointsMat.current.size = state.camera.zoom * state.gl.getPixelRatio() * 0.1;
  });

  return (
    <group>
      <line ref={line} geometry={lineGeo} visible={false} frustumCulled={false}>
        <lineBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
      </line>
      <points ref={points} geometry={dotGeo} visible={false} frustumCulled={false}>
        <pointsMaterial
          ref={pointsMat}
          map={glowMap}
          vertexColors
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          sizeAttenuation={false}
          toneMapped={false}
        />
      </points>
    </group>
  );
};
