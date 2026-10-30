import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { getImageUrl } from "../../utils";
import { useImageReady } from "../../hooks/useImageReady";
import styles from "./CertificateModal.module.css";

/** Lightbox for a skill's certificate. Closes on Escape, backdrop click or button. */
export const CertificateModal = ({ certificate, onClose }) => {
  const closeBtn = useRef(null);
  const { ready, imageProps } = useImageReady();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${certificate.title} certificate`}
      onClick={onClose}
    >
      <div className={styles.frame} onClick={(event) => event.stopPropagation()}>
        <div className={styles.bar}>
          <p className={styles.label}>{certificate.title} - Certificate</p>
          <button
            ref={closeBtn}
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close certificate"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.imageWrap}>
          {!ready && <span className={`skeleton ${styles.imageSkeleton}`} aria-hidden="true" />}
          <img
            className={`${styles.image} ${ready ? styles.imageReady : ""}`}
            src={getImageUrl(certificate.imageSrc)}
            alt={`${certificate.title} certificate`}
            {...imageProps}
          />
        </div>
      </div>
    </div>
  );
};
