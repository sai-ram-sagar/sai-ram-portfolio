import { useState } from "react";
import { Award, GraduationCap, ScrollText } from "lucide-react";
import { Section } from "../ui/Section";
import { SpotlightCard } from "../ui/SpotlightCard";
import { CertificateModal } from "../ui/CertificateModal";
import { education } from "../../data/education";
import certificates from "../../data/certificates.json";
import styles from "./Education.module.css";

const ICONS = { GraduationCap, Award };

export const Education = () => {
  const [certificate, setCertificate] = useState(null);

  if (!education.length) return null;

  return (
    <Section id="education" index="05" label="Education" title="Education & certification.">
      <ul className={styles.grid}>
        {education.map((item, index) => {
          const Icon = ICONS[item.icon] ?? GraduationCap;
          return (
            <SpotlightCard
              as="li"
              key={`${item.institution}-${item.qualification}`}
              contentClassName={styles.item}
              data-reveal="scale"
              style={{ "--reveal-delay": `${index * 90}ms` }}
            >
              <span className={styles.icon}>
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className={styles.text}>
                <h3 className={styles.qualification}>{item.qualification}</h3>
                <p className={styles.institution}>{item.institution}</p>
                <p className={styles.meta}>
                  {item.detail}
                  {item.detail && item.period ? " · " : ""}
                  {item.period}
                </p>
              </div>
            </SpotlightCard>
          );
        })}
      </ul>

      {certificates.length > 0 && (
        <div className={styles.certificates} data-reveal="fade">
          <h3 className={styles.certificatesTitle}>
            <ScrollText size={16} strokeWidth={1.75} aria-hidden="true" />
            Course certificates
          </h3>
          <ul className={styles.certificateList}>
            {certificates.map((cert) => (
              <li key={cert.title}>
                <button
                  type="button"
                  className={styles.certificate}
                  onClick={() => setCertificate(cert)}
                  aria-label={`View the ${cert.title} certificate`}
                >
                  {cert.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {certificate && (
        <CertificateModal certificate={certificate} onClose={() => setCertificate(null)} />
      )}
    </Section>
  );
};
