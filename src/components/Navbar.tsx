import { useState } from 'react';
import { motion, useMotionTemplate, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Services', href: '#services' },
  { label: 'Work', href: '#work' },
  { label: 'Agency', href: '#agency' },
  { label: 'Contact', href: '#contact' },
] as const;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { scrollY } = useScroll();

  /* Scroll [0 → 50px]: the glass thickens as the page leaves the top. */
  const backgroundOpacity = useTransform(scrollY, [0, 50], [0.02, 0.08]);
  const blurAmount = useTransform(scrollY, [0, 50], [8, 24]);
  const borderOpacity = useTransform(scrollY, [0, 50], [0.05, 0.1]);

  const background = useMotionTemplate`rgba(255, 255, 255, ${backgroundOpacity})`;
  const backdropFilter = useMotionTemplate`blur(${blurAmount}px)`;
  const borderColor = useMotionTemplate`rgba(255, 255, 255, ${borderOpacity})`;

  return (
    <header className="fixed left-0 right-0 top-6 z-50 flex justify-center px-4 sm:px-6 lg:px-8">
      <motion.nav
        aria-label="Primary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        style={{ background, backdropFilter, WebkitBackdropFilter: backdropFilter, borderColor }}
        className={`w-full max-w-5xl border transition-[border-radius] duration-500 ${
          isOpen ? 'rounded-3xl' : 'rounded-full'
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <a
            href="#top"
            className="group flex items-center gap-2 text-lg font-black tracking-tighter text-white"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0c1128] transition-transform duration-500 group-hover:scale-75" />
            </span>
            Almateh
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="group relative inline-block py-1 text-sm font-medium text-gray-300 transition-colors duration-300 hover:text-white"
                >
                  {item.label}
                  <span className="absolute -bottom-0.5 left-0 block h-px w-0 bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300 ease-out group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#contact"
              className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 sm:inline-block"
            >
              Start Project
            </a>

            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-navigation"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors duration-300 hover:bg-white/10 active:scale-95 md:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id="mobile-navigation"
              key="mobile-navigation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden rounded-b-3xl bg-[#0c1128]/80 md:hidden"
            >
              <ul className="flex flex-col gap-1 border-t border-white/5 px-5 pb-5 pt-4">
                {NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-2xl px-3 py-3 text-base font-medium text-gray-300 transition-colors duration-300 hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <a
                    href="#contact"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black transition-transform duration-300 active:scale-95"
                  >
                    Start Project
                  </a>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}
