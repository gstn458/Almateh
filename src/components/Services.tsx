import { motion } from 'framer-motion';
import { Compass, LayoutDashboard, PenTool, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Corner = 'tl' | 'tr' | 'bl' | 'br';

type Service = {
  title: string;
  description: string;
  Icon: LucideIcon;
  corner: Corner;
  accent: string;
};

/* Each card seats its icon inside a quarter-circle pinned to one corner,
   walking the diagonal across the 2x2 grid. */
const CORNER_STYLES: Record<Corner, { arc: string; icon: string; body: string }> = {
  tl: { arc: 'left-0 top-0 rounded-br-full', icon: 'left-8 top-8', body: 'justify-end pt-40' },
  tr: { arc: 'right-0 top-0 rounded-bl-full', icon: 'right-8 top-8', body: 'justify-end pt-40' },
  bl: { arc: 'bottom-0 left-0 rounded-tr-full', icon: 'bottom-8 left-8', body: 'justify-start pb-40' },
  br: { arc: 'bottom-0 right-0 rounded-tl-full', icon: 'bottom-8 right-8', body: 'justify-start pb-40' },
};

const SERVICES: Service[] = [
  {
    title: 'UI/UX Design',
    description:
      'Product interfaces built on real user research — flows, wireframes and pixel-exact systems that make complex software feel obvious.',
    Icon: LayoutDashboard,
    corner: 'tl',
    accent: 'from-blue-500/25 to-blue-500/0',
  },
  {
    title: 'Visual Graphic',
    description:
      'Identity, motion and art direction. Logotypes, type scales and campaign visuals that hold their nerve across every surface you ship.',
    Icon: PenTool,
    corner: 'tr',
    accent: 'from-purple-500/25 to-purple-500/0',
  },
  {
    title: 'Strategy',
    description:
      'Positioning, messaging and roadmaps grounded in market evidence, so every design decision traces back to a business one.',
    Icon: Compass,
    corner: 'bl',
    accent: 'from-cyan-500/25 to-cyan-500/0',
  },
  {
    title: 'Business Growth',
    description:
      'Conversion architecture, lifecycle experiments and analytics loops that turn a beautiful launch into compounding revenue.',
    Icon: TrendingUp,
    corner: 'br',
    accent: 'from-fuchsia-500/25 to-fuchsia-500/0',
  },
];

export default function Services() {
  return (
    <section id="services" className="relative py-32" aria-labelledby="services-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="max-w-3xl"
        >
          <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 backdrop-blur-md">
            What we do
          </span>
          <h2
            id="services-heading"
            className="mt-6 text-4xl font-black leading-[1.1] tracking-tighter text-white sm:text-5xl lg:text-6xl"
          >
            Services Built Specifically for{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              your Business
            </span>
          </h2>
          <p className="mt-6 max-w-2xl text-base font-light leading-relaxed text-gray-400 sm:text-lg">
            No retainer templates and no recycled decks. Every engagement is scoped around the
            outcome you are actually chasing.
          </p>
        </motion.div>

        <div className="mt-16 grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2">
          {SERVICES.map((service, index) => {
            const corner = CORNER_STYLES[service.corner];
            return (
              <motion.article
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 1, 0.5, 1] }}
                className="group relative min-h-[360px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors duration-500 hover:border-white/20"
              >
                <div
                  aria-hidden="true"
                  className={`absolute h-40 w-40 bg-gradient-to-br ${service.accent} ${corner.arc} transition-transform duration-700 ease-out group-hover:scale-110`}
                />
                <div
                  aria-hidden="true"
                  className={`absolute flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white backdrop-blur-md ${corner.icon}`}
                >
                  <service.Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>

                <div className={`relative flex h-full flex-col p-8 ${corner.body}`}>
                  <h3 className="text-2xl font-black tracking-tighter text-white sm:text-3xl">
                    {service.title}
                  </h3>
                  <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-gray-400 sm:text-base">
                    {service.description}
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
