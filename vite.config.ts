import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Standard TanStack Start + Vite + Tailwind v4 setup — no Lovable-specific
// plugins. Dev serves on :8080 and binds 0.0.0.0 so it works in Codespaces
// and remote containers. Production builds with Nitro (cloudflare-module by
// default), which deploys for free to Cloudflare Workers / Pages.
export default defineConfig(({ command }) => ({
  server: {
    port: 8080,
    host: true,
  },
  resolve: {
    // Resolve the `@/` alias from tsconfig.json (Vite 8 native support).
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    react(),
    // Nitro powers the SSR build. Only needed at build time; dev uses the
    // TanStack Start dev server. Override the target with NITRO_PRESET.
    //
    // `experimental.tasks` + `scheduledTasks` turn on Nitro's cron support: the
    // Cloudflare preset copies each schedule into the generated
    // .output/server/wrangler.json as a `crons` trigger, which is the config
    // `npm run deploy` actually ships. 06:17 UTC rather than 06:00 so the
    // run doesn't land on the hour, when Roblox's API traffic peaks.
    ...(command === "build"
      ? [
          nitro({
            defaultPreset: process.env["NITRO_PRESET"] || "cloudflare-module",
            experimental: { tasks: true },
            tasks: {
              "works:refresh": {
                // Absolute path: Nitro normalizes task handlers into a virtual
                // module's import specifier, so a "./src/…" string loses its
                // leading "./" and stops being resolvable by the bundler.
                handler: fileURLToPath(
                  new URL("./src/tasks/refresh-roblox-metadata.ts", import.meta.url),
                ),
                description:
                  "Fill in missing Roblox titles, descriptions and icons for portfolio entries",
              },
              "portfolio:digest": {
                handler: fileURLToPath(new URL("./src/tasks/weekly-digest.ts", import.meta.url)),
                description: "Weekly DM summarising new entries, merges and refresh results",
              },
              "portfolio:bot-liveness": {
                handler: fileURLToPath(new URL("./src/tasks/bot-liveness.ts", import.meta.url)),
                description: "DM the owner when the hosted Discord bot goes dark or comes back",
              },
            },
            scheduledTasks: {
              // Off the hour on purpose — 06:17 and 08:43 avoid the peak of
              // everyone else's scheduled traffic (and Roblox's own). The
              // liveness watch runs at :29, similarly off-peak and guaranteed
              // to be distinct from the other two slots.
              "17 6 * * *": "works:refresh",
              // Monday morning — a digest of the week just gone.
              "43 8 * * 1": "portfolio:digest",
              // Hourly bot-liveness watch — pages the owner exactly on state
              // transitions (down / recovered), never per tick.
              "29 * * * *": "portfolio:bot-liveness",
            },
          }),
        ]
      : []),
  ],
}));
