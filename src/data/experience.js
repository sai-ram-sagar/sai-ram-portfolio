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
    /* the three projects worked on, shown as cards under the role */
    projects: [
      { id: "erss", name: "Emergency Response Support System (ERSS)", note: "for Telangana Police" },
      { id: "dfr", name: "Drone as First Responder", note: "drone mission planning" },
      { id: "stt", name: "Real-Time Speech-to-Text System", note: "PBX to STT bridge" },
    ],
    /* a few clear points covering all three projects together */
    highlights: [
      "Built the real-time dispatch screens in React.js that up to 50 operators use to handle emergency calls, SOS alerts and live incidents.",
      "Built live maps that track police vehicles and station boundaries across 700+ stations, keeping 100-200 active complaints on screen without slowing down.",
      "Developed a speech-to-text pipeline that shows a caller's words on the operator's screen as a live transcript in under 1 second.",
      "Built the Flight Hub for the drone project, where operators plan a drone's route through any number of waypoints, and helped shape mission planning and dispatch.",
      "Replaced page refreshes with live updates (Pusher/WebSocket), so alerts, vehicle positions and transcripts appear instantly.",
      "Built the shared React components reused across 50+ modules, and fixed production issues such as map crashes, dropped connections and slow APIs.",
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
