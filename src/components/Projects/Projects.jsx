import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Section } from "../ui/Section";
import { Button } from "../ui/Button";
import { ProjectCard } from "./ProjectCard";
import { ProjectShowcase } from "./ProjectShowcase";
import { work } from "../../data/work";
import projects from "../../data/projects.json";
import styles from "./Projects.module.css";

/*
 * Which projects lead the section is a content decision, so it lives in
 * projects.json as `featured` rather than in a slice() here. Everything not
 * featured waits behind "Load more".
 */
const featured = projects.filter((project) => project.featured);
const rest = projects.filter((project) => !project.featured);

/* if nothing is flagged, fall back to showing everything rather than nothing */
const leadingSet = featured.length ? featured : projects;
const remainingSet = featured.length ? rest : [];

const GroupHeading = ({ kind, children, count }) => (
  <h3 className={styles.groupTitle} data-reveal="fade">
    <span className={`${styles.groupRule} ${styles.groupRuleLead}`} aria-hidden="true" />
    <span className={styles.groupLabel}>{kind}</span>
    <span className={styles.groupText}>{children}</span>
    <span className={styles.groupRule} aria-hidden="true" />
    <span className={styles.groupCount} aria-hidden="true">
      {String(count).padStart(2, "0")}
    </span>
  </h3>
);

/* how long a card rests in the centre before the next one steps in */
const STEP_MS = 2800;
/* after a touch, swipe or button press the rotation waits this long */
const HOLD_MS = 5000;
/* distance between neighbouring cards, as a share of one card's width */
const SPACING = 0.66;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wrap = (value, n) => ((value % n) + n) % n;
/* signed distance from the centre, the short way round the ring */
const offsetOf = (i, pos, n) => wrap(i - pos + n / 2, n) - n / 2;

/*
 * Where a card sits for a given distance from the centre. The centred card
 * is lifted forward and slightly enlarged; each step away sits lower,
 * smaller, dimmer and turned a little toward the middle, like steps going
 * back. Beyond two steps the card fades out, which is also where it wraps
 * round to the far side unseen.
 */
const place = (node, o, width) => {
  const a = Math.abs(o);
  const x = o * width * SPACING;
  const scale = 1.07 - 0.13 * Math.min(a, 2.6);
  const depth = -Math.min(a, 3) * 90;
  const turn = -Math.max(-1.5, Math.min(1.5, o)) * 9;
  node.style.transform = `translate3d(${x}px, 0, ${depth}px) rotateY(${turn}deg) scale(${scale})`;
  node.style.filter = a < 0.01 ? "none" : `brightness(${1 - 0.16 * Math.min(a, 2)})`;
  node.style.opacity = a <= 2 ? 1 : Math.max(0, 1 - (a - 2) / 0.6);
  node.style.visibility = a > 2.65 ? "hidden" : "visible";
  node.style.zIndex = String(Math.round(100 - a * 10));
};

