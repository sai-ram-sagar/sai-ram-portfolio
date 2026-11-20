/*
 * One clock drives the whole diorama. Everything that moves is a pure function
 * of the time sampled here, so the loop closes without a reset.
 *
 * What the scene shows - one live call through the real pipeline:
 *
 *   PBX --raw call audio--> NODE.JS BRIDGE --200 ms chunks--> STT SERVER
 *                               |   (denoise, resample)  <--transcript + translation--'
 *                               '--- Pusher ---> AGENT UI
 *
 * The bridge holds a persistent WebSocket to the STT server. Audio flows PBX ->
 * bridge -> STT for the whole call while transcript and translation flow back
 * STT -> bridge -> (Pusher) -> agent UI at the same time; nothing waits for
 * anything else.
 *
 *    0.0 -  5.4   CONNECT   the WebSocket assembles, a handshake runs, "connected"
 *    5.4 - 31.0   LIVE CALL audio chunks and text stream in opposite directions
 *   31.0 - 40.0   CALL ENDED  new audio stops, in-flight data lands, the
 *                           connection closes and powers down; the cycle restarts
 */

import { clamp01, easeOutBack, easeOutCubic, lerp, smoothstep } from "../sceneKit/math";

export { clamp01, easeOutBack, easeOutCubic, lerp, smoothstep };

export const CYCLE = 40;
/* where a still frame is taken from for visitors who prefer reduced motion */
export const REDUCED_AT = 17.6;

/** Lifecycle milestones, in cycle seconds. */
export const CALL = {
  buildDone: 4.4, /* WebSocket link fully assembled */
  connected: 5.4, /* handshake complete, call goes live */
  speechEnd: 31.0, /* last audio leaves the PBX */
  closing: 35.0, /* connection starts to close */
  closed: 36.0, /* connection closed, link dark */
  teardownStart: 36.6,
  teardownEnd: 39.4,
};

/* ---- layout: everything sits on the x axis except the agent UI, out front ---- */
export const PBX = { x: -5.6, out: -4.55 };
export const HUB = { x: -2.2, inX: -3.4, outX: -1.0, gates: [-3.0, -2.2, -1.4] };
/* one bridge, PBX to STT server: pillars along it (the first three are the processing gates) */
export const BRIDGE = {
  from: PBX.out,
  to: 3.3,
  frames: [-3.0, -2.2, -1.4, 0.15, 1.5, 2.85],
  lanes: [
    { z: -0.5, from: PBX.out, to: 3.3 }, /* audio, the whole way */
    { z: 0.5, from: HUB.outX, to: 3.3 }, /* transcript, from the bridge on */
  ],
};
export const PORT = { server: 3.35 };
export const UI = { x: 2.0, z: 2.15 }; /* the agent's workstation, out front */
export const LANE_Y = 1.22;
export const LANE_Z = { audio: -0.5, data: 0.5 };

/* audio: PBX -> bridge -> STT. One 200 ms chunk every 0.2 s once it leaves the bridge. */
export const AUDIO = { start: 5.6, end: CALL.speechEnd, speed: 4.5, rate: 62, chunk: 0.2 };
AUDIO.length = PORT.server - PBX.out;
AUDIO.travel = AUDIO.length / AUDIO.speed;

/* text: STT -> bridge along the WebSocket, then out through Pusher to the agent UI */
export const PUSH = {
  p0: [HUB.outX, LANE_Y, LANE_Z.data],
  p1: [0.3, 3.5, 1.5],
  p2: [1.65, 1.25, 1.95],
};
export const pusherPoint = (t, out) => {
  const k = 1 - t;
  out.x = k * k * PUSH.p0[0] + 2 * k * t * PUSH.p1[0] + t * t * PUSH.p2[0];
  out.y = k * k * PUSH.p0[1] + 2 * k * t * PUSH.p1[1] + t * t * PUSH.p2[1];
  out.z = k * k * PUSH.p0[2] + 2 * k * t * PUSH.p1[2] + t * t * PUSH.p2[2];
  return out;
};
PUSH.length = (() => {
  const a = { x: 0, y: 0, z: 0 };
  const b = { x: 0, y: 0, z: 0 };
  let sum = 0;
  pusherPoint(0, a);
  for (let i = 1; i <= 40; i += 1) {
    pusherPoint(i / 40, b);
    sum += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    a.x = b.x;
    a.y = b.y;
    a.z = b.z;
  }
  return sum;
})();

