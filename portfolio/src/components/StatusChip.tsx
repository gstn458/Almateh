import type { Status } from "../data/content";

const DOTS: Record<Status, string> = {
  Live: "bg-emerald-400",
  Published: "bg-[#89AACC]",
  "In development": "bg-amber-300",
  "In progress": "bg-amber-300",
  Upcoming: "bg-muted",
  Finalist: "bg-emerald-400",
};

export default function StatusChip({ status }: { status: Status }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-bg/60 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-text-primary backdrop-blur-md">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOTS[status]}`} />
      {status}
    </span>
  );
}
