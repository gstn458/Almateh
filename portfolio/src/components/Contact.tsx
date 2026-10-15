import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { profile, socials } from "../data/content";
import { gsap } from "../lib/gsap";
import HlsVideo from "./HlsVideo";
import { VIDEO_SRC } from "./Hero";
import RingButton from "./RingButton";
import { revealTransition } from "./SectionHeader";

const MARQUEE_TEXT = "BUILDING THE FUTURE • ";

export default function Contact() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(marqueeRef.current, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="contact" className="relative overflow-hidden bg-bg pb-8 pt-16 md:pb-12 md:pt-20">
      <div className="absolute inset-0 overflow-hidden">
        <HlsVideo src={VIDEO_SRC} className="scale-y-[-1]" />
      </div>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute left-0 right-0 top-0 h-48 bg-gradient-to-b from-bg to-transparent" />

      <div className="relative z-10">
        <div className="overflow-hidden py-6 md:py-10" aria-hidden="true">
          <div ref={marqueeRef} className="flex w-max whitespace-nowrap">
            <span className="font-display text-6xl italic leading-none text-text-primary/20 md:text-8xl lg:text-9xl">
              {MARQUEE_TEXT.repeat(10)}
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
          <span className="mb-5 text-xs uppercase tracking-[0.3em] text-muted">Get in touch</span>
          <h2 className="mb-10 text-4xl font-light tracking-tight text-text-primary md:text-6xl">
            Have a project <span className="font-display italic">in mind?</span>
          </h2>
          <RingButton href={`mailto:${profile.email}`} size="px-6 py-3.5 text-sm md:px-8 md:py-4 md:text-base">
            {profile.email} <span aria-hidden="true">↗</span>
          </RingButton>
        </motion.div>

        <footer className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
          <div className="flex flex-col items-center gap-6 border-t border-white/10 pt-8 md:flex-row md:justify-between">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-muted transition-colors duration-300 hover:text-text-primary"
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 text-sm text-muted">
              <span className="relative flex h-2 w-2">
                {profile.availability.available && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    profile.availability.available ? "bg-emerald-400" : "bg-muted"
                  }`}
                />
              </span>
              {profile.availability.label}
            </div>

            <p className="text-xs text-muted">
              © {new Date().getFullYear()} {profile.name}
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
