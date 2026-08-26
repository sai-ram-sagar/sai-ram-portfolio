import { useEffect, useState } from "react";

/**
 * Returns the id of the section currently occupying the middle of the
 * viewport, used to drive the navbar's active indicator.
 *
 * Returns "" while the hero is in view, so the nav shows no active item
 * before the reader has actually reached a section.
 */
export const useScrollSpy = (ids) => {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const visible = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        });

        if (!visible.size) {
          /* above the first section — nothing should read as current */
          if (window.scrollY < window.innerHeight * 0.6) setActiveId("");
          return;
        }

        const [top] = [...visible.entries()].sort((a, b) => b[1] - a[1]);
        setActiveId(top[0]);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
};
