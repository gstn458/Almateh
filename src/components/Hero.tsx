import { useRef } from 'react';
import { motion, useMotionTemplate, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const OUTLINE_IMAGE =
  'https://strvid.nyc3.cdn.digitaloceanspaces.com/cloudinary/hero_city_outline_fzg37d.jpg';
const REVEAL_IMAGE = 'https://strvid.nyc3.cdn.digitaloceanspaces.com/cloudinary/hero_city_iglhwn.jpg';

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  /* The reveal circle grows from nothing to well past the viewport corners. */
  const circleSize = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const clipPath = useMotionTemplate`circle(${circleSize}% at 50% 50%)`;

  /* Both skylines drift toward the viewer through the whole scroll. */
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const outlineTextOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

  return (
    <section ref={sectionRef} id="top" className="relative h-[300vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Base layer — the sketched-out idea. */}
        <motion.div style={{ scale }} className="absolute inset-0">
          <img
            src={OUTLINE_IMAGE}
            alt="Line-drawn architectural sketch of a city skyline"
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c1128]/80 via-transparent to-[#0c1128]" />
        </motion.div>

        <motion.div
          style={{ opacity: outlineTextOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8"
        >
          <span className="mb-6 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 backdrop-blur-md">
            Digital Agency
          </span>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.1] tracking-tighter text-white sm:text-7xl lg:text-8xl">
            Imagine the Future
            <span className="sr-only"> — and build the reality.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base font-light leading-relaxed text-gray-300 sm:text-lg">
            Every landmark begins as a line on paper. We draw the idea, then we make it stand.
          </p>
        </motion.div>

        {/* Reveal layer — the idea, made real. Unmasked by an expanding circle. */}
        <motion.div style={{ clipPath, WebkitClipPath: clipPath }} className="absolute inset-0">
          <motion.div style={{ scale }} className="absolute inset-0">
            <img
              src={REVEAL_IMAGE}
              alt="Photorealistic city skyline glowing at dusk"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0c1128]/70 via-transparent to-[#0c1128]" />
          </motion.div>

          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8"
            aria-hidden="true"
          >
            <span className="mb-6 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 backdrop-blur-md">
              Almateh Studio
            </span>
            <p className="max-w-4xl bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-5xl font-black leading-[1.1] tracking-tighter text-transparent sm:text-7xl lg:text-8xl">
              Build the Reality
            </p>
            <p className="mt-6 max-w-xl text-base font-light leading-relaxed text-gray-300 sm:text-lg">
              Interfaces, brands and growth systems engineered to outlive the trend cycle.
            </p>
          </div>
        </motion.div>

        <motion.div
          style={{ opacity: indicatorOpacity }}
          className="pointer-events-none absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Scroll
          </span>
          <ChevronDown className="h-6 w-6 animate-bounce-slow text-white/70" aria-hidden="true" />
        </motion.div>
      </div>
    </section>
  );
}
