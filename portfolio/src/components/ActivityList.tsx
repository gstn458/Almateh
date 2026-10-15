import type { Activity } from "../data/content";
import StatusChip from "./StatusChip";
import Todo from "./Todo";

/** Compact timeline-style list used for leadership roles and competitions. */
export default function ActivityList({ items, todoDetail }: { items: Activity[]; todoDetail?: Record<string, string> }) {
  return (
    <ol className="border-l border-stroke">
      {items.map((item) => (
        <li key={item.title} className="relative pb-7 pl-6 last:pb-0">
          <span aria-hidden="true" className="absolute -left-[4.5px] top-2 h-2 w-2 rounded-full bg-stroke ring-4 ring-bg" />
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <h4 className="text-base text-text-primary md:text-lg">{item.title}</h4>
            {item.status && <StatusChip status={item.status} />}
          </div>
          {item.detail ? (
            <p className="mt-1 text-sm text-muted">{item.detail}</p>
          ) : (
            todoDetail?.[item.title] && (
              <div className="mt-1">
                <Todo>{todoDetail[item.title]}</Todo>
              </div>
            )
          )}
          {item.dates ? (
            <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted">{item.dates}</p>
          ) : (
            !item.status && (
              <div className="mt-1">
                <Todo>years</Todo>
              </div>
            )
          )}
        </li>
      ))}
    </ol>
  );
}
