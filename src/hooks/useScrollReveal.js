import { useEffect } from "react";

/**
 * Scroll-reveal for every `[data-reveal]` element.
 *
 * Three things matter here, each fixing a way this can silently hide content:
 *
 * 1. The `data-reveal-active` flag on <html> is what switches the CSS from
 *    "visible" to "hidden until revealed". It is only set once an observer
 *    exists, so content is never hidden by a system that cannot un-hide it.
 *
 * 2. A MutationObserver registers elements that appear after mount — the extra
 *    cards behind "Show more projects" would otherwise keep the pre-reveal
 *    opacity forever. For the same reason the IntersectionObserver is never
 *    torn down early: it has to be alive when that content arrives.
 *
 * 3. A geometric sweep runs when the document becomes visible. A page loaded
 *    in a background tab computes no intersections at all, so without this the
 *    first screenful can stay blank after the reader switches to it.
 */
export const useScrollReveal = () => {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canObserve = !reduced && "IntersectionObserver" in window;

    if (!canObserve) return;

    const reveal = (node) => node.setAttribute("data-revealed", "");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      /* threshold 0: some targets are 1px rules whose area never reaches a ratio */
      { rootMargin: "0px 0px -12% 0px", threshold: 0 }
    );

    const register = (node) => {
      const nodes =
        node.matches && node.matches("[data-reveal]")
          ? [node, ...node.querySelectorAll("[data-reveal]")]
          : [...node.querySelectorAll("[data-reveal]")];

      nodes.forEach((el) => {
        if (!el.hasAttribute("data-revealed")) observer.observe(el);
      });
    };

    /* reveal anything already on screen, for when the observer could not run */
    const sweep = (nodes) => {
      const list = nodes ?? document.querySelectorAll("[data-reveal]:not([data-revealed])");
      const viewport = window.innerHeight;

      list.forEach((el) => {
        if (el.hasAttribute("data-revealed")) return;
        /*
         * A zero-height viewport (embedded/offscreen frames) makes both the
         * observer and the rect test meaningless — every element reads as
         * off-screen forever. Show the content rather than judge it.
         */
        if (viewport > 0) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= viewport * 0.88 || rect.bottom <= 0) return;
        }
        reveal(el);
        observer.unobserve(el);
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") sweep();
    };

    root.setAttribute("data-reveal-active", "");
    register(document.body);

    /*
     * Nodes added after mount come from a deliberate action — pressing "Load
     * more". Those are swept on a short timer instead of being left to the
     * observer: the reader asked for that content, so it must not depend on an
     * intersection callback that may be deferred (or, in a background tab,
     * never delivered at all).
     */
    let sweepTimer = 0;
    const scheduleSweep = (nodes) => {
      clearTimeout(sweepTimer);
      sweepTimer = setTimeout(() => sweep(nodes), 120);
    };

    const mutations = new MutationObserver((records) => {
      const added = [];
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          register(node);
          if (node.matches("[data-reveal]")) added.push(node);
          added.push(...node.querySelectorAll("[data-reveal]"));
        });
      });
      if (added.length) scheduleSweep(added);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(sweepTimer);
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      root.removeAttribute("data-reveal-active");
    };
  }, []);
};
