# Almateh

A premium digital-agency website — scroll-driven hero masking, an infinite client
ticker, a glassmorphic services grid, and an expanding project gallery.

## Stack

- **React 18 + TypeScript**, built with **Vite**
- **Tailwind CSS** for styling
- **Framer Motion** for scroll, layout and entrance animation
- **lucide-react** for icons

## Running it

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
```

## Structure

```
src/
  App.tsx                 page assembly
  index.css               Tailwind layers, design tokens, motion preferences
  components/
    Navbar.tsx            fixed glass pill, scroll-reactive blur, mobile menu
    Hero.tsx              300vh scroll section, circular clip-path reveal
    Clients.tsx           infinite 40s ticker with masked edges
    Services.tsx          2x2 glass cards, quarter-circle corner icons
    Work.tsx              flex accordion gallery, hover + keyboard driven
    About.tsx             split layout with blurred purple bloom
    Footer.tsx            CTA headline, 4-column links, bottom bar
```

## Design system

| Token | Value |
| --- | --- |
| Background | `#0c1128` |
| Text | `#ffffff`, `#d1d5db`, `#9ca3af`, `#4b5563` |
| Neon blue | `#00f0ff` |
| Neon purple | `#b026ff` |
| Accent gradients | `from-blue-400 to-purple-500`, `from-blue-200 to-purple-200` |
| Typeface | Outfit (300–900) |

## Notes

- The hero and gallery images are served from an external CDN; they load in any
  normal browser but are unreachable from restricted network sandboxes.
- `overflow-x: clip` (not `hidden`) is used on the page wrapper on purpose —
  `hidden` makes the wrapper a scroll container and silently breaks the hero's
  `position: sticky`.
- Animations respect `prefers-reduced-motion`.
