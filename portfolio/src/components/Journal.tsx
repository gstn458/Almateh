import { motion } from "framer-motion";
import { journal, links, type JournalEntry } from "../data/content";
import RingButton from "./RingButton";
import SectionHeader, { revealTransition } from "./SectionHeader";

function EntryRow({ entry }: { entry: JournalEntry }) {
  const inner = (
    <>
      <img
        src={entry.image}
        alt=""
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-28"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-base text-text-primary md:text-lg">{entry.title}</h3>
        <p className="mt-1 text-xs text-muted sm:hidden">
          {entry.readTime} · {entry.date}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-4 text-xs text-muted sm:flex">
        <span>{entry.readTime}</span>
        <span className="h-1 w-1 rounded-full bg-muted" />
        <span>{entry.date}</span>
      </div>
      <span
        aria-hidden="true"
        className="mr-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stroke text-muted transition-colors duration-300 group-hover:border-text-primary/30 group-hover:text-text-primary sm:flex"
      >
        ↗
      </span>
    </>
  );

  const className =
    "group flex items-center gap-6 rounded-[40px] border border-stroke bg-surface/30 p-4 transition-colors duration-300 hover:bg-surface sm:rounded-full";

  return entry.href ? (
    <a href={entry.href} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default function Journal() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <SectionHeader
          eyebrow="Journal"
          title={
            <>
              Recent <span className="font-display italic">thoughts</span>
            </>
          }
          subtext="Notes on process, tools and the things I'm learning along the way."
          action={
            <RingButton href={links.journal} size="px-6 py-3 text-sm">
              View all <span aria-hidden="true">→</span>
            </RingButton>
          }
        />

        <div className="flex flex-col gap-4">
          {journal.map((entry, index) => (
            <motion.div
              key={`${entry.title}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ ...revealTransition, delay: index * 0.08 }}
            >
              <EntryRow entry={entry} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
