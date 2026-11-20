import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from "three";
import { mulberry32 } from "../sceneKit/math";

const FONT = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';

const makeCanvas = (w, h) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

const toTexture = (canvas, repeat = false) => {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  return texture;
};

const pill = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/* waypoint badge: dark disc, white ring and number - tinted per state by the sprite */
export const createNumberTexture = (n) => {
  const canvas = makeCanvas(96, 96);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(6, 12, 24, 0.92)";
  ctx.beginPath();
  ctx.arc(48, 48, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 46px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), 48, 51);
  return toTexture(canvas);
};

/**
 * Minimal text pill, sized to its text so it stays legible at card scale.
 * The width-to-height ratio is left on `texture.userData.aspect` for sprites.
 */
export const createTagTexture = (text, { accent = "#5cf2ff", icon = null } = {}) => {
  const height = 56;
  const measure = makeCanvas(8, 8).getContext("2d");
  measure.font = `700 30px ${FONT}`;
  const lead = icon === "check" ? 44 : 0;
  const width = Math.ceil(measure.measureText(text).width) + 40 + lead;

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  pill(ctx, 2, 2, width - 4, height - 4, 14);
  ctx.fillStyle = "rgba(6, 12, 24, 0.86)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e8f6ff";
  ctx.font = `700 30px ${FONT}`;
  if (icon === "check") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(18, 29);
    ctx.lineTo(27, 38);
    ctx.lineTo(44, 19);
    ctx.stroke();
  }
  ctx.fillText(text, 20 + lead, 30);
  const texture = toTexture(canvas);
  texture.userData.aspect = width / height;
  return texture;
};

/** Sprite scale for a tag texture of a given world height. */
export const tagScale = (texture, worldHeight) => [worldHeight * texture.userData.aspect, worldHeight, 1];

/**
 * Floating waypoint readout (number, altitude, speed). One shared canvas that
 * is repainted only when it switches to a different waypoint.
 */
export const createInfoPainter = () => {
  const canvas = makeCanvas(232, 96);
  const ctx = canvas.getContext("2d");
  const texture = toTexture(canvas);
  let lastKey = "";

  const paint = ({ number, altitude, speed }) => {
    const key = `${number}|${altitude}|${speed}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(0, 0, 232, 96);
    pill(ctx, 3, 3, 226, 90, 16);
    ctx.fillStyle = "rgba(6, 12, 24, 0.9)";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255, 207, 112, 0.8)";
    ctx.stroke();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffcf70";
    ctx.font = `700 36px ${FONT}`;
    ctx.fillText(`WP ${String(number).padStart(2, "0")}`, 18, 33);
    ctx.fillStyle = "#e8f6ff";
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(`${altitude} m · ${speed} m/s`, 18, 69);
    texture.needsUpdate = true;
  };
  return { texture, paint, dispose: () => texture.dispose() };
};

/**
 * Small battery readout above the drone. Painted only when the rounded
 * percentage (or charging state) changes.
 */
export const createBatteryPainter = () => {
  const canvas = makeCanvas(196, 64);
  const ctx = canvas.getContext("2d");
  const texture = toTexture(canvas);
  let lastKey = "";

  const paint = (pct, charging) => {
    const value = Math.round(pct);
    const key = `${value}|${charging}`;
    if (key === lastKey) return;
    lastKey = key;
    ctx.clearRect(0, 0, 196, 64);
    pill(ctx, 2, 2, 192, 60, 14);
    ctx.fillStyle = "rgba(6, 12, 24, 0.88)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(160, 200, 235, 0.45)";
    ctx.stroke();

    const fill = charging ? "#5cf2ff" : value < 45 ? "#ffb454" : "#7dffc4";
    /* cell */
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#cfe6f7";
    pill(ctx, 12, 16, 62, 32, 6);
    ctx.stroke();
    ctx.fillStyle = "#cfe6f7";
    ctx.fillRect(76, 26, 5, 12);
    ctx.fillStyle = fill;
    pill(ctx, 16, 20, Math.max(5, 54 * (value / 100)), 24, 3);
    ctx.fill();
    if (charging) {
      ctx.fillStyle = "#06121f";
      ctx.beginPath();
      ctx.moveTo(48, 20);
      ctx.lineTo(36, 34);
      ctx.lineTo(43, 34);
      ctx.lineTo(39, 44);
      ctx.lineTo(53, 29);
      ctx.lineTo(46, 29);
      ctx.closePath();
      ctx.fill();
    }
    /* percentage */
    ctx.fillStyle = "#e8f6ff";
    ctx.font = `700 34px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`${value}%`, 90, 34);
    texture.needsUpdate = true;
  };
  return { texture, paint, dispose: () => texture.dispose() };
};

/**
 * Window textures for the town. The wall is near-white so each building's
 * vertex colour tints it; the emissive map lights a few windows warm so the
 * town reads as a lived-in miniature in the dark navy environment.
 */
export const createFacadeTextures = () => {
  const size = 128;
  const map = makeCanvas(size, size);
  const glow = makeCanvas(size, size);
  const mctx = map.getContext("2d");
  const gctx = glow.getContext("2d");
  const rand = mulberry32(7);

  mctx.fillStyle = "#f2f2f2";
  mctx.fillRect(0, 0, size, size);
  gctx.fillStyle = "#000";
  gctx.fillRect(0, 0, size, size);

  const cells = 2;
  const cell = size / cells;
  for (let r = 0; r < cells; r += 1) {
    for (let c = 0; c < cells; c += 1) {
      const x = c * cell + cell * 0.2;
      const y = r * cell + cell * 0.22;
      const w = cell * 0.6;
      const h = cell * 0.5;
      mctx.fillStyle = "#2c3a52";
      mctx.fillRect(x, y, w, h);
      mctx.fillStyle = "rgba(255,255,255,0.18)";
      mctx.fillRect(x, y, w, 3);
      if (rand() > 0.74) {
        gctx.fillStyle = "#ffcf8a";
        gctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      }
    }
  }
  return { map: toTexture(map, true), emissive: toTexture(glow, true) };
};

/* the "H" of the launch pad */
export const createPadTexture = () => {
  const canvas = makeCanvas(256, 256);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#2b3340";
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#cfe6f7";
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#cfe6f7";
  ctx.font = `700 120px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("H", 128, 138);
  return toTexture(canvas);
};
