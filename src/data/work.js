/**
 * Key professional projects - taken from the KEY PROJECTS block of the resume.
 * These are internal platform projects with no public demo and no screenshot,
 * so they are presented as detail cards rather than as previews.
 */
export const work = [
  {
    id: "dfr",
    short: "DFR",
    title: "Drone as First Responder",
    status: "In progress",
    summary:
      "A mission-planning system that lets operators create, configure and reuse predefined drone flight missions.",
    highlights: [
      "Built the Flight Hub: ordered routes through any number of waypoints (limited only by battery), with add, edit, delete, reposition and live path drawing.",
      "Helping shape mission planning, drone assignment, dispatch integration and map visualisation.",
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
      "Built the Node.js bridge that takes the live call stream, cancels noise and resamples it (e.g. 8 → 16 kHz) for the chosen STT model.",
      "Pushes transcripts and translations to the agent's screen through Pusher, live during the call.",
      "Added separate voice detection for agent and citizen audio, with configurable thresholds, buffering, segmentation, error handling and observability.",
    ],
    stack: ["Node.js", "WebSocket", "STT", "VAD", "Pusher", "Audio Processing"],
    icon: "AudioLines",
    scene: "stt",
  },
  {
    id: "erss",
    short: "ERSS",
    title: "Emergency Response Support System",
    status: "Shipped",
    summary:
      "A comprehensive emergency response platform integrating Computer-Aided Dispatch (CAD), GIS-based location management, real-time call handling, incident tracking and resource dispatch workflows.",
    highlights: [
      "Built real-time CAD workflows in React.js for SOS alerts, calls, assignment and live incidents, used by up to 50 operators.",
      "Built live vehicle tracking and station geofencing on Leaflet across 700+ stations, keeping 100-200 active complaints on screen.",
      "Added Pusher/WebSocket event flows so alerts, vehicle positions and transcripts update live, with no page refresh.",
    ],
    stack: ["React.js", "Node.js", "Leaflet", "WebSocket", "Pusher", "GIS"],
    icon: "Navigation",
    scene: "erss",
  },
];