export const Projects = () => {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(() => typeof window === "undefined" || !reducedMotion());
  const stageRef = useRef(null);
  const playingRef = useRef(playing);
  const api = useRef({ step: () => {}, go: () => {} });
  const visible = expanded ? [...leadingSet, ...remainingSet] : leadingSet;

  playingRef.current = playing;

  /*
   * A ring of cards that turns one step at a time and never ends, always in
   * the same direction. `pos` is the ring's angle in card units: its
   * rounded value is whichever card is centred, and the fraction is a step
   * in progress. Everything is written straight to the DOM each frame.
   *
   * Hands-off it advances on a timer. It stops while the pointer is over it,
   * while something inside has focus, while a finger or button has just
   * touched it, and while off screen. People can drag, swipe, scroll
   * sideways, press the arrows or click a side card, and the ring follows.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const slots = [...stage.children];
    const n = slots.length;
    const reduce = reducedMotion();

    let pos = 0;
    let target = 0;
    let rendered = NaN;
    let shown = 0;
    let last = performance.now();
    let nextAt = last + STEP_MS;
    let holdUntil = 0;
    let wasAuto = false;
    let inView = false;
    let hovering = false;
    let focused = false;
    let dragging = false;
    let moved = false;
    let suppressClick = false;
    let startX = 0;
    let startPos = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let wheelTimer = 0;
    let raf = 0;

    const width = () => slots[0]?.offsetWidth || 300;
    const hold = (ms = HOLD_MS) => {
      holdUntil = performance.now() + ms;
    };
    const render = () => {
      rendered = pos;
      const w = width();
      slots.forEach((node, i) => place(node, offsetOf(i, pos, n), w));
      const centre = wrap(Math.round(pos), n);
      if (centre !== shown) {
        shown = centre;
        setActive(centre);
      }
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.064);
      last = now;

      const auto =
        playingRef.current &&
        !reduce &&
        inView &&
        !document.hidden &&
        !hovering &&
        !focused &&
        !dragging &&
        now >= holdUntil;
      if (auto && !wasAuto) nextAt = now + STEP_MS * 0.6;
      wasAuto = auto;
      if (auto && now >= nextAt) {
        target = Math.round(target) + 1;
        nextAt = now + STEP_MS;
      }

      if (!dragging) {
        const diff = target - pos;
        if (Math.abs(diff) < 0.0008) pos = target;
        else pos += diff * (reduce ? 1 : 1 - Math.exp(-dt * 6));
      }
      if (pos !== rendered) render();
    };

    const spacingPx = () => width() * SPACING;

    const onPointerDown = (event) => {
      if (event.button > 0) return;
      dragging = false;
      moved = false;
      startX = lastX = event.clientX;
      startPos = pos;
      lastT = event.timeStamp;
      velocity = 0;
      hold();
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    };
    const onPointerMove = (event) => {
      const dx = event.clientX - startX;
      if (!dragging && Math.abs(dx) < 6) return;
      dragging = true;
      moved = true;
      const dtMs = Math.max(event.timeStamp - lastT, 1);
      velocity = (event.clientX - lastX) / dtMs;
      lastX = event.clientX;
      lastT = event.timeStamp;
      pos = startPos - dx / spacingPx();
      target = pos;
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (dragging) {
        /* a flick carries on a little way; either way it settles on a card */
        target = Math.round(pos - (velocity * 220) / spacingPx());
        dragging = false;
        suppressClick = moved;
        setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      hold();
    };

    const onClickCapture = (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      /* a side card comes to the centre first; the centred one opens normally */
      const slot = event.target.closest("[data-slot]");
      if (!slot) return;
      const i = slots.indexOf(slot);
      if (i >= 0 && wrap(Math.round(pos), n) !== i) {
        event.preventDefault();
        event.stopPropagation();
        api.current.go(i);
      }
    };

    const onWheel = (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      pos += event.deltaX / spacingPx();
      target = pos;
      hold();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        target = Math.round(pos);
      }, 140);
    };

    const onEnter = (event) => {
      if (event.pointerType === "mouse") hovering = true;
    };
    const onLeave = (event) => {
      if (event.pointerType !== "mouse") return;
      hovering = false;
      hold(500);
    };
    const onFocusIn = (event) => {
      /* only keyboard focus holds it: a mouse press leaves focus on the link for good */
      focused = event.target.matches(":focus-visible");
      const i = slots.indexOf(event.target.closest("[data-slot]"));
      if (i >= 0 && wrap(Math.round(pos), n) !== i) api.current.go(i);
    };
    const onFocusOut = () => {
      focused = false;
      hold(1500);
    };
    const onKeyDown = (event) => {
      if (event.key === "ArrowRight") api.current.step(1);
      else if (event.key === "ArrowLeft") api.current.step(-1);
    };
    const onDragStart = (event) => event.preventDefault();

    api.current = {
      step: (d) => {
        target = Math.round(target) + d;
        hold();
      },
      go: (i) => {
        const base = Math.round(target);
        target = base + Math.round(offsetOf(i, base, n));
        hold();
      },
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0.2 }
    );
    observer.observe(stage);

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointerenter", onEnter);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("click", onClickCapture, true);
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("focusin", onFocusIn);
    stage.addEventListener("focusout", onFocusOut);
    stage.addEventListener("keydown", onKeyDown);
    stage.addEventListener("dragstart", onDragStart);

    render();
    raf = requestAnimationFrame((t) => {
      last = t;
      tick(t);
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointerenter", onEnter);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("click", onClickCapture, true);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("focusout", onFocusOut);
      stage.removeEventListener("keydown", onKeyDown);
      stage.removeEventListener("dragstart", onDragStart);
    };
  }, [visible.length]);

  return (
    <Section
      id="projects"
      className={styles.root}
      index="03"
      label="Projects"
      title="Projects"
    >
      {work.length > 0 && (
        <div className={styles.group}>
          <GroupHeading kind="At work" count={work.length}>
            Public-safety systems
          </GroupHeading>
          <div className={styles.bleed}>
            <ProjectShowcase items={work} />
          </div>
        </div>
      )}

      <div className={styles.group}>
        <GroupHeading kind="Self-built" count={projects.length}>
          Live apps you can try
        </GroupHeading>

        <div
          className={styles.stage}
          ref={stageRef}
          role="group"
          aria-roledescription="carousel"
          aria-label="Self-built projects"
        >
          {visible.map((project, index) => (
            <div className={styles.slot} data-slot key={project.title}>
              <ProjectCard
                project={project}
                index={index}
                delay={(index % 3) * 90}
                active={index === active}
              />
            </div>
          ))}
        </div>

        <div className={styles.pager}>
          <span className={styles.counter} aria-live="off">
            {String(active + 1).padStart(2, "0")}
            <span className={styles.counterOf}> / {String(visible.length).padStart(2, "0")}</span>
          </span>
          <span className={styles.dots}>
            {visible.map((project, i) => (
              <button
                key={project.title}
                type="button"
                className={styles.dot}
                data-active={i === active}
                aria-label={`Show ${project.title}`}
                aria-current={i === active}
                onClick={() => api.current.go(i)}
              />
            ))}
          </span>
          <span className={styles.controls}>
            <button
              type="button"
              className={styles.ctrl}
              aria-label="Previous project"
              onClick={() => api.current.step(-1)}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.ctrl}
              aria-label="Next project"
              onClick={() => api.current.step(1)}
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.ctrl}
              aria-label={playing ? "Pause automatic scrolling" : "Play automatic scrolling"}
              aria-pressed={!playing}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? (
                <Pause size={15} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                <Play size={15} strokeWidth={2.2} aria-hidden="true" />
              )}
            </button>
          </span>
        </div>

        {remainingSet.length > 0 && !expanded && (
          <div className={styles.moreWrap}>
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronDown}
              className={styles.more}
              onClick={() => setExpanded(true)}
            >
              Load {remainingSet.length} more{" "}
              {remainingSet.length === 1 ? "project" : "projects"}
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
};
