import { useRef } from "react";
import { usePaletteIs, usePeekGaze } from "../../hooks/usePeekGaze";
import peekUrl from "/assets/batman/batman-peek.webp?url";
import irisLUrl from "/assets/batman/batman-iris-l.webp?url";
import irisRUrl from "/assets/batman/batman-iris-r.webp?url";
import eyeLUrl from "/assets/batman/batman-eye-l.png?url";
import eyeRUrl from "/assets/batman/batman-eye-r.png?url";
import styles from "./BatPeek.module.css";

/* the artwork is 480 x 570; the irises are 84px discs centred here */
const ART_W = 480;
const ART_H = 570;
const IRIS = 84;
const EYES = [
  { cx: 165, cy: 330, iris: irisLUrl, mask: eyeLUrl },
  { cx: 327, cy: 332, iris: irisRUrl, mask: eyeRUrl },
];

/**
 * A little Batman peeking up over the bottom edge of the page whose eyes - and head -
 * follow the cursor. With nothing to follow (touch, or a still mouse) he looks around on
 * his own. The irises are separate sprites clipped to the eye shapes, so they slide inside
 * the sockets rather than the whole face swimming.
 */
const Peek = () => {
  const rootRef = useRef(null);
  const shown = usePeekGaze(rootRef, { eyeY: 0.5 });

  return (
    <div className={styles.root} ref={rootRef} data-shown={shown} aria-hidden="true">
      <div className={styles.head}>
        <img className={styles.body} src={peekUrl} alt="" width={ART_W} height={ART_H} draggable="false" />
        {EYES.map((eye) => (
          <span
            key={eye.iris}
            className={styles.socket}
            style={{ WebkitMaskImage: `url(${eye.mask})`, maskImage: `url(${eye.mask})` }}
          >
            <img
              className={styles.iris}
              src={eye.iris}
              alt=""
              draggable="false"
              style={{
                left: `${((eye.cx - IRIS / 2) / ART_W) * 100}%`,
                top: `${((eye.cy - IRIS / 2) / ART_H) * 100}%`,
                width: `${(IRIS / ART_W) * 100}%`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
};

/** Batman palette only; each time it is chosen he peeks up afresh. */
export const BatPeek = () => (usePaletteIs("batman") ? <Peek /> : null);
