import { useCallback, useRef } from "react";

/**
 * Tracks the pointer inside an element and exposes its position as
 * `--px` / `--py` custom properties so CSS can draw a spotlight.
 * Writes are batched into a single animation frame and skipped on
 * touch devices / reduced-motion, so it never costs a frame budget.
 */
export const usePointerSpotlight = () => {
  const ref = useRef(null);
  const frame = useRef(0);

  const onPointerMove = useCallback((event) => {
    if (event.pointerType !== "mouse") return;
    const node = ref.current;
    if (!node || frame.current) return;

    const { clientX, clientY } = event;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--px", `${clientX - rect.left}px`);
      node.style.setProperty("--py", `${clientY - rect.top}px`);
    });
  }, []);

  return { ref, onPointerMove };
};
