import type { Project } from "../data/content";
import { linkProps } from "../lib/links";
import StatusChip from "./StatusChip";
import Todo from "./Todo";

const SECTIONS: { key: "problem" | "built" | "how" | "learned"; heading: string }[] = [
  { key: "problem", heading: "The problem" },
  { key: "built", heading: "What I built" },
  { key: "how", heading: "How it works" },
  { key: "learned", heading: "What I learned" },
];

/** Body of the project detail dialog. Missing sections show as TODOs on the dev server only. */
export default function ProjectDetails({ project }: { project: Project }) {
  const { details } = project;

  return (
    <article>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <StatusChip status={project.status} />
        {project.tags?.map((tag) => (
          <span key={tag} className="text-xs text-muted">
            {tag}
          </span>
        ))}
      </div>
      <h2 className="font-display text-3xl italic leading-tight text-text-primary md:text-4xl">{project.title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">{project.summary}</p>

      {details.facts && (
        <ul className="mt-6 space-y-1 text-sm text-text-primary/90">
          {details.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      )}

      <div className="mt-8 space-y-7">
        {SECTIONS.map(({ key, heading }) => {
          const text = details[key];
          if (!text && !import.meta.env.DEV) return null;
          return (
            <section key={key}>
              <h3 className="mb-2 text-xs uppercase tracking-[0.3em] text-muted">{heading}</h3>
              {text ? (
                <p className="text-sm leading-relaxed text-text-primary/90 md:text-base">{text}</p>
              ) : (
                <Todo>{`${heading} (${project.cardTitle ?? project.title})`}</Todo>
              )}
            </section>
          );
        })}

        <section>
          <h3 className="mb-3 text-xs uppercase tracking-[0.3em] text-muted">Links</h3>
          {project.links.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {project.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    {...linkProps(link.href)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-stroke px-5 text-sm text-text-primary transition-colors hover:border-text-primary/40"
                  >
                    {link.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-sm text-muted">Link coming soon.</p>
              <Todo>link</Todo>
            </>
          )}
        </section>
      </div>

      {details.note && <p className="mt-10 border-t border-stroke pt-5 text-xs leading-relaxed text-muted">{details.note}</p>}
    </article>
  );
}
