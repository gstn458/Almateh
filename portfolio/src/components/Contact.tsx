import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { contact, person, socials } from "../data/content";
import { gsap } from "../lib/gsap";
import { linkProps } from "../lib/links";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import HlsVideo from "./HlsVideo";
import { VIDEO_SRC } from "./Hero";
import RingButton from "./RingButton";
import { revealTransition } from "./SectionHeader";
import Todo from "./Todo";

// Two identical halves, so sliding by -50% loops seamlessly.
const MARQUEE_TEXT = (contact.marquee.map((word) => `${word.toUpperCase()} • `).join("")).repeat(4);

export default function Contact() {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.to(marqueeRef.current, { xPercent: -50, duration: 80, ease: "none", repeat: -1 });
    });
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative overflow-hidden bg-bg pb-8 pt-16 md:pb-12 md:pt-20"
    >
      <div className="absolute inset-0 overflow-hidden">
        <HlsVideo src={VIDEO_SRC} className="scale-y-[-1]" lazy />
      </div>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute left-0 right-0 top-0 h-48 bg-gradient-to-b from-bg to-transparent" />

      <div className="relative z-10">
        <div className="overflow-hidden py-6 md:py-10" aria-hidden="true">
          <div ref={marqueeRef} className="flex w-max whitespace-nowrap">
            <span className="font-display text-6xl italic leading-none text-text-primary/20 md:text-8xl lg:text-9xl">
              {MARQUEE_TEXT}
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={revealTransition}
          className="mx-auto flex max-w-[1200px] flex-col items-center px-6 py-16 text-center md:px-10 md:py-24 lg:px-16"
        >
          <span className="mb-5 text-xs uppercase tracking-[0.3em] text-muted">{contact.eyebrow}</span>
          <h2
            id="contact-heading"
            className="text-4xl font-light tracking-tight text-text-primary md:text-6xl"
          >
            {contact.title} <span className="font-display italic">{contact.titleEmphasis}</span>
          </h2>
          <p className="mb-10 mt-5 max-w-md text-sm text-muted md:text-base">{contact.subtext}</p>
          {person.email ? (
            <RingButton href={`mailto:${person.email}`} size="px-6 py-3.5 text-sm md:px-8 md:py-4 md:text-base">
              {person.email} <span aria-hidden="true">↗</span>
            </RingButton>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <RingButton href={contact.fallbackCta.href} size="px-6 py-3.5 text-sm md:px-8 md:py-4 md:text-base">
                {contact.fallbackCta.label} <span aria-hidden="true">↗</span>
              </RingButton>
              <Todo>public email address</Todo>
            </div>
          )}
        </motion.div>

        <footer className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
          <div className="flex flex-col items-center gap-6 border-t border-white/10 pt-8 md:flex-row md:justify-between">
            <ul className="flex flex-wrap justify-center gap-x-6">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    {...linkProps(social.href)}
                    className="inline-flex min-h-[44px] items-center text-sm text-muted transition-colors duration-300 hover:text-text-primary"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 text-sm text-muted">
              <span aria-hidden="true" className="relative flex h-2 w-2">
                {person.availability.open && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    person.availability.open ? "bg-emerald-400" : "bg-muted"
                  }`}
                />
              </span>
              {person.availability.label}
            </div>

            <p className="text-xs text-muted">{contact.footer}</p>
          </div>
        </footer>
      </div>
    </section>
  );
}
