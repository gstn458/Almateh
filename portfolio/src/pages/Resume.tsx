import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { activities, experience, hero, person, projects, research, resume, site } from "../data/content";
import { LEADERSHIP_TODOS } from "../components/Activities";
import ActivityList from "../components/ActivityList";
import RingButton from "../components/RingButton";
import { revealTransition } from "../components/SectionHeader";
import StatusChip from "../components/StatusChip";
import Todo from "../components/Todo";
import { linkProps } from "../lib/links";
import { useGoToSection } from "../lib/navigation";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={revealTransition}
      className="border-t border-stroke py-10 md:grid md:grid-cols-[200px_1fr] md:gap-10 md:py-14"
    >
      <div className="mb-6 flex items-center gap-3 md:mb-0 md:items-start md:pt-1">
        <span aria-hidden="true" className="h-px w-8 shrink-0 bg-stroke md:mt-2" />
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted">{title}</h2>
      </div>
      <div className="min-w-0">{children}</div>
    </motion.section>
  );
}

function Row({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <li>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <h3 className="text-lg text-text-primary md:text-xl">{title}</h3>
        {meta && <div className="shrink-0 text-xs uppercase tracking-[0.2em] text-muted">{meta}</div>}
      </div>
      {children}
    </li>
  );
}

export default function Resume() {
  const goToSection = useGoToSection();
  const { education } = resume;
  // In dev the button always shows so you can see where it goes; the live site
  // only shows it once public/resume.pdf exists.
  const showPdf = __HAS_RESUME_PDF__ || import.meta.env.DEV;

  useEffect(() => {
    document.title = resume.pageTitle;
    return () => {
      document.title = site.title;
    };
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1000px] px-6 pb-20 pt-32 md:px-10 md:pb-28 md:pt-40">
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...revealTransition, delay: 0.1 }}
          className="mb-12 md:mb-16"
        >
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-muted">{resume.eyebrow}</p>
          <h1 className="font-display text-5xl italic leading-[0.95] tracking-tight text-text-primary md:text-7xl lg:text-8xl">
            {person.fullName}
          </h1>
          <p lang="zh-Hans" className="mt-4 text-sm tracking-[0.3em] text-muted md:text-base">
            {person.chineseName}
          </p>
          <p className="mt-6 text-base text-muted md:text-lg">
            {resume.headline} · {person.location}
          </p>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted md:text-base">{resume.summary}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {showPdf && (
              <RingButton variant="solid" href={resume.pdf.href}>
                {resume.pdf.label} <span aria-hidden="true">↓</span>
              </RingButton>
            )}
            {!__HAS_RESUME_PDF__ && <Todo>add your PDF at public/resume.pdf</Todo>}
            {person.email ? (
              <RingButton variant="outline" href={`mailto:${person.email}`}>
                {person.email} <span aria-hidden="true">↗</span>
              </RingButton>
            ) : (
              <Todo>public email address</Todo>
            )}
          </div>
        </motion.header>

        <Block title="Education">
          <ul>
            <Row title={education.school} meta={education.period}>
              <p className="mt-1 text-sm text-muted">{education.programme}</p>
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="Subjects">
                {education.subjects.map((subject) => (
                  <li key={subject} className="rounded-full border border-stroke px-3 py-1.5 text-xs text-text-primary">
                    {subject}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted">Plus {education.core.join(", ").replace(/, ([^,]*)$/, " and $1")}.</p>
            </Row>
          </ul>
        </Block>

        <Block title="Experience">
          <ul className="flex flex-col gap-8">
            {experience.map((job) => (
              <Row
                key={job.company}
                title={
                  <>
                    {job.role ? (
                      <>
                        {job.role} <span className="font-display italic text-muted">at</span>{" "}
                      </>
                    ) : (
                      <span className="mr-2">
                        <Todo>role</Todo>
                      </span>
                    )}
                    {job.company}
                  </>
                }
                meta={job.dates ?? <Todo>dates</Todo>}
              >
                {job.summary ? (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted md:text-base">{job.summary}</p>
                ) : (
                  <div className="mt-2">
                    <Todo>one line on what you did</Todo>
                  </div>
                )}
              </Row>
            ))}
          </ul>
        </Block>

        <Block title="Research and publications">
          <ul className="flex flex-col gap-8">
            {research.items.map((item) => (
              <Row key={item.title} title={item.title} meta={item.status ? <StatusChip status={item.status} /> : <Todo>status</Todo>}>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{item.kind}</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{item.summary}</p>
                {item.link && (
                  <a
                    href={item.link.href}
                    {...linkProps(item.link.href)}
                    className="mt-1 inline-flex min-h-[44px] items-center gap-1 break-all text-sm text-text-primary underline-offset-4 hover:underline"
                  >
                    {item.link.label} <span aria-hidden="true">↗</span>
                  </a>
                )}
                {item.note && <p className="mt-1 text-xs text-muted">{item.note}</p>}
              </Row>
            ))}
          </ul>
        </Block>

        <Block title="Projects">
          <ul className="flex flex-col gap-8">
            {projects.map((project) => (
              <Row key={project.id} title={project.cardTitle ?? project.title} meta={<StatusChip status={project.status} />}>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{project.summary}</p>
                {project.links.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-5">
                    {project.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        {...linkProps(link.href)}
                        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-text-primary underline-offset-4 hover:underline"
                      >
                        {link.label} <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                )}
              </Row>
            ))}
          </ul>
        </Block>

        <Block title="Competitions and leadership">
          <h3 className="mb-6 text-xs uppercase tracking-[0.3em] text-muted">{activities.leadershipHeading}</h3>
          <ActivityList items={activities.leadership} todoDetail={LEADERSHIP_TODOS} />
          <h3 className="mb-6 mt-12 text-xs uppercase tracking-[0.3em] text-muted">{activities.competitionsHeading}</h3>
          <ActivityList items={activities.competitions} />
        </Block>

        <Block title="Skills">
          <div className="flex flex-col gap-8">
            {resume.skills.map((group) => (
              <div key={group.group}>
                <h3 className="mb-3 text-base text-text-primary">{group.group}</h3>
                <ul className="flex flex-wrap gap-2">
                  {group.items.map((skill) => (
                    <li key={skill} className="rounded-full border border-stroke bg-surface/30 px-4 py-2 text-sm text-text-primary">
                      {skill}
                    </li>
                  ))}
                  {group.todo && (
                    <li className="flex items-center">
                      <Todo>{group.todo}</Todo>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Block>

        <div className="flex flex-col items-center gap-6 border-t border-stroke pt-12 text-center md:pt-16">
          <h2 className="text-3xl font-light tracking-tight text-text-primary md:text-5xl">
            {resume.closingTitle} <span className="font-display italic">{resume.closingEmphasis}</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <RingButton variant="solid" onClick={() => goToSection("work")}>
              {hero.primaryCta}
            </RingButton>
            <RingButton variant="outline" onClick={() => goToSection("contact")}>
              {hero.secondaryCta}
            </RingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
