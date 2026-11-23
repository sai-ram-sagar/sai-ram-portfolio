/**
 * Professional experience - taken from the resume (Sai_Ram_Sagar_Resume_2026).
 * Bullets are condensed for scannability; no claim, figure or technology
 * appears here that is not stated in the resume.
 */
export const experience = [
  {
    company: "Krishnas Digital Technologies and Softlabs Pvt. Ltd.",
    role: "Software Developer",
    period: "May 2024 - Present",
    location: "Hyderabad, India",
    context: "Emergency Response Support System (ERSS) for Telangana Police",
    highlights: [
      "Built real-time CAD workflows in React.js for SOS alerts, emergency calls and live incidents, used by up to 50 dispatch operators.",
      "Developed a Speech-to-Text pipeline (telephony audio → VAD → WebSocket → STT → Pusher → CAD UI) that shows live call transcripts in under 1 second.",
      "Built live vehicle tracking and police-station geofencing on Leaflet across 700+ stations, with 100-200 active complaints kept visible using zoom-based rendering and tile caching.",
      "Replaced page refreshes with Pusher/WebSocket events for alerts, vehicle positions and transcripts.",
      "Built the shared React component layer (tables, modals, popups, state patterns) reused across 50+ modules.",
      "Cut duplicated code into shared utilities, guided by SonarQube findings.",
      "Fixed production issues (map render crashes, dropped WebSockets, API timeouts) using Bugsnag and PM2.",
      "Used AI-assisted and CLI workflows to speed up delivery while owning code quality.",
    ],
    stack: [
      "React.js",
      "Node.js",
      "Leaflet",
      "WebSocket",
      "Pusher",
      "SonarQube",
      "Bugsnag",
      "PM2",
    ],
  },
];
