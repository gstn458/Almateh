import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { profile, resume } from "../data/content";
import RingButton from "../components/RingButton";
import { revealTransition } from "../components/SectionHeader";
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
        <span className="h-px w-8 bg-stroke md:mt-2" />
        <h2 className="text-xs uppercase tracking-[0.3em] text-muted">{title}</h2>
      </div>
      <div>{children}</div>
    </motion.section>
  );
}

export default function Resume() {
  const goToSection = useGoToSection();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1000px] px-6 pb-20 pt-32 md:px-10 md:pb-28 md:pt-40">
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...revealTransition, delay: 0.1 }}
          className="mb-12 md:mb-16"
        >
          <p className="mb-6 text-xs uppercase tracking-[0.3em] text-muted">Resume</p>
          <h1 className="font-display text-5xl italic leading-[0.9] tracking-tight text-text-primary md:text-7xl lg:text-8xl">
            {profile.name}
          </h1>
          <p className="mt-6 text-base text-muted md:text-lg">
            {profile.roles.join(" · ")} — {profile.city}
          </p>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted md:text-base">{resume.summary}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            {resume.pdfUrl && (
              <RingButton variant="solid" href={resume.pdfUrl}>
                Download PDF <span aria-hidden="true">↓</span>
              </RingButton>
            )}
            <RingButton variant="outline" href={`mailto:${profile.email}`}>
              {profile.email} <span aria-hidden="true">↗</span>
            </RingButton>
          </div>
        </motion.header>

        <Block title="Experience">
          <ol className="flex flex-col gap-10">
            {resume.experience.map((job, index) => (
              <li key={`${job.company}-${index}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <h3 className="text-lg text-text-primary md:text-xl">
                    {job.role} <span className="font-display italic text-muted">at</span> {job.company}
                  </h3>
                  <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-muted">{job.period}</span>
                </div>
                {job.location && <p className="mt-1 text-sm text-muted">{job.location}</p>}
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
                  {job.description}
                </p>
              </li>
            ))}
          </ol>
        </Block>

        <Block title="Education">
          <ol className="flex flex-col gap-8">
            {resume.education.map((item, index) => (
              <li
                key={`${item.school}-${index}`}
                className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <div>
                  <h3 className="text-lg text-text-primary md:text-xl">{item.school}</h3>
                  <p className="mt-1 text-sm text-muted">{item.degree}</p>
                </div>
                <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-muted">{item.period}</span>
              </li>
            ))}
          </ol>
        </Block>

        <Block title="Skills">
          <ul className="flex flex-wrap gap-3">
            {resume.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border border-stroke bg-surface/30 px-4 py-2 text-sm text-text-primary"
              >
                {skill}
              </li>
            ))}
          </ul>
        </Block>

        <div className="flex flex-col items-center gap-6 border-t border-stroke pt-12 text-center md:pt-16">
          <h2 className="text-3xl font-light tracking-tight text-text-primary md:text-5xl">
            Let's work <span className="font-display italic">together</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <RingButton variant="solid" onClick={() => goToSection("work")}>
              See Works
            </RingButton>
            <RingButton variant="outline" onClick={() => goToSection("contact")}>
              Reach out...
            </RingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
