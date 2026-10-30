/**
 * Skill taxonomy - the six groups and their contents come directly from the
 * TECHNICAL SKILLS block of the resume.
 *
 * `certificate` optionally names an entry in certificates.json so the
 * matching course certificate can be opened from the chip.
 */
export const skillGroups = [
  {
    id: "frontend",
    label: "Frontend",
    icon: "LayoutDashboard",
    items: [
      { name: "JavaScript (ES6+)", certificate: "JavaScript", logo: "skills/javascript.png" },
      { name: "React.js", certificate: "ReactJS", logo: "skills/react.png" },
      { name: "HTML5", certificate: "HTML & CSS", logo: "skills/html.png" },
      { name: "CSS3", certificate: "HTML & CSS", logo: "skills/css.png" },
      { name: "Tailwind CSS", logo: "skills/tailwind_CSS.png" },
      { name: "Axios" },
    ],
  },
  {
    id: "backend",
    label: "Backend & Data",
    icon: "Server",
    items: [
      { name: "Node.js", certificate: "NodeJS", logo: "skills/node.png" },
      { name: "Express.js", logo: "skills/express.png" },
      { name: "REST APIs" },
      { name: "WebSocket" },
      { name: "MongoDB", logo: "skills/mongodb.png" },
      { name: "MySQL", certificate: "SQL", logo: "skills/sql.png" },
      { name: "SQLite" },
    ],
  },
  {
    id: "realtime",
    label: "Real-Time",
    icon: "Radio",
    items: [
      { name: "Event-Driven Architecture" },
      { name: "Pusher" },
      { name: "WebSocket" },
      { name: "State Synchronisation" },
      { name: "REST API Integration" },
    ],
  },
  {
    id: "geospatial",
    label: "Geospatial",
    icon: "Map",
    items: [
      { name: "Leaflet" },
      { name: "Geofencing & Polygon Rendering" },
      { name: "Map Tiles" },
      { name: "Self-Hosted Tile Sources" },
    ],
  },
  {
    id: "speech",
    label: "Speech & Audio",
    icon: "AudioLines",
    items: [
      { name: "Speech-to-Text (STT)" },
      { name: "Voice Activity Detection (VAD)" },
      { name: "8 kHz–16 kHz Resampling" },
      { name: "Buffering" },
      { name: "Speech Segmentation" },
    ],
  },
  {
    id: "tooling",
    label: "Tooling & Practices",
    icon: "Wrench",
    items: [
      { name: "Git", logo: "extraSkills/git.png" },
      { name: "GitHub", logo: "extraSkills/github.png" },
      { name: "PM2" },
      { name: "Bugsnag" },
      { name: "SonarQube" },
      { name: "npm" },
      { name: "Render" },
      { name: "Netlify" },
      { name: "AI-assisted & CLI-based development" },
      { name: "Technical Documentation" },
    ],
  },
];
