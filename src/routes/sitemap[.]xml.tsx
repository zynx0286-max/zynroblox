import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/data/works";
import { listWorks } from "@/lib/works.functions";

const staticPaths = ["/", "/work"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const works = await listWorks();
        const urls = [
          ...staticPaths.map((p) => ({ loc: `${SITE_URL}${p}`, priority: p === "/" ? "1.0" : "0.9" })),
          ...works.map((w) => ({ loc: `${SITE_URL}/work/${w.slug}`, priority: "0.7" })),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
