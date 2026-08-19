import { defineConfig } from "vite";
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
    ...(command === "build"
      ? [nitro({ defaultPreset: process.env["NITRO_PRESET"] || "cloudflare-module" })]
      : []),
  ],
}));
