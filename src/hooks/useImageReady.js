import { useCallback, useState } from "react";

/**
 * Tracks whether an <img> has finished loading, for swapping a skeleton out.
 *
 * Two details this exists to get right:
 *
 * - A cached image can already be complete before React attaches `onLoad`,
 *   so the ref callback checks `complete` rather than waiting for an event
 *   that will never fire.
 * - A failed image also counts as ready. A skeleton that waits for a load
 *   that never comes is a placeholder the visitor can never get past.
 */
export const useImageReady = () => {
  const [ready, setReady] = useState(false);

  const ref = useCallback((node) => {
    if (node?.complete) setReady(true);
  }, []);

  const settle = useCallback(() => setReady(true), []);

  return { ready, imageProps: { ref, onLoad: settle, onError: settle } };
};
