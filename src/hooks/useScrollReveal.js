import { useEffect } from "react";

/**
 * Reveals every `[data-reveal]` element once it scrolls into view by setting
 * `[data-revealed]`. The variant attribute is left untouched so the entrance
 * style (up / fade / scale / side / mask) survives.
 *
 * One shared IntersectionObserver for the whole page — cheaper than an
 * observer per component.
 *
 * A MutationObserver registers elements that appear after mount. Content added
 * later — the extra cards behind "Show more projects" — starts at the
 * pre-reveal opacity, so anything the initial scan misses stays invisible
 * permanently. For the same reason the IntersectionObserver is never torn down
 * early: it has to still be alive when that content arrives.
 */
export const useScrollReveal = () => {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canObserve = !reduced && "IntersectionObserver" in window;

    const reveal = (node) => node.setAttribute("data-revealed", "");

    const observer = canObserve
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              reveal(entry.target);
              observer.unobserve(entry.target);
            });
          },
          /* threshold 0: some targets are 1px rules whose area never reaches a ratio */
          { rootMargin: "0px 0px -12% 0px", threshold: 0 }
        )
      : null;

    const register = (root) => {
      const nodes =
        root.matches && root.matches("[data-reveal]")
          ? [root, ...root.querySelectorAll("[data-reveal]")]
          : [...root.querySelectorAll("[data-reveal]")];

      nodes.forEach((node) => {
        if (node.hasAttribute("data-revealed")) return;
        if (observer) observer.observe(node);
        else reveal(node);
      });
    };

    register(document.body);

    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) register(node);
        });
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutations.disconnect();
    };
  }, []);
};
