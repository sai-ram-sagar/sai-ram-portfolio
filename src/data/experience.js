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
      "Built real-time Computer-Aided Dispatch (CAD) workflows in React.js for SOS alerts, emergency calls, service assignment and live incident data, used by up to 50 dispatch operators.",
      "Developed a real-time Speech-to-Text pipeline - telephony audio → VAD → WebSocket → STT → Pusher → CAD UI - delivering live call transcripts in under 1 second, with 8 kHz → 16 kHz resampling and speech segmentation.",
      "Built live vehicle tracking and police-station geofencing on Leaflet across 700+ stations statewide, keeping 100–200 concurrently active complaints visible using zoom-based rendering, multiple tile sources and tile caching.",
      "Implemented Pusher/WebSocket event flows that removed page refreshes for alerts, vehicle positions and live transcripts, keeping operator screens current during active incidents.",
      "Built and maintained the shared React component layer - data tables, complaint-view modals, popups, animations and state patterns - reused across 50+ modules.",
      "Consolidated duplicated logic into shared utilities, replacing hard-coded map-initialisation code across modules with one parameterised function, guided by SonarQube findings on code smells and technical debt.",
      "Diagnosed and fixed production issues including map-related render crashes, dropped WebSocket connections, API timeouts and async error handling, using Bugsnag and PM2.",
      "Used AI-assisted and CLI-based development workflows to accelerate delivery and evaluate implementation alternatives while retaining ownership of code quality.",
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
