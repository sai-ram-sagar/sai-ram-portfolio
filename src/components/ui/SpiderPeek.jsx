import { useRef } from "react";
import peekUrl from "/assets/spiderman/spider-peek.webp?url";
import lensUrl from "/assets/spiderman/spider-lens.webp?url";
import socketUrl from "/assets/spiderman/spider-socket.png?url";
import { usePaletteIs, usePeekGaze } from "../../hooks/usePeekGaze";
import styles from "./SpiderPeek.module.css";

/* the artwork is 268 x 521 */
const ART_W = 268;
const ART_H = 521;

/**
 * Spider-Man peeking round the right-hand edge of the page. His head leans
 * toward the cursor, and the white lenses of his mask slide inside their black
 * rims. The lenses are a separate layer clipped to the socket shape, so they
 * can never leave it; the base picture has black behind them where they were.
 */
const Peek = () => {
  const rootRef = useRef(null);
  const shown = usePeekGaze(rootRef, { eyeY: 0.35 });

  return (
    <div className={styles.root} ref={rootRef} data-shown={shown} aria-hidden="true">
      {/* the body stays put... */}
      <img className={styles.body} src={peekUrl} alt="" width={ART_W} height={ART_H} draggable="false" />
      {/* ...and only the head, with its lenses, turns toward the cursor */}
      <div className={styles.head}>
        <img className={styles.headImg} src={peekUrl} alt="" width={ART_W} height={ART_H} draggable="false" />
        <span className={styles.socket} style={{ WebkitMaskImage: `url(${socketUrl})`, maskImage: `url(${socketUrl})` }}>
          <img className={styles.lens} src={lensUrl} alt="" draggable="false" />
        </span>
      </div>
    </div>
  );
};

/** Spider-Man palette only. */
export const SpiderPeek = () => (usePaletteIs("spiderman") ? <Peek /> : null);
