import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type SectionId = "home" | "work" | "contact";

// Leaves room for the floating navbar above the section heading.
const NAV_OFFSET = 40;

/** Smoothly scrolls the window to a section on the current page. */
export function scrollToSection(id: SectionId) {
  if (id === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Returns a function that goes to a section of the home page. On the home page
 * it scrolls there; from any other page it navigates home first and the home
 * page finishes the scroll once it has mounted.
 */
export function useGoToSection() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return useCallback(
    (id: SectionId) => {
      if (pathname === "/") scrollToSection(id);
      else navigate("/", { state: { scrollTo: id } });
    },
    [navigate, pathname],
  );
}
