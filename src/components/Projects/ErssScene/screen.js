import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

const FONT = '"JetBrains Mono", ui-monospace, "SFMono-Regular", Consolas, monospace';

/**
 * The calltaker's CAD screen: standby, then an incoming 112 call, then the GIS
 * map with the incident placed on it. A 2D canvas, repainted only when the
 * state (or the blink) actually changes.
 */
export const createCadScreen = () => {
  const W = 320;
  const H = 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  let lastKey = "";

  const paint = ({ t }) => {
    const stage = t >= 22.4 || t < 2.0 ? 0 : t < 5.2 ? 1 : 2;
    const blink = Math.floor(t * 2) % 2;
    const key = `${stage}|${blink}|${stage === 2 ? Math.floor((t - 5.2) * 2) : 0}`;
    if (key === lastKey) return;
    lastKey = key;

    ctx.fillStyle = "#07101f";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(90, 190, 255, 0.12)";
    ctx.fillRect(0, 0, W, 26);
    ctx.font = `700 14px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#dff3ff";
    ctx.fillText("CAD · CALLTAKER", 10, 13);

    if (stage === 0) {
      ctx.fillStyle = "rgba(160, 200, 235, 0.6)";
      ctx.font = `600 16px ${FONT}`;
      ctx.fillText("STANDBY", 10, 100);
      return;
    }

    if (stage === 1) {
      ctx.fillStyle = blink ? "rgba(255, 70, 80, 0.9)" : "rgba(255, 70, 80, 0.35)";
      ctx.fillRect(0, 60, W, 70);
      ctx.fillStyle = "#fff";
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText("INCOMING 112", 14, 96);
      return;
    }

    /* GIS map: a small street grid with the incident dropped on it */
    ctx.strokeStyle = "rgba(90, 190, 255, 0.28)";
    ctx.lineWidth = 1;
    for (let x = 20; x < W; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 44; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(160, 200, 235, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 104);
    ctx.lineTo(W, 104);
    ctx.moveTo(236, 30);
    ctx.lineTo(236, H);
    ctx.stroke();

    const pulse = 8 + ((Math.floor((t - 5.2) * 2) % 4) * 5);
    ctx.strokeStyle = "rgba(255, 70, 80, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(236, 72, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff4650";
    ctx.beginPath();
    ctx.arc(236, 72, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e8f6ff";
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText("INCIDENT LOCATED", 10, 44);
    ctx.fillStyle = "rgba(160, 200, 235, 0.8)";
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText("GIS · SYNCED TO DISPATCH", 10, 60);
  };

  return { texture, paint, dispose: () => texture.dispose() };
};
