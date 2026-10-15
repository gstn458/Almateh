# Portfolio

A single-page dark portfolio (React, Vite, Tailwind, GSAP, Framer Motion, hls.js)
with a separate `/resume` page.

All personal content is in `src/data/content.ts`. Lines marked `PLACEHOLDER`
still need your own details.

```bash
npm install
npm run dev      # open the address it prints, usually http://localhost:5173
npm run build    # production build into dist/
```

When you host it, set the host to serve `index.html` for every path so that
`/resume` still works after a page reload. Netlify, Vercel and Cloudflare Pages
each have a single-page-app setting for this.
