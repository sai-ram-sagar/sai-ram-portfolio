import { lazy, useState } from "react";
import { PHASES } from "./DfrScene/phases";
import { SceneRail } from "./SceneRail";
import { SceneStage } from "./SceneStage";

const Scene = lazy(() => import("./DfrScene/Scene"));

/**
 * Drone as First Responder: a miniature mission simulation - waypoints are
 * planned and configured, then the drone flies the ordered route.
 */
export const DfrVisual = ({ immersive = false }) => {
  const [phase, setPhase] = useState(0);

  return (
    <SceneStage
      Scene={Scene}
      label="Animated 3D miniature of drone mission planning: an operator places numbered waypoints across a small town, adjusts one, then the drone flies the route, completes it and returns to land. Simulated data."
      immersive={immersive}
      onPhase={setPhase}
    >
      <SceneRail steps={PHASES} active={phase} placement={immersive ? "right" : "left"} note="Simulated mission data" />
    </SceneStage>
  );
};
