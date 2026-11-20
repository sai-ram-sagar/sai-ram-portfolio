import { useCallback, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { smoothstep } from "./math";

/*
 * Drag-to-rotate for the project scenes.
 *
 * Offsets are kept relative to each scene's own default camera angle, so the
 * scene's composition is the resting state and every limit is symmetric:
 *   - sideways: a little over a third of a turn each way, so the scene can be
 *     seen from either end but never from "behind" its labels and screens
 *   - up/down: from a low three-quarter view to a steep one, never below the
 *     floor and never straight down
 *
 * Scrolling is never hijacked: the mouse wheel is not touched, and on touch
 * screens `touch-action: pan-y` leaves vertical swipes to the page, so only a
 * sideways drag turns the scene.
 */
const MAX_AZ = 1.9; /* radians either way, ~109 deg */
const MIN_EL = -0.28;
const MAX_EL = 0.55;
const AZ_PER_PX = 0.006;
const EL_PER_PX = 0.004;
const MAX_SPEED = 6; /* rad/s, caps a flick */

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const useOrbit = ({ reduced = false } = {}) => {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const orbit = useRef({
    az: 0,
    el: 0,
    tAz: 0,
    tEl: 0,
    vAz: 0,
    vEl: 0,
    idle: 99,
    dragging: false,
    id: null,
    x: 0,
    y: 0,
    at: 0,
    touch: false,
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const s = orbit.current;
    const previous = { cursor: canvas.style.cursor, touchAction: canvas.style.touchAction };

    /* the cursor says "draggable"; vertical touch swipes stay with the page */
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "pan-y";

    const end = (event) => {
      if (!s.dragging || (event && event.pointerId !== s.id)) return;
      s.dragging = false;
      canvas.style.cursor = "grab";
      if (event && canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (reduced) s.vAz = s.vEl = 0;
    };

    const down = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      s.dragging = true;
      s.id = event.pointerId;
      s.x = event.clientX;
      s.y = event.clientY;
      s.at = performance.now();
      s.touch = event.pointerType !== "mouse";
      s.vAz = 0;
      s.vEl = 0;
      s.idle = 0;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.style.cursor = "grabbing";
    };

    const move = (event) => {
      if (!s.dragging || event.pointerId !== s.id) return;
      const dx = event.clientX - s.x;
      const dy = event.clientY - s.y;
      const now = performance.now();
      const dt = Math.max(0.001, (now - s.at) / 1000);
      s.x = event.clientX;
      s.y = event.clientY;
      s.at = now;

      /* dragging right swings the scene right, i.e. the camera round to the left */
      const dAz = -dx * AZ_PER_PX;
      const dEl = s.touch ? 0 : dy * EL_PER_PX;
      s.tAz = clamp(s.tAz + dAz, -MAX_AZ, MAX_AZ);
      s.tEl = clamp(s.tEl + dEl, MIN_EL, MAX_EL);
      s.vAz = clamp(s.vAz * 0.4 + (dAz / dt) * 0.6, -MAX_SPEED, MAX_SPEED);
      s.vEl = clamp(s.vEl * 0.4 + (dEl / dt) * 0.6, -MAX_SPEED, MAX_SPEED);
      s.idle = 0;
      if (reduced) invalidate();
    };

    /* a double click or double tap returns to the composed view */
    const reset = () => {
      s.tAz = 0;
      s.tEl = 0;
      s.vAz = 0;
      s.vEl = 0;
      s.idle = 0;
      if (reduced) invalidate();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("dblclick", reset);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
      canvas.removeEventListener("dblclick", reset);
      canvas.style.cursor = previous.cursor;
      canvas.style.touchAction = previous.touchAction;
    };
  }, [gl, invalidate, reduced]);

  /**
   * Call once per frame. Lets a flick coast to a stop, eases the camera to its
   * target, and reports `calm` (0 while being handled, rising to 1 a couple of
   * seconds after the last touch) so the idle sway can fade back in.
   */
  const step = useCallback(
    (delta) => {
      const s = orbit.current;
      const dt = Math.min(delta, 0.05);
      if (s.dragging) {
        s.idle = 0;
      } else {
        s.tAz = clamp(s.tAz + s.vAz * dt, -MAX_AZ, MAX_AZ);
        s.tEl = clamp(s.tEl + s.vEl * dt, MIN_EL, MAX_EL);
        const decay = Math.exp(-dt * 3.5);
        s.vAz *= decay;
        s.vEl *= decay;
        s.idle += dt;
      }
      const follow = reduced ? 1 : 1 - Math.exp(-dt * 14);
      s.az += (s.tAz - s.az) * follow;
      s.el += (s.tEl - s.el) * follow;
      return { az: s.az, el: s.el, calm: reduced ? 1 : smoothstep(0.6, 2.4, s.idle) };
    },
    [reduced]
  );

  return step;
};
