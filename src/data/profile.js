/**
 * Single source of truth for identity + contact content.
 * Every value is taken verbatim from the resume
 * (Sai_Ram_Sagar_Resume_2026) or from the existing portfolio links.
 * Nothing here is invented.
 */

export const profile = {
  firstName: "Sai Ram",
  fullName: "Sai Ram Sagar",
  role: "Software Developer",
  specialism: "Real-Time & Geospatial Web Applications",
  stackLine: "React.js / Node.js",
  location: "Hyderabad, India",
  email: "sairam.webdev@gmail.com",

  /* Resume summary, split for typographic rhythm — wording unchanged in substance. */
  summary:
    "Software Developer with 2+ years on a statewide emergency-response platform (ERSS) serving 700+ police stations across Telangana and handling 6,000–10,000 citizen calls a day.",
  summaryDetail:
    "Primarily frontend — real-time React.js operator interfaces and Leaflet geospatial workflows — with backend work on a sub-second Speech-to-Text pipeline in Node.js, WebSocket and Pusher.",

  /* Figures below are stated in the resume summary / experience bullets. */
  metrics: [
    { value: "2+", label: "Years building ERSS" },
    { value: "700+", label: "Police stations covered" },
    { value: "6k–10k", label: "Citizen calls a day" },
    { value: "<1s", label: "Live transcript latency" },
  ],

  focus: ["React.js", "Node.js", "Real-Time Systems", "Leaflet", "Speech-to-Text"],
};

export const disciplines = [
  {
    icon: "MonitorSmartphone",
    title: "Real-time frontend",
    description:
      "React.js operator interfaces for Computer-Aided Dispatch — SOS alerts, emergency calls and live incident data, used by up to 50 dispatch operators.",
  },
  {
    icon: "Map",
    title: "Geospatial engineering",
    description:
      "Live vehicle tracking and police-station geofencing on Leaflet across 700+ stations, with zoom-based rendering, multiple tile sources and tile caching.",
  },
  {
    icon: "AudioLines",
    title: "Streaming backend",
    description:
      "A Node.js Speech-to-Text pipeline — telephony audio through VAD, WebSocket and Pusher — delivering transcripts to operators in under a second.",
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