export const DATA = { speed: 4.6, fromX: PORT.server - 0.1, toX: HUB.outX };
DATA.wsLength = DATA.fromX - DATA.toX;
DATA.length = DATA.wsLength + PUSH.length; /* STT -> bridge -> agent UI */
DATA.travel = DATA.length / DATA.speed;

const WORD_GAP = 0.4; /* seconds between spoken words */
const SERVER_LAG = 0.55; /* recognition latency inside the STT server */
const TRANSLATE_LAG = 0.5; /* the translation follows the last word of a line */

/*
 * The simulated call: both voices are streamed. The citizen speaks Hindi
 * (shown transliterated), so those lines come back with an English
 * translation; the agent speaks English and needs none.
 */
export const SCRIPT = [
  { role: "AGENT", text: "911, what's your emergency?", at: 5.9 },
  {
    role: "CITIZEN",
    text: "MG Road ke paas accident hua hai.",
    en: "There's been an accident near MG Road.",
    at: 8.9,
  },
  { role: "AGENT", text: "Is anyone injured?", at: 12.4 },
  {
    role: "CITIZEN",
    text: "Haan, ek aadmi ko ambulance chahiye.",
    en: "Yes, one man needs an ambulance.",
    at: 14.8,
  },
  { role: "AGENT", text: "Stay on the line, help is on the way.", at: 18.6 },
  {
    role: "CITIZEN",
    text: "Dhanyavaad, jaldi aaiye.",
    en: "Thank you, please come quickly.",
    at: 22.6,
  },
  { role: "AGENT", text: "Units are two minutes away.", at: 25.2 },
  {
    role: "CITIZEN",
    text: "Theek hai, mujhe woh dikh rahe hain.",
    en: "Okay, I can see them now.",
    at: 27.8,
  },
];

/** Every recognised word: spoken at the PBX, emitted by the STT server, shown on the agent UI. */
export const WORDS = SCRIPT.flatMap((line, u) =>
  line.text.split(" ").map((text, k) => {
    const spoken = line.at + k * WORD_GAP;
    const emit = spoken + AUDIO.travel + SERVER_LAG;
    return { u, k, text, spoken, emit, arrive: emit + DATA.travel };
  })
);

/** One translation packet per translated line, sent right after its last word. */
export const TRANSLATIONS = SCRIPT.flatMap((line, u) => {
  if (!line.en) return [];
  const last = WORDS.filter((word) => word.u === u).at(-1);
  const emit = last.emit + TRANSLATE_LAG;
  return [{ u, text: line.en, emit, arrive: emit + DATA.travel }];
});

/* ---- speech level: 0.14 is the open line, speech lifts it towards 1 ---- */
const LEVEL_STEP = 0.02;
const LEVEL_BASE = 0.14;
const LEVEL = new Float32Array(Math.round(CYCLE / LEVEL_STEP) + 2).fill(LEVEL_BASE);
WORDS.forEach((word) => {
  for (let s = 0; s < 0.34; s += LEVEL_STEP) {
    const i = Math.round((word.spoken + s) / LEVEL_STEP);
    const bump = LEVEL_BASE + (1 - LEVEL_BASE) * Math.sin(Math.PI * (s / 0.34)) ** 0.7;
    LEVEL[i] = Math.max(LEVEL[i], bump);
  }
});

/** Speech level at PBX time `t` (the open-line level when nobody speaks). */
export const levelAt = (t) => {
  const x = clamp01(t / CYCLE) * (LEVEL.length - 2);
  const i = Math.floor(x);
  return lerp(LEVEL[i], LEVEL[i + 1], x - i);
};

/** Fresh, reusable sample object - written into every frame, never reallocated. */
export const createSample = () => ({
  time: 0,
  t: 0,
  live: 0,
  callOn: 0,
  speak: 0,
  level: LEVEL_BASE,
  activity: 0.1,
  burst: 0,
  arrive: 0,
  textAlpha: 0,
  bridgeClock: 0,
  connectedTag: 0,
  endedTag: 0,
});

const bump = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));

