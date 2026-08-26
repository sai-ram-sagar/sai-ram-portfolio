import { ArrowDown, ArrowUpRight, Mail, MapPin } from "lucide-react";
import { getImageUrl } from "../../utils";
import { usePointerSpotlight } from "../../hooks/usePointerSpotlight";
import { Button } from "../ui/Button";
import { profile } from "../../data/profile";
import styles from "./Hero.module.css";

/**
 * The hero runs its own entrance rather than the shared scroll-reveal: it is
 * above the fold, so it plays once on load in a fixed order — frame, eyebrow,
 * name, specialism, lead, actions, chips, portrait, metrics. The order lives
 * in `--enter-delay` on each element, so the choreography is readable here
 * instead of being buried in the stylesheet.
 */
export const Hero = () => {
  const { ref, onPointerMove } = usePointerSpotlight();

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
            {profile.summary}
          </p>

          <div className={styles.actions} style={{ "--enter-delay": "600ms" }}>
            <Button as="a" href={`mailto:${profile.email}`} icon={Mail} iconSide="left">
              Contact me
            </Button>
            <Button as="a" href="#experience" variant="ghost" icon={ArrowUpRight}>
              See what I build
            </Button>
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
          <div className={styles.portraitFrame}>
            <span className={styles.orbit} aria-hidden="true" />
            <span className={styles.ring} aria-hidden="true" />
            <span className={styles.ringGlow} aria-hidden="true" />
            <img
              className={styles.portrait}
              src={getImageUrl("hero/portfolio-image-round-web.webp")}
              alt={`Portrait of ${profile.fullName}`}
              width="900"
              height="900"
              decoding="async"
            />
          </div>
          <span className={`${styles.tick} ${styles.tickTL}`} aria-hidden="true" />
          <span className={`${styles.tick} ${styles.tickBR}`} aria-hidden="true" />
        </div>
      </div>

      <ul className={styles.metrics} style={{ "--enter-delay": "820ms" }}>
        {profile.metrics.map((metric, index) => (
          <li
            key={metric.label}
            className={styles.metric}
            style={{ "--enter-delay": `${860 + index * 70}ms` }}
          >
            <span className={styles.metricValue}>{metric.value}</span>
            <span className={styles.metricLabel}>{metric.label}</span>
          </li>
        ))}
      </ul>

      <a className={styles.scrollCue} href="#about" style={{ "--enter-delay": "1120ms" }}>
        <span className={styles.scrollTrack} aria-hidden="true">
          <span className={styles.scrollDot} />
        </span>
        <span className={styles.scrollLabel}>Scroll</span>
        <ArrowDown size={13} strokeWidth={2} aria-hidden="true" />
      </a>
    </section>
  );
};
