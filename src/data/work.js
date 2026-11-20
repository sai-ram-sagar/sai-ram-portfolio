/**
 * Key professional projects - taken from the KEY PROJECTS block of the resume.
 * These are internal platform projects with no public demo and no screenshot,
 * so they are presented as detail cards rather than as previews.
 */
export const work = [
  {
    id: "dfr",
    short: "DFR",
    title: "Drone as First Responder (DFR)",
    status: "In progress",
    summary:
      "A mission-planning system that lets operators create, configure and reuse predefined drone flight missions.",
    highlights: [
      "Implemented a Flight Hub interface for ordered routing through unlimited waypoints - bounded in practice by drone battery endurance - with add, edit, delete and reposition actions and live path rendering.",
      "Contributing to design discussions on mission planning, drone assignment, dispatch integration and geospatial visualisation.",
    ],
    stack: ["React.js", "Node.js", "Express.js", "REST APIs", "Leaflet", "Geospatial Data"],
    icon: "Navigation",
    scene: "dfr",
  },
  {
    id: "stt",
    short: "STT",
    title: "Real-Time Speech-to-Text System",
    status: "Shipped",
    summary:
      "A live bridge between the PBX and the STT server: call audio streams in, and transcription and translation stream back to the agent's screen.",
    highlights: [
      "Built the Node.js bridge that receives the live call stream, applies noise cancellation, and upsamples or downsamples it (8 kHz → 16 kHz and others) to suit the chosen STT model.",
      "Streams the audio to the STT server in 200 ms chunks over a persistent WebSocket, while transcription and translation come back continuously during the call.",
      "Relays each transcript and translation from the bridge to the agent UI through Pusher, so the agent reads them live as the call goes on.",
      "Implemented independent VAD processing for agent and citizen audio streams with configurable speech and silence thresholds, plus buffering, speech segmentation, error handling and observability at each stage.",
    ],
    stack: ["Node.js", "WebSocket", "STT", "VAD", "Pusher", "Audio Processing"],
    icon: "AudioLines",
    scene: "stt",
  },
  {
    id: "erss",
    short: "ERSS",
    title: "Emergency Response Support System (ERSS) - Dial 112",
    status: "Shipped",
    summary:
      "A comprehensive emergency response platform integrating Computer-Aided Dispatch (CAD), GIS-based location management, real-time call handling, incident tracking and resource dispatch workflows.",
    highlights: [
      "Built the real-time CAD workflows in React.js for SOS alerts, emergency calls, service assignment and live incident data, used by up to 50 dispatch operators.",
      "Built live vehicle tracking and police-station geofencing on Leaflet across 700+ stations statewide, keeping 100-200 concurrently active complaints visible.",
      "Implemented Pusher/WebSocket event flows that removed page refreshes for alerts, vehicle positions and live transcripts during active incidents.",
    ],
    stack: ["React.js", "Node.js", "Leaflet", "WebSocket", "Pusher", "GIS"],
    icon: "Navigation",
    scene: "erss",
  },
];