export const sampleInto = (out, time) => {
  const t = time % CYCLE;
  out.time = time;
  out.t = t;

  /* the link's power: on from the handshake, off when the connection closes */
  out.live = smoothstep(CALL.buildDone, CALL.buildDone + 0.8, t) * (1 - smoothstep(CALL.closing, CALL.closed, t));

  /* the PBX streams for the whole call, whatever is being said */
  out.callOn = smoothstep(AUDIO.start - 0.3, AUDIO.start, t) * (1 - smoothstep(AUDIO.end, AUDIO.end + 0.3, t));
  out.level = levelAt(t) * out.callOn;
  out.speak = out.callOn * smoothstep(0.3, 0.7, levelAt(t));

  /* the STT server works for as long as audio is arriving, and works harder on speech */
  const serverOn =
    smoothstep(AUDIO.start + AUDIO.travel, AUDIO.start + AUDIO.travel + 0.8, t) *
    (1 - smoothstep(AUDIO.end + AUDIO.travel, AUDIO.end + AUDIO.travel + 0.8, t));
  out.activity = 0.1 + 0.9 * serverOn * (0.62 + 0.38 * levelAt(t - AUDIO.travel));

  /* the WebSocket assembles on a clock that runs back down to take it apart */
  out.bridgeClock =
    t < CALL.buildDone
      ? t
      : t < CALL.teardownStart
        ? CALL.buildDone
        : Math.max(0, CALL.buildDone * (1 - (t - CALL.teardownStart) / (CALL.teardownEnd - CALL.teardownStart)));

  out.textAlpha = 1 - smoothstep(CALL.closing, CALL.closing + 1.2, t);
  out.connectedTag = bump(t, 4.9, 5.4, CALL.speechEnd, CALL.speechEnd + 0.4);
  out.endedTag = bump(t, CALL.speechEnd + 0.4, CALL.speechEnd + 0.9, CALL.closed + 0.4, CALL.closed + 1.2);

  /* short flashes: a fragment leaving the STT server, a fragment landing on the agent UI */
  let burst = 0;
  let arrive = 0;
  for (let i = 0; i < WORDS.length; i += 1) {
    const w = WORDS[i];
    if (t >= w.emit) burst = Math.max(burst, Math.exp(-(t - w.emit) * 6));
    if (t >= w.arrive) arrive = Math.max(arrive, Math.exp(-(t - w.arrive) * 6));
  }
  out.burst = burst;
  out.arrive = arrive;
  return out;
};

/* ---- what the agent's transcript window shows at time t ---- */
const ARRIVED = new Array(SCRIPT.length).fill(0);
const TRANSLATED = new Array(SCRIPT.length).fill(false);

const tally = (t) => {
  ARRIVED.fill(0);
  TRANSLATED.fill(false);
  for (let i = 0; i < WORDS.length; i += 1) {
    if (t >= WORDS[i].arrive) ARRIVED[WORDS[i].u] = WORDS[i].k + 1;
  }
  for (let i = 0; i < TRANSLATIONS.length; i += 1) {
    if (t >= TRANSLATIONS[i].arrive) TRANSLATED[TRANSLATIONS[i].u] = true;
  }
};

/*
 * The floating transcription window is not always up: it pops open from the
 * monitor for a while, then closes again. Two openings during the call.
 */
export const POPUP_OPEN = [
  [13.5, 20.5],
  [25.5, 33.0],
];
const popupOpen = (t) => {
  let open = 0;
  for (let i = 0; i < POPUP_OPEN.length; i += 1) {
    const [a, b] = POPUP_OPEN[i];
    open = Math.max(open, smoothstep(a, a + 0.7, t) * (1 - smoothstep(b - 0.7, b, t)));
  }
  return open;
};

/* 0 connecting, 1 live, 2 call ended, 3 gone */
const windowState = (t) =>
  t < CALL.connected ? 0 : t < AUDIO.end + 0.3 ? 1 : t < CALL.closed ? 2 : 3;
const windowAlpha = (t) => 1 - smoothstep(CALL.closing, CALL.closing + 1.2, t);

/** Cheap change detector: the window is only re-rendered when this string changes. */
export const transcriptKey = (t) => {
  tally(t);
  return `${windowState(t)}|${Math.round(windowAlpha(t) * 10)}|${Math.round(popupOpen(t) * 10)}|${ARRIVED.join(",")}|${TRANSLATED.join(",")}`;
};

/** The words that have reached the agent so far, grouped by line, plus window state. */
export const transcriptSnapshot = (t) => {
  tally(t);
  const lines = [];
  let seq = 0;
  for (let u = 0; u < SCRIPT.length; u += 1) {
    if (ARRIVED[u] === 0) continue;
    seq += ARRIVED[u];
    lines.push({
      u,
      role: SCRIPT[u].role,
      words: SCRIPT[u].text.split(" ").slice(0, ARRIVED[u]),
      en: TRANSLATED[u] ? SCRIPT[u].en : null,
    });
  }
  return { state: windowState(t), alpha: windowAlpha(t), open: popupOpen(t), lines, seq };
};
