import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useCallback, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { RobloxMark } from "@/components/RobloxMark";
import { SITE_URL } from "@/data/works";

const PROFILE_URL = "https://www.roblox.com/users/1752054483/profile";
const PROFILE_ID = "1752054483";

// Three.js only ships to people who open this page.
const ProfileScene = lazy(() => import("@/components/profile/ProfileScene"));

const PAGE_TITLE = "3D Profile — Gothic Courtyard | ZYN";
const PAGE_DESC =
  "A playable WebGL courtyard built around ZYN's Roblox avatar. Move with WASD, jump with space, drag to orbit and scroll to zoom through a monochrome gothic scene.";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESC },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/profile` },
      { property: "og:image", content: `${SITE_URL}/og.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#08080c" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/profile` }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [sceneReady, setSceneReady] = useState(false);
  const handleReady = useCallback(() => setSceneReady(true), []);

  return (
    <div className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#08080c] text-white">
      <SiteNav />

      <main className="absolute inset-0">
        <Suspense fallback={<SceneFallback />}>
          <ProfileScene onReady={handleReady} />
        </Suspense>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-52 bg-gradient-to-b from-[#050507]/95 via-[#07070b]/45 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-52 bg-gradient-to-t from-[#050507]/95 via-[#07070b]/45 to-transparent"
        />

        <div className="pointer-events-none absolute inset-x-0 top-[84px] z-20 flex items-start justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div>
            <p className="flex items-center gap-2 font-mono text-[0.54rem] tracking-[0.2em] text-white/45 uppercase">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Profile / {PROFILE_ID}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2rem,5vw,4rem)] leading-[0.86] font-black tracking-[-0.07em] text-white">
              ZYN<span className="text-primary">.</span>
            </h1>
            <p className="mt-2 max-w-[20ch] font-mono text-[0.52rem] leading-relaxed tracking-[0.18em] text-white/35 uppercase">
              Gothic courtyard
              <span className="mx-1.5 text-white/15">/</span>
              WebGL R6
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[0.5rem] tracking-[0.16em] text-white/45 uppercase backdrop-blur-md sm:inline-flex">
              <span
                className={`size-1.5 rounded-full ${
                  sceneReady ? "bg-primary" : "animate-pulse bg-white/30"
                }`}
              />
              {sceneReady ? "Live WebGL" : "Booting scene"}
            </span>
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-2 font-mono text-[0.52rem] tracking-[0.14em] text-white/75 uppercase backdrop-blur-md transition-colors hover:border-primary/60 hover:text-white"
            >
              <span className="flex size-3 shrink-0 items-center justify-center">
                <RobloxMark className="size-3" />
              </span>
              Roblox
              <ArrowUpRight className="size-3 shrink-0" />
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 sm:p-6">
          <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md sm:flex">
            <span className="font-mono text-[0.5rem] tracking-[0.18em] text-primary uppercase">
              Controls
            </span>
            <span aria-hidden className="h-3.5 w-px bg-white/15" />
            <span className="flex items-center gap-1.5">
              {["W", "A", "S", "D"].map((key) => (
                <Keycap key={key}>{key}</Keycap>
              ))}
              <Legend>Move</Legend>
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>Space</Keycap>
              <Legend>Jump</Legend>
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>Drag</Keycap>
              <Legend>Orbit</Legend>
            </span>
            <span className="flex items-center gap-1.5">
              <Keycap>Scroll</Keycap>
              <Legend>Zoom</Legend>
            </span>
          </div>

          <div className="hidden flex-col items-end gap-1 text-right sm:flex">
            <p className="font-mono text-[0.48rem] tracking-[0.18em] text-white/30 uppercase">
              Procedural WebGL / no assets
            </p>
            <p className="font-mono text-[0.48rem] tracking-[0.18em] text-white/50 uppercase">
              Roblox profile · {PROFILE_ID}
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-40 z-20 flex justify-center sm:hidden">
          <p className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[0.46rem] tracking-[0.16em] text-white/35 uppercase backdrop-blur-md">
            Drag to look around
          </p>
        </div>

        <p className="sr-only">
          Interactive 3D scene of the Roblox profile {PROFILE_ID}. An R6 avatar in a black polo,
          jeans, pointed hat and horns stands in a gothic stone courtyard with floating crosses. Use
          W, A, S, D or the arrow keys to walk, space to jump, drag to orbit the camera and scroll
          to zoom. On touch screens, use the joystick and jump button.
        </p>
      </main>
    </div>
  );
}

function Keycap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-[0.3rem] border border-white/15 border-b-white/25 bg-white/5 px-1.5 py-1 font-mono text-[0.48rem] leading-none tracking-[0.08em] text-white/65">
      {children}
    </kbd>
  );
}

function Legend({ children }: { children: string }) {
  return (
    <span className="font-mono text-[0.5rem] tracking-[0.12em] text-white/35 uppercase">
      {children}
    </span>
  );
}

function SceneFallback() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#08080c]">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border border-white/12 border-t-primary" />
        <p className="mt-5 font-mono text-[0.54rem] tracking-[0.22em] text-white/40 uppercase">
          Opening the courtyard
        </p>
      </div>
    </div>
  );
}
