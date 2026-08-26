import { useEffect } from "react";

/**
 * The site's single scroll listener.
 *
 * Publishes scroll state onto <html> as custom properties / attributes so any
 * number of components can react in pure CSS:
 *   --scroll-progress : 0 → 1 through the document
 *   --scroll-y        : pixels scrolled, for parallax offsets
 *   [data-scrolled]   : set once the page has left the top
 *
 * Everything is read inside one rAF frame, so no component adds its own
 * listener and there is never more than one layout read per frame.
 */
export const usePageScroll = () => {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(y / max, 1) : 0;

      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      if (!reduced) root.style.setProperty("--scroll-y", `${y}px`);

      if (y > 12) root.setAttribute("data-scrolled", "");
      else root.removeAttribute("data-scrolled");
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
};
