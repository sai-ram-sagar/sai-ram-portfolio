/**
 * Single source of truth for identity + contact content.
 * Every fact comes from the resume (Sai_Ram_Sagar_Resume_2026) or from the
 * existing portfolio links - the About copy rephrases it in plain language,
 * but nothing here is invented.
 */

export const profile = {
  firstName: "Sai Ram",
  fullName: "Sai Ram Sagar",
  role: "Software Developer",
  specialism: "Real-Time & Geospatial Web Applications",
  stackLine: "React.js / Node.js",
  location: "Hyderabad, India",
  email: "sairam.webdev@gmail.com",

  /*
   * The hero leads with the work itself. It used to reuse `summary`, which
   * opened on platform scale (700+ stations, 6,000-10,000 calls) and printed
   * the same sentence twice in one scroll - once here and again in About.
   */
  lead:
    "I build web applications that have to work in real time - React.js operator interfaces, Leaflet mapping workflows, and a sub-second Speech-to-Text pipeline in Node.js.",

  /*
   * About: who I am and how I work, in plain words with the technical detail
   * kept in. Written so a recruiter and an engineer both get something from it.
   */
  summary:
    "I'm a software developer who builds web applications that react the moment something happens. My work powers public-safety software for Telangana Police: the screens dispatchers use to handle emergency calls, live maps of police vehicles, and a system that turns phone calls into text while the caller is still speaking.",
  summaryDetail:
    "Most of my time is spent on the frontend in React.js, building interfaces that update live over WebSocket and Pusher instead of waiting for a page refresh. I also work on the backend in Node.js and Express, and on maps with Leaflet - drawing station boundaries, tracking vehicles and planning drone routes.",

  /* every project from the resume, in plain language */
  workedOn: [
    {
      name: "Emergency dispatch screens",
      detail:
        "React.js interfaces for SOS alerts, emergency calls and live incident data, used by up to 50 operators at once across 700+ police stations.",
    },
    {
      name: "Real-time Speech-to-Text",
      detail:
        "A Node.js pipeline that detects speech in live call audio and puts the transcript on the operator's screen in under a second.",
    },
    {
      name: "Live vehicle tracking & geofencing",
      detail:
        "Leaflet maps showing police vehicles and station boundaries, keeping 100-200 active complaints on screen without slowing down.",
    },
    {
      name: "Drone as First Responder",
      status: "In progress",
      detail:
        "A mission planner where operators plot drone routes through waypoints and save missions to reuse.",
    },
    {
      name: "Shared component library",
      detail:
        "Data tables, modals, popups and state patterns reused across 50+ modules, so every screen looks and behaves the same.",
    },
  ],

  focus: ["React.js", "Node.js", "Real-Time Systems", "Leaflet", "Speech-to-Text"],
};

export const disciplines = [
  {
    icon: "MonitorSmartphone",
    title: "Real-time frontend",
    description:
      "React.js screens that change the instant the data does. New alerts, calls and incident updates arrive over WebSocket and Pusher, so nobody has to hit refresh.",
  },
  {
    icon: "Map",
    title: "Maps & geospatial",
    description:
      "Leaflet maps for vehicle tracking, station boundaries and drone route planning, kept fast with zoom-based rendering and cached map tiles.",
  },
  {
    icon: "AudioLines",
    title: "Streaming backend",
    description:
      "Node.js and Express services that move data as it happens, including a pipeline that turns live phone audio into on-screen text in under a second.",
  },
];

export const socials = [
  {
    id: "linkedin",
    label: "LinkedIn",
    handle: "in/sairamsagar",
    href: "https://www.linkedin.com/in/sairamsagar",
  },
  {
    id: "github",
    label: "GitHub",
    handle: "sai-ram-sagar",
    href: "https://www.github.com/sai-ram-sagar",
  },
  {
    id: "instagram",
    label: "Instagram",
    handle: "sairamsagar_",
    href: "https://www.instagram.com/sairamsagar_",
  },
];

/* Web3Forms endpoint already wired into the existing contact form. */
export const contactForm = {
  action: "https://api.web3forms.com/submit",
  accessKey: "b047a379-283d-4af4-92f4-bc0c5e52a3b0",
};
