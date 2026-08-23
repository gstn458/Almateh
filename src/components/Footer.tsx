import { motion } from 'framer-motion';
import { ArrowUpRight, Dribbble, Github, Instagram, Linkedin, Twitter } from 'lucide-react';

const NAVIGATION = [
  { label: 'Services', href: '#services' },
  { label: 'Work', href: '#work' },
  { label: 'Agency', href: '#agency' },
  { label: 'Contact', href: '#contact' },
] as const;

const COMPANY = [
  { label: 'Careers', href: '#agency' },
  { label: 'Process', href: '#services' },
  { label: 'Journal', href: '#agency' },
  { label: 'Contact', href: '#contact' },
] as const;

const SOCIALS = [
  { label: 'Almateh on X', Icon: Twitter, href: '#contact' },
  { label: 'Almateh on Instagram', Icon: Instagram, href: '#contact' },
  { label: 'Almateh on LinkedIn', Icon: Linkedin, href: '#contact' },
  { label: 'Almateh on Dribbble', Icon: Dribbble, href: '#contact' },
  { label: 'Almateh on GitHub', Icon: Github, href: '#contact' },
] as const;

export default function Footer() {
  return (
    <footer id="contact" className="relative border-t border-white/5 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col items-start gap-10 border-b border-white/5 pb-20 lg:flex-row lg:items-end lg:justify-between"
        >
          <h2 className="max-w-3xl text-5xl font-black leading-[1.1] tracking-tighter text-white sm:text-6xl lg:text-7xl">
            Let&rsquo;s create something{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              epic.
            </span>
          </h2>

          <a
            href="mailto:hello@almateh.studio"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
          >
            Start a Project
            <ArrowUpRight
              className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </motion.div>

        <div className="grid grid-cols-2 gap-10 py-16 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <a href="#top" className="flex items-center gap-2 text-lg font-black tracking-tighter">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0c1128]" />
              </span>
              Almateh
            </a>
            <p className="mt-5 max-w-xs text-sm font-light leading-relaxed text-gray-400">
              A design and growth studio for teams who would rather set the standard than meet it.
            </p>
            <a
              href="mailto:hello@almateh.studio"
              className="mt-5 inline-block text-sm font-medium text-gray-300 transition-colors duration-300 hover:text-white"
            >
              hello@almateh.studio
            </a>
          </div>

          <nav aria-label="Footer navigation">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Navigation
            </h3>
            <ul className="mt-5 space-y-3">
              {NAVIGATION.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="group relative inline-block text-sm font-light text-gray-300 transition-colors duration-300 hover:text-white"
                  >
                    {item.label}
                    <span className="absolute -bottom-0.5 left-0 block h-px w-0 bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300 ease-out group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company links">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Company</h3>
            <ul className="mt-5 space-y-3">
              {COMPANY.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="group relative inline-block text-sm font-light text-gray-300 transition-colors duration-300 hover:text-white"
                  >
                    {item.label}
                    <span className="absolute -bottom-0.5 left-0 block h-px w-0 bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300 ease-out group-hover:w-full" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Socials</h3>
            <ul className="mt-5 flex flex-wrap gap-3">
              {SOCIALS.map(({ label, Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-white/20 hover:text-white active:scale-95"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" strokeWidth={1.75} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs font-light text-gray-600">
            &copy; {new Date().getFullYear()} Almateh Studio. All rights reserved.
          </p>
          <ul className="flex items-center gap-6">
            <li>
              <a
                href="#contact"
                className="text-xs font-light text-gray-600 transition-colors duration-300 hover:text-gray-300"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="text-xs font-light text-gray-600 transition-colors duration-300 hover:text-gray-300"
              >
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
