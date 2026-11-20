import styles from "./TranscriptPopup.module.css";

/* only the latest lines are kept in view; older ones scroll off the top */
const VISIBLE_LINES = 3;

/**
 * The agent's floating transcription window. It pops open beside the monitor
 * for a while during the call and then closes again. While open it shows what
 * Pusher has delivered so far - each recognised word appears the moment its
 * fragment arrives, and a translated line is followed by its English version.
 * Plain HTML, so the text stays crisp.
 */
export const TranscriptPopup = ({ snapshot }) => {
  const { state, alpha, open, lines, seq } = snapshot;
  const live = state === 1;
  const shown = lines.slice(-VISIBLE_LINES);
  const status = state === 0 ? "Connecting" : live ? "Live · via Pusher" : "Call ended";
  const last = shown.length - 1;

  return (
    <div
      className={styles.anchor}
      data-state={state}
      style={{ "--open": open, opacity: state === 3 ? 0 : alpha * open, visibility: open < 0.02 ? "hidden" : "visible" }}
      aria-hidden="true"
    >
      {/* a pointer from the window's corner to the monitor screen it belongs to */}
      <span className={styles.pointer} />

      {/* the ping restarts on every delivered word: two names alternate so it replays */}
      <div className={styles.window} data-ping={seq % 2}>
        <header className={styles.bar}>
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.title}>Live transcript</span>
          <span className={`${styles.status} ${live ? styles.statusLive : ""}`}>{status}</span>
        </header>

        <div className={styles.body}>
          {shown.length === 0 ? (
            <p className={styles.waiting}>
              {state === 0 ? "Opening WebSocket" : "Listening"}
              <span className={styles.ellipsis} aria-hidden="true" />
            </p>
          ) : (
            shown.map((line, i) => (
              <div key={line.u} className={`${styles.line} ${i < last ? styles.older : ""}`}>
                <span className={`${styles.role} ${line.role === "AGENT" ? styles.agent : styles.citizen}`}>
                  {line.role}
                </span>
                <p className={styles.original}>
                  {line.words.map((word, k) => (
                    <span key={`${line.u}-${k}`} className={styles.word}>
                      {word}
                    </span>
                  ))}
                  {live && i === last && !line.en && <span className={styles.caret} />}
                </p>
                {line.en && (
                  <p className={styles.translation}>
                    <span className={styles.lang}>EN</span>
                    <span className={styles.word}>{line.en}</span>
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
