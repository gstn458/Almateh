import { motion } from 'framer-motion';

const STATS = [
  { value: '10+', label: 'Years Experience' },
  { value: '150+', label: 'Global Clients' },
] as const;

export default function About() {
  return (
    <section id="agency" className="relative overflow-hidden py-32" aria-labelledby="about-heading">
      {/* Soft purple bloom behind the whole section. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[120px]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          >
            <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 backdrop-blur-md">
              The Agency
            </span>
            <h2
              id="about-heading"
              className="mt-6 text-4xl font-black leading-[1.1] tracking-tighter text-white sm:text-5xl lg:text-6xl"
            >
              Design is not just what it looks like.{' '}
              <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                It&rsquo;s how it feels.
              </span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col justify-center"
          >
            <p className="text-base font-light leading-relaxed text-gray-300 sm:text-lg">
              Almateh is a small, senior team of designers, strategists and engineers. We work in
              tight loops with the people who own the outcome — no account layer, no handoff
              theatre, no version of the work that only exists in a slide.
            </p>
            <p className="mt-6 text-base font-light leading-relaxed text-gray-400 sm:text-lg">
              Ten years in, we have learned that the difference between a good product and one
              people talk about is rarely a bigger idea. It is the hundred small decisions nobody
              is supposed to notice.
            </p>

            <dl className="mt-12 grid grid-cols-2 gap-6">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-colors duration-500 hover:border-white/20"
                >
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-4xl font-black tracking-tighter text-transparent sm:text-5xl">
                      {stat.value}
                    </span>
                    <span className="mt-2 block text-xs font-bold uppercase tracking-widest text-gray-400">
                      {stat.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
