import { useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import PageTransition from "./components/PageTransition";
import Index from "./pages/Index";
import Resume from "./pages/Resume";

export default function App() {
  const location = useLocation();
  // The loading screen plays once, and only when the visit starts on the home page.
  const [isLoading, setIsLoading] = useState(() => location.pathname === "/");

  return (
    // reducedMotion="user" turns off movement for visitors who ask their system to reduce motion.
    <MotionConfig reducedMotion="user">
      <Navbar />
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Index isLoading={isLoading} onLoaded={() => setIsLoading(false)} />
              </PageTransition>
            }
          />
          <Route
            path="/resume"
            element={
              <PageTransition>
                <Resume />
              </PageTransition>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </MotionConfig>
  );
}
