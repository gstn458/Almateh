# Portfolio

A single-page dark portfolio (React, Vite, Tailwind, GSAP, Framer Motion, hls.js)
with a separate `/resume` page.

All content (copy, links, image paths, metadata) is in `src/data/content.ts`.
Search it for `TODO`. Missing details show as dashed amber "TODO" chips on the
dev server only and are left out of the production build.

- Screenshots go in `public/images/`; point `image` at them in content.ts.
- Your resume PDF goes at `public/resume.pdf`; the Download button appears once it exists.
- `public/og.png` is the social preview image (1200 × 630).
- Set `site.url` once deployed; the sitemap, robots.txt and social tags use it.

```bash
npm install
npm run dev      # open the address it prints, usually http://localhost:5173
npm run build    # production build into dist/
```

When you host it, set the host to serve `index.html` for every path so that
`/resume` still works after a page reload. Netlify, Vercel and Cloudflare Pages
each have a single-page-app setting for this.
