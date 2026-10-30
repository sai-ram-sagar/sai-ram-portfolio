import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, X } from "lucide-react";
import { useImageReady } from "../../hooks/useImageReady";
import resumePdf from "/assets/resume/Sai_Ram_Sagar_Resume.pdf?url";
import resumePreview from "/assets/resume/resume-preview.png?url";
import styles from "./ResumeModal.module.css";

/*
 * The preview is a rendered image of the PDF rather than an embedded PDF:
 * mobile browsers (Android Chrome especially) won't draw a PDF inside an
 * iframe, while an image looks the same everywhere. The real PDF - with
 * working links - is one click away through "Open" and "Download".
 *
 * Both files are produced from the .docx resume; see assets/resume/.
 */
const FILE_NAME = "Sai_Ram_Sagar_Resume.pdf";

/** Resume preview. Closes on Escape, backdrop click or button. */
export const ResumeModal = ({ onClose }) => {
  const closeBtn = useRef(null);
  const { ready, imageProps } = useImageReady();

  useEffect(() => {
    const opener = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      /* hand focus back to the button that opened the preview */
      opener?.focus?.();
    };
  }, [onClose]);

  /* portalled so the hero's stacking and transforms can't trap the overlay */
  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Resume preview"
      onClick={onClose}
    >
      <div className={styles.frame} onClick={(event) => event.stopPropagation()}>
        <div className={styles.bar}>
          <p className={styles.label}>
            <span className={styles.labelDot} aria-hidden="true" />
            Resume
            <span className={styles.labelMeta}>PDF · 1 page</span>
          </p>

          <div className={styles.tools}>
            <a
              className={styles.tool}
              href={resumePdf}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the resume PDF in a new tab"
            >
              <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
              <span className={styles.toolText}>Open</span>
            </a>
            <a className={`${styles.tool} ${styles.toolPrimary}`} href={resumePdf}
              download={FILE_NAME}
              aria-label="Download the resume PDF"
            >
              <Download size={15} strokeWidth={2} aria-hidden="true" />
              <span className={styles.toolText}>Download</span>
            </a>
            <button
              ref={closeBtn}
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Close resume preview"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className={styles.desk}>
          <div className={styles.page}>
            {!ready && <span className={`skeleton ${styles.pageSkeleton}`} aria-hidden="true" />}
            <img
              className={`${styles.image} ${ready ? styles.imageReady : ""}`}
              src={resumePreview}
              alt="Resume of Sai Ram Sagar, Software Developer"
              width="1700"
              height="2200"
              {...imageProps}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
