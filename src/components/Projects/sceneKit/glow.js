import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

/* one soft radial dot, shared by every glow sprite and particle in every scene */
let glow;
export const getGlowTexture = () => {
  if (glow) return glow;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glow = new CanvasTexture(canvas);
  glow.colorSpace = SRGBColorSpace;
  glow.minFilter = LinearFilter;
  return glow;
};
