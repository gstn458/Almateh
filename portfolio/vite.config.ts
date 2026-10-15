import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type HtmlTagDescriptor, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { person, resume, site, socials } from "./src/data/content";

const PLACEHOLDER_URL = "https://TODO-set-site-url-in-content.ts";

/**
 * Fills index.html's <head> from src/data/content.ts (title, description,
 * Open Graph, Twitter card and JSON-LD) and serves sitemap.xml and robots.txt,
 * so all of it is edited in one place.
 */
function seo(): Plugin {
  const origin = site.url.replace(/\/$/, "");
  const absolute = (path: string) => (origin ? `${origin}${path}` : path);

  const sitemap = () => {
    const base = origin || PLACEHOLDER_URL;
    const urls = ["/", "/resume"].map((path) => `  <url><loc>${base}${path}</loc></url>`).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  };
  const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${origin || PLACEHOLDER_URL}/sitemap.xml\n`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.fullName,
    alternateName: [person.name, person.chineseName],
    affiliation: { "@type": "EducationalOrganization", name: resume.education.school },
    sameAs: socials.map((social) => social.href),
    ...(origin ? { url: origin } : {}),
  };

  const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: "meta", attrs, injectTo: "head" });

  return {
    name: "portfolio-seo",
    transformIndexHtml(html) {
      const tags: HtmlTagDescriptor[] = [
        meta({ name: "description", content: site.description }),
        meta({ name: "author", content: person.fullName }),
        meta({ property: "og:type", content: "website" }),
        meta({ property: "og:site_name", content: person.fullName }),
        meta({ property: "og:title", content: site.title }),
        meta({ property: "og:description", content: site.description }),
        meta({ property: "og:image", content: absolute(site.ogImage) }),
        meta({ property: "og:image:width", content: "1200" }),
        meta({ property: "og:image:height", content: "630" }),
        meta({ property: "og:image:alt", content: site.ogImageAlt }),
        meta({ name: "twitter:card", content: "summary_large_image" }),
        meta({ name: "twitter:title", content: site.title }),
        meta({ name: "twitter:description", content: site.description }),
        meta({ name: "twitter:image", content: absolute(site.ogImage) }),
        meta({ name: "twitter:image:alt", content: site.ogImageAlt }),
        { tag: "script", attrs: { type: "application/ld+json" }, children: JSON.stringify(jsonLd), injectTo: "head" },
      ];
      if (origin) {
        tags.push(meta({ property: "og:url", content: `${origin}/` }));
        tags.push({ tag: "link", attrs: { rel: "canonical", href: `${origin}/` }, injectTo: "head" });
      }
      return { html: html.replace(/<title>.*<\/title>/, `<title>${site.title}</title>`), tags };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/sitemap.xml") {
          res.setHeader("Content-Type", "application/xml");
          res.end(sitemap());
        } else if (req.url === "/robots.txt") {
          res.setHeader("Content-Type", "text/plain");
          res.end(robots());
        } else next();
      });
    },
    generateBundle() {
      if (!origin) {
        this.warn("TODO: set site.url in src/data/content.ts so the sitemap and social previews use your real address.");
      }
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap() });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots() });
    },
  };
}

export default defineConfig({
  plugins: [react(), seo()],
  // hls.js (the video player) is large but loads on its own, after the page; this silences a harmless size warning.
  build: { chunkSizeWarningLimit: 700 },
  define: {
    __HAS_RESUME_PDF__: JSON.stringify(existsSync(resolve(__dirname, "public/resume.pdf"))),
  },
});
