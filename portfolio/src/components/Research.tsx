import { motion } from "framer-motion";
import { research } from "../data/content";
import { linkProps } from "../lib/links";
import SectionHeader, { revealTransition } from "./SectionHeader";
import StatusChip from "./StatusChip";
import Todo from "./Todo";

export default function Research() {
  return (
    <section id="research" aria-labelledby="research-heading" className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <SectionHeader
          id="research-heading"
          eyebrow={research.eyebrow}
          title={
            <>
              {research.title} <span className="font-display italic">{research.titleEmphasis}</span>
            </>
          }
          subtext={research.subtext}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          {research.items.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...revealTransition, delay: (index % 2) * 0.1 }}
              className="flex flex-col rounded-3xl border border-stroke bg-surface p-6 md:p-8"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-muted">{item.kind}</span>
                {item.status ? <StatusChip status={item.status} /> : <Todo>status</Todo>}
              </div>
              <h3 className="font-display text-2xl italic leading-tight text-text-primary md:text-[1.7rem]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.summary}</p>
              {item.link && (
                <a
                  href={item.link.href}
                  {...linkProps(item.link.href)}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1 self-start break-all text-sm text-text-primary underline-offset-4 hover:underline"
                >
                  {item.link.label} <span aria-hidden="true">↗</span>
                </a>
              )}
              {item.note && <p className="mt-auto pt-4 text-xs leading-relaxed text-muted">{item.note}</p>}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
