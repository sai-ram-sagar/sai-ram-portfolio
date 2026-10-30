import { useState } from "react";
import { ArrowUpRight, Loader2, Mail, MapPin, Send } from "lucide-react";
import { Section } from "../ui/Section";
import { SpotlightCard } from "../ui/SpotlightCard";
import { Button } from "../ui/Button";
import { BrandIcon } from "../ui/BrandIcon";
import { contactForm, profile, socials } from "../../data/profile";
import styles from "./Contact.module.css";

const FIELDS = [
  { name: "name", label: "Your name", type: "text", autoComplete: "name" },
  { name: "email", label: "Your email", type: "email", autoComplete: "email" },
  { name: "mobile", label: "Your mobile number", type: "tel", autoComplete: "tel" },
];

/*
 * Email, location and socials sit in the heading column rather than in a grid
 * below it, so the whole left half reads as one block against the form.
 */
const Details = () => (
  <div className={styles.details} data-reveal="fade">
    <a className={styles.emailLink} href={`mailto:${profile.email}`}>
      <span>{profile.email}</span>
      <ArrowUpRight size={22} strokeWidth={1.75} aria-hidden="true" />
    </a>

    <ul className={styles.directList}>
      <li>
        <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>{profile.location}</span>
      </li>
    </ul>

    <ul className={styles.socials}>
      {socials.map((social) => (
        <li key={social.id}>
          <a
            className={styles.social}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.socialIcon}>
              <BrandIcon name={social.id} size={16} />
            </span>
            <span className={styles.socialText}>
              <span className={styles.socialLabel}>{social.label}</span>
              <span className={styles.socialHandle}>{social.handle}</span>
            </span>
            <ArrowUpRight
              className={styles.socialArrow}
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          </a>
        </li>
      ))}
    </ul>
  </div>
);

export const Contact = () => {
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState("sending");

    const payload = Object.fromEntries(new FormData(event.target).entries());

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...payload, access_key: contactForm.accessKey }),
      });
      if (!response.ok) throw new Error("Request failed");
      event.target.reset();
      setState("sent");
    } catch {
      setState("error");
    }
  };

  return (
    <Section
      id="contact"
      index="06"
      label="Contact"
      title="Let's build something that has to work."
      caption="Whether it's about a role, a collaboration or something you saw above - the fastest way to reach me is a message."
      split
      headerExtra={<Details />}
    >
      <SpotlightCard
        contentClassName={styles.formCard}
        data-reveal="side"
        style={{ "--reveal-delay": "120ms" }}
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <header className={styles.formHead}>
            <Mail size={16} strokeWidth={1.75} aria-hidden="true" />
            <h3>Send a message</h3>
          </header>

          {FIELDS.map((field) => (
            <div className={styles.field} key={field.name}>
              <label htmlFor={`contact-${field.name}`}>{field.label}</label>
              <input
                id={`contact-${field.name}`}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.label}
                required
              />
            </div>
          ))}

          <div className={styles.field}>
            <label htmlFor="contact-message">Your message</label>
            <textarea
              id="contact-message"
              name="message"
              rows="4"
              placeholder="What would you like to build?"
              required
            />
          </div>

          <Button
            type="submit"
            className={styles.submit}
            disabled={state === "sending"}
            data-loading={state === "sending"}
            icon={state === "sending" ? Loader2 : Send}
            iconSide="left"
          >
            {state === "sending" ? "Sending" : "Send message"}
          </Button>

          <p
            className={`${styles.status} ${state === "error" ? styles.statusError : ""}`}
            role="status"
            aria-live="polite"
          >
            {state === "sent" && "Thanks - your message is on its way. I'll get back to you soon."}
            {state === "error" &&
              `Something went wrong. Please email me directly at ${profile.email}.`}
          </p>
        </form>
      </SpotlightCard>
    </Section>
  );
};
