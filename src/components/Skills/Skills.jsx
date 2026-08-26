import { useState } from "react";
import {
  AudioLines,
  BadgeCheck,
  LayoutDashboard,
  Map as MapIcon,
  Radio,
  Server,
  Wrench,
} from "lucide-react";
import { Section } from "../ui/Section";
import { SpotlightCard } from "../ui/SpotlightCard";
import { CertificateModal } from "../ui/CertificateModal";
import { skillGroups } from "../../data/skillGroups";
import certificates from "../../data/certificates.json";
import { getImageUrl } from "../../utils";
import styles from "./Skills.module.css";

/* aliased: the lucide `Map` icon would otherwise shadow the global Map constructor */
const ICONS = { LayoutDashboard, Server, Radio, Map: MapIcon, AudioLines, Wrench };

const certificateByTitle = new Map(certificates.map((cert) => [cert.title, cert]));

export const Skills = () => {
  const [certificate, setCertificate] = useState(null);

  return (
    <Section
      id="skills"
      index="04"
      label="Skills"
      title="The stack behind the work."
      caption="Grouped the way I actually use them — from the operator interface down to the audio pipeline."
    >
      <div className={styles.grid}>
        {skillGroups.map((group, groupIndex) => {
          const Icon = ICONS[group.icon];
          return (
            <SpotlightCard
              key={group.id}
              className={styles.groupCard}
              contentClassName={styles.group}
              data-reveal="scale"
              style={{ "--reveal-delay": `${(groupIndex % 3) * 90}ms` }}
            >
              <header className={styles.groupHeader}>
                <span className={styles.groupIcon}>
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className={styles.groupTitle}>{group.label}</h3>
                <span className={styles.groupCount} aria-hidden="true">
                  {String(group.items.length).padStart(2, "0")}
                </span>
              </header>

              <ul className={styles.chips}>
                {group.items.map((item) => {
                  const cert = item.certificate
                    ? certificateByTitle.get(item.certificate)
                    : undefined;

                  const inner = (
                    <>
                      {item.logo && (
                        <img
                          className={styles.chipIcon}
                          src={getImageUrl(item.logo)}
                          alt=""
                          loading="lazy"
                          width="16"
                          height="16"
                        />
                      )}
                      {item.name}
                      {cert && (
                        <BadgeCheck
                          className={styles.chipBadge}
                          size={13}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      )}
                    </>
                  );

                  return (
                    <li key={`${group.id}-${item.name}`}>
                      {cert ? (
                        <button
                          type="button"
                          className={`${styles.chip} ${styles.chipInteractive}`}
                          onClick={() => setCertificate(cert)}
                          aria-label={`View the ${cert.title} certificate`}
                        >
                          {inner}
                        </button>
                      ) : (
                        <span className={styles.chip}>{inner}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SpotlightCard>
          );
        })}
      </div>

      <p className={styles.legend} data-reveal="fade">
        <BadgeCheck size={14} strokeWidth={2} aria-hidden="true" />
        Marked technologies have a course certificate — select one to view it.
      </p>

      {certificate && (
        <CertificateModal certificate={certificate} onClose={() => setCertificate(null)} />
      )}
    </Section>
  );
};
