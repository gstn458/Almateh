import type { VisualKind } from "../data/content";

/**
 * Placeholder artwork drawn with SVG, shown until a real screenshot is added
 * in content.ts. Decorative only, so it is hidden from screen readers.
 */
export default function Visual({ kind, className = "" }: { kind: VisualKind; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_70%_20%,rgba(78,133,191,0.22),transparent_60%),radial-gradient(80%_70%_at_10%_100%,rgba(137,170,204,0.10),transparent_60%)] ${className}`}
    >
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id={`g-${kind}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#89AACC" />
            <stop offset="1" stopColor="#4E85BF" />
          </linearGradient>
        </defs>
        {ART[kind](`url(#g-${kind})`)}
      </svg>
    </div>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const ART: Record<VisualKind, (accent: string) => JSX.Element> = {
  // A lattice with two basis vectors.
  lattice: (accent) => (
    <g>
      {range(13).flatMap((x) =>
        range(10).map((y) => (
          <circle key={`${x}-${y}`} cx={x * 34 + (y % 2) * 17 - 4} cy={y * 32 + 6} r="1.6" fill="#f5f5f5" opacity="0.22" />
        )),
      )}
      <g stroke={accent} strokeWidth="2.5" strokeLinecap="round">
        <line x1="166" y1="166" x2="234" y2="134" />
        <line x1="166" y1="166" x2="183" y2="230" />
        <line x1="166" y1="166" x2="251" y2="198" strokeDasharray="4 6" opacity="0.7" />
      </g>
      <circle cx="166" cy="166" r="5" fill="#f5f5f5" />
      <circle cx="251" cy="198" r="7" fill="none" stroke={accent} strokeWidth="2" />
    </g>
  ),
  // Tilted orbits, a nod to a Three.js scene.
  orbit: (accent) => (
    <g fill="none" transform="translate(200 150)">
      {[0, 30, 60, 90, 120, 150].map((angle, i) => (
        <ellipse
          key={angle}
          rx={150 - i * 8}
          ry={48 + i * 6}
          transform={`rotate(${angle})`}
          stroke={i % 2 ? "#f5f5f5" : accent}
          strokeOpacity={i % 2 ? 0.14 : 0.7}
          strokeWidth="1.5"
        />
      ))}
      <circle r="10" fill={accent} />
      <circle r="26" stroke="#f5f5f5" strokeOpacity="0.2" />
    </g>
  ),
  // A stack of pages.
  paper: (accent) => (
    <g>
      <rect x="150" y="58" width="150" height="200" rx="10" fill="#141414" stroke="#f5f5f5" strokeOpacity="0.12" transform="rotate(6 225 158)" />
      <rect x="120" y="44" width="160" height="210" rx="10" fill="#161616" stroke="#f5f5f5" strokeOpacity="0.18" />
      <rect x="140" y="68" width="90" height="8" rx="4" fill={accent} />
      {range(9).map((i) => (
        <rect key={i} x="140" y={92 + i * 15} width={i % 3 === 2 ? 70 : 120} height="4" rx="2" fill="#f5f5f5" opacity="0.18" />
      ))}
      <path d="M140 236 q20 -24 40 0 t40 0" fill="none" stroke={accent} strokeWidth="2" />
    </g>
  ),
  // Range rings, a sweep and a few blips.
  radar: (accent) => (
    <g transform="translate(200 150)" fill="none">
      {[40, 80, 120, 160].map((r) => (
        <circle key={r} r={r} stroke="#f5f5f5" strokeOpacity="0.14" />
      ))}
      <line x1="-170" y1="0" x2="170" y2="0" stroke="#f5f5f5" strokeOpacity="0.1" />
      <line x1="0" y1="-170" x2="0" y2="170" stroke="#f5f5f5" strokeOpacity="0.1" />
      <path d="M0 0 L150 -60 A162 162 0 0 1 160 20 Z" fill={accent} opacity="0.25" />
      <line x1="0" y1="0" x2="160" y2="20" stroke={accent} strokeWidth="2" />
      <circle cx="96" cy="-14" r="5" fill="#f5f5f5" />
      <circle cx="-62" cy="58" r="4" fill={accent} />
      <circle cx="40" cy="-104" r="3.5" fill="#f5f5f5" opacity="0.6" />
    </g>
  ),
  // Layout blocks, for web design studies.
  layout: (accent) => (
    <g>
      <rect x="60" y="50" width="280" height="200" rx="14" fill="#141414" stroke="#f5f5f5" strokeOpacity="0.14" />
      <rect x="80" y="74" width="60" height="8" rx="4" fill="#f5f5f5" opacity="0.3" />
      <rect x="250" y="70" width="70" height="16" rx="8" fill="none" stroke={accent} strokeWidth="1.5" />
      <rect x="80" y="104" width="170" height="22" rx="4" fill="#f5f5f5" opacity="0.85" />
      <rect x="80" y="134" width="120" height="22" rx="4" fill={accent} />
      <rect x="80" y="176" width="110" height="52" rx="8" fill="#f5f5f5" opacity="0.08" />
      <rect x="200" y="176" width="120" height="52" rx="8" fill="#f5f5f5" opacity="0.08" />
    </g>
  ),
  // A video frame with a play button.
  devlog: (accent) => (
    <g>
      <rect x="70" y="60" width="260" height="160" rx="16" fill="#141414" stroke="#f5f5f5" strokeOpacity="0.14" />
      <circle cx="200" cy="140" r="34" fill="none" stroke={accent} strokeWidth="2.5" />
      <path d="M190 124 L218 140 L190 156 Z" fill="#f5f5f5" />
      <rect x="70" y="236" width="260" height="4" rx="2" fill="#f5f5f5" opacity="0.15" />
      <rect x="70" y="236" width="104" height="4" rx="2" fill={accent} />
    </g>
  ),
};
