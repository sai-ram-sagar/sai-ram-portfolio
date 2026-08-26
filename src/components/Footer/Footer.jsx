import { ArrowUp } from "lucide-react";
import { profile, socials } from "../../data/profile";
import styles from "./Footer.module.css";

export const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <p className={styles.identity}>
        <span className={styles.name}>{profile.fullName}</span>
        <span className={styles.role}>
          {profile.role} · {profile.location}
        </span>
      </p>

      <ul className={styles.links}>
        {socials.map((social) => (
          <li key={social.id}>
            <a href={social.href} target="_blank" rel="noopener noreferrer">
              {social.label}
            </a>
          </li>
        ))}
      </ul>

      <a className={styles.top} href="#top">
        Back to top
        <ArrowUp size={15} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  </footer>
);
