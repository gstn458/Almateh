import type { ReactNode } from "react";
import { motion } from "framer-motion";

type SectionHeaderProps = {
  /** id for the heading, so the section can be labelled by it. */
  id?: string;
  eyebrow: string;
  title: ReactNode;
  subtext: string;
  action?: ReactNode;
};

export const revealTransition = { duration: 1, ease: [0.25, 0.1, 0.25, 1] } as const;

/** Eyebrow line, large heading, short subtext and an optional desktop-only button. */
export default function SectionHeader({ id, eyebrow, title, subtext, action }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={revealTransition}
      className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <div className="mb-5 flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-stroke" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted">{eyebrow}</span>
        </div>
        <h2 id={id} className="text-4xl font-light tracking-tight text-text-primary md:text-5xl lg:text-6xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-sm text-muted md:text-base">{subtext}</p>
      </div>
      {action && <div className="hidden shrink-0 md:block">{action}</div>}
    </motion.div>
  );
}
