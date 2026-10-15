import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ScrollTrigger } from "../lib/gsap";

/** Short fade-and-slide used when moving between routes. */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      // Scroll positions were measured mid-slide; measure again once settled.
      onAnimationComplete={() => ScrollTrigger.refresh()}
    >
      {children}
    </motion.main>
  );
}
