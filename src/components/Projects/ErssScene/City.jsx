import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D } from "three";
import { easeOutCubic, lerp } from "../sceneKit/math";
import { createFacadeTextures } from "../DfrScene/labels";
import { LAKE, TERRAIN, buildWorld } from "./city";

const SOIL = "#4a3a2c";
const ROCK = "#2d3138";

/**
 * The ERSS city. Static after its opening rise, so it costs
 * almost nothing per frame.
 */
export const City = ({ sim }) => {
  const group = useRef();
  const trunks = useRef();
  const pineMesh = useRef();
  const broadMesh = useRef();

  const world = useMemo(() => buildWorld(), []);
  const facade = useMemo(() => createFacadeTextures(), []);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const { pines, broads } = world.trees;
    let n = 0;

    pines.forEach((t, i) => {
      dummy.rotation.set(0, i * 1.7, 0);
      dummy.scale.setScalar(t.s);
      dummy.position.set(t.x, t.y + 0.45 * t.s, t.z);
      dummy.updateMatrix();
      pineMesh.current.setMatrixAt(i, dummy.matrix);
      pineMesh.current.setColorAt(i, t.color);
      dummy.position.set(t.x, t.y + 0.1 * t.s, t.z);
      dummy.updateMatrix();
      trunks.current.setMatrixAt(n, dummy.matrix);
      n += 1;
    });
    broads.forEach((t, i) => {
      dummy.rotation.set(0, i * 2.3, 0);
      dummy.scale.set(t.s, t.s * 0.9, t.s);
      dummy.position.set(t.x, t.y + 0.34 * t.s, t.z);
      dummy.updateMatrix();
      broadMesh.current.setMatrixAt(i, dummy.matrix);
      broadMesh.current.setColorAt(i, t.color);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(t.s);
      dummy.position.set(t.x, t.y + 0.1 * t.s, t.z);
      dummy.updateMatrix();
      trunks.current.setMatrixAt(n, dummy.matrix);
      n += 1;
    });
    [pineMesh, broadMesh, trunks].forEach((mesh) => {
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });
  }, [world]);

  useEffect(
    () => () => {
      const { terrain, town } = world;
      [terrain, town.walls, town.roofs, town.plots, town.roads, town.marks].forEach((g) => g.dispose());
      facade.map.dispose();
      facade.emissive.dispose();
    },
    [world, facade]
  );

  /* the ground rises into place once, on the very first pass only */
  useFrame(() => {
    const rise = easeOutCubic(sim.current.time / 1.4);
    group.current.scale.set(1, lerp(0.02, 1, rise), 1);
  });

  const { town, trees } = world;
  const treeCount = trees.pines.length + trees.broads.length;

  return (
    <group ref={group}>
      {/* cut-away strata under the surface */}
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[TERRAIN.w, 0.12, TERRAIN.d]} />
        <meshStandardMaterial color={SOIL} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.34, 0]} receiveShadow>
        <boxGeometry args={[TERRAIN.w, 0.42, TERRAIN.d]} />
        <meshStandardMaterial color={ROCK} roughness={0.9} metalness={0.1} />
      </mesh>

      <mesh geometry={world.terrain} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
      </mesh>

      {/* lake */}
      <mesh position={[LAKE.x, 0.012, LAKE.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[LAKE.rx + 0.14, LAKE.rz + 0.12, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#6b6a52" roughness={1} />
      </mesh>
      <mesh position={[LAKE.x, 0.022, LAKE.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[LAKE.rx, LAKE.rz, 1]} receiveShadow>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#27495c" roughness={0.45} metalness={0} />
      </mesh>

      {/* town */}
      <mesh geometry={town.plots} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.95} />
      </mesh>
      <mesh geometry={town.roads} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>
      <mesh geometry={town.marks}>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </mesh>
      <mesh geometry={town.walls} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          map={facade.map}
          emissiveMap={facade.emissive}
          emissive="#ffffff"
          emissiveIntensity={0.7}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      <mesh geometry={town.roofs} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.85} />
      </mesh>

      {/* vegetation */}
      <instancedMesh ref={trunks} args={[null, null, treeCount]} castShadow>
        <cylinderGeometry args={[0.022, 0.034, 0.22, 6]} />
        <meshStandardMaterial color="#4a3526" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={pineMesh} args={[null, null, Math.max(1, trees.pines.length)]} castShadow>
        <coneGeometry args={[0.16, 0.6, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={broadMesh} args={[null, null, Math.max(1, trees.broads.length)]} castShadow>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
};
