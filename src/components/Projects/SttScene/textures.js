import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import { AUDIO, CALL, SCRIPT, TRANSLATIONS, WORDS } from "./timeline";

const FONT = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';

const makeCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const toTexture = (canvas) => {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.anisotropy = 4;
  return texture;
};

export { getGlowTexture } from "../sceneKit/glow";

/* faint engineering grid for the diorama floor, brighter every fourth line */
export const createGridTexture = () => {
  const canvas = makeCanvas(1024, 512);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 1024, 512);
  const cell = 1024 / 26;
  for (let i = 0; i <= 26; i += 1) {
    ctx.strokeStyle = i % 4 === 0 ? "rgba(80,190,255,0.34)" : "rgba(80,190,255,0.13)";
    ctx.lineWidth = i % 4 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, 512);
    ctx.stroke();
  }
  for (let j = 0; j <= 12; j += 1) {
    ctx.strokeStyle = j % 4 === 0 ? "rgba(80,190,255,0.34)" : "rgba(80,190,255,0.13)";
    ctx.lineWidth = j % 4 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(0, j * cell);
    ctx.lineTo(1024, j * cell);
    ctx.stroke();
  }
  return toTexture(canvas);
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/* minimal technical label: a small pill with a title and a one-line detail */
export const createLabelTexture = (title, detail) => {
  const canvas = makeCanvas(360, 104);
  const ctx = canvas.getContext("2d");
  roundRect(ctx, 3, 3, 354, 98, 16);
  ctx.fillStyle = "rgba(6, 12, 26, 0.78)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(90, 200, 255, 0.55)";
  ctx.stroke();

  ctx.fillStyle = "#5cf2ff";
  ctx.beginPath();
  ctx.arc(30, 38, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = "middle";
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = "#e6f6ff";
  ctx.fillText(title, 50, 38);
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = "rgba(160, 200, 235, 0.85)";
  ctx.fillText(detail, 30, 74);
  return toTexture(canvas);
};

const wrap = (ctx, text, maxWidth) => {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/**
 * The agent UI's screen. A 2D canvas is the right tool for text; the scene
 * only uploads it when something on it actually changed, so a frame with
 * nothing new costs nothing. Words appear one by one as their fragments
 * arrive over Pusher, and a translated line is followed by its English version.
 */
export const createScreen = () => {
  const W = 640;
  const H = 400;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const texture = toTexture(canvas);
  let lastKey = "";
  const arrived = new Array(SCRIPT.length).fill(0);
  const translated = new Array(SCRIPT.length).fill(false);

  const paint = ({ t, level, textAlpha }) => {
    arrived.fill(0);
    translated.fill(false);
    let latest = -1;
    for (let i = 0; i < WORDS.length; i += 1) {
      const w = WORDS[i];
      if (t >= w.arrive) {
        arrived[w.u] = w.k + 1;
        latest = Math.max(latest, w.u);
      }
    }
    for (let i = 0; i < TRANSLATIONS.length; i += 1) {
      if (t >= TRANSLATIONS[i].arrive) translated[TRANSLATIONS[i].u] = true;
    }
    const live = t >= CALL.connected && t < AUDIO.end + 0.3;
    const status =
      t < CALL.connected ? "CONNECTING" : live ? "LIVE · VIA PUSHER" : t < CALL.closed ? "CALL ENDED" : "DISCONNECTED";
    const barFrame = live ? Math.floor(t * 14) : t < CALL.connected ? Math.floor(t * 3) : -1;
    const cursor = live ? Math.floor(t * 2) % 2 : 0;
    const key = `${arrived.join(",")}|${translated.join(",")}|${textAlpha.toFixed(2)}|${status}|${barFrame}|${cursor}`;
    if (key === lastKey) return;
    lastKey = key;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1730");
    bg.addColorStop(1, "#050b18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* title bar */
    ctx.fillStyle = "rgba(90, 190, 255, 0.1)";
    ctx.fillRect(0, 0, W, 54);
    ctx.fillStyle = live ? "#ff6b7a" : status === "CONNECTING" ? "#ffcf70" : "#5cf2ff";
    ctx.beginPath();
    ctx.arc(30, 27, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = "middle";
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = "#dff3ff";
    ctx.fillText("LIVE TRANSCRIPT", 50, 28);
    ctx.font = `600 17px ${FONT}`;
    ctx.fillStyle = "rgba(140, 205, 255, 0.9)";
    ctx.textAlign = "right";
    ctx.fillText(status, W - 26, 28);
    ctx.textAlign = "left";

    if (t < CALL.connected) {
      ctx.fillStyle = "rgba(223, 243, 255, 0.85)";
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText(`Opening WebSocket${".".repeat(1 + (barFrame % 3))}`, 30, 150);
    }

    /* transcript: newest lines are kept, older ones scroll off the top */
    ctx.save();
    ctx.globalAlpha = textAlpha;
    const blocks = [];
    for (let u = 0; u <= latest; u += 1) {
      if (arrived[u] === 0) continue;
      ctx.font = `600 25px ${FONT}`;
      const words = SCRIPT[u].text.split(" ").slice(0, arrived[u]).join(" ");
      const lines = wrap(ctx, words, W - 60);
      let en = [];
      if (translated[u]) {
        ctx.font = `500 22px ${FONT}`;
        en = wrap(ctx, SCRIPT[u].en, W - 100);
      }
      blocks.push({ role: SCRIPT[u].role, lines, en, u });
    }
    const blockHeight = (b) => 22 + b.lines.length * 30 + b.en.length * 27 + 12;
    const room = H - 54 - 52 - 12;
    let used = 0;
    let first = blocks.length;
    while (first > 0) {
      const h = blockHeight(blocks[first - 1]);
      if (used + h > room) break;
      used += h;
      first -= 1;
    }
    let y = 80;
    for (let b = first; b < blocks.length; b += 1) {
      const block = blocks[b];
      ctx.font = `700 15px ${FONT}`;
      ctx.fillStyle = block.role === "AGENT" ? "#6aa8ff" : "#5cf2ff";
      ctx.fillText(block.role, 30, y);
      ctx.font = `600 25px ${FONT}`;
      ctx.fillStyle = "#e8f6ff";
      block.lines.forEach((line, row) => ctx.fillText(line, 30, y + 26 + row * 30));
      let ty = y + 26 + block.lines.length * 30;
      if (b === blocks.length - 1 && live && cursor && !block.en.length) {
        const last = block.lines[block.lines.length - 1] ?? "";
        ctx.fillStyle = "#5cf2ff";
        ctx.fillRect(30 + ctx.measureText(last).width + 5, y + 26 + (block.lines.length - 1) * 30 - 14, 11, 26);
      }
      if (block.en.length) {
        ctx.font = `700 13px ${FONT}`;
        ctx.fillStyle = "#ffcf70";
        ctx.fillText("EN", 30, ty + 2);
        ctx.font = `500 22px ${FONT}`;
        block.en.forEach((line, row) => ctx.fillText(line, 62, ty + 2 + row * 27));
        ty += block.en.length * 27;
      }
      y = ty + 22;
    }
    ctx.restore();

    /* live input level */
    const barW = 9;
    const gap = 5;
    const count = Math.floor((W - 60) / (barW + gap));
    for (let i = 0; i < count; i += 1) {
      const wave = Math.abs(Math.sin(barFrame * 0.9 + i * 0.55) * Math.sin(i * 0.23 + barFrame * 0.21));
      const amount = barFrame < 0 ? 0.06 : live ? 0.1 + level * 0.9 * wave : 0.08 + 0.2 * wave;
      const h = 4 + amount * 18;
      ctx.fillStyle = live ? "rgba(92,242,255,0.78)" : "rgba(90,190,255,0.25)";
      ctx.fillRect(30 + i * (barW + gap), H - 18 - h, barW, h);
    }

    texture.needsUpdate = true;
  };

  return { texture, paint, dispose: () => texture.dispose() };
};

/**
 * Small direction tag for a conduit - "AUDIO" with an arrow pointing the way
 * the traffic flows. Aspect ratio is left on `texture.userData.aspect`.
 */
export const createLaneTag = (text, direction, color) => {
  const height = 56;
  const measure = makeCanvas(8, 8).getContext("2d");
  measure.font = `700 28px ${FONT}`;
  const textW = Math.ceil(measure.measureText(text).width);
  const width = textW + (direction ? 92 : 44);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");

  roundRect(ctx, 2, 2, width - 4, height - 4, 14);
  ctx.fillStyle = "rgba(6, 12, 26, 0.86)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.stroke();
  ctx.globalAlpha = 1;

  const right = direction === "right";
  const textX = direction === "left" ? 66 : 22;
  ctx.fillStyle = "#e6f6ff";
  ctx.font = `700 28px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, textX, 30);

  if (!direction) {
    const flat = toTexture(canvas);
    flat.userData.aspect = width / height;
    return flat;
  }

  /* arrow: a shaft and a head, pointing with the flow */
  const ax = right ? textX + textW + 12 : 18;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, 28);
  ctx.lineTo(ax + 34, 28);
  ctx.stroke();
  ctx.beginPath();
  if (right) {
    ctx.moveTo(ax + 44, 28);
    ctx.lineTo(ax + 30, 18);
    ctx.lineTo(ax + 30, 38);
  } else {
    ctx.moveTo(ax - 10, 28);
    ctx.lineTo(ax + 4, 18);
    ctx.lineTo(ax + 4, 38);
  }
  ctx.closePath();
  ctx.fill();

  const texture = toTexture(canvas);
  texture.userData.aspect = width / height;
  return texture;
};

/** Sprite scale for a tag texture of a given world height. */
export const tagScale = (texture, worldHeight) => [worldHeight * texture.userData.aspect, worldHeight, 1];
