/**
 * Key professional projects - taken from the KEY PROJECTS block of the resume.
 * These are internal platform projects with no public demo and no screenshot,
 * so they are presented as detail cards rather than as previews.
 */
export const work = [
  {
    id: "dfr",
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
  },
  {
    id: "stt",
    title: "Real-Time Speech-to-Text System",
    status: "Shipped",
    summary:
      "The pipeline from telephony audio capture through to live transcript delivery inside the CAD application, at sub-second latency.",
    highlights: [
      "Implemented independent VAD processing for agent and citizen audio streams with configurable speech and silence thresholds.",
      "Handled 8 kHz → 16 kHz conversion, buffering and speech segmentation, with error handling and observability at each stage.",
    ],
    stack: ["Node.js", "WebSocket", "STT", "VAD", "Pusher", "Audio Processing"],
    icon: "AudioLines",
  },
];
