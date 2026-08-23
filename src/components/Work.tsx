import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const EASE = [0.25, 1, 0.5, 1] as const;

type Project = {
  name: string;
  category: string;
  year: string;
  description: string;
  image: string;
};

const PROJECTS: Project[] = [
  {
    name: 'Pixzen',
    category: 'Product Design',
    year: '2025',
    description:
      'A creative asset platform rebuilt around a single canvas. We cut the onboarding flow from eleven steps to three and doubled week-one activation.',
    image: 'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionitems/1781522720269-Pixzen.webp',
  },
  {
    name: 'Wander',
    category: 'Brand & Web',
    year: '2025',
    description:
      'Travel booking with the friction designed out. A new identity, an editorial art direction and a booking funnel that finally reads like a story.',
    image:
      'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionitems/1781631791578-Wander_Hero.webp',
  },
  {
    name: 'Agentify',
    category: 'AI Platform',
    year: '2024',
    description:
      'An agent orchestration console for technical teams. Dense data made calm through disciplined hierarchy, restraint and a real design system.',
    image:
      'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionitems/1781671943344-Agentify_Hero.webp',
  },
  {
    name: 'Future',
    category: 'Campaign',
    year: '2024',
    description:
      'A launch campaign that ran across film, web and out-of-home without losing a single degree of tension between the channels.',
    image:
      'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionitems/1781679053418-Future_Carousel.webp',
  },
  {
    name: 'Genova',
    category: 'E-Commerce',
    year: '2024',
    description:
      'A luxury storefront rebuilt for speed. Sub-second loads, a rewritten checkout and a 41% lift in completed orders inside one quarter.',
    image:
      'https://strvid.nyc3.cdn.digitaloceanspaces.com/motionitems/1781670271708-Genova_Hero.webp',
  },
];

export default function Work() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="work" className="relative py-32" aria-labelledby="work-heading">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 backdrop-blur-md">
              Selected projects
            </span>
            <h2
              id="work-heading"
              className="mt-6 text-4xl font-black leading-[1.1] tracking-tighter text-white sm:text-5xl lg:text-6xl"
            >
              Our{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Works
              </span>
            </h2>
          </div>

          <a
            href="#work"
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors duration-300 hover:text-white"
          >
            <span className="relative py-1">
              View All Projects
              <span className="absolute -bottom-0.5 left-0 block h-px w-0 bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300 ease-out group-hover:w-full" />
            </span>
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: EASE }}
          className="mt-14 flex h-[620px] w-full flex-col gap-3 md:h-[400px] md:flex-row md:gap-4"
          onMouseLeave={() => setActiveIndex(0)}
        >
          {PROJECTS.map((project, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.li
                key={project.name}
                /* The hovered panel claims the space its siblings give up. */
                animate={{ flexGrow: isActive ? 4 : 0.8 }}
                transition={{ duration: 0.6, ease: EASE }}
                style={{ flexBasis: 0, minWidth: 0, minHeight: 0 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10"
                onMouseEnter={() => setActiveIndex(index)}
              >
                <a
                  href="#work"
                  onFocus={() => setActiveIndex(index)}
                  aria-label={`${project.name} — ${project.category}, ${project.year}. View case study.`}
                  className="absolute inset-0 z-20 block rounded-3xl"
                />

                <img
                  src={project.image}
                  alt={`${project.name} — ${project.category} project by Almateh`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
                  <AnimatePresence mode="wait" initial={false}>
                    {isActive ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
                        className="max-w-md"
                      >
                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-blue-300">
                          <span>{project.category}</span>
                          <span className="h-px w-6 bg-white/30" aria-hidden="true" />
                          <span className="text-gray-400">{project.year}</span>
                        </div>
                        <h3 className="mt-3 text-3xl font-black tracking-tighter text-white sm:text-4xl">
                          {project.name}
                        </h3>
                        <p className="mt-3 hidden text-sm font-light leading-relaxed text-gray-300 sm:block">
                          {project.description}
                        </p>
                        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform duration-300 group-hover:scale-105">
                          View Case Study
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        <span
                          className="block text-[10px] font-bold tracking-widest text-gray-500"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="mt-1 whitespace-nowrap text-lg font-black tracking-tighter text-white sm:text-xl">
                          {project.name}
                        </h3>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
