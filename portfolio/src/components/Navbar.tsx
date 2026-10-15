import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { nav, person } from "../data/content";
import { useGoToSection } from "../lib/navigation";

type NavLink = "home" | "work" | "resume";
const LINKS: NavLink[] = ["home", "work", "resume"];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const goToSection = useGoToSection();
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState<"home" | "work">("home");

  // Shadow after 100px, and the active link follows the scroll position.
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 100);
      const work = document.getElementById("work");
      const pastWork = work ? work.getBoundingClientRect().top <= window.innerHeight * 0.4 : false;
      setSection(pastWork ? "work" : "home");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  const active: NavLink = pathname === "/resume" ? "resume" : section;

  const handleClick = (link: NavLink) => {
    if (link === "home") goToSection("home");
    else if (link === "work") goToSection("work");
    else if (pathname !== "/resume") navigate("/resume");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-4 md:pt-6">
      <nav
        aria-label="Main"
        className={`inline-flex items-center rounded-full border border-white/10 bg-surface px-2 py-2 backdrop-blur-md transition-shadow duration-300 ${
          scrolled ? "shadow-md shadow-black/10" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => goToSection("home")}
          aria-label={`${person.name}, back to top`}
          className="hit-area group relative h-9 w-9 shrink-0 rounded-full bg-[linear-gradient(90deg,#89AACC_0%,#4E85BF_100%)] p-[1.5px] transition-transform duration-300 hover:scale-110 hover:bg-[linear-gradient(270deg,#89AACC_0%,#4E85BF_100%)]"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-bg font-display text-[13px] italic text-text-primary">
            {person.initials}
          </span>
        </button>

        <span className="mx-1 hidden h-5 w-px bg-stroke sm:block" />

        {LINKS.map((link) => (
          <button
            key={link}
            type="button"
            onClick={() => handleClick(link)}
            aria-current={active === link ? "page" : undefined}
            className={`hit-area rounded-full px-3 py-1.5 text-xs transition-colors duration-300 sm:px-4 sm:py-2 sm:text-sm ${
              active === link
                ? "bg-stroke/50 text-text-primary"
                : "text-muted hover:bg-stroke/50 hover:text-text-primary"
            }`}
          >
            {nav[link]}
          </button>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-stroke sm:block" />

        <button
          type="button"
          onClick={() => goToSection("contact")}
          className="hit-area group relative rounded-full text-xs focus-visible:outline-none sm:text-sm"
        >
          <span
            aria-hidden="true"
            className="accent-gradient absolute rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ inset: -2 }}
          />
          <span className="relative inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-text-primary backdrop-blur-md sm:px-4 sm:py-2">
            {nav.contact} <span aria-hidden="true">↗</span>
          </span>
        </button>
      </nav>
    </header>
  );
}
