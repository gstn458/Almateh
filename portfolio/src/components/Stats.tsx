import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { stats } from "../data/content";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { revealTransition } from "./SectionHeader";

/** Counts up from 0 the first time it scrolls into view. Static with reduced motion. */
function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setShown(value);
      return;
    }
    if (!inView) return;
    let frame = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, reducedMotion]);

  return (
    <span ref={ref} aria-hidden="true">
      {shown}
    </span>
  );
}

export default function Stats() {
  return (
    <section aria-label="In numbers" className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <dl className="grid grid-cols-1 gap-10 border-t border-stroke pt-12 sm:grid-cols-3 sm:gap-6 md:pt-16">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ ...revealTransition, delay: index * 0.1 }}
              className="flex flex-col-reverse text-center sm:text-left"
            >
              <dt className="mt-3 text-sm text-muted">{stat.label}</dt>
              <dd className="font-display text-6xl leading-none text-text-primary md:text-7xl lg:text-8xl">
                <Counter value={stat.value} />
                <span className="sr-only">{stat.value}</span>
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
