import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, FileText, Mail, MapPin } from "lucide-react";
import { getImageUrl } from "../../utils";
import { usePointerSpotlight } from "../../hooks/usePointerSpotlight";
import { useImageReady } from "../../hooks/useImageReady";
import { Button } from "../ui/Button";
import { ResumeModal } from "../ui/ResumeModal";
import { profile } from "../../data/profile";
import styles from "./Hero.module.css";

/**
 * The hero runs its own entrance rather than the shared scroll-reveal: it is
 * above the fold, so it plays once on load in a fixed order - frame, eyebrow,
 * name, specialism, lead, actions, chips, portrait. The order lives
 * in `--enter-delay` on each element, so the choreography is readable here
 * instead of being buried in the stylesheet.
 */
export const Hero = () => {
  const { ref, onPointerMove } = usePointerSpotlight();
  const { ready: portraitReady, imageProps } = useImageReady();
  const [resumeOpen, setResumeOpen] = useState(false);
  const tiltRef = useRef(null);

  /*
   * The photo leans towards the cursor, like a card in 3D. Only a mouse does
   * this (touch has no hover), and not for visitors who prefer reduced motion.
   * It writes two custom properties (-1..1) once per frame; the CSS does the rest.
   */
  useEffect(() => {
    const node = tiltRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const set = (x, y) => {
      node.style.setProperty("--tilt-x", x.toFixed(3));
      node.style.setProperty("--tilt-y", y.toFixed(3));
    };
    const onMove = (event) => {
      if (event.pointerType !== "mouse" || frame) return;
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = node.getBoundingClientRect();
        /* measured from the photo's centre, over about a screen's width, then clamped */
        const x = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (window.innerWidth * 0.45)));
        const y = Math.max(-1, Math.min(1, (clientY - (r.top + r.height / 2)) / (window.innerHeight * 0.45)));
        set(x, y);
      });
    };
    const onLeave = () => set(0, 0);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className={styles.hero} id="top" ref={ref} onPointerMove={onPointerMove}>
      <span className={styles.pointerGlow} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.kicker} style={{ "--enter-delay": "120ms" }}>
            <span className={styles.kickerDot} aria-hidden="true" />
            <span className={styles.kickerRole}>{profile.role}</span>
            <span className={styles.kickerSep} aria-hidden="true" />
            <span className={styles.kickerPlace}>
              <MapPin size={12} strokeWidth={2} aria-hidden="true" />
              {profile.location}
            </span>
          </p>

          <h1 className={styles.title}>
            <span className={styles.greeting} style={{ "--enter-delay": "200ms" }}>
              Hi, I&apos;m
            </span>
            <span className={styles.nameMask} style={{ "--enter-delay": "280ms" }}>
              <span className={styles.name}>{profile.fullName}</span>
            </span>
          </h1>

          <p className={styles.specialism} style={{ "--enter-delay": "420ms" }}>
            <span className={styles.specialismRule} aria-hidden="true" />
            <span className={styles.specialismText}>
              {profile.specialism}
              <span className={styles.stackLine}>
                <span className={styles.slash} aria-hidden="true">
                  {"//"}
                </span>
                {profile.stackLine}
              </span>
            </span>
          </p>

          <p className={styles.lead} style={{ "--enter-delay": "520ms" }}>
            {profile.lead}
          </p>

          <div className={styles.actions} style={{ "--enter-delay": "600ms" }}>
            <Button as="a" href={`mailto:${profile.email}`} icon={Mail} iconSide="left">
              Contact me
            </Button>
            <Button as="a" href="#experience" variant="ghost" icon={ArrowUpRight}>
              See what I build
            </Button>
            {/* the wrapper carries the effects that must spill outside the
                button's clipped surface: the breathing halo and the ping badge */}
            <span className={styles.resumeCta}>
              <Button
                variant="ghost"
                icon={FileText}
                iconSide="left"
                className={styles.resumeBtn}
                onClick={() => setResumeOpen(true)}
                aria-haspopup="dialog"
              >
                View resume
              </Button>
              <span className={styles.resumeBadge} aria-hidden="true" />
            </span>
          </div>

          <ul className={styles.focus} style={{ "--enter-delay": "680ms" }}>
            {profile.focus.map((item, index) => (
              <li
                key={item}
                className={styles.focusItem}
                style={{ "--enter-delay": `${740 + index * 55}ms` }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.portraitWrap} style={{ "--enter-delay": "300ms" }}>
          <div className={styles.portraitFrame} ref={tiltRef}>
            <span className={styles.ripple} aria-hidden="true" />
            <span className={`${styles.ripple} ${styles.rippleLate}`} aria-hidden="true" />
            <span className={styles.orbit} aria-hidden="true" />
            <span className={styles.ring} aria-hidden="true" />
            <span className={styles.ringGlow} aria-hidden="true" />
            {!portraitReady && (
              <span className={`skeleton ${styles.portraitSkeleton}`} aria-hidden="true" />
            )}
            <img
              className={`${styles.portrait} ${portraitReady ? styles.portraitReady : ""}`}
              src={getImageUrl("hero/portfolio-image-round-web.png")}
              alt={`Portrait of ${profile.fullName}`}
              width="900"
              height="900"
              decoding="async"
              {...imageProps}
            />
            <span className={styles.shine} aria-hidden="true" />
          </div>
          <span className={`${styles.tick} ${styles.tickTL}`} aria-hidden="true" />
          <span className={`${styles.tick} ${styles.tickBR}`} aria-hidden="true" />
        </div>
      </div>

      <a className={styles.scrollCue} href="#about" style={{ "--enter-delay": "880ms" }}>
        <span className={styles.scrollTrack} aria-hidden="true">
          <span className={styles.scrollDot} />
        </span>
        <span className={styles.scrollLabel}>Scroll</span>
        <ArrowDown size={13} strokeWidth={2} aria-hidden="true" />
      </a>

      {resumeOpen && <ResumeModal onClose={() => setResumeOpen(false)} />}
    </section>
  );
};
