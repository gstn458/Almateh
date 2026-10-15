import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { profile } from "../data/content";
import { gsap } from "../lib/gsap";
import { scrollToSection } from "../lib/navigation";
import { article } from "../lib/text";
import HlsVideo from "./HlsVideo";
import RingButton from "./RingButton";

export const VIDEO_SRC = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

type HeroProps = {
  /** False while the loading screen is up; the entrance plays once it turns true. */
  ready: boolean;
};

export default function Hero({ ready }: HeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const roles = profile.roles.length > 0 ? profile.roles : [""];
  const role = roles[roleIndex % roles.length];

  useEffect(() => {
    if (roles.length < 2) return;
    const id = window.setInterval(() => setRoleIndex((i) => (i + 1) % roles.length), 2000);
    return () => window.clearInterval(id);
  }, [roles.length]);

  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".name-reveal", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.1 }, 0);
      tl.fromTo(
        ".blur-in",
        { opacity: 0, filter: "blur(10px)", y: 20 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1, delay: 0.3 },
        0,
      );
    }, rootRef);
    return () => ctx.revert();
  }, [ready]);

  return (
    <section
      id="home"
      ref={rootRef}
      className="relative flex h-[100svh] min-h-[560px] items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden">
        <HlsVideo src={VIDEO_SRC} />
      </div>
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <p className="blur-in mb-8 text-xs uppercase tracking-[0.3em] text-muted opacity-0">
          COLLECTION '26
        </p>
        <h1 className="name-reveal mb-6 font-display text-6xl italic leading-[0.9] tracking-tight text-text-primary opacity-0 md:text-8xl lg:text-9xl">
          {profile.name}
        </h1>
        <p className="blur-in mb-4 text-base text-muted opacity-0 md:text-xl">
          {article(role)}{" "}
          <span key={roleIndex} className="animate-role-fade-in inline-block font-display italic text-text-primary">
            {role}
          </span>{" "}
          lives in {profile.city}.
        </p>
        <p className="blur-in mb-12 max-w-md text-sm text-muted opacity-0 md:text-base">
          {profile.description}
        </p>
        <div className="blur-in inline-flex flex-wrap justify-center gap-4 opacity-0">
          <RingButton variant="solid" onClick={() => scrollToSection("work")}>
            See Works
          </RingButton>
          <RingButton variant="outline" onClick={() => scrollToSection("contact")}>
            Reach out...
          </RingButton>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-muted">Scroll</span>
        <span className="relative h-10 w-px overflow-hidden bg-stroke">
          <span className="animate-scroll-down absolute left-0 top-0 h-1/2 w-full bg-text-primary/80" />
        </span>
      </div>
    </section>
  );
}
