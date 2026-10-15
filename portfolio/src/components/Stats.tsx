import { motion } from "framer-motion";
import { stats } from "../data/content";
import { revealTransition } from "./SectionHeader";

export default function Stats() {
  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-10 border-t border-stroke pt-12 sm:grid-cols-3 sm:gap-6 md:pt-16">
          {stats.map((stat, index) => (
            <motion.div
              key={`${stat.label}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ ...revealTransition, delay: index * 0.1 }}
              className="text-center sm:text-left"
            >
              <p className="font-display text-6xl leading-none text-text-primary md:text-7xl lg:text-8xl">
                {stat.value}
              </p>
              <p className="mt-3 text-sm text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
