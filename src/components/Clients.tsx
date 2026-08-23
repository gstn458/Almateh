import { motion } from 'framer-motion';
import { Camera, CreditCard, Globe2, Hexagon, ShoppingBag, Tv, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Client = { name: string; Icon: LucideIcon };

const CLIENTS: Client[] = [
  { name: 'Instagram', Icon: Camera },
  { name: 'Shopify', Icon: ShoppingBag },
  { name: 'HubSpot', Icon: Hexagon },
  { name: 'CNBC', Icon: Tv },
  { name: 'BUSINESS INSIDER', Icon: Globe2 },
  { name: 'stripe', Icon: CreditCard },
];

/* The track holds two identical runs, so a -50% shift lands seamlessly on the copy. */
const TICKER_TRACK = [...CLIENTS, ...CLIENTS];

export default function Clients() {
  return (
    <section className="relative py-24" aria-labelledby="clients-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gray-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
            Interested
          </span>
          <h2
            id="clients-heading"
            className="text-2xl font-black tracking-tighter text-white sm:text-3xl"
          >
            Trusted by{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              300+ businesses
            </span>
          </h2>
        </motion.div>
      </div>

      <div className="relative mt-14 overflow-hidden">
        <motion.ul
          className="flex w-max items-center gap-16 pr-16 sm:gap-24 sm:pr-24"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
        >
          {TICKER_TRACK.map(({ name, Icon }, index) => (
            <li
              key={`${name}-${index}`}
              aria-hidden={index >= CLIENTS.length ? 'true' : undefined}
              className="flex shrink-0 items-center gap-3 text-gray-400 transition-colors duration-500 hover:text-white"
            >
              <Icon className="h-7 w-7" aria-hidden="true" strokeWidth={1.5} />
              <span className="whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl">
                {name}
              </span>
            </li>
          ))}
        </motion.ul>

        {/* Fade the ticker in and out of the page background at both edges. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0c1128] to-transparent sm:w-48"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0c1128] to-transparent sm:w-48"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
