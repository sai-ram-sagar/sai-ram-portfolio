import { lazy, useState } from "react";
import { PHASES } from "./SttScene/phases";
import { SceneRail } from "./SceneRail";
import { SceneStage } from "./SceneStage";
import { TranscriptPopup } from "./TranscriptPopup";

const Scene = lazy(() => import("./SttScene/Scene"));

const EMPTY = { state: 0, alpha: 1, open: 0, lines: [], seq: 0 };

/**
 * Real-time speech-to-text pipeline: the PBX call streams through the Node.js
 * bridge to the STT server, and the transcription comes back to the bridge,
 * which pushes it to the agent's floating transcription window through Pusher.
 */
export const SttVisual = ({ immersive = false }) => {
  const [phase, setPhase] = useState(0);
  const [transcript, setTranscript] = useState(EMPTY);

  return (
    <SceneStage
      Scene={Scene}
      label="Animated 3D miniature of the pipeline: a call streams from the PBX through the Node.js bridge to the speech-to-text server, and the transcript and translation return to the bridge, which pushes them through Pusher to a live transcription window for the agent. Sample data."
      immersive={immersive}
      onPhase={setPhase}
      onTranscript={setTranscript}
    >
      <SceneRail steps={PHASES} active={phase} placement={immersive ? "right" : "left"} note="Sample audio · simulated" />
      <TranscriptPopup snapshot={transcript} />
    </SceneStage>
  );
};
