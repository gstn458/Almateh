import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import Hero from "../components/Hero";
import SelectedWorks from "../components/SelectedWorks";
import Journal from "../components/Journal";
import Explorations from "../components/Explorations";
import Stats from "../components/Stats";
import Contact from "../components/Contact";
import { ScrollTrigger } from "../lib/gsap";
import { scrollToSection, type SectionId } from "../lib/navigation";

type IndexProps = {
  isLoading: boolean;
  onLoaded: () => void;
};

export default function Index({ isLoading, onLoaded }: IndexProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollTarget = (location.state as { scrollTo?: SectionId } | null)?.scrollTo;

  // The loader hides the scrollbar, which shifts the layout slightly, so
  // re-measure the scroll animations once it is gone.
  useEffect(() => {
    if (isLoading) return;
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [isLoading]);

  // Arriving from another page via "Work" or "Say hi": scroll there once the
  // page transition has settled, then clear the request so a reload starts at the top.
  useEffect(() => {
    if (!scrollTarget) return;
    const id = window.setTimeout(() => {
      scrollToSection(scrollTarget);
      navigate(location.pathname, { replace: true, state: null });
    }, 450);
    return () => window.clearTimeout(id);
  }, [scrollTarget, navigate, location.pathname]);

  return (
    <>
      <AnimatePresence>{isLoading && <LoadingScreen onComplete={onLoaded} />}</AnimatePresence>
      <Hero ready={!isLoading} />
      <SelectedWorks />
      <Journal />
      <Explorations />
      <Stats />
      <Contact />
    </>
  );
}
