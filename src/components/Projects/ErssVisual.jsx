import { lazy, useState } from "react";
import { PHASES } from "./ErssScene/phases";
import { SceneRail } from "./SceneRail";
import { SceneStage } from "./SceneStage";

const Scene = lazy(() => import("./ErssScene/Scene"));

/**
 * ERSS (Dial 112): the emergency-response ecosystem in miniature - a call
 * reaches the calltaker, the incident lands on the GIS map, the dispatcher
 * sends police units and a drone, and everything stays in sync.
 */
export const ErssVisual = ({ immersive = false }) => {
  const [phase, setPhase] = useState(0);

  return (
    <SceneStage
      Scene={Scene}
      label="Animated 3D miniature of an emergency response: a citizen dials 112 and talks to a calltaker in the control room, the incident is placed on the GIS city map, the nearest police station and hospital are picked, police cars, a drone and an ambulance are sent, the ambulance takes the citizen to hospital, and the police units return to their station. Simulated data."
      immersive={immersive}
      onPhase={setPhase}
    >
      <SceneRail steps={PHASES} active={phase} placement={immersive ? "right" : "left"} note="Simulated incident data" />
    </SceneStage>
  );
};
