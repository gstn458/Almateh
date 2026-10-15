import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { explorations, links, type Exploration } from "../data/content";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import RingButton from "./RingButton";

// A slight tilt per card, alternating direction.
const ROTATIONS = ["-rotate-3", "rotate-2", "rotate-3", "-rotate-2", "-rotate-1", "rotate-3"];

function Lightbox({
  index,
  onClose,
  onStep,
}: {
  index: number | null;
  onClose: () => void;
  onStep: (direction: 1 | -1) => void;
}) {
  const open = index !== null;
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onStep(1);
      if (event.key === "ArrowLeft") onStep(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onStep]);

  const item = index !== null ? explorations[index] : null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={item.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
        >
          <motion.figure
            key={item.image}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-full flex-col items-center"
          >
            <img
              src={item.image}
              alt={item.title}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl border border-stroke object-contain"
            />
            <figcaption className="mt-4 font-display text-xl italic text-text-primary">
              {item.title}
            </figcaption>
          </motion.figure>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-surface text-lg text-text-primary transition-colors hover:bg-stroke md:right-8 md:top-8"
          >
            ✕
          </button>
          {explorations.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onStep(-1);
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-surface text-text-primary transition-colors hover:bg-stroke md:left-8"
              >
                ←
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onStep(1);
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-surface text-text-primary transition-colors hover:bg-stroke md:right-8"
              >
                →
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Card({
  item,
  rotation,
  onOpen,
}: {
  item: Exploration;
  rotation: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.title}`}
      className={`group pointer-events-auto relative aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl border border-stroke bg-surface shadow-2xl shadow-black/40 transition-transform duration-500 hover:rotate-0 hover:scale-[1.03] ${rotation}`}
    >
      <img
        src={item.image}
        alt={item.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="halftone pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply" />
    </button>
  );
}

export default function Explorations() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false,
      });

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
  }, []);

  const left = explorations.map((item, i) => ({ item, i })).filter(({ i }) => i % 2 === 0);
  const right = explorations.map((item, i) => ({ item, i })).filter(({ i }) => i % 2 === 1);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback((direction: 1 | -1) => {
    setOpenIndex((current) =>
      current === null ? null : (current + direction + explorations.length) % explorations.length,
    );
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-[300vh] bg-bg">
      <div
        ref={contentRef}
        className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px w-8 bg-stroke" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted">Explorations</span>
          <span className="h-px w-8 bg-stroke" />
        </div>
        <h2 className="text-4xl font-light tracking-tight text-text-primary md:text-6xl lg:text-7xl">
          Visual <span className="font-display italic">playground</span>
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted md:text-base">
          Side projects and experiments made outside client work.
        </p>
        <div className="mt-8">
          <RingButton href={links.dribbble}>
            See more on Dribbble <span aria-hidden="true">↗</span>
          </RingButton>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <div className="mx-auto grid h-full max-w-[1400px] grid-cols-2 gap-12 px-6 pb-[30vh] pt-[70vh] md:gap-40 md:px-10">
          <div ref={leftRef} className="flex flex-col items-start justify-around">
            {left.map(({ item, i }) => (
              <Card key={i} item={item} rotation={ROTATIONS[i % ROTATIONS.length]} onOpen={() => setOpenIndex(i)} />
            ))}
          </div>
          <div ref={rightRef} className="flex flex-col items-end justify-around">
            {right.map(({ item, i }) => (
              <Card key={i} item={item} rotation={ROTATIONS[i % ROTATIONS.length]} onOpen={() => setOpenIndex(i)} />
            ))}
          </div>
        </div>
      </div>

      <Lightbox index={openIndex} onClose={close} onStep={step} />
    </section>
  );
}
