import { Component, Suspense, useEffect, useRef, useState } from "react";
import { Rotate3d } from "lucide-react";
import styles from "./SceneStage.module.css";

class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    /* while a retry is pending the stage stays blank rather than flashing the message */
    return this.props.final ? (
      <p className={styles.fallback}>3D preview unavailable on this device.</p>
    ) : null;
  }
}

/* one lighter retry (no antialiasing, 1x pixel ratio) before giving up */
const MAX_RETRIES = 1;

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return reduced;
};

/**
 * Frame for a lazy-loaded 3D scene.
 *
 * three.js and react-three-fiber are only fetched when the card nears the
 * viewport, and the render loop pauses whenever it scrolls out of view, so the
 * rest of the page never pays for a scene. `Scene` must be a React.lazy
 * component taking `active` and `reduced`; extra props are passed through.
 * `children` are plain HTML overlays drawn above the canvas. `immersive` drops
 * the framed look so the stage can fill whatever area it is placed in.
 */
export const SceneStage = ({ Scene, label, immersive = false, children, ...sceneProps }) => {
  const stageRef = useRef(null);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  /* the "drag to rotate" hint steps aside the first time the scene is touched */
  const [touched, setTouched] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !("IntersectionObserver" in window)) {
      setNear(true);
      setOnScreen(true);
      return undefined;
    }
    /* mount a little early so the scene is ready by the time it scrolls in */
    const preload = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "300px 0px" }
    );
    const visibility = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.05 }
    );
    preload.observe(stage);
    visibility.observe(stage);
    return () => {
      preload.disconnect();
      visibility.disconnect();
    };
  }, []);

  /* A failed context (busy or constrained GPU) is often transient: say why in
     the console, then try once more with lighter settings. */
  const handleError = (error) => {
    console.error("3D scene failed to start:", error);
    if (attempt < MAX_RETRIES) setTimeout(() => setAttempt((n) => n + 1), 600);
    else setGaveUp(true);
  };

  return (
    <div
      ref={stageRef}
      className={`${styles.stage} ${immersive ? styles.immersive : ""}`}
      data-stage=""
      onPointerDown={() => setTouched(true)}
      role="img"
      aria-label={label}
    >
      <span className={styles.skeleton} aria-hidden="true" />
      {near && (
        <SceneBoundary key={attempt} onError={handleError} final={gaveUp}>
          <Suspense fallback={null}>
            <div className={styles.canvas}>
              <Scene active={onScreen} reduced={reduced} lowPower={attempt > 0} immersive={immersive} {...sceneProps} />
            </div>
          </Suspense>
        </SceneBoundary>
      )}
      {near && !touched && !gaveUp && (
        <span className={`${styles.hint} ${immersive ? styles.hintWide : ""}`} aria-hidden="true">
          <Rotate3d size={13} strokeWidth={1.9} />
          <span className={styles.hintMouse}>Drag to rotate</span>
          <span className={styles.hintTouch}>Swipe to rotate</span>
        </span>
      )}
      {children}
    </div>
  );
};
