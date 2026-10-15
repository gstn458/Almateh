import { motion } from "framer-motion";
import { links, projects, type Project } from "../data/content";
import RingButton from "./RingButton";
import SectionHeader, { revealTransition } from "./SectionHeader";

// Alternating 7/5/5/7 columns. The wide card sets the row height and the
// narrow one stretches to match it.
const LAYOUT = [
  "md:col-span-7 md:aspect-[16/11]",
  "md:col-span-5 md:aspect-auto",
  "md:col-span-5 md:aspect-auto",
  "md:col-span-7 md:aspect-[16/11]",
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const inner = (
    <>
      <img
        src={project.image}
        alt={project.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="halftone pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply" />

      {/* Title for touch screens, which have no hover state. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 [@media(hover:hover)]:hidden">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">{project.category}</p>
        <p className="mt-1 font-display text-2xl italic text-white">{project.title}</p>
      </div>

      <div className="absolute inset-0 bg-bg/70 opacity-0 backdrop-blur-lg transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-0 flex translate-y-2 items-center justify-center opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
        <span className="accent-gradient-animated rounded-full p-[2px]">
          <span className="block whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm text-black">
            View — <span className="font-display text-base italic">{project.title}</span>
          </span>
        </span>
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ ...revealTransition, delay: (index % 2) * 0.1 }}
      className={`group relative aspect-[4/3] overflow-hidden rounded-3xl border border-stroke bg-surface ${LAYOUT[index % LAYOUT.length]}`}
    >
      {project.href ? (
        <a
          href={project.href}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0"
          aria-label={`View ${project.title}`}
        >
          {inner}
        </a>
      ) : (
        <div className="absolute inset-0">{inner}</div>
      )}
    </motion.div>
  );
}

export default function SelectedWorks() {
  return (
    <section id="work" className="bg-bg py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <SectionHeader
          eyebrow="Selected Work"
          title={
            <>
              Featured <span className="font-display italic">projects</span>
            </>
          }
          subtext="A selection of projects I've worked on, from concept to launch."
          action={
            <RingButton href={links.allWork} size="px-6 py-3 text-sm">
              View all work <span aria-hidden="true">→</span>
            </RingButton>
          }
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          {projects.map((project, index) => (
            <ProjectCard key={`${project.title}-${index}`} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
