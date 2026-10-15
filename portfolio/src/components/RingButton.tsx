import type { ReactNode } from "react";
import { linkProps } from "../lib/links";

type RingButtonProps = {
  children: ReactNode;
  /** "solid": light pill that turns dark on hover. "outline": dark pill with a border. */
  variant?: "solid" | "outline";
  href?: string;
  onClick?: () => void;
  /** Size and spacing of the pill. */
  size?: string;
  className?: string;
};

/**
 * Rounded button with the accent-gradient ring that appears on hover. Renders a
 * link when `href` is given, otherwise a button.
 */
export default function RingButton({
  children,
  variant = "outline",
  href,
  onClick,
  size = "px-7 py-3.5 text-sm",
  className = "",
}: RingButtonProps) {
  const outer = `group relative inline-flex rounded-full transition-transform duration-300 hover:scale-105 focus-visible:outline-none ${className}`;

  const variants = {
    solid: "border-transparent bg-text-primary text-bg group-hover:bg-bg group-hover:text-text-primary",
    outline: "border-stroke bg-bg text-text-primary group-hover:border-transparent",
  };

  const content = (
    <>
      <span
        aria-hidden="true"
        className="accent-gradient absolute rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ inset: -2 }}
      />
      <span
        className={`relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 transition-colors duration-300 ${variants[variant]} ${size}`}
      >
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={outer} {...linkProps(href)}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={outer}>
      {content}
    </button>
  );
}
