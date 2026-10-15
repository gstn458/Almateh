/**
 * A dashed amber "TODO" chip for content that still needs filling in. It only
 * renders on the dev server, so unfinished details never reach the live site.
 */
export default function Todo({ children }: { children: string }) {
  if (!import.meta.env.DEV) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-amber-400/70 px-2 py-0.5 align-middle font-body text-[11px] not-italic normal-case tracking-normal text-amber-300">
      TODO: {children}
    </span>
  );
}
