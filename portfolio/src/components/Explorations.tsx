import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { sideProjects, type SideProject } from "../data/content";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { linkProps } from "../lib/links";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import Dialog from "./Dialog";
import RingButton from "./RingButton";
import Todo from "./Todo";
import Visual from "./Visual";

// A slight tilt per card, alternating direction.
const ROTATIONS = ["-rotate-3", "rotate-2", "rotate-3", "-rotate-2", "-rotate-1", "rotate-3"];

function Card({ item, rotation, onOpen }: { item: SideProject; rotation: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.title}`}
      className={`group pointer-events-auto relative aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl border border-stroke bg-surface text-left shadow-2xl shadow-black/40 transition-transform duration-500 hover:rotate-0 hover:scale-[1.03] focus-visible:rotate-0 ${rotation}`}
    >
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
        {item.image ? (
          <img
            src={item.image}
            alt={item.imageAlt ?? item.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Visual kind={item.visual} />
        )}
      </div>
      <div className="halftone pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 md:p-5">
        <p className="font-display text-lg italic leading-tight text-white md:text-2xl">{item.title}</p>
      </div>
    </button>
  );
}

export default function Explorations() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false,
      });

      if (reducedMotion) return;

      // The two columns drift at different speeds as the section scrolls past.
      const scrub = {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      };
      gsap.fromTo(leftRef.current, { y: 0 }, { y: -160, ease: "none", scrollTrigger: scrub });
      gsap.fromTo(rightRef.current, { y: 200 }, { y: -480, ease: "none", scrollTrigger: { ...scrub } });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const items = sideProjects.items.map((item, i) => ({ item, i }));
  const left = items.filter(({ i }) => i % 2 === 0);
  const right = items.filter(({ i }) => i % 2 === 1);
  const open = openIndex !== null ? sideProjects.items[openIndex] : null;
  const close = useCallback(() => setOpenIndex(null), []);

  return (
    <section ref={sectionRef} id="side-projects" aria-labelledby="side-heading" className="relative min-h-[300vh] bg-bg">
      <div
        ref={contentRef}
        className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center"
      >
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-stroke" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted">{sideProjects.eyebrow}</span>
          <span aria-hidden="true" className="h-px w-8 bg-stroke" />
        </div>
        <h2 id="side-heading" className="text-4xl font-light tracking-tight text-text-primary md:text-6xl lg:text-7xl">
          {sideProjects.title} <span className="font-display italic">{sideProjects.titleEmphasis}</span>
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted md:text-base">{sideProjects.subtext}</p>
        <div className="mt-8">
          <RingButton href={sideProjects.cta.href}>
            {sideProjects.cta.label} <span aria-hidden="true">↗</span>
          </RingButton>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1400px] grid-cols-2 gap-6 px-6 pb-[30vh] pt-[70vh] sm:gap-12 md:gap-40 md:px-10">
          <div ref={leftRef} className="flex flex-col items-start justify-around">
            {left.map(({ item, i }) => (
              <Card key={item.title} item={item} rotation={ROTATIONS[i % ROTATIONS.length]} onOpen={() => setOpenIndex(i)} />
            ))}
          </div>
          <div ref={rightRef} className="flex flex-col items-end justify-around">
            {right.map(({ item, i }) => (
              <Card key={item.title} item={item} rotation={ROTATIONS[i % ROTATIONS.length]} onOpen={() => setOpenIndex(i)} />
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!open} onClose={close} label={open?.title ?? "Side project"}>
        {open && (
          <article>
            <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-2xl border border-stroke bg-bg">
              {open.image ? (
                <img src={open.image} alt={open.imageAlt ?? open.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <Visual kind={open.visual} />
                  <div className="absolute bottom-3 right-3">
                    <Todo>screenshot</Todo>
                  </div>
                </>
              )}
            </div>
            <h2 className="font-display text-3xl italic text-text-primary">{open.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">{open.summary}</p>
            <div className="mt-6">
              {open.link ? (
                <a
                  href={open.link.href}
                  {...linkProps(open.link.href)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-stroke px-5 text-sm text-text-primary transition-colors hover:border-text-primary/40"
                >
                  {open.link.label} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <Todo>link</Todo>
              )}
            </div>
          </article>
        )}
      </Dialog>
    </section>
  );
}
