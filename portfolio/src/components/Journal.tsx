import { motion } from "framer-motion";
import { writing, type WritingEntry } from "../data/content";
import { linkProps } from "../lib/links";
import SectionHeader, { revealTransition } from "./SectionHeader";

const hasPublished = writing.entries.some((entry) => entry.published);

function EntryRow({ entry, index }: { entry: WritingEntry; index: number }) {
  const live = entry.published && entry.href;
  const inner = (
    <>
      <span
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-stroke bg-[radial-gradient(circle_at_30%_30%,rgba(78,133,191,0.35),transparent_70%)] font-display text-2xl italic text-text-primary/80 sm:h-20 sm:w-28"
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base text-text-primary md:text-lg">{entry.title}</h3>
        <p className="mt-1 text-xs text-muted sm:hidden">
          {entry.published ? [entry.readTime, entry.date].filter(Boolean).join(" · ") : writing.comingSoon}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-4 text-xs text-muted sm:flex">
        {entry.published ? (
          [entry.readTime, entry.date].filter(Boolean).map((text) => <span key={text}>{text}</span>)
        ) : (
          <span className="rounded-full border border-stroke px-3 py-1 uppercase tracking-[0.15em]">{writing.comingSoon}</span>
        )}
      </div>
      {live && (
        <span
          aria-hidden="true"
          className="mr-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stroke text-muted transition-colors duration-300 group-hover:border-text-primary/30 group-hover:text-text-primary sm:flex"
        >
          ↗
        </span>
      )}
    </>
  );

  const className =
    "group flex items-center gap-4 rounded-[40px] border border-stroke bg-surface/30 p-4 transition-colors duration-300 hover:bg-surface sm:gap-6 sm:rounded-full";

  return live ? (
    <a href={entry.href} {...linkProps(entry.href!)} className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default function Journal() {
  // Hidden on the live site until at least one entry is published.
  if (!hasPublished && !import.meta.env.DEV) return null;

  return (
    <section id="writing" aria-labelledby="writing-heading" className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        {!hasPublished && (
          <p className="mb-8 rounded-2xl border border-dashed border-amber-400/70 px-4 py-3 text-xs text-amber-300">
            Dev preview only. This section is hidden on the live site until an entry in content.ts has published: true.
          </p>
        )}
        <SectionHeader
          id="writing-heading"
          eyebrow={writing.eyebrow}
          title={
            <>
              {writing.title} <span className="font-display italic">{writing.titleEmphasis}</span>
            </>
          }
          subtext={writing.subtext}
        />

        <div className="flex flex-col gap-4">
          {writing.entries.map((entry, index) => (
            <motion.div
              key={entry.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ ...revealTransition, delay: index * 0.08 }}
            >
              <EntryRow entry={entry} index={index} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
