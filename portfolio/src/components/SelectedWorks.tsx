import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { projects, work, type Project } from "../data/content";
import { linkProps } from "../lib/links";
import Dialog from "./Dialog";
import ProjectDetails from "./ProjectDetails";
import RingButton from "./RingButton";
import SectionHeader, { revealTransition } from "./SectionHeader";
import StatusChip from "./StatusChip";
import Todo from "./Todo";
import Visual from "./Visual";

// Alternating 7/5/5/7 columns.
const SPANS = ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7"];

function ProjectCard({ project, index, onOpen }: { project: Project; index: number; onOpen: () => void }) {
  const name = project.cardTitle ?? project.title;

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ ...revealTransition, delay: (index % 2) * 0.1 }}
      className={`flex flex-col overflow-hidden rounded-3xl border border-stroke bg-surface ${SPANS[index % SPANS.length]}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View details: ${name}`}
        className="group relative h-56 w-full shrink-0 overflow-hidden text-left focus-visible:outline-offset-[-3px] md:h-72"
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
          {project.image ? (
            <img
              src={project.image}
              alt={project.imageAlt ?? `Screenshot of ${name}`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Visual kind={project.visual} />
          )}
        </div>
        <div className="halftone pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply" />
        <div className="absolute left-5 top-5">
          <StatusChip status={project.status} />
        </div>
        {!project.image && (
          <div className="absolute bottom-4 right-4">
            <Todo>screenshot</Todo>
          </div>
        )}

        <div className="absolute inset-0 bg-bg/70 opacity-0 backdrop-blur-lg transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <div className="absolute inset-0 flex translate-y-2 items-center justify-center p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <span className="accent-gradient-animated max-w-full rounded-full p-[2px]">
            <span className="block truncate rounded-full bg-white px-5 py-2.5 text-sm text-black">
              View — <span className="font-display text-base italic">{name}</span>
            </span>
          </span>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3 className="font-display text-2xl italic leading-tight text-text-primary md:text-3xl">{name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{project.summary}</p>
        {project.tags ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
            {project.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-stroke px-3 py-1 text-xs text-muted">
                {tag}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <Todo>tags</Todo>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 pt-5">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-[44px] items-center text-sm text-text-primary underline-offset-4 hover:underline"
          >
            {work.detailsLabel}
          </button>
          {project.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...linkProps(link.href)}
              className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted transition-colors hover:text-text-primary"
            >
              {link.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function SelectedWorks() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openProject = projects.find((project) => project.id === openId);
  const close = useCallback(() => setOpenId(null), []);

  return (
    <section id="work" aria-labelledby="work-heading" className="bg-bg py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <SectionHeader
          id="work-heading"
          eyebrow={work.eyebrow}
          title={
            <>
              {work.title} <span className="font-display italic">{work.titleEmphasis}</span>
            </>
          }
          subtext={work.subtext}
          action={
            <RingButton href={work.allLink.href} size="px-6 py-3 text-sm">
              {work.allLink.label} <span aria-hidden="true">↗</span>
            </RingButton>
          }
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} onOpen={() => setOpenId(project.id)} />
          ))}
        </div>
      </div>

      <Dialog open={!!openProject} onClose={close} label={openProject?.title ?? "Project"}>
        {openProject && <ProjectDetails project={openProject} />}
      </Dialog>
    </section>
  );
}
